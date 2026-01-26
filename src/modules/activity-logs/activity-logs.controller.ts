import {
    Controller,
    Get,
    Param,
    Query,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityEntity } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { ActivityLogsDTO } from './dtos/activity-logs.dto';
import ActivityLogBaseEntity from './entities/activity-log.base-entity';

@ApiTags('Activity Logs')
@Controller('activity-logs')
export class ActivityLogsController {
    constructor(
        private readonly activityLogsService: ActivityLogsService,
    ) { }

    /**
     * 🔹 Get all activity logs (Admin / Audit view)
     */
    @Get()
    @ApiOperation({ summary: 'Get all activity logs' })
    @ApiOkResponse({ type: [ActivityLogBaseEntity] })
    async findAll(
        @Query() query: ActivityLogsDTO,
    ): Promise<PaginatorTypes.PaginatedResult<ActivityLogBaseEntity>> {
        return this.activityLogsService.findAll(query);
    }

    /**
     * 🔹 Get activity logs for a specific user
     */
    @Get('user/:userId')
    @ApiOperation({ summary: 'Get activity logs for a user' })
    async findForUser(
        @Param('userId', new ParseUUIDPipe()) userId: string,
        @Query('limit') limit?: number,
        @Query('cursor') cursor?: string,
    ) {
        return this.activityLogsService.findForUser({
            userId,
            limit,
            cursor,
        });
    }

    /**
     * 🔹 Get activity logs for a specific entity (project, file, approval, etc.)
     */
    @Get('entity/:entity/:entityId')
    @ApiOperation({ summary: 'Get activity logs for an entity' })
    async findForEntity(
        @Param('entity') entity: ActivityEntity,
        @Param('entityId') entityId: string,
        @Query('limit') limit?: number,
    ) {
        return this.activityLogsService.findForEntity({
            entity,
            entityId,
            limit,
        });
    }
}
