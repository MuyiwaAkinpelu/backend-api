export interface SaveFileToDBParams {
  fileName: string;
  originalFilename: string;
  fileUrl: string;
  contentType: string;
  size: number;
  tags?: string[];
  uploaderId: string;
}
