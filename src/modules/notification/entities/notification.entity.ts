import { Notification, NotificationType } from "@prisma/client";

export class NotificationEntity implements Notification {
    readonly id!: string;
    readonly userId!: string;
    readonly title!: string;
    readonly message!: string;
    readonly type!: NotificationType;
    readonly read!: boolean;
    readonly metadata!: Record<string, any> | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
}