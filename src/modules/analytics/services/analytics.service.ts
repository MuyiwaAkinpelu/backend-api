import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { DailyUploadStatRepository } from '../repositories/daily-upload-stat.repository';
import { UserActivityRepository } from '../repositories/user-activity.repository';
import { ProjectDocumentStatRepository } from '../repositories/project-document-stat.repository';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { ActivityLogsService } from '@modules/activity-logs/activity-logs.service';
import { ActivityLogSortableColumns } from '@modules/activity-logs/types';
import { Order } from '@constants/order.constants';
import { ActivityTimeframe, TrendPeriod, LogStatus } from '../constants/analytics.enums';
import { ApprovalStatus, ProjectCategory, Roles } from '@prisma/client';
import { format } from 'date-fns';
import { ActivityLogsDTO } from '@modules/activity-logs/dtos/activity-logs.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly uploadsRepo: DailyUploadStatRepository,
    private readonly activityRepo: UserActivityRepository,
    private readonly projectRepo: ProjectDocumentStatRepository,
    private readonly securityRepo: SecurityEventRepository,
    private readonly activityLogsService: ActivityLogsService,
    private readonly prisma: PrismaService,
  ) { }

  async getAdminAnalytics() {
    const [
      totalDocuments,
      totalUsers,
      pendingApprovals,
      totalViews,
      totalDownloads,
      activeProjects
    ] = await Promise.all([
      this.prisma.file.count({ where: { approvalRequests: { some: {} } } }),
      this.prisma.user.count(),
      this.prisma.approvalRequest.count({ where: { status: ApprovalStatus.PENDING } }),
      this.prisma.file.aggregate({ _sum: { views: true } }).then(res => res._sum?.views || 0),
      this.prisma.file.aggregate({ _sum: { downloads: true } }).then(res => res._sum?.downloads || 0),
      this.prisma.project.count({ where: { status: 'ACTIVE' } })
    ]);

    const uploadTrends = await this.getUploadTrends(TrendPeriod.ONE_YEAR);

    // Optimization: Fetch all projects and their document counts from ApprovalRequest (non-drafts) in fewer queries
    const allProjects = await this.prisma.project.findMany({
      select: { id: true, name: true, category: true }
    });

    const allProjectsDocsStats = await this.prisma.approvalRequest.groupBy({
      by: ['projectId'],
      _count: { documentId: true }
    });

    const projectCountMap = new Map(allProjectsDocsStats.map(s => [s.projectId, s._count.documentId]));

    const orgDistribution = [
      {
        name: 'SCIDaR',
        value: allProjects
          .filter(p => p.category === ProjectCategory.SCIDAR)
          .reduce((sum, p) => sum + (projectCountMap.get(p.id) || 0), 0)
      },
      {
        name: ProjectCategory.SOLINA_HEALTH,
        value: allProjects
          .filter(p => p.category === ProjectCategory.SOLINA_HEALTH)
          .reduce((sum, p) => sum + (projectCountMap.get(p.id) || 0), 0)
      },
    ];

    const projectDistribution = allProjects
      .slice(0, 6)
      .map(p => ({
        name: p.name,
        value: projectCountMap.get(p.id) || 0
      }));

    const mostViewedDocuments = await this.prisma.file.findMany({
      take: 5,
      orderBy: { views: 'desc' },
      select: { originalFilename: true, views: true }
    }).then(docs => docs.map(d => ({ title: d.originalFilename, views: d.views })));

    const userActivity = await this.getUserActivityByTimeframe(ActivityTimeframe.WEEKLY);

    const failedLoginsRaw = await this.securityRepo.findFailedLogins(new Date(new Date().setDate(new Date().getDate() - 30)), new Date());
    const recentLogsRaw = await this.prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } }
    });

    const securityAudit = {
      failedLogins: failedLoginsRaw.map(f => ({ date: f.occurredAt.toISOString().split('T')[0], count: f.count })),
      unauthorizedAttempts: await this.prisma.activityLog.count({ where: { securityEvent: 'UNAUTHORIZED_ACCESS' } }),
      // recentLogs: recentLogsRaw.map(log => ({
      //   action: log.verb,
      //   user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      //   description: log.metadata ? (log.metadata as any).description || 'Activity logged' : 'Activity logged',
      //   time: log.createdAt.toISOString(),
      //   status: log.outcome === 'SUCCESS' ? LogStatus.SUCCESS : LogStatus.FLAGGED
      // }))
      recentLogs: await this.getAuditLogs()
    };

    const approvalStats = await this.prisma.approvalRequest.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    const approvalDistribution = approvalStats.map(s => ({
      name: s.status === 'APPROVED' ? 'Approved' : s.status === 'DECLINED' ? 'Declined' : 'Pending',
      value: s._count.id
    }));

    return {
      totalDocuments,
      totalUsers,
      pendingApprovals,
      totalViews,
      totalDownloads,
      activeProjects,
      uploadTrends,
      orgDistribution,
      projectDistribution,
      mostViewedDocuments,
      userActivity,
      securityAudit,
      operationalEfficiency: {
        avgApprovalTime: await this.calculateAvgApprovalTime(),
        approvalDistribution,
        metadataQuality: await this.calculateMetadataQuality()
      },
      engagementInsights: {
        inactiveUsers: await this.prisma.user.count({ where: { isActive: false } }),
        leaderboard: await this.getLeaderboard()
      }
    };
  }

  async getUploadTrends(period: TrendPeriod | string, customFrom?: Date, customTo?: Date) {
    let from = new Date();
    const to = customTo || new Date();

    if (period === TrendPeriod.SIX_MONTHS) from.setMonth(from.getMonth() - 6);
    else if (period === TrendPeriod.ONE_YEAR) from.setFullYear(from.getFullYear() - 1);
    else if (period === TrendPeriod.ALL_TIME) from = new Date(0);
    else if (period === TrendPeriod.CUSTOM && customFrom) from = customFrom;
    else from.setFullYear(from.getFullYear() - 1);

    const stats = await this.uploadsRepo.findRange(from, to);

    const monthlyData = new Map<string, number>();
    stats.forEach(stat => {
      const month = stat.date.toISOString().slice(0, 7);
      const current = monthlyData.get(month) || 0;
      monthlyData.set(month, current + stat.uploads);
    });

    return Array.from(monthlyData.entries()).map(([month, uploads]) => ({ month, uploads })).sort((a, b) => a.month.localeCompare(b.month));
  }

  async getAuditLogs(limit: number = 20) {
    const logDto = new ActivityLogsDTO();
    logDto.page = 1;
    logDto.limit = limit;
    logDto.sortBy = ActivityLogSortableColumns.OCCURRED_AT;
    logDto.order = Order.DESC;

    const result = await this.activityLogsService.findAll(logDto);

    return result.data.map(log => ({
      action: log.verb,
      user: log.actorName || 'System',
      description: log.description,
      time: log.createdAt.toISOString(),
      status: log.outcome === 'SUCCESS' ? LogStatus.SUCCESS : LogStatus.FLAGGED
    }));
  }

  async getUserActivityByTimeframe(timeframe: ActivityTimeframe) {
    const to = new Date();
    const from = new Date();

    switch (timeframe) {
      case ActivityTimeframe.WEEKLY: from.setDate(to.getDate() - 7); break;
      case ActivityTimeframe.BIWEEKLY: from.setDate(to.getDate() - 14); break;
      case ActivityTimeframe.MONTHLY: from.setMonth(from.getMonth() - 1); break;
      case ActivityTimeframe.QUARTERLY: from.setMonth(from.getMonth() - 3); break;
      case ActivityTimeframe.YEARLY: from.setFullYear(from.getFullYear() - 1); break;
      default: from.setDate(to.getDate() - 7);
    }

    const rows = await this.activityRepo.findGrouped(from, to);

    // Group by day for more detailed line chart labels
    const dailyMap = new Map<string, number>();
    rows.forEach(row => {
      const dateKey = row.date.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    });

    return Array.from(dailyMap.entries()).map(([date, active]) => ({
      label: format(new Date(date), 'MMM dd'),
      active
    })).sort((a, b) => a.label.localeCompare(b.label));
  }

  private async getLeaderboard() {
    const topUploaders = await this.prisma.file.groupBy({
      by: ['uploaderId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });
    return Promise.all(topUploaders.filter(u => u.uploaderId).map(async u => {
      const user = await this.prisma.user.findUnique({ where: { id: u.uploaderId! } });
      const isAdmin = user?.roles.includes(Roles.SYSTEM_ADMIN);
      const project = await this.prisma.project.findFirst({ where: { membersIDs: { has: u.uploaderId! } } });
      return {
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        uploads: u._count.id,
        project: isAdmin ? 'Administrator' : project?.name || 'N/A'
      };
    }));
  }

  // Previous methods kept for compatibility if needed (overwritten above but interface must match)
  async getUserActivity(from: Date, to: Date) {
    const rows = await this.activityRepo.findGrouped(from, to);

    // Group by date to count unique users (each row is a user-day activity)
    const dailyMap = new Map<string, number>();
    rows.forEach(row => {
      const dateKey = row.date.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    });

    return Array.from(dailyMap.entries()).map(([date, active]) => ({
      label: date,
      active
    })).sort((a, b) => a.label.localeCompare(b.label));
  }

  async getSecurityAudit(from: Date, to: Date) {
    const failed = await this.securityRepo.findFailedLogins(from, to);
    return {
      failedLogins: failed.map(f => ({
        date: f.occurredAt,
        count: f.count,
      })),
    };
  }

  private async calculateAvgApprovalTime(): Promise<number> {
    const approvedRequests = await this.prisma.approvalRequest.findMany({
      where: { status: ApprovalStatus.APPROVED },
      select: { createdAt: true, updatedAt: true }
    });

    if (approvedRequests.length === 0) return 0;

    const totalDuration = approvedRequests.reduce((sum, req) => {
      const duration = req.updatedAt.getTime() - req.createdAt.getTime();
      return sum + duration;
    }, 0);

    const avgMs = totalDuration / approvedRequests.length;
    const avgDays = avgMs / (1000 * 60 * 60 * 24);

    return parseFloat(avgDays.toFixed(1));
  }

  private async calculateMetadataQuality(): Promise<number> {
    const totalDocs = await this.prisma.file.count();
    if (totalDocs === 0) return 0;

    const [withDesc, withTags, withType] = await Promise.all([
      this.prisma.file.count({
        where: {
          AND: [
            { description: { not: null } },
            { description: { not: '' } }
          ]
        }
      }),
      this.prisma.file.count({
        where: { NOT: { tags: { equals: [] } } }
      }),
      this.prisma.file.count({
        where: { contentType: { not: '' } }
      }),
    ]);

    // weighted formula: desc(40%) + tags(30%) + contentType(30%)
    const score = ((withDesc * 0.4) + (withTags * 0.3) + (withType * 0.3)) / totalDocs * 100;

    return Math.round(score);
  }
}

// projectManagerProjects   Project[] @relation(fields: [projectManagerProjectIDs], references: [id], name: "ProjectManagerProjects")