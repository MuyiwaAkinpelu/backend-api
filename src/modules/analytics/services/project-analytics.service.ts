import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { ApprovalStatus, Prisma } from '@prisma/client';

@Injectable()
export class ProjectAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async totalProjects(): Promise<number> {
    return this.prisma.project.count();
  }

  async activeProjects(): Promise<number> {
    return this.prisma.project.count({
      where: { status: 'ACTIVE' }, // Adjust to your schema
    });
  }

  async projectDistribution(limit = 5) {
    const projects = await this.prisma.project.findMany({
      include: { _count: { select: { documents: true } } },
      take: limit,
    });

    return projects.map((p) => ({
      name: p.name,
      documentCount: p._count.documents,
    }));
  }
  async getProjects(limit = 3, where: Prisma.ProjectWhereInput = {}) {
    const res = await this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        members: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        managers: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        _count: {
          select: {
            documents: true,
            members: true,
          },
        },
      },
    });
    return res;
  }

  async getProjectStats(projectId: string) {
    // Optimize: instead of counting files with nested approval checks,
    // count the approval requests directly which is indexed by projectId and status.
    const [approved, pending, declined, totalSubmitted, totalFiles] =
      await Promise.all([
        this.prisma.approvalRequest.count({
          where: { projectId, status: ApprovalStatus.APPROVED },
        }),
        this.prisma.approvalRequest.count({
          where: { projectId, status: ApprovalStatus.PENDING },
        }),
        this.prisma.approvalRequest.count({
          where: { projectId, status: ApprovalStatus.DECLINED },
        }),
        this.prisma.approvalRequest.count({ where: { projectId } }),
        this.prisma.file.count({ where: { projectsIDs: { has: projectId } } }),
      ]);

    return {
      approved,
      total: totalFiles,
      pending,
      declined,
      totalSubmitted,
    };
  }

  async getProjectsStatsBatch(projectIds: string[]) {
    const approvalStats = await this.prisma.approvalRequest.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    });

    const totalSubmittedStats = await this.prisma.approvalRequest.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    });

    // For total files, since it's an array field in MongoDB, we fetch all projects and their document count at once
    const projectsWithFileCount = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, _count: { select: { documents: true } } },
    });

    const statsMap = new Map<string, any>();
    projectIds.forEach((id) => {
      statsMap.set(id, {
        approved: 0,
        pending: 0,
        declined: 0,
        totalSubmitted: 0,
        total: 0,
      });
    });

    approvalStats.forEach((stat) => {
      const entry = statsMap.get(stat.projectId);
      if (entry) {
        if (stat.status === ApprovalStatus.APPROVED)
          entry.approved = stat._count.id;
        else if (stat.status === ApprovalStatus.PENDING)
          entry.pending = stat._count.id;
        else if (stat.status === ApprovalStatus.DECLINED)
          entry.declined = stat._count.id;
      }
    });

    totalSubmittedStats.forEach((stat) => {
      const entry = statsMap.get(stat.projectId);
      if (entry) entry.totalSubmitted = stat._count.id;
    });

    projectsWithFileCount.forEach((p) => {
      const entry = statsMap.get(p.id);
      if (entry) entry.total = p._count.documents;
    });

    return statsMap;
  }
}
