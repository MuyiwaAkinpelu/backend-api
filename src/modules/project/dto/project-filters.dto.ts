import {
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectCategory } from '@prisma/client';

export class ProjectFiltersDTO {
  @ApiPropertyOptional({ enum: ProjectCategory })
  @IsOptional()
  @IsEnum(ProjectCategory)
  category?: ProjectCategory = ProjectCategory.SCIDAR;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter projects by name or part of it',
    required: false,
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter projects by creator user ID',
    required: false,
  })
  createdBy?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter projects created after this date (ISO 8601 format)',
    required: false,
  })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter projects created before this date (ISO 8601 format)',
    required: false,
  })
  createdBefore?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter projects by tags',
    required: false,
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter projects by description text',
    required: false,
  })
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter projects managed by specific user IDs',
    required: false,
    type: [String],
  })
  managedByIDs?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Search query to filter by project name or description',
    required: false,
  })
  search?: string;
}
