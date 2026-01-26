import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { DailyUploadStatRepository } from '../repositories/daily-upload-stat.repository';
import { UserActivityRepository } from '../repositories/user-activity.repository';
import { ProjectDocumentStatRepository } from '../repositories/project-document-stat.repository';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { ActivityTimeframe, TrendPeriod, LogStatus } from '../constants/analytics.enums';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly uploadsRepo: DailyUploadStatRepository,
    private readonly activityRepo: UserActivityRepository,
    private readonly projectRepo: ProjectDocumentStatRepository,
    private readonly securityRepo: SecurityEventRepository,
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
      this.prisma.file.count(),
      this.prisma.user.count(),
      this.prisma.approvalRequest.count({ where: { status: ApprovalStatus.PENDING } }),
      this.prisma.file.aggregate({ _sum: { views: true } }).then(res => res._sum?.views || 0),
      this.prisma.file.aggregate({ _sum: { downloads: true } }).then(res => res._sum?.downloads || 0),
      this.prisma.project.count({ where: { status: 'ACTIVE' } })
    ]);

    const uploadTrends = await this.getUploadTrends(TrendPeriod.ONE_YEAR);

    const orgDistribution = [
      { name: 'SCIDaR', value: await this.prisma.project.count({ where: { category: 'SCIDAR' } }) },
      { name: 'Solina Health', value: await this.prisma.project.count({ where: { category: 'SOLINA_HEALTH' } }) },
    ];

    const projectDistributionRaw = await this.prisma.project.findMany({
      take: 6,
      include: { _count: { select: { documents: true } } }
    });
    const projectDistribution = projectDistributionRaw.map(p => ({ name: p.name, value: p._count.documents }));

    const mostViewedDocuments = await this.prisma.file.findMany({
      take: 5,
      orderBy: { views: 'desc' },
      select: { originalFilename: true, views: true }
    }).then(docs => docs.map(d => ({ title: d.originalFilename, views: d.views })));

    const userActivity = await this.getAllUserActivityTimeframes();

    const failedLoginsRaw = await this.securityRepo.findFailedLogins(new Date(new Date().setDate(new Date().getDate() - 30)), new Date());
    const recentLogsRaw = await this.prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } }
    });

    const securityAudit = {
      failedLogins: failedLoginsRaw.map(f => ({ date: f.occurredAt.toISOString().split('T')[0], count: f.count })),
      unauthorizedAttempts: await this.prisma.activityLog.count({ where: { securityEvent: 'UNAUTHORIZED_ACCESS' } }),
      recentLogs: recentLogsRaw.map(log => ({
        action: log.verb,
        user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        description: log.metadata ? (log.metadata as any).description || 'Activity logged' : 'Activity logged',
        time: log.createdAt.toISOString(),
        status: log.outcome === 'SUCCESS' ? LogStatus.SUCCESS : LogStatus.FLAGGED
      }))
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
        avgApprovalTime: 2.4, // Placeholder
        approvalDistribution,
        metadataQuality: 88 // Placeholder
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

  async getAllUserActivityTimeframes() {
    // Placeholder for full aggregation logic implementation
    return {
      [ActivityTimeframe.WEEKLY]: [],
      [ActivityTimeframe.BIWEEKLY]: [],
      [ActivityTimeframe.MONTHLY]: [],
      [ActivityTimeframe.QUARTERLY]: [],
      [ActivityTimeframe.YEARLY]: [],
    };
  }

  private async getLeaderboard() {
    const topUploaders = await this.prisma.file.groupBy({
      by: ['uploaderId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 3
    });
    return Promise.all(topUploaders.filter(u => u.uploaderId).map(async u => {
      const user = await this.prisma.user.findUnique({ where: { id: u.uploaderId! } });
      const project = await this.prisma.project.findFirst({ where: { membersIDs: { has: u.uploaderId! } } });
      return {
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        uploads: u._count.id,
        project: project?.name || 'N/A'
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
}

// projectManagerProjects   Project[] @relation(fields: [projectManagerProjectIDs], references: [id], name: "ProjectManagerProjects")