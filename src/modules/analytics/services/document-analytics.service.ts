import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { Prisma } from '@prisma/client';
import { StatMetric } from '../dtos/dashboard-stats.dto';
import * as moment from 'moment';

@Injectable()
export class DocumentAnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getMetricWithTrend(
        where: Prisma.FileWhereInput = {},
        useCurrentInterval = false
    ): Promise<StatMetric> {

        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const sixtyDaysAgo = moment().subtract(60, 'days').toDate();

        const [current, previous, total] = await Promise.all([
            this.prisma.file.count({
                where: { ...where, uploadDate: { gte: thirtyDaysAgo } }
            }),
            this.prisma.file.count({
                where: { ...where, uploadDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
            }),
            this.prisma.file.count({ where })
        ]);

        if (previous === 0) {
            return { current: total };
        }

        const change = ((current - previous) / previous) * 100;
        const isPositive = change >= 0;
        const changeStr = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;

        return {
            current: useCurrentInterval ? current : total,
            change: changeStr,
            isPositive
        };
    }

    async totalDocuments(): Promise<number> {
        return this.prisma.file.count();
    }

    async topDocuments(limit = 5): Promise<{ title: string; views: number }[]> {
        const docs = await this.prisma.file.findMany({
            orderBy: { views: 'desc' },
            take: limit,
            select: { originalFilename: true, views: true },
        });
        return docs.map(d => ({ title: d.originalFilename, views: d.views }));
    }

    async uploadTrends(days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const uploads = await this.prisma.file.groupBy({
            by: ['uploadDate'],
            where: { uploadDate: { gte: cutoff } },
            _count: { id: true },
        });

        return uploads.map(u => ({
            date: u.uploadDate,
            count: u._count.id,
        }));
    }
    async recentUploads(limit = 5, where: Prisma.FileWhereInput = {}) {
        const files = await this.prisma.file.findMany({
            where,
            orderBy: { uploadDate: 'desc' },
            take: limit,
            include: {
                uploader: { select: { firstName: true, lastName: true } },
                projects: { select: { name: true, id: true } },
            },
        });

        // Map to match the JSON structure somewhat or return raw to let DashboardService format it
        return files;
    }

    async mostViewed(limit = 5, where: Prisma.FileWhereInput = {}) {
        const res = await this.prisma.file.findMany({
            where,
            orderBy: { views: 'desc' },
            take: limit,
            include: {
                uploader: { select: { firstName: true, lastName: true } },
                projects: { select: { name: true } },
            },
        });
        return res;
    }

    async totalDownloads(where: Prisma.FileWhereInput = {}): Promise<number> {
        const result = await this.prisma.file.aggregate({
            where,
            _sum: { downloads: true }
        });
        return result?._sum?.downloads || 0;
    }

    //  async totalDownloads(where: Prisma.FileWhereInput = {}): Promise<number> {
    //     // If we have projectsIDs in where, we can potentially use ProjectDocumentStat
    //     // But for global total, DailyDownloadStat is best. 
    //     if (where.projectsIDs) {
    //         const projectIds = (where.projectsIDs as any).hasSome || [];
    //         if (projectIds.length > 0) {
    //             const stats = await this.prisma.projectDocumentStat.aggregate({
    //                 where: { projectId: { in: projectIds } },
    //                 _sum: { totalDownloads: true }
    //             });
    //             return stats._sum?.totalDownloads || 0;
    //         }
    //     }

    //     const result = await this.prisma.dailyDownloadStat.aggregate({
    //         _sum: { downloads: true }
    //     });
    //     return result?._sum?.downloads || 0;
    // }

    async count(where: Prisma.FileWhereInput = {}): Promise<number> {
        return this.prisma.file.count({ where });
    }

    async getSummaryStats(where: Prisma.FileWhereInput = {}) {
        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const sixtyDaysAgo = moment().subtract(60, 'days').toDate();

        const [current, previous, total, totalDownloads] = await Promise.all([
            this.prisma.file.count({
                where: { ...where, uploadDate: { gte: thirtyDaysAgo } }
            }),
            this.prisma.file.count({
                where: { ...where, uploadDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
            }),
            this.prisma.file.count({ where }),
            this.totalDownloads(where)
        ]);

        const getMetric = (curr: number, prev: number, tot: number) => {
            if (prev === 0) return { current: tot };
            const change = ((curr - prev) / prev) * 100;
            const isPositive = change >= 0;
            return {
                current: tot,
                change: `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
                isPositive
            };
        };

        return {
            totalDocuments: getMetric(current, previous, total),
            totalDownloads
        };
    }
}
