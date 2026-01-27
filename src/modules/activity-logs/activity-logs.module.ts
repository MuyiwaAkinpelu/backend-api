import { ActivityLogsService } from "./activity-logs.service";
import { Module } from "@nestjs/common";
import { ActivityLogRepository } from "./activity-logs.repository";
import { ActivityLogsController } from "./activity-logs.controller";
import { PrismaModule } from "@providers/prisma";

@Module({
    imports: [PrismaModule],
    controllers: [ActivityLogsController],
    providers: [ActivityLogsService, ActivityLogRepository],
    exports: [ActivityLogsService],
})
export class ActivityLogsModule { }