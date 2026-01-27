import { ActivityLog, ActivityVerb, ActivityEntity, SecurityEventType, ActivityOutcome } from '@prisma/client';

export default class ActivityLogEntity implements ActivityLog {
  readonly id!: string;

  readonly userId!: string;
  readonly verb!: ActivityVerb;
  readonly entity!: ActivityEntity;
  readonly entityId!: string | null;

  readonly actorId!: string | null;
  readonly actorName!: string | null;
  readonly actorEmail!: string | null;

  readonly description!: string;
  readonly metadata!: Record<string, any> | null;

  readonly ip!: string | null;
  readonly userAgent!: string | null;
  readonly securityEvent!: SecurityEventType | null;
  readonly outcome!: ActivityOutcome | null;

  readonly occurredAt!: Date;
  readonly createdAt!: Date;
}
