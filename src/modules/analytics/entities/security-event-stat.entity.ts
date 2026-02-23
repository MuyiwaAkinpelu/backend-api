import {
  ActivityOutcome,
  SecurityEventStat,
  SecurityEventType,
} from '@prisma/client';

export default class SecurityEventStatEntity implements SecurityEventStat {
  readonly id!: string;
  readonly occurredAt!: Date;
  readonly eventType!: SecurityEventType;
  readonly count!: number;
  readonly outcome!: ActivityOutcome;
  readonly createdAt!: Date;
}
