import { Injectable, Logger, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Prisma, NotificationType, ActivityVerb, ActivityEntity, ActivityOutcome } from '@prisma/client';
import { ActivityLogEvent, ActivityAction } from '@modules/activity-logs/constants';

import { PrismaService } from '@providers/prisma';
import { NotificationRepository } from '../notification.repository';
import { NotificationGateway } from '../notification.gateway';
import { NotificationPreferenceService } from './notification-preference.service';
import { NOTIFICATION_EVENT, NotificationsListEvent, NotificationStatusEvent } from '../events/notification.event';

export interface ICreateSingleNotificationPayload {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    metadata?: any;
    isRead?: boolean;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private readonly repository: NotificationRepository,
        private readonly prisma: PrismaService,
        private readonly emitter: EventEmitter2,
        private readonly notificationPreferenceService: NotificationPreferenceService,
        @Inject(forwardRef(() => NotificationGateway))
        private readonly gateway: NotificationGateway,
    ) { }

    async createNotification(payload: ICreateSingleNotificationPayload) {
        const canReceive = await this.notificationPreferenceService.canReceive(payload.userId, payload.type, 'push');
        if (!canReceive) return null;

        const notification = await this.repository.createNotification({
            user: { connect: { id: payload.userId } },
            title: payload.title,
            message: payload.message,
            type: payload.type,
            metadata: payload.metadata || Prisma.JsonNull,
            read: payload.isRead ?? false,
        });

        if (!notification) {
            throw new BadRequestException('Could not create notification');
        }

        // Emit real-time notification via gateway
        this.gateway.sendNotificationToUser(payload.userId, notification);

        return notification;
    }

    async createBulkNotifications(payload: {
        userIds: string[];
        title: string;
        message: string;
        type: NotificationType;
        metadata?: any;
    }) {
        const notifications = [];
        for (const userId of payload.userIds) {
            const n = await this.createNotification({
                userId,
                title: payload.title,
                message: payload.message,
                type: payload.type,
                metadata: payload.metadata,
            });
            if (n) notifications.push(n);
        }
        return { count: notifications.length };
    }

    async markAllNotificationAsRead(userId: string): Promise<boolean> {
        await this.repository.markAllAsRead(userId);
        await this.updateUnreadCountForUser(userId);
        await this.getAllMemberNotifications(userId);

        this.emitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
            userId: userId,
            verb: ActivityVerb.UPDATE,
            entity: ActivityEntity.USER,
            outcome: ActivityOutcome.SUCCESS,
            metadata: {
                action: ActivityAction.MARK_ALL_NOTIFICATIONS_READ,
            },
            occurredAt: new Date(),
        });

        return true;
    }


    async markOneNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
        await this.repository.markAsRead(notificationId, userId);
        await this.updateUnreadCountForUser(userId);
        await this.getAllMemberNotifications(userId);

        this.emitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
            userId: userId,
            verb: ActivityVerb.UPDATE,
            entity: ActivityEntity.USER,
            outcome: ActivityOutcome.SUCCESS,
            metadata: {
                action: ActivityAction.MARK_NOTIFICATION_READ,
                notificationId,
            },
            occurredAt: new Date(),
        });

        return true;
    }


    async getUnreadCount(userId: string): Promise<number> {
        const count = await this.prisma.notification.count({
            where: { userId, read: false },
        });
        return count;
    }

    async updateUnreadCountForUser(userId: string): Promise<void> {
        try {
            const count = await this.getUnreadCount(userId);
            this.emitter.emit(
                NOTIFICATION_EVENT.NOTIFICATION_COUNT_UPDATED,
                new NotificationStatusEvent(userId, count),
            );
        } catch (error) {
            this.logger.error(`Failed to update unread count for user ${userId}`, error);
        }
    }

    async getAllMemberNotifications(userId: string, page = 1, limit = 15) {
        try {
            const notifications = await this.repository.findAllPaginated({ userId }, { page, perPage: limit });

            this.emitter.emit(
                NOTIFICATION_EVENT.GET_ALL_NOTIFICATIONS,
                new NotificationsListEvent(userId, notifications.data, notifications.meta),
            );

            return notifications;
        } catch (error) {
            this.logger.error(`Failed to get all notifications for user ${userId}`, error);
            return { data: [], meta: {} };
        }
    }

    @OnEvent('project.updated')
    async handleProjectUpdated(payload: { projectId: string; members?: string[]; name?: string }) {
        let { projectId, members, name } = payload;

        if (!members || !name) {
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
                select: {
                    name: true,
                    membersIDs: true,
                    managersIDs: true,
                },
            });

            if (!project) return;

            name = project.name;
            members = Array.from(new Set([...(project.membersIDs || []), ...(project.managersIDs || [])]));
        }

        for (const memberId of members) {
            await this.createNotification({
                userId: memberId,
                title: 'Project Updated',
                message: `The project "${name}" has been updated.`,
                type: NotificationType.PROJECT_UPDATE,
                metadata: { projectId },
            });
        }
    }

    @OnEvent('approval.status_changed')
    async handleApprovalStatusChanged(payload: { userId: string; status: string; projectName: string; requestId: string }) {
        await this.createNotification({
            userId: payload.userId,
            title: 'Approval Status Changed',
            message: `Your request for "${payload.projectName}" has been ${payload.status}.`,
            type: NotificationType.APPROVAL_STATUS,
            metadata: { requestId: payload.requestId },
        });
    }
}
