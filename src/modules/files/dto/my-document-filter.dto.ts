import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { DocumentFiltersDTO } from './document-filter.dto';
import { ApprovalStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class MyDocumentFiltersDTO extends OmitType(DocumentFiltersDTO, [
  'uploaderId',
  'approvalStatus',
] as const) {
  @ApiPropertyOptional({
    description: 'Filter files by approval status',
    enum: ApprovalStatus,
  })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({
    description: 'Filter files that are drafts (no approval requests)',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDraft?: boolean;
}
