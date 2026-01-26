import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { ApprovalStatus, Prisma } from '@prisma/client';

@Injectable()
export class ProjectAnalyticsService {
    constructor(private prisma: PrismaService) { }

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

        return projects.map(p => ({
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
                members: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                managers: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                _count: {
                    select: {
                        documents: true,
                        members: true,
                    }
                }
            },
        });
        return res;
    }

    async getProjectStats(projectId: string) {

        // Optimize: instead of counting files with nested approval checks, 
        // count the approval requests directly which is indexed by projectId and status.
        const [approved, pending, declined, totalSubmitted, totalFiles] = await Promise.all([
            this.prisma.approvalRequest.count({ where: { projectId, status: ApprovalStatus.APPROVED } }),
            this.prisma.approvalRequest.count({ where: { projectId, status: ApprovalStatus.PENDING } }),
            this.prisma.approvalRequest.count({ where: { projectId, status: ApprovalStatus.DECLINED } }),
            this.prisma.approvalRequest.count({ where: { projectId } }),
            this.prisma.file.count({ where: { projectsIDs: { has: projectId } } }),
        ]);

        return {
            approved,
            total: totalFiles,
            pending,
            declined,
            totalSubmitted,
        }
    }
}
