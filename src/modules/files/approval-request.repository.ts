import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { ApprovalRequest, Prisma } from '@prisma/client';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { PrismaRepositoryClient } from '@providers/prisma/types';

@Injectable()
export class ApprovalRequestRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  async findById(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<ApprovalRequest> {
    return transactionClient.approvalRequest.findUnique({
      where: { id },
    });
  }

  async findOne(
    params: Prisma.ApprovalRequestFindFirstArgs,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<ApprovalRequest | null> {
    return transactionClient.approvalRequest.findFirst(params);
  }

  async create(
    data: Prisma.ApprovalRequestCreateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<ApprovalRequest> {
    return transactionClient.approvalRequest.create({
      data,
    });
  }

  async findAll(
    where: Prisma.ApprovalRequestWhereInput,
    include: Prisma.ApprovalRequestInclude,
    orderBy?: Prisma.ApprovalRequestOrderByWithRelationInput,
    paginationOptions?: PaginatorTypes.PaginateOptions,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<PaginatorTypes.PaginatedResult<ApprovalRequest>> {
    const paginate = paginator(paginationOptions);
    return paginate(transactionClient.approvalRequest, {
      where,
      orderBy,
      include,
    });
  }

  async update(
    id: string,
    data: Prisma.ApprovalRequestUpdateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<ApprovalRequest> {
    return transactionClient.approvalRequest.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<ApprovalRequest> {
    return transactionClient.approvalRequest.delete({
      where: { id },
    });
  }
}
