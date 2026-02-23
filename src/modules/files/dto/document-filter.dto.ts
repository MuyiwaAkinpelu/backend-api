import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsDateString,
  ArrayNotEmpty,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalStatus,
  DocumentVisibility,
  ProjectCategory,
} from '@prisma/client';

export class DocumentFiltersDTO {
  @IsOptional()
  @IsEnum(ProjectCategory)
  @ApiPropertyOptional({
    description: 'Filter files by project category',
    enum: ProjectCategory,
  })
  projectCategory?: ProjectCategory;

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
  visibility?: DocumentVisibility;

  @ApiPropertyOptional({
    description: 'Filter files by approval status',
    enum: ApprovalStatus,
  })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Filter files by size (greater than or equal)',
    required: false,
  })
  sizeMin?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Filter files by size (less than or equal)',
    required: false,
  })
  sizeMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter files by type (e.g., image, document)',
    required: false,
    type: [String],
  })
  @ValidateIf((obj) => obj.fileType !== undefined)
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    return value;
  })
  fileType?: string[];

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
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter files by MIME type',
    required: false,
    type: [String],
  })
  @ValidateIf((obj) => obj.contentType !== undefined)
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    return value;
  })
  contentType?: string[];

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

  @ValidateIf((obj) => obj.sharedWithIDs && obj.sharedWithIDs.length > 0)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter files shared with specific user IDs',
    required: false,
    type: [String],
  })
  sharedWithIDs?: string[];

  @ValidateIf((obj) => obj.projectIDs && obj.projectIDs.length > 0)
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter files approved in specific project IDs',
    required: false,
    type: [String],
  })
  projectIDs?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Search query to filter by filename or uploader name',
    required: false,
  })
  search?: string;
}
