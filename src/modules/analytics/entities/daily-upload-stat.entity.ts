import { DailyUploadStat } from '@prisma/client';

export default class DailyUploadStatEntity implements DailyUploadStat {
  readonly id!: string;
  readonly date!: Date;
  readonly uploads!: number;
  readonly totalSize!: number;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}