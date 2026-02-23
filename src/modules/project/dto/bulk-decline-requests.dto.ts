import {
  IsArray,
  ArrayMinSize,
  IsString,
  IsOptional,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeclineRequestsDTO {
  @ApiProperty({
    description: 'Array of approval request IDs to decline',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requestIds: string[];

  @ApiProperty({
    description: 'Reason for decline (applies to all requests)',
    example: 'Inappropriate content',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  disapprovalReason?: string;
}
