import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export default class ProjectDocumentStatBaseEntity {
  @ApiProperty()
  @Expose()
  readonly documentCount!: number;

  @ApiProperty()
  @Expose()
  readonly totalUploads!: number;

  @ApiProperty()
  @Expose()
  readonly totalViews!: number;

  @ApiProperty()
  @Expose()
  readonly totalDownloads!: number;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly lastActivity!: Date | null;
}