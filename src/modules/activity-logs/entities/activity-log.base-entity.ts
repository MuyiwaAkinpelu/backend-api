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

  @ApiProperty({ nullable: true })
  @Expose()
  readonly actorId!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly actorName!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly actorEmail!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly outcome!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly occurredAt!: Date | null;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly securityEvent?: boolean;

  @ApiProperty()
  @Expose()
  readonly description!: string;

  @ApiProperty()
  @Expose()
  readonly createdAt!: Date;
}
