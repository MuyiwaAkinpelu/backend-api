import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisapproveDocumentDTO {
  @ApiProperty({
    description: 'Reason for disapproval',
    example: 'Inappropriate content',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  disapprovalReason?: string;
}
