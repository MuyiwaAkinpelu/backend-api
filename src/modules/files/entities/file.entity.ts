import { UserBaseEntity } from './file-base.entity';

export class FileEntity {
  readonly id!: string;
  readonly filename!: string | null;
  readonly path!: string;
  readonly uploaderId!: string;
  readonly uploader!: UserBaseEntity;
  readonly isApproved!: boolean;
  readonly isPublic!: boolean;
  readonly size!: number;
  readonly fileType!: string | null;
  readonly uploadDate!: Date;
  readonly description!: string | null;
  readonly tags!: string[];
  readonly originalFilename!: string;
  readonly contentType!: string;
  readonly disapprovalReason!: string | null;
  readonly sharedWithIDs!: string[];
  readonly sharedWith!: UserBaseEntity[];
}
