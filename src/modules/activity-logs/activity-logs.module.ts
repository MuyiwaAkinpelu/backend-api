import { ActivityLogsService } from "./activity-logs.service";
import { Module } from "@nestjs/common";
import { ActivityLogRepository } from "./activity-logs.repository";
import { ActivityLogsController } from "./activity-logs.controller";
import { PrismaModule } from "@providers/prisma";
import { CaslModule } from "@modules/casl";
import { permissions } from "./activity-logs.permissions";

@Module({
    imports: [CaslModule.forFeature({ permissions }), PrismaModule],
    controllers: [ActivityLogsController],
    providers: [ActivityLogsService, ActivityLogRepository],
    exports: [ActivityLogsService],
})
export class ActivityLogsModule { }