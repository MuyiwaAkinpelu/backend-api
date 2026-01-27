import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from './project.repository';
import { Project, Prisma, User, ActivityEntity, ActivityVerb, Status, ActivityOutcome, SecurityEventType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityLogEvent } from '@modules/activity-logs/constants';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { PROJECT_NOT_FOUND } from '@constants/errors.constants';
import { ProjectFiltersDTO } from './dto/project-filters.dto';
import { ListProjectsDTO } from './dto/projects.dto';
import { CreateProjectDTO } from './dto/create-project.dto';
import { UpdateProjectDTO } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async findById(id: string): Promise<Omit<Project, 'documentsIDs' | 'managersIDs' | 'membersIDs'> & { documentCount: number }> {
    const project = await this.projectRepository.findById(id,
      {
        managers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            department: true,
            roles: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            department: true,
            roles: true,
          },
        },
      }
    );
    if (!project) {
      throw new NotFoundException(PROJECT_NOT_FOUND);
    }

    const { documentsIDs, managersIDs, membersIDs, ...projectWithoutDocIds } = project as any;
    const documentCount = documentsIDs.length;
    return { ...projectWithoutDocIds, documentCount };
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

  async create(data: CreateProjectDTO): Promise<Project> {
    const { projectManagersIDs, projectMembersIDs, ...rest } = data;

    const projectData: Prisma.ProjectCreateInput = {
      ...rest,
      managers: {
        connect:
          projectManagersIDs?.map((managerId) => ({
            id: managerId,
          })) || [],
      },
      members: {
        connect:
          projectMembersIDs?.map((memberId) => ({
            id: memberId,
          })) || [],
      },
    };

    return this.projectRepository.create(projectData);
  }

  async update(id: string, data: UpdateProjectDTO, performedBy: string): Promise<Project> {
    const { projectManagersIDs, projectMembersIDs, ...rest } = data;

    const projectData: Prisma.ProjectUpdateInput = {
      ...rest,
      ...(projectManagersIDs && {
        managers: {
          set: projectManagersIDs.map((managerId) => ({
            id: managerId,
          })),
        },
      }),
      ...(projectMembersIDs && {
        members: {
          set: projectMembersIDs.map((memberId) => ({
            id: memberId,
          })),
        },
      }),
    };

    const updatedProject = await this.projectRepository.updateProject(id, projectData);

    if (data.status === Status.INACTIVE) {
      this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
        userId: performedBy,
        verb: ActivityVerb.UPDATE,
        entity: ActivityEntity.PROJECT,
        entityId: id,
        outcome: ActivityOutcome.SUCCESS,
        securityEvent: null,
        metadata: {
          projectName: updatedProject.name,
          action: 'DEACTIVATED',
        },
        occurredAt: new Date(),
      });
    }

    return updatedProject;
  }

  async delete(id: string, performedBy: string): Promise<Project> {
    const project = await this.findById(id);

    // Clean up references in User documents
    // We update all users who have this project ID in their arrays
    await this.projectRepository.removeProjectFromUsers(id);

    const deletedProject = await this.projectRepository.deleteProject(id);

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.DELETE,
      entity: ActivityEntity.PROJECT,
      entityId: id,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.PROJECT_DELETED,
      metadata: {
        projectName: project.name,
      },
      occurredAt: new Date(),
    });

    return deletedProject;
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

  async getMyProjects(
    user: User,
    projectsDTO: ListProjectsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<Project>> {
    const { page, limit, sortBy, order, ...filters } = projectsDTO;

    const where: Prisma.ProjectWhereInput = {
      AND: [
        this.buildWhereClause(filters),
        {
          OR: [
            { membersIDs: { has: user.id } },
            { managersIDs: { has: user.id } },
          ],
        },
      ]
    };

    const include: Prisma.ProjectInclude = {
      managers: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          department: true,
          roles: true,
        },
      },
      members: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          department: true,
          roles: true,
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

  async getDocuments(projectId: string): Promise<any[]> {
    const project = await this.projectRepository.findById(projectId, {
      documents: true,
    });
    if (!project) {
      throw new NotFoundException(PROJECT_NOT_FOUND);
    }

    // @ts-ignore
    return project.documents || [];
  }

  private buildWhereClause(filters: ProjectFiltersDTO) {
    const where: Prisma.ProjectWhereInput = {};

    if (filters) {
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
      }
      if (filters.createdBy) {
        where.createdByUserId = filters.createdBy;
      }
      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {
          ...(filters.createdAfter && { gte: new Date(filters.createdAfter) }),
          ...(filters.createdBefore && { lte: new Date(filters.createdBefore) }),
        };
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
