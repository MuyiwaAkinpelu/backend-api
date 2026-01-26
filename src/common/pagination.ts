import { Order } from "@constants/order.constants";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class BasePaginationDTO {
    @ApiPropertyOptional({
        minimum: 1,
        default: 1,
        description: 'Page number',
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
        enum: Order,
        default: Order.DESC,
    })
    @IsEnum(Order)
    @IsOptional()
    order: Order = Order.DESC;
}
