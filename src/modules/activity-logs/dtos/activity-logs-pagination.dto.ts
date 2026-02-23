import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ActivityLogSortableColumns } from '../types';
import { BasePaginationDTO } from 'src/common/pagination';

export class ActivityLogsPaginationDTO extends BasePaginationDTO {
  @ApiPropertyOptional({
    enum: ActivityLogSortableColumns,
    default: ActivityLogSortableColumns.OCCURRED_AT,
  })
  @IsEnum(ActivityLogSortableColumns)
  @IsOptional()
  sortBy: ActivityLogSortableColumns = ActivityLogSortableColumns.OCCURRED_AT;
}
