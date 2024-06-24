import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from './project.repository';
import { Project, Prisma } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { PROJECT_NOT_FOUND } from '@constants/errors.constants';
import { ProjectFiltersDTO } from './dto/project-filters.dto';
import { ListProjectsDTO } from './dto/projects.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async findById(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException(PROJECT_NOT_FOUND);
    }
    return project;
  }

  async findOne(id: string): Promise<Project> {
    return this.projectRepository.findById(id);
  }

  async findAll(
    projectsDTO: ListProjectsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<Project>> {
    const { page, limit, sortBy, order, ...filters } = projectsDTO;

    const where: Prisma.ProjectWhereInput = this.buildWhereClause(filters);
    const include: Prisma.ProjectInclude = {
      managers: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      members: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.ProjectOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.projectRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.projectRepository.create(data);
  }

  async update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return this.projectRepository.updateProject(id, data);
  }

  async delete(id: string): Promise<Project> {
    return this.projectRepository.deleteProject(id);
  }

  async addMember(projectId: string, userId: string): Promise<Project> {
    const project = await this.findById(projectId);
    return this.projectRepository.updateProject(projectId, {
      members: {
        connect: { id: userId },
      },
    });
  }

  async removeMember(projectId: string, userId: string): Promise<Project> {
    const project = await this.findById(projectId);
    return this.projectRepository.updateProject(projectId, {
      members: {
        disconnect: { id: userId },
      },
    });
  }

  async addManager(projectId: string, userId: string): Promise<Project> {
    const project = await this.findById(projectId);
    return this.projectRepository.updateProject(projectId, {
      managers: {
        connect: { id: userId },
      },
    });
  }

  async removeManager(projectId: string, userId: string): Promise<Project> {
    const project = await this.findById(projectId);
    return this.projectRepository.updateProject(projectId, {
      managers: {
        disconnect: { id: userId },
      },
    });
  }

  private buildWhereClause(filters: ProjectFiltersDTO) {
    const where: Prisma.ProjectWhereInput = {};

    if (filters) {
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
      }
      if (filters.createdBy) {
        where.createdByUserId = filters.createdBy;
      }
      if (filters.createdAfter) {
        where.createdAt = { gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        where.createdAt = { lte: new Date(filters.createdBefore) };
      }
      if (filters.tags) {
        where.tags = { hasSome: filters.tags };
      }
      if (filters.description) {
        where.description = {
          contains: filters.description,
          mode: 'insensitive',
        };
      }
      if (filters.managedByIDs) {
        where.managersIDs = { hasSome: filters.managedByIDs };
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    return where;
  }
}
