import { ProjectDocumentStat } from '@prisma/client';

export default class ProjectDocumentStatEntity implements ProjectDocumentStat {
  readonly id!: string;
  readonly projectId!: string;

  readonly documentCount!: number;
  readonly totalUploads!: number;
  readonly totalViews!: number;
  readonly totalDownloads!: number;

  readonly lastActivity!: Date | null;
  readonly updatedAt!: Date;
}
