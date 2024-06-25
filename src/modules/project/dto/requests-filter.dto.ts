import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus } from '@prisma/client';

export class RequestsFiltersDTO {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filter approval requests by the ID of the user who submitted them',
    required: false,
  })
  submittedById?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filter approval requests by the ID of the user who approved them',
    required: false,
  })
  approvedById?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filter approval requests by the ID of the user who disapproved them',
    required: false,
  })
  disapprovedById?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filter approval requests by the ID of the project they are associated with',
    required: false,
  })
  projectId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filter approval requests by the ID of the document they are associated with',
    required: false,
  })
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Filter approval requests by their approval status',
    enum: ApprovalStatus,
  })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus = ApprovalStatus.APPROVED;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description:
      'Filter approval requests created after this date (ISO 8601 format)',
    required: false,
  })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description:
      'Filter approval requests created before this date (ISO 8601 format)',
    required: false,
  })
  createdBefore?: string;
}
