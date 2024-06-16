import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { FileEntity } from './file.entity';

export class UserEntity {
  readonly id!: string;
  readonly firstName!: string | null;
  readonly lastName!: string | null;
  readonly avatar!: string | null;
}

@Exclude()
export class UserBaseEntity extends PartialType(UserEntity) {
  @ApiProperty({ type: String })
  @Expose()
  readonly id!: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly firstName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly lastName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly avatar!: string | null;
}

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
  readonly uploader!: UserBaseEntity;

  @ApiProperty({ type: String })
  @Expose()
  readonly uploaderId!: string;

  @ApiProperty({ type: Boolean })
  @Expose()
  readonly isApproved!: boolean;

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
  readonly sharedWith!: UserBaseEntity[];
}
