import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@providers/prisma';
import { AnalyticsEvents } from './events';
import { ActivityLogEvent } from '@modules/activity-logs/constants';
import { ActivityEvent } from '@modules/activity-logs/events/activity-logs.event';
import { ActivityEntity, ActivityOutcome, ActivityVerb } from '@prisma/client';

@Injectable()
export class AnalyticsListener {
    constructor(private readonly prisma: PrismaService) { }

    private today() {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }

    private async updateProjectDocumentCount(projectId: string, increment: number) {
        await this.prisma.projectDocumentStat.upsert({
            where: { projectId },
            update: {
                documentCount: { increment: increment },
                ...(increment > 0 && { totalUploads: { increment: 1 } }),
                lastActivity: new Date(),
            },
            create: {
                projectId,
                documentCount: increment > 0 ? increment : 0,
                totalUploads: increment > 0 ? 1 : 0,
                totalViews: 0,
                lastActivity: new Date(),
            },
        });
    }

    @OnEvent(ActivityLogEvent.ACTIVITY_LOG, { async: true })
    async handleActivityLog(payload: ActivityEvent) {
        const today = this.today();

        // 1. Update User Activity
        if (payload.userId) {
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

        // 2. Update File Stats (Create/Delete)
        if (payload.entity === ActivityEntity.FILE && payload.outcome === ActivityOutcome.SUCCESS) {
            const metadata = payload.metadata as any;
            const fileSize = metadata?.size || 0;

            // Handle Creation
            if (payload.verb === ActivityVerb.CREATE) {
                await this.prisma.dailyUploadStat.upsert({
                    where: { date: today },
                    update: {
                        uploads: { increment: 1 },
                        totalSize: { increment: fileSize },
                    },
                    create: {
                        date: today,
                        uploads: 1,
                        totalSize: fileSize,
                    },
                });

                const projectId = metadata?.projectId;
                if (projectId) {
                    await this.updateProjectDocumentCount(projectId, 1);
                }
            }

            // Handle Deletion
            if (payload.verb === ActivityVerb.DELETE) {
                const projectIds = metadata?.projectsIDs || [];
                for (const projectId of projectIds) {
                    await this.updateProjectDocumentCount(projectId, -1);
                }
            }
        }

        // 3. Update Security Event Stats
        if (payload.securityEvent) {
            await this.prisma.securityEventStat.upsert({
                where: {
                    SecurityEventStat_date_eventType: {
                        occurredAt: today,
                        eventType: payload.securityEvent,
                    },
                },
                update: {
                    count: { increment: 1 },
                },
                create: {
                    occurredAt: today,
                    eventType: payload.securityEvent,
                    count: 1,
                },
            });
        }
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

    @OnEvent(ActivityLogEvent.DOCUMENT_DOWNLOADED, { async: true })
    async handleDocumentDownloaded(documentId: string) {
        const today = this.today();

        // Update daily stats
        await this.prisma.dailyDownloadStat.upsert({
            where: { date: today },
            update: { downloads: { increment: 1 } },
            create: { date: today, downloads: 1 },
        });

        // Update project stats
        const document = await this.prisma.file.findUnique({
            where: { id: documentId },
            select: { projectsIDs: true }
        });

        if (document?.projectsIDs?.length) {
            await Promise.all(document.projectsIDs.map(projectId =>
                this.prisma.projectDocumentStat.upsert({
                    where: { projectId },
                    update: {
                        totalDownloads: { increment: 1 },
                        lastActivity: new Date(),
                    },
                    create: {
                        projectId,
                        totalDownloads: 1,
                        lastActivity: new Date(),
                    },
                })
            ));
        }
    }
}
