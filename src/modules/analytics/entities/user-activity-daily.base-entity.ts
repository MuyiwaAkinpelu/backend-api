import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export default class UserActivityDailyBaseEntity {
  @ApiProperty()
  @Expose()
  readonly date!: Date;

  @ApiProperty()
  @Expose()
  readonly actions!: number;

  @ApiProperty()
  @Expose()
  readonly lastAction!: Date;
}
