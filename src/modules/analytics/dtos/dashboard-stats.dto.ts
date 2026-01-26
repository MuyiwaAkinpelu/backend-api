export class DashboardStatsDTO {
    projectId?: string;
}

export interface StatMetric {
    current: number;
    change?: string;
    isPositive?: boolean;
}
