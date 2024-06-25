import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeclineRequestDTO {
  @ApiProperty({
    description: 'Reason for decline',
    example: 'Inappropriate content',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  disapprovalReason?: string;
}
