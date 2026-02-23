import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class DailyUploadStatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRange(from: Date, to: Date) {
    return this.prisma.dailyUploadStat.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });
  }
}
