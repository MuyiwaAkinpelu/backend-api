import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { DocumentFiltersDTO } from './document-filter.dto';
import { ApprovalStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

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
}
