import { ApiProperty } from '@nestjs/swagger';

export class DailyDownloadStatBaseEntity {
  @ApiProperty()
  readonly id!: string;

  @ApiProperty()
  readonly date!: Date;

  @ApiProperty()
  readonly downloads!: number;

  @ApiProperty()
  readonly createdAt!: Date;

  @ApiProperty()
  readonly updatedAt!: Date;
}
