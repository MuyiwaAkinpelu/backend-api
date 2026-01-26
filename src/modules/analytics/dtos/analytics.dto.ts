import { TrendPeriod } from '../constants/analytics.enums';
import { ActivityTimeframe } from '../constants/analytics.enums';

export class UploadTrendsDTO {
    period: TrendPeriod;
    from?: Date;
    to?: Date;
}


export class UserActivityDTO {
    timeframe: ActivityTimeframe;
}
