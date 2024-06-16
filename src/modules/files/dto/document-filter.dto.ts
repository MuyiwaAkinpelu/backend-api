import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsDateString,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentApprovalStatus, DocumentVisibility } from '@prisma/client';

export class DocumentFiltersDTO {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter files by filename or part of it',
    required: false,
  })
  filename?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter files by uploader user ID',
    required: false,
  })
  uploaderId?: string;

  @ApiPropertyOptional({
    description: 'Filter files by public visibility',
    enum: DocumentVisibility,
  })
  @IsOptional()
  @IsEnum(DocumentVisibility)
  visibility?: DocumentVisibility = DocumentVisibility.PRIVATE;

  @ApiPropertyOptional({
    description: 'Filter files by approval status',
    enum: DocumentApprovalStatus,
  })
  @IsOptional()
  @IsEnum(DocumentApprovalStatus)
  approvalStatus?: DocumentApprovalStatus = DocumentApprovalStatus.APPROVED;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({
    description: 'Filter files by size (greater than or equal)',
    required: false,
  })
  sizeMin?: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({
    description: 'Filter files by size (less than or equal)',
    required: false,
  })
  sizeMax?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter files by type (e.g., image, document)',
    required: false,
  })
  fileType?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter files uploaded after this date (ISO 8601 format)',
    required: false,
  })
  uploadedAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter files uploaded before this date (ISO 8601 format)',
    required: false,
  })
  uploadedBefore?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter files by tags',
    required: false,
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter files by MIME type',
    required: false,
  })
  contentType?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter files by description text',
    required: false,
  })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter files by original filename',
    required: false,
  })
  originalFilename?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter files shared with specific user IDs',
    required: false,
    type: [String],
  })
  sharedWithIDs?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Search query to filter by filename or uploader name',
    required: false,
  })
  search?: string;
}
