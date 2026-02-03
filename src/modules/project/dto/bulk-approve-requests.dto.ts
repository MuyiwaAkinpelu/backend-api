import { IsArray, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkApproveRequestsDTO {
    @ApiProperty({
        description: 'Array of approval request IDs to approve',
        example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        type: [String],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    requestIds: string[];
}
