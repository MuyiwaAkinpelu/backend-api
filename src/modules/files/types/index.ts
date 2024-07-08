import { File } from '@prisma/client';

export interface SaveFileToDBParams {
  fileName: string;
  originalFilename: string;
  fileUrl: string;
  contentType: string;
  size: number;
  tags?: string[];
  uploaderId: string;
}

export interface FileWithContent extends File {
  content?: string;
}
