import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FileNamingDTO } from './file-naming.dto';

export class DocumentUploadDTO {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string' },
    default: [],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    type: 'array',
    items: { $ref: '#/components/schemas/FileNamingDTO' },
    description: 'Naming parts for each uploaded file, in the same order as the files',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileNamingDTO)
  namingDetails: FileNamingDTO[];
}
