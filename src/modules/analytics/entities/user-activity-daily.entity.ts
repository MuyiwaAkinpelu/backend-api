import { UserActivityDaily } from '@prisma/client';

export default class UserActivityDailyEntity implements UserActivityDaily {
  readonly id!: string;
  readonly date!: Date;
  readonly userId!: string;
  readonly actions!: number;
  readonly lastAction!: Date;
  readonly createdAt!: Date;
}
