import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitRequestDTO {
  @ApiProperty({
    description: 'The ID of the document to be submitted for approval',
    example: '6643717e74fc51dd7f57cdfa',
    type: String,
  })
  @IsMongoId()
  documentId: string;

  @ApiProperty({
    description:
      'The ID of the project for which the document is being submitted',
    example: '6643717e74fc51dd7f57cdfa',
    type: String,
  })
  @IsMongoId()
  projectId: string;
}
