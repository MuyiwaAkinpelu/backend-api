import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayNotEmpty,
} from 'class-validator';
import { ProjectCategory } from '../types';

export class CreateProjectDTO {
  @ApiProperty({
    description: 'The name of the project',
    example: 'Project Alpha',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the project',
    example: 'This project is about...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The category of the project',
    enum: ProjectCategory,
    example: ProjectCategory.SCIDAR,
  })
  @IsEnum(ProjectCategory)
  category: ProjectCategory;

  @ApiPropertyOptional({
    description: 'Tags or keywords associated with the project',
    type: [String],
    example: ['health', 'science'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'User IDs of the project members',
    type: [String],
    example: ['60d21b4667d0d8992e610c85', '60d21b4667d0d8992e610c86'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  projectMembersIDs?: string[];

  @ApiPropertyOptional({
    description: 'User IDs of the project managers',
    type: [String],
    example: ['60d21b4667d0d8992e610c87', '60d21b4667d0d8992e610c88'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  projectManagersIDs?: string[];
}
