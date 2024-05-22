import { ApiProperty } from '@nestjs/swagger';

export class DocumentSearchDTO {
  @ApiProperty({
    description: 'Search query',
  })
  readonly q: string;
}
