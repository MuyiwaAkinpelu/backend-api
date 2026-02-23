import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class UserActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findGrouped(from: Date, to: Date) {
    return this.prisma.userActivityDaily.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }
}
