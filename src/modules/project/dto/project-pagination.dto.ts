import { Order } from '@constants/order.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProjectFiltersDTO } from './project-filters.dto';
import { ProjectSortableColumns } from '../types';

export class ProjectsPaginationDTO {
  @ApiPropertyOptional({ enum: ProjectSortableColumns })
  @IsOptional()
  @IsEnum(ProjectSortableColumns)
  sortBy?: ProjectSortableColumns = ProjectSortableColumns.CREATED_AT;

  @ApiPropertyOptional({ enum: Order, default: Order.ASC })
  @IsEnum(Order)
  @IsOptional()
  readonly order?: Order = Order.ASC;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Page number',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    default: 10,
    description: 'Items per page',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly limit?: number = 10;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
