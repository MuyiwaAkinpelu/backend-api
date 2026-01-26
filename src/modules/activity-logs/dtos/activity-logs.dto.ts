import { IntersectionType } from "@nestjs/swagger";
import { ActivityLogsPaginationDTO } from "./activity-logs-pagination.dto";
import { ActivityLogsFiltersDTO } from "./activity-logs-filter.dto";

export class ActivityLogsDTO extends IntersectionType(
    ActivityLogsPaginationDTO,
    ActivityLogsFiltersDTO,
) { }