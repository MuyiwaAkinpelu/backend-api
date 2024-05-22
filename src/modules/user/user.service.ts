import { Injectable } from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { Prisma, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { PaginationDTO } from './dto/pagination.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<User> {
    return this.userRepository.findById(id);
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
        roles: true,
      },
    });
  }

  /**
   * @desc Find all users with pagination
   * @param where
   * @param orderBy
   */
  findAll(
    paginationDTO: PaginationDTO,
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.userRepository.findAll(where, orderBy);
  }
}
