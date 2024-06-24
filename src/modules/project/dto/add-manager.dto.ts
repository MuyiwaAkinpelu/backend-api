import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectCategory } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  ValidateNested,
  IsMongoId,
} from 'class-validator';

export class AddProjectManagerDTO {
  @ApiPropertyOptional({
    description: 'User IDs of the project managers',
    type: [String],
    example: ['60d21b4667d0d8992e610c87', '60d21b4667d0d8992e610c88'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  projectManagersIDs?: string[];
}
