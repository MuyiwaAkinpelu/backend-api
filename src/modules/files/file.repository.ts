import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { File, Prisma } from '@prisma/client';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';

@Injectable()
export class FileRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  async findById(id: string): Promise<File> {
    return this.prisma.file.findUnique({
      where: { id },
    });
  }

  async findOne(params: Prisma.FileFindFirstArgs): Promise<File | null> {
    return this.prisma.file.findFirst(params);
  }

  async create(data: Prisma.FileCreateInput): Promise<File> {
    return this.prisma.file.create({
      data,
    });
  }

  async findAll(
    where: Prisma.FileWhereInput,
    include: Prisma.FileInclude,
    orderBy?: Prisma.FileOrderByWithRelationInput,
    paginationOptions?: PaginatorTypes.PaginateOptions,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    const paginate = paginator(paginationOptions);
    return paginate(this.prisma.file, {
      where,
      orderBy,
      include,
    });
  }

  async updateFile(id: string, data: Prisma.FileUpdateInput): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data,
    });
  }

  async deleteFile(id: string): Promise<File> {
    return this.prisma.file.delete({
      where: { id },
    });
  }
}
