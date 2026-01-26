import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { StatMetric } from '../dtos/dashboard-stats.dto';
import * as moment from 'moment';

@Injectable()
export class ApprovalAnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getMetricWithTrend(
        where: Prisma.ApprovalRequestWhereInput = {},
        useCurrentInterval = false
    ): Promise<StatMetric> {

        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const sixtyDaysAgo = moment().subtract(60, 'days').toDate();

        const [current, previous, total] = await Promise.all([
            this.prisma.approvalRequest.count({
                where: { ...where, createdAt: { gte: thirtyDaysAgo } }
            }),
            this.prisma.approvalRequest.count({
                where: { ...where, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
            }),
            this.prisma.approvalRequest.count({ where })
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

    async recentApproved(limit = 6, where: Prisma.ApprovalRequestWhereInput = {}) {
        return this.prisma.approvalRequest.findMany({
            where: { ...where, status: ApprovalStatus.APPROVED },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            include: {
                document: { select: { originalFilename: true, id: true, filename: true } },
                approvedBy: { select: { firstName: true, lastName: true } }
            }
        });
    }

    async getMySubmissions(userId: string, limit = 6) {
        return this.prisma.approvalRequest.findMany({
            where: { submittedById: userId },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            include: {
                document: { select: { originalFilename: true, id: true, filename: true } },
                approvedBy: { select: { firstName: true, lastName: true } }
            }
        });
    }

    async count(where: Prisma.ApprovalRequestWhereInput = {}): Promise<number> {
        return this.prisma.approvalRequest.count({ where });
    }
}
