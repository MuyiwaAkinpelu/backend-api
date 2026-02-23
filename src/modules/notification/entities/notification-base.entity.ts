import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { Expose } from 'class-transformer';

export default class NotificationBaseEntity {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  userId!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  message!: string;

  @ApiProperty({ enum: NotificationType })
  @Expose()
  type!: NotificationType;

  @ApiProperty()
  @Expose()
  read!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}
