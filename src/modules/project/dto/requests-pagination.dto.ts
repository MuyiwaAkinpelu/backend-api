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
import { DocumentFiltersDTO } from '../../files/dto/document-filter.dto';

export enum ApprovalRequestSortableColumns {
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class RequestsPaginationDTO {
  @ApiPropertyOptional({ enum: ApprovalRequestSortableColumns })
  @IsOptional()
  @IsEnum(ApprovalRequestSortableColumns)
  sortBy?: ApprovalRequestSortableColumns =
    ApprovalRequestSortableColumns.CREATED_AT;

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
