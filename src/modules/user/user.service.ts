import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { Prisma, Roles, User, ActivityVerb, ActivityEntity, ActivityOutcome, SecurityEventType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityLogEvent, ActivityAction } from '@modules/activity-logs/constants';

import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { USER_NOT_FOUND } from '@constants/errors.constants';
import { UserFiltersDTO } from './dto/user-filters.dto';
import { ListUsersDTO } from './dto/users.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return user;
  }

  /**
   * @desc Find a user by id
   * @param id
   * @returns Promise<User>
   */
  findOne(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        password: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        isOnline: true,
        lastSeen: true,
        roles: true,
        projectMemberProjects: { select: { id: true, name: true, category: true } },
        projectManagerProjects: { select: { id: true, name: true, category: true } },
      },
    });
  }

  /**
   * @desc Find all users with pagination
   * @param where
   * @param sortBy
   */
  findAll(
    projectsDTO: ListUsersDTO,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    const { page, limit, sortBy, order, ...filters } = projectsDTO;

    const where: Prisma.UserWhereInput = this.buildWhereClause(filters);
    const include: Prisma.UserInclude = {
      projectMemberProjects: { select: { id: true, name: true, category: true } },
      projectManagerProjects: { select: { id: true, name: true, category: true } },
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.userRepository.findAllPaginated(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  findAllMembers(all?: boolean): Promise<User[]> {
    const where: Prisma.UserWhereInput = {
      ...(all !== true && { isActive: true }),
    };
    const select: Prisma.UserSelect = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
      isActive: true,
      roles: true,
      createdAt: true,
      lastLogin: true,
      department: true,
      isOnline: true,
      lastSeen: true,
    };
    return this.userRepository.findAll(where, select);
  }

  /**
   * Update a user by ID.
   * @param id The ID of the user to update.
   * @param data The updated user data.
   * @param performedBy The ID of the user performing the update.
   * @returns The updated user.
   */
  async updateUser(id: string, data: Prisma.UserUpdateInput, performedBy: string): Promise<User> {
    const user = await this.findById(id);
    const updatedUser = await this.userRepository.updateUser(id, data);

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.USER,
      entityId: id,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: null,
      metadata: {
        targetUserEmail: user.email,
        updates: data,
      },
      occurredAt: new Date(),
    });

    return updatedUser;
  }

  /**
   * Delete a user by ID.
   * @param id The ID of the user to delete.
   * @param performedBy The ID of the user performing the deletion.
   * @returns The deleted user.
   */
  async deleteUser(id: string, performedBy: string): Promise<User> {
    const user = await this.findById(id);
    const deletedUser = await this.userRepository.deleteUser(id);
    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.DELETE,
      entity: ActivityEntity.USER,
      entityId: id,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.USER_DELETED,
      metadata: {
        targetUserEmail: user.email,
      },
      occurredAt: new Date(),
    });
    return deletedUser;
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param roles The new roles to assign to the user.
   * @param performedBy The ID of the user performing the update.
   * @returns The updated user.
   */
  async updateUserRoles(userId: string, roles: Roles[], performedBy: string): Promise<User> {
    const user = await this.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, { roles });
    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.USER,
      entityId: userId,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.ROLE_CHANGE,
      metadata: {
        targetUserEmail: user.email,
        newRoles: roles,
      },
      occurredAt: new Date(),
    });
    return updatedUser;
  }

  /**
   * Update the role of a user.
   * @param userId The ID of the user to update.
   * @param role The new role to assign to the user.
   * @param performedBy The ID of the user performing the update.
   * @returns The updated user.
   */
  async setUserRole(userId: string, role: Roles, performedBy: string): Promise<User> {
    const user = await this.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, { roles: [role] });
    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.USER,
      entityId: userId,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.ROLE_CHANGE,
      metadata: {
        targetUserEmail: user.email,
        newRole: role,
      },
      occurredAt: new Date(),
    });
    return updatedUser;
  }

  /**
   * @param userId The ID of the user to activate.
   * @param performedBy The ID of the user performing the activation.
   * @returns The updated user.
   */
  async activateUser(userId: string, performedBy: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, { isActive: true });
    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.USER,
      entityId: userId,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: null,
      metadata: {
        targetUserEmail: user.email,
        action: ActivityAction.ACTIVATED,
      },

      occurredAt: new Date(),
    });
    return updatedUser;
  }

  /**
   * @param userId The ID of the user to deactivate.
   * @param performedBy The ID of the user performing the deactivation.
   * @returns The updated user.
   */
  async deactivateUser(userId: string, performedBy: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, { isActive: false });
    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.USER,
      entityId: userId,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.USER_DEACTIVATED,
      metadata: {
        targetUserEmail: user.email,
        action: ActivityAction.DEACTIVATED,
      },

      occurredAt: new Date(),
    });
    return updatedUser;
  }

  /**
   * @param userId The ID of the user to verify.
   * @param performedBy The ID of the user performing the verification.
   * @returns The updated user.
   */
  async verifyUser(userId: string, performedBy: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, { isVerified: true });
    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.USER,
      entityId: userId,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: null,
      metadata: {
        targetUserEmail: user.email,
        action: ActivityAction.VERIFIED,
      },

      occurredAt: new Date(),
    });
    return updatedUser;
  }

  private buildWhereClause(filters: UserFiltersDTO) {
    const where: Prisma.UserWhereInput = {};

    if (filters) {
      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {
          ...(filters.createdAfter && { gte: new Date(filters.createdAfter) }),
          ...(filters.createdBefore && { lte: new Date(filters.createdBefore) }),
        };
      }
      if (filters.role) {
        where.roles = { has: filters.role };
      }
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    return where;
  }
}
