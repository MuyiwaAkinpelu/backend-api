import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ApprovalStatus } from '@prisma/client';
import ApprovalRequestEntity from './approval-request.entity';

@Exclude()
export default class ApprovalRequestBaseEntity extends PartialType(
  ApprovalRequestEntity,
) {
  @ApiProperty({ type: String })
  @Expose()
  readonly id: string;

  @ApiProperty({ type: String })
  @Expose()
  readonly documentId: string;

  @ApiProperty({ type: String })
  @Expose()
  readonly projectId: string;

  @ApiProperty({ type: String })
  @Expose()
  readonly submittedById: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly approvedById: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly disapprovedById: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly disapprovalReason: string | null;

  @ApiProperty({ enum: ApprovalStatus })
  @Expose()
  readonly status: ApprovalStatus;

  @ApiProperty({ type: Date })
  @Expose()
  readonly createdAt: Date;

  @ApiProperty({ type: Date })
  @Expose()
  readonly updatedAt: Date;
}
