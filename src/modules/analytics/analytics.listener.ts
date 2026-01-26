import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@providers/prisma';
import { AnalyticsEvents } from './events';

@Injectable()
export class AnalyticsListener {
    constructor(private readonly prisma: PrismaService) { }

    private today() {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }


    @OnEvent(AnalyticsEvents.FILE_UPLOADED, { async: true })
    async handleFileUploaded(payload: {
        userId: string;
        projectId?: string;
        fileSize: number;
    }) {
        const today = this.today();

        await this.prisma.dailyUploadStat.upsert({
            where: { date: today },
            update: {
                uploads: { increment: 1 },
                totalSize: { increment: payload.fileSize },
            },
            create: {
                date: today,
                uploads: 1,
                totalSize: payload.fileSize,
            },
        });

        if (payload.projectId) {
            await this.prisma.projectDocumentStat.upsert({
                where: { projectId: payload.projectId },
                update: {
                    documentCount: { increment: 1 },
                    totalUploads: { increment: 1 },
                    lastActivity: new Date(),
                },
                create: {
                    projectId: payload.projectId,
                    documentCount: 1,
                    totalUploads: 1,
                    totalViews: 0,
                    lastActivity: new Date(),
                },
            });
        }
    }

    @OnEvent(AnalyticsEvents.USER_ACTION, { async: true })
    async handleUserAction(payload: { userId: string }) {
        const today = this.today();

        await this.prisma.userActivityDaily.upsert({
            where: {
                UserActivityDaily_userId_date: {
                    date: today,
                    userId: payload.userId,
                },
            },
            update: {
                actions: { increment: 1 },
                lastAction: new Date(),
            },
            create: {
                date: today,
                userId: payload.userId,
                actions: 1,
                lastAction: new Date(),
            },
        });
    }


    @OnEvent(AnalyticsEvents.SECURITY_EVENT, { async: true })
    async handleSecurityEvent(payload: {
        type: 'FAILED_LOGIN' | 'UNAUTHORIZED_ACCESS' | 'PASSWORD_RESET' | 'ROLE_CHANGE';
    }) {
        const today = this.today();

        await this.prisma.securityEventStat.upsert({
            where: {
                SecurityEventStat_date_eventType: {
                    occurredAt: today,
                    eventType: payload.type,
                },
            },
            update: {
                count: { increment: 1 },
            },
            create: {
                occurredAt: today,
                eventType: payload.type,
                count: 1,
            },
        });
    }
}
