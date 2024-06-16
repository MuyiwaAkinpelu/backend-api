import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
