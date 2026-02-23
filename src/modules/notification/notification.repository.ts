import { PrismaService } from '@providers/prisma';
import { Injectable } from '@nestjs/common';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, Notification, NotificationPreference } from '@prisma/client';
import { PrismaRepositoryClient } from '@providers/prisma/types';

@Injectable()
export class NotificationRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        email: true,
        push: true,
        updates: true,
        approvals: true,
      },
    });
  }

  async updatePreferences(
    userId: string,
    data: Prisma.NotificationPreferenceUpdateInput,
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.update({
      where: { userId },
      data,
    });
  }

  async createNotification(
    data: Prisma.NotificationCreateInput,
  ): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async findAllPaginated(
    where: Prisma.NotificationWhereInput,
    paginationOptions?: PaginatorTypes.PaginateOptions,
  ): Promise<PaginatorTypes.PaginatedResult<Notification>> {
    const paginate = paginator(paginationOptions);
    return paginate(this.prisma.notification, {
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
