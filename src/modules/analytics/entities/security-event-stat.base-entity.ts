import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SecurityEventType } from '@prisma/client';

@Exclude()
export default class SecurityEventStatBaseEntity {
  @ApiProperty({ enum: SecurityEventType })
  @Expose()
  readonly eventType!: SecurityEventType;

  @ApiProperty()
  @Expose()
  readonly count!: number;

  @ApiProperty()
  @Expose()
  readonly date!: Date;
}
