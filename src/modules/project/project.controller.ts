import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { Project, User, File } from '@prisma/client';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiExtraModels,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import ProjectBaseEntity from './entities/project-base.entity';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { CreateProjectDTO } from './dto/create-project.dto';
import { UpdateProjectDTO } from './dto/update-project.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { ListProjectsDTO } from './dto/projects.dto';
import { AddProjectManagerDTO } from './dto/add-manager.dto';
import { PROJECT_NOT_FOUND } from '@constants/errors.constants';
import Serialize from '@decorators/serialize.decorator';
import ProjectEntity from './entities/project.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@ApiExtraModels(ProjectBaseEntity)
@SkipThrottle()
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Get projects for logged-in user' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved',
    type: [ProjectBaseEntity],
  })
  async getMyProjects(
    @CaslUser() userProxy: UserProxy<User>,
    @Query() paginationDTO: ListProjectsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<Project>> {
    const user = await userProxy.get();
    return this.projectService.getMyProjects(user, paginationDTO);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Find project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project found',
    type: ProjectBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findById(@Param('projectId') id: string): Promise<any> {
    return this.projectService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved',
    type: [ProjectBaseEntity],
  })
  async findAll(
    @Query() paginationDTO: ListProjectsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<Project>> {
    return this.projectService.findAll(paginationDTO);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created',
    type: ProjectBaseEntity,
  })
  async create(
    @Body() data: CreateProjectDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Project> {
    const user = userProxy ? await userProxy.get() : null;
    return this.projectService.create(data, user?.id);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated',
    type: ProjectBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('projectId') id: string,
    @Body() data: UpdateProjectDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Project> {
    const user = await userProxy.get();
    return this.projectService.update(id, data, user.id);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: 'Delete a project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted',
    type: ProjectBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(
    @Param('projectId') id: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Project> {
    const user = await userProxy.get();
    return this.projectService.delete(id, user.id);
  }

  @Post(':projectId/members/:userId')
  @ApiOperation({ summary: 'Add member to project' })
  @ApiResponse({
    status: 200,
    description: 'Member added',
    type: ProjectBaseEntity,
  })
  @ApiResponse({ status: 404, description: PROJECT_NOT_FOUND })
  async addMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Project> {
    const user = await userProxy.get();
    return this.projectService.addMember(projectId, userId, user.id);
  }

  @Delete(':projectId/members/:userId')
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiResponse({
    status: 200,
    description: 'Member removed',
    type: ProjectBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Project or user not found' })
  async removeMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Project> {
    const user = await userProxy.get();
    return this.projectService.removeMember(projectId, userId, user.id);
  }

  @Post(':projectId/managers/:userId')
  @ApiOperation({ summary: 'Add manager to project' })
  @ApiResponse({
    status: 200,
    description: 'Manager added',
    type: ProjectBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async addManager(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Project> {
    const user = await userProxy.get();
    return this.projectService.addManager(projectId, userId, user.id);
  }

  @Delete(':projectId/managers/:userId')
  @ApiOperation({ summary: 'Remove manager from project' })
  @ApiResponse({
    status: 200,
    description: 'Manager removed',
    type: ProjectBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Project or user not found' })
  async removeManager(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Project> {
    const user = await userProxy.get();
    return this.projectService.removeManager(projectId, userId, user.id);
  }

  @Get(':projectId/documents')
  @ApiOperation({ summary: 'Get all documents in a project' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved',
    // type: [DocumentBaseEntity],
  })
  async getDocuments(@Param('projectId') projectId: string): Promise<File[]> {
    return this.projectService.getDocuments(projectId);
  }
}
