import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export default class DailyUploadStatBaseEntity {
  @ApiProperty()
  @Expose()
  readonly date!: Date;

  @ApiProperty()
  @Expose()
  readonly uploads!: number;

  @ApiProperty()
  @Expose()
  readonly totalSize!: number;
}
