import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityVerb, ActivityEntity } from '@prisma/client';

@Exclude()
export default class ActivityLogBaseEntity {
  @ApiProperty()
  @Expose()
  readonly id!: string;

  @ApiProperty({ enum: ActivityVerb })
  @Expose()
  readonly verb!: ActivityVerb;

  @ApiProperty({ enum: ActivityEntity })
  @Expose()
  readonly entity!: ActivityEntity;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly entityId!: string | null;

  @ApiProperty()
  @Expose()
  readonly description!: string;

  @ApiProperty()
  @Expose()
  readonly createdAt!: Date;
}
