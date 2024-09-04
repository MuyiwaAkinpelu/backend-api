import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { Prisma, Roles, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { USER_NOT_FOUND } from '@constants/errors.constants';
import { UserFiltersDTO } from './dto/user-filters.dto';
import { ListUsersDTO } from './dto/users.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

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
        roles: true,
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
    const include: Prisma.UserInclude = undefined;

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

  findAllMembers(): Promise<User[]> {
    const where: Prisma.UserWhereInput = {
      isActive: true,
    };
    const select: Prisma.UserSelect = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
    };
    return this.userRepository.findAll(where, select);
  }

  /**
   * Update a user by ID.
   * @param id The ID of the user to update.
   * @param data The updated user data.
   * @returns The updated user.
   */
  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.findById(id);
    return this.userRepository.updateUser(id, data);
  }

  /**
   * Delete a user by ID.
   * @param id The ID of the user to delete.
   * @returns The deleted user.
   */
  async deleteUser(id: string): Promise<User> {
    const user = await this.findById(id);
    return this.userRepository.deleteUser(id);
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param roles The new roles to assign to the user.
   * @returns The updated user.
   */
  async updateUserRoles(userId: string, roles: Roles[]): Promise<User> {
    const user = await this.findById(userId);
    return this.userRepository.updateUser(userId, { roles });
  }

  /**
   * Update the role of a user.
   * @param userId The ID of the user to update.
   * @param role The new role to assign to the user.
   * @returns The updated user.
   */
  async setUserRole(userId: string, role: Roles): Promise<User> {
    const user = await this.findById(userId);
    return this.userRepository.updateUser(userId, { roles: [role] });
  }

  /**
   * Activate a user by ID.
   * @param userId The ID of the user to activate.
   * @returns The updated user.
   */
  async activateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    return this.userRepository.updateUser(userId, { isActive: true });
  }

  /**
   * Deactivate a user by ID.
   * @param userId The ID of the user to deactivate.
   * @returns The updated user.
   */
  async deactivateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    return this.userRepository.updateUser(userId, { isActive: false });
  }

  /**
   * Verify a user by ID.
   * @param userId The ID of the user to verify.
   * @returns The updated user.
   */
  async verifyUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    return this.userRepository.updateUser(userId, { isVerified: true });
  }

  private buildWhereClause(filters: UserFiltersDTO) {
    const where: Prisma.UserWhereInput = {};

    if (filters) {
      if (filters.createdAfter) {
        where.createdAt = { gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        where.createdAt = { lte: new Date(filters.createdBefore) };
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
