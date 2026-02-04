import { SignUpDto } from '@modules/auth/dto/sign-up.dto';
import { faker } from '@faker-js/faker';
import { Prisma, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import PaginatedResult = PaginatorTypes.PaginatedResult;
import { Roles } from '@modules/app/app.roles';

export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    notificationPreference: true;
    notifications: true;
  };
}>;

export function getSignUpData(email?: string): SignUpDto {
  return {
    email: faker.internet.email({ provider: email }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    department: 'Finance',
    designation: 'Principal',
    password: faker.internet.password({ length: 12 }),
    roles: [Roles.GUEST],
  };
}

export function getPaginatedData<T>(input: T[]): PaginatedResult<T> {
  return {
    data: input,
    meta: {
      total: input.length,
      lastPage: Math.ceil(input.length / 10),
      currentPage: 1,
      perPage: 10,
      prev: null,
      next: null,
    },
  };
}

export function createUsers(length: number): UserWithRelations[] {
  const result: UserWithRelations[] = [];
  for (let i = 0; i < length; i++) {
    const user: UserWithRelations = {
      id: faker.string.alphanumeric({ length: 12 }),
      ...getSignUpData(),
      googleId: null,
      phone: null,
      avatar: null,
      roles: [Roles.GUEST],
      createdAt: faker.date.anytime(),
      updatedAt: faker.date.anytime(),
      fileSharedIDs: [],
      isVerified: true,
      isActive: true,
      projectMemberProjectIDs: [],
      projectManagerProjectIDs: [],
      lastLogin: null,
      isOnline: false,
      lastSeen: faker.date.anytime(),
      notifications: [],
      notificationPreference: {
        id: faker.string.alphanumeric({ length: 12 }),
        userId: '', // Will be set if needed
        email: true,
        push: true,
        updates: true,
        approvals: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    result.push(user);
  }
  return result;
}

export function getJwtTokens(): Auth.AccessRefreshTokens {
  return {
    accessToken: faker.string.alphanumeric({ length: 40 }),
    refreshToken: faker.string.alphanumeric({ length: 40 }),
  };
}
