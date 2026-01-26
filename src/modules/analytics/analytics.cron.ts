import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ActivityEntity, ActivityVerb, SecurityEventType } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { getDayWindow } from 'src/common/utils';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AnalyticsCron {
  private readonly logger = new Logger(AnalyticsCron.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Runs every 12 hours (00:00 and 12:00)
   */
  @Cron('0 */12 * * *')
  async runAnalyticsAggregation() {
    this.logger.log('Starting analytics aggregation job');

    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      await Promise.all([
        this.aggregateDailyUploads(startOfDay, endOfDay),
        this.aggregateUserActivity(startOfDay, endOfDay),
        this.aggregateProjectDocuments(),
        this.aggregateSecurityEvents(startOfDay, endOfDay),
      ]);

      this.logger.log('Analytics aggregation completed successfully');
    } catch (error) {
      this.logger.error('Analytics aggregation failed', error);
    }
  }

  private async aggregateDailyUploads(start: Date, end: Date) {
    const uploads = await this.prisma.file.groupBy({
      by: ['uploadDate'],
      where: {
        uploadDate: {
          gte: start,
          lte: end,
        },
      },
      _count: { id: true },
      _sum: { size: true },
    });

    for (const u of uploads) {
      await this.prisma.dailyUploadStat.upsert({
        where: {
          date: u.uploadDate,
        },
        update: {
          uploads: u._count.id,
          totalSize: u._sum.size || 0,
        },
        create: {
          date: u.uploadDate,
          uploads: u._count.id,
          totalSize: u._sum.size || 0,
        },
      });
    }
  }

  private async aggregateUserActivity(start: Date, end: Date) {
    const activities = await this.prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _count: { id: true },
    });

    for (const a of activities) {
      await this.prisma.userActivityDaily.upsert({
        where: {
          UserActivityDaily_userId_date: {
            userId: a.userId,
            date: start,
          },
        },
        update: {
          actions: a._count.id,
        },
        create: {
          userId: a.userId,
          date: start,
          actions: a._count.id,
          lastAction: end,
        },
      });
    }
  }

  private async aggregateProjectDocuments() {
    const projects = await this.prisma.project.findMany({
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    for (const project of projects) {
      await this.prisma.projectDocumentStat.upsert({
        where: {
          projectId: project.id,
        },
        update: {
          documentCount: project._count.documents,
        },
        create: {
          projectId: project.id,
          documentCount: project._count.documents,
        },
      });
    }
  }


  // async aggregateSecurityEvents(date: Date = new Date()) {
  //   const start = startOfDay(date);
  //   const end = endOfDay(date);

  //   const securityEventTypes: SecurityEventType[] = [
  //     SecurityEventType.FAILED_LOGIN,
  //     SecurityEventType.UNAUTHORIZED_ACCESS,
  //     SecurityEventType.PASSWORD_RESET,
  //     SecurityEventType.ROLE_CHANGE,
  //   ];

  //   // 1. Aggregate raw activity logs
  //   const grouped = await this.prisma.activityLog.groupBy({
  //     by: ['eventType'],
  //     where: {
  //       eventType: { in: securityEventTypes },
  //       createdAt: {
  //         gte: start,
  //         lte: end,
  //       },
  //     },
  //     _count: {
  //       _all: true,
  //     },
  //   });

  //   // 2. Persist aggregated stats
  //   for (const item of grouped) {
  //     await this.prisma.securityEventStat.upsert({
  //       where: {
  //         SecurityEventStat_date_eventType: {
  //           date: start,
  //           eventType: item.eventType,
  //         },
  //       },
  //       update: {
  //         count: item._count._all,
  //       },
  //       create: {
  //         date: start,
  //         eventType: item.eventType,
  //         count: item._count._all,
  //       },
  //     });
  //   }
  // }

  private async aggregateSecurityEvents(start: Date, end: Date) {
    const definitions = [
      {
        type: SecurityEventType.FAILED_LOGIN,
        where: {
          entity: ActivityEntity.AUTH,
          verb: ActivityVerb.LOGIN,
          metadata: {
            equals: { outcome: 'FAILURE' },
          },
          createdAt: { gte: start, lte: end },
        },
      },
      {
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        where: {
          entity: ActivityEntity.AUTH,
          metadata: {
            equals: { outcome: 'FAILURE' },
          },
          createdAt: { gte: start, lte: end },
        },
      },
      {
        type: SecurityEventType.PASSWORD_RESET,
        where: {
          entity: ActivityEntity.AUTH,
          verb: ActivityVerb.UPDATE,
          createdAt: { gte: start, lte: end },
        },
      },
      {
        type: SecurityEventType.ROLE_CHANGE,
        where: {
          entity: ActivityEntity.USER,
          verb: ActivityVerb.UPDATE,
          createdAt: { gte: start, lte: end },
        },
      },
    ];

    for (const def of definitions) {
      const count = await this.prisma.activityLog.count({
        where: def.where as any,
      });

      await this.prisma.securityEventStat.upsert({
        where: {
          SecurityEventStat_date_eventType: {
            occurredAt: start,
            eventType: def.type,
          },
        },
        update: {
          count,
        },
        create: {
          occurredAt: start,
          eventType: def.type,
          count,
        },
      });
    }
  }



}

