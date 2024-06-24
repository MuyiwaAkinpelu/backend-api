import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { Project, Prisma } from '@prisma/client';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { PrismaRepositoryClient } from '@providers/prisma/types';

@Injectable()
export class ProjectRepository {
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
  ): Promise<Project | null> {
    return transactionClient.project.findUnique({
      where: { id },
    });
  }

  async findOne(
    params: Prisma.ProjectFindFirstArgs,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<Project | null> {
    return transactionClient.project.findFirst(params);
  }

  async create(
    data: Prisma.ProjectCreateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<Project> {
    return transactionClient.project.create({
      data,
    });
  }

  async findAll(
    where: Prisma.ProjectWhereInput,
    include: Prisma.ProjectInclude,
    orderBy?: Prisma.ProjectOrderByWithRelationInput,
    paginationOptions?: PaginatorTypes.PaginateOptions,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<PaginatorTypes.PaginatedResult<Project>> {
    const paginate = paginator(paginationOptions);
    return paginate(transactionClient.project, {
      where,
      orderBy,
      include,
    });
  }

  async isUserPartOfProject(
    projectId: string,
    userId: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<boolean> {
    const project = await transactionClient.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { members: { some: { id: userId } } },
          { managers: { some: { id: userId } } },
        ],
      },
    });
    return !!project;
  }

  async isUserManagerOfProject(
    projectId: string,
    userId: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<boolean> {
    const project = await transactionClient.project.findFirst({
      where: {
        id: projectId,
        managers: { some: { id: userId } },
      },
    });
    return !!project;
  }

  async addDocumentToProject(
    projectId: string,
    documentId: string,
    transactionClient?: Prisma.TransactionClient,
  ): Promise<void> {
    await (transactionClient ?? this.prisma).project.update({
      where: { id: projectId },
      data: {
        documents: {
          connect: { id: documentId },
        },
      },
    });
  }

  async updateProject(
    id: string,
    data: Prisma.ProjectUpdateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<Project> {
    return transactionClient.project.update({
      where: { id },
      data,
    });
  }

  async deleteProject(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<Project> {
    return transactionClient.project.delete({
      where: { id },
    });
  }
}
