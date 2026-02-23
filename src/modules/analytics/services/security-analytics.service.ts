import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class SecurityAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async failedLogins(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.prisma.securityEventStat.count({
      where: { eventType: 'FAILED_LOGIN', occurredAt: { gte: cutoff } },
    });
  }

  async unauthorizedAttempts(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.prisma.securityEventStat.count({
      where: { eventType: 'UNAUTHORIZED_ACCESS', occurredAt: { gte: cutoff } },
    });
  }
}
