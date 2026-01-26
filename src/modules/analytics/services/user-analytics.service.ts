import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { ActivityLog } from '@prisma/client';

@Injectable()
export class UserAnalyticsService {
    constructor(private prisma: PrismaService) { }

    async totalUsers(): Promise<number> {
        return this.prisma.user.count();
    }

    async recentActivity(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const logs: ActivityLog[] = await this.prisma.activityLog.findMany({
            where: { occurredAt: { gte: cutoff } },
        });

        const weeklyCounts = Array(7).fill(0);
        logs.forEach(log => {
            const day = new Date(log.occurredAt).getDay();
            weeklyCounts[day]++;
        });

        const daysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return daysLabels.map((label, idx) => ({ label, active: weeklyCounts[idx] }));
    }
}
