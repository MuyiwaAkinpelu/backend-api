import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  IsDateString,
} from 'class-validator';
import { BodyOfWork, ProjectCategory, Status } from '@prisma/client';

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

  @ApiPropertyOptional({
    description: 'The status of the project',
    enum: Status,
    example: Status.ACTIVE,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiProperty({
    description: 'The body of work the project belongs to',
    enum: BodyOfWork,
    example: BodyOfWork.PRIMARY_HEALTH_CARE,
  })
  @IsOptional()
  @IsEnum(BodyOfWork)
  bodyOfWork?: BodyOfWork;

  @ApiProperty({
    description: 'The date the project was established/created',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDateString()
  establishedDate: string;
}
