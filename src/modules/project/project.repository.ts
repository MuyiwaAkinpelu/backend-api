import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { Project, Prisma } from '@prisma/client';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';

@Injectable()
export class ProjectRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
    });
  }

  async findOne(params: Prisma.ProjectFindFirstArgs): Promise<Project | null> {
    return this.prisma.project.findFirst(params);
  }

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({
      data,
    });
  }

  async findAll(
    where: Prisma.ProjectWhereInput,
    include: Prisma.ProjectInclude,
    orderBy?: Prisma.ProjectOrderByWithRelationInput,
    paginationOptions?: PaginatorTypes.PaginateOptions,
  ): Promise<PaginatorTypes.PaginatedResult<Project>> {
    const paginate = paginator(paginationOptions);
    return paginate(this.prisma.project, {
      where,
      orderBy,
      include,
    });
  }

  async updateProject(
    id: string,
    data: Prisma.ProjectUpdateInput,
  ): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async deleteProject(id: string): Promise<Project> {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}
