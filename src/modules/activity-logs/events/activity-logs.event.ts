import { ActivityEntity, ActivityVerb, Prisma } from "@prisma/client";

export interface ActivityEvent {
    userId: string;
    verb: ActivityVerb;
    entity: ActivityEntity;
    entityId?: string;
    metadata?: Prisma.JsonValue;
    ip?: string;
    userAgent?: string;
    occurredAt?: Date;
}