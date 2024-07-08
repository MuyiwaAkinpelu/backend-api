import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  AWS_S3_BUCKET,
  AWS_S3_REGION,
  AWS_S3_ENDPOINT,
} from '@constants/env.constants';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@providers/prisma';
import { SaveFileToDBParams } from './types';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as officeParser from 'officeparser';

@Injectable()
export class UploadService {
  s3Client: S3Client;
  bucketUrl: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow(AWS_S3_REGION),
    });
    this.bucketUrl =
      this.configService.get(AWS_S3_ENDPOINT) ||
      this.configService.get(AWS_S3_BUCKET)
        ? `https://${this.configService.get(AWS_S3_BUCKET)}.s3.amazonaws.com`
        : 'https://scidar-drs-uploads.s3.amazonaws.com';
  }

  async upload(file: Express.Multer.File, tags: string[], uploaderId: string) {
    try {
      // create custom name for the file
      const uniqueSuffix = `${uuidv4()}-${Date.now()}`;
      console.log(file.originalname);
      const extension = path.extname(file.originalname);
      const customFileName = `${uniqueSuffix}${extension}`;

      const parallelUploads3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: 'scidar-drs-uploads',
          Key: customFileName,
          Body: file.buffer,
          ACL: 'public-read',
          ContentType: file.mimetype,
          ContentDisposition: 'inline',
        },

        tags: [
          /*...*/
        ], // optional tags
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
      });

      parallelUploads3.on('httpUploadProgress', (progress) => {
        console.log(progress);
      });

      await parallelUploads3.done();

      // Generate the URL for accessing the uploaded file
      const fileUrl = `${this.bucketUrl}/${customFileName}`;

      // Save file details to the database
      const savedFile = await this.saveFileToDatabase({
        fileName: customFileName,
        originalFilename: file.originalname,
        fileUrl,
        contentType: file.mimetype,
        size: file.size,
        tags,
        uploaderId,
      });

      // Return the details of the uploaded file
      return savedFile;
    } catch (e) {
      console.log(e);
    }
  }

  async saveFileToDatabase({
    fileName,
    originalFilename,
    fileUrl,
    contentType,
    size,
    tags,
    uploaderId,
  }: SaveFileToDBParams) {
    // Save file details to the database using Prisma
    const savedFile = await this.prisma.file.create({
      data: {
        filename: fileName,
        originalFilename,
        path: fileUrl,
        uploader: {
          connect: {
            id: uploaderId,
          },
        },
        contentType,
        size,
        tags,
      },
    });

    return savedFile;
  }

  async extractTextFromFile(
    filePath: string,
    contentType: string,
  ): Promise<string> {
    const fileBuffer = await this.getFileBuffer(filePath);

    if (
      [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.presentation',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/pdf',
      ].includes(contentType)
    ) {
      return new Promise((resolve, reject) => {
        officeParser
          .parseOfficeAsync(fileBuffer)
          .then((data) => resolve(data))
          .catch((err) => reject(err));
      });
    } else if (contentType === 'text/plain') {
      return fileBuffer.toString('utf-8');
    }
    return '';
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    const getObjectCommand = new GetObjectCommand({
      Bucket: this.configService.getOrThrow(AWS_S3_BUCKET),
      Key: filePath,
    });

    const response = await this.s3Client.send(getObjectCommand);
    const str = await response.Body.transformToByteArray();
    return Buffer.from(str);
  }
}
