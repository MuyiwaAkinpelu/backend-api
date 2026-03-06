import { Injectable } from '@nestjs/common';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginationType, BasePaginationDTO } from './pagination';

@Injectable()
export class PaginationService {
    /**
     * Dynamically paginates a Prisma model based on the provided DTO.
     */
    async paginate<T, K>(
        model: any,
        queryArgs: any,
        paginationDTO: BasePaginationDTO,
        options?: {
            cursorField?: string;
        },
    ) {
        const type = paginationDTO.getPaginationType();

        if (type === PaginationType.CURSOR) {
            return this.paginateWithCursor<T>(model, queryArgs, paginationDTO, options?.cursorField || 'id');
        }

        return this.paginateWithOffset<T>(model, queryArgs, paginationDTO);
    }

    private async paginateWithOffset<T>(model: any, queryArgs: any, paginationDTO: BasePaginationDTO) {
        const paginate = paginator({
            page: paginationDTO.page,
            perPage: paginationDTO.limit,
        });

        return paginate(model, queryArgs);
    }

    private async paginateWithCursor<T>(
        model: any,
        queryArgs: any,
        paginationDTO: BasePaginationDTO,
        cursorField: string,
    ) {
        const { cursor, limit, order } = paginationDTO;

        const take = limit;
        const skip = cursor ? 1 : 0;
        const cursorObj = cursor ? { [cursorField]: cursor } : undefined;

        const items = await model.findMany({
            ...queryArgs,
            take: take + 1, // Fetch one extra to check if there's a next page
            skip,
            cursor: cursorObj,
        });

        const hasNextPage = items.length > take;
        const results = hasNextPage ? items.slice(0, take) : items;
        const nextCursor = hasNextPage ? results[results.length - 1][cursorField] : null;

        return {
            data: results,
            meta: {
                nextCursor,
                hasNextPage,
                limit,
            },
        };
    }
}
