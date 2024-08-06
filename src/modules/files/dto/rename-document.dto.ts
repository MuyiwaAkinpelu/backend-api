import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenameDocumentDto {
  @ApiProperty({ description: 'The new name for the document' })
  @IsString()
  @MinLength(1)
  originalFilename: string;
}
