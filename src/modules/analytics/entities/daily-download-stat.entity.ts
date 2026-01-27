import { DailyDownloadStat } from '@prisma/client';

export default class DailyDownloadStatEntity implements DailyDownloadStat {
    readonly id!: string;
    readonly date!: Date;
    readonly downloads!: number;

    readonly createdAt!: Date;
    readonly updatedAt!: Date;
}
