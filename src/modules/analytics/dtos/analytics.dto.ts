import { TrendPeriod, ActivityTimeframe } from '../constants/analytics.enums';
import { IsEnum, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadTrendsDTO {
    @IsEnum(TrendPeriod)
    period: TrendPeriod;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    from?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    to?: Date;
}

export class UserActivityDTO {
    @IsEnum(ActivityTimeframe)
    timeframe: ActivityTimeframe;
}
