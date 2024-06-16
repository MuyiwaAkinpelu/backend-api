import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class DocumentSearchDTO {
  @ApiProperty({
    description: 'Search query',
  })
  @IsNotEmpty()
  readonly q: string;
}
