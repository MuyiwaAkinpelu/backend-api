import { Order } from '@constants/order.constants';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum PaginationType {
  OFFSET = 'OFFSET',
  CURSOR = 'CURSOR',
}

export class BasePaginationDTO {
  @ApiPropertyOptional({
    enum: PaginationType,
    default: PaginationType.OFFSET,
    description: 'Pagination strategy',
  })
  @IsEnum(PaginationType)
  @IsOptional()
  type?: PaginationType = PaginationType.OFFSET;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Page number (for OFFSET pagination)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 200,
    default: 20,
    description: 'Items per page',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    description: 'The cursor for fetching the next set of results (for CURSOR pagination)',
  })
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({
    enum: Order,
    default: Order.DESC,
  })
  @IsEnum(Order)
  @IsOptional()
  order: Order = Order.DESC;

  getPaginationType(): PaginationType {
    if (this.cursor) return PaginationType.CURSOR;
    return this.type || PaginationType.OFFSET;
  }
}
