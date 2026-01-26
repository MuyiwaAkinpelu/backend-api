import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, ActivityLog } from '@prisma/client';
import { PrismaRepositoryClient } from '@providers/prisma/types';
import { ActivityLogWithUser } from './types';

@Injectable()
export class ActivityLogRepository {
    private readonly paginate: PaginatorTypes.PaginateFunction;

    constructor(private prisma: PrismaService) {
        this.paginate = paginator({ page: 1, perPage: 10 });
    }

    async create(
        data: Prisma.ActivityLogCreateInput,
        transactionClient: PrismaRepositoryClient = this.prisma,
    ): Promise<ActivityLog> {
        return transactionClient.activityLog.create({ data });
    }

    async findAll(
        where: Prisma.ActivityLogWhereInput,
        include: Prisma.ActivityLogInclude = { user: true },
        orderBy?: Prisma.ActivityLogOrderByWithRelationInput,
        paginationOptions?: PaginatorTypes.PaginateOptions,
        transactionClient: PrismaRepositoryClient = this.prisma,
    ): Promise<PaginatorTypes.PaginatedResult<ActivityLogWithUser>> {
        const paginate = paginator(paginationOptions);
        return paginate(transactionClient.activityLog, {
            where,
            include,
            orderBy,
        });
    }
}   