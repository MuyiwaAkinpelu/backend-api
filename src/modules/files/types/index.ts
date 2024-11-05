import { File, Roles } from '@prisma/client';

export interface SaveFileToDBParams {
  fileName: string;
  originalFilename: string;
  fileUrl: string;
  contentType: string;
  size: number;
  tags?: string[];
  uploaderId: string;
  userRoles: Roles[];
  projectId?: string;
}

export interface FileWithContent extends File {
  content?: string;
}
