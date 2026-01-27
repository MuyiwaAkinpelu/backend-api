import { ActivityEntity, ActivityLog, ActivityOutcome, ActivityVerb, Prisma, SecurityEventType, User } from "@prisma/client";

export enum ActivityLogSortableColumns {
    CREATED_AT = 'createdAt',
    OCCURRED_AT = 'occurredAt',
    VERB = 'verb',
    ENTITY = 'entity',
}

export type ActivityLogWithUser = Prisma.ActivityLogGetPayload<{
    include: {
        user: true;
    };
}>;

export interface LogActivityInput {
    userId?: string;
    verb: ActivityVerb;
    entity: ActivityEntity;
    entityId?: string;
    actorId?: string;
    actorName: string;
    actorEmail?: string;
    occurredAt?: Date;
    metadata?: Prisma.JsonValue;
    outcome?: ActivityOutcome;
    securityEvent?: SecurityEventType;
    ip?: string;
    userAgent?: string;
}

// export interface LogActivityInput {
//   userId: string;

//   verb: ActivityVerb;
//   entity: ActivityEntity;
//   entityId?: string;

//   metadata?: Record<string, any>;

//   ip?: string;
//   userAgent?: string;
// }

// export interface ActivityLogWithUser extends ActivityLog {
//   user: User;
// }