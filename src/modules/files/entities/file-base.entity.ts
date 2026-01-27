import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { FileEntity } from './file.entity';
import ApprovalRequestBaseEntity from '@modules/project/entities/approval-request-base.entity';
import ProjectBaseEntity from '@modules/project/entities/project-base.entity';
import UserBaseEntity from '@modules/user/entities/user-base.entity';

// Local UserEntity and UserBaseEntity removed in favor of imported module entities

@Exclude()
export class FileBaseEntity extends PartialType(FileEntity) {
  @ApiProperty({ type: String })
  @Expose()
  readonly id!: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly filename!: string | null;

  @ApiProperty({ type: String })
  @Expose()
  readonly path!: string;

  @ApiProperty({ type: UserBaseEntity })
  @Expose()
  @Type(() => UserBaseEntity)
  readonly uploader!: UserBaseEntity;

  @ApiProperty({ type: String })
  @Expose()
  readonly uploaderId!: string;

  @ApiProperty({ type: Boolean })
  @Expose()
  readonly isApproved!: boolean;

  @ApiProperty({ type: Boolean })
  @Expose()
  get isDraft(): boolean {
    return !this.approvalRequests || this.approvalRequests.length === 0;
  }

  @ApiProperty({ type: Boolean })
  @Expose()
  readonly isPublic!: boolean;

  @ApiProperty({ type: Number })
  @Expose()
  readonly size!: number;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly fileType!: string | null;

  @ApiProperty({ type: Date })
  @Expose()
  readonly uploadDate!: Date;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly description!: string | null;

  @ApiProperty({ type: [String] })
  @Expose()
  readonly tags!: string[];

  @ApiProperty({ type: String })
  @Expose()
  readonly originalFilename!: string;

  @ApiProperty({ type: String })
  @Expose()
  readonly contentType!: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly disapprovalReason!: string | null;

  @ApiProperty({ type: [String] })
  @Expose()
  readonly sharedWithIDs!: string[];

  @ApiProperty({ type: [UserBaseEntity] })
  @Expose()
  @Type(() => UserBaseEntity)
  readonly sharedWith!: UserBaseEntity[];

  @ApiProperty({ type: String })
  @Expose()
  readonly visibility!: string;

  @ApiProperty({ type: Number })
  @Expose()
  readonly downloads!: number;

  @ApiProperty({ type: [ApprovalRequestBaseEntity] })
  @Expose()
  @Type(() => ApprovalRequestBaseEntity)
  readonly approvalRequests!: ApprovalRequestBaseEntity[];

  @ApiProperty({ type: [ProjectBaseEntity] })
  @Expose()
  @Type(() => ProjectBaseEntity)
  readonly projects!: ProjectBaseEntity[];

  @ApiProperty({ type: Number })
  @Expose()
  readonly views!: number;

  @ApiProperty({ type: [String] })
  @Expose()
  readonly filenameKeywords!: string[] | null;
}
