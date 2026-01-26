import { ActivityEntity, ActivityLog, ActivityVerb, Prisma, User } from "@prisma/client";

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
    metadata?: Prisma.JsonValue;
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