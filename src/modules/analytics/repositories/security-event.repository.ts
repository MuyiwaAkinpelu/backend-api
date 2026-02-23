import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class SecurityEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFailedLogins(from: Date, to: Date) {
    return this.prisma.securityEventStat.findMany({
      where: {
        eventType: 'FAILED_LOGIN',
        occurredAt: { gte: from, lte: to },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }
}
