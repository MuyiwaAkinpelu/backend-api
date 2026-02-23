import {
  ActivityEntity,
  ActivityOutcome,
  ActivityVerb,
  Prisma,
  SecurityEventType,
} from '@prisma/client';

export interface ActivityEvent {
  userId: string;
  verb: ActivityVerb;
  entity: ActivityEntity;
  entityId?: string;
  metadata?: Prisma.JsonValue;
  securityEvent?: SecurityEventType;
  outcome?: ActivityOutcome;
  ip?: string;
  userAgent?: string;
  occurredAt?: Date;
}
