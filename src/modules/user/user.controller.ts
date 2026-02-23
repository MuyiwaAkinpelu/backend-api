import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Post,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import {
  AccessGuard,
  Actions,
  CaslConditions,
  CaslSubject,
  CaslUser,
  ConditionsProxy,
  SubjectProxy,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import Serialize from '@decorators/serialize.decorator';
import { OrderByPipe, WherePipe } from '@nodeteam/nestjs-pipes';
import { Prisma, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import { UserHook } from '@modules/user/user.hook';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import { UpdateUserRolesDTO } from './dto/update-user-roles.dto';
import { SetUserRoleDTO } from './dto/set-user-role.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { UserPaginationDTO } from './dto/user-pagination.dto';
import { ListUsersDTO } from './dto/users.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { UploadService } from '@modules/files/upload.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(UserBaseEntity)
@ApiBaseResponses()
@Controller('users')
@SkipThrottle()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('members')
  @ApiOperation({ summary: 'Get all members' })
  @ApiOkBaseResponse({ dto: UserBaseEntity, isArray: true })
  @ApiQuery({
    name: 'all',
    required: false,
    type: Boolean,
    description:
      'If true, returns all members regardless of active status. Defaults to false.',
  })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async findAllMembers(@Query('all') all?: string): Promise<User[]> {
    const includeAll = all === 'true';
    return this.userService.findAllMembers(includeAll);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkBaseResponse({ dto: UserBaseEntity, isArray: true, meta: true })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async findAll(
    @Query() paginationDTO: ListUsersDTO,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.userService.findAll(paginationDTO);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user details' })
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async me(
    @CaslUser() userProxy?: UserProxy<User>,
    @CaslConditions() conditions?: ConditionsProxy,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    // console.log(tokenUser);

    return this.userService.findOne(tokenUser.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Patch user' })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.update, UserEntity, UserHook)
  async updateUser(
    @CaslUser() userProxy?: UserProxy<User>,
    @CaslConditions() conditions?: ConditionsProxy,
    @CaslSubject() subjectProxy?: SubjectProxy<User>,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    const subject = await subjectProxy.get();

    console.log(tokenUser);
    console.log(subject);
    console.log(conditions.toMongo());
    return subject;
  }

  @Post('profile-picture')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @CaslUser() userProxy?: UserProxy<User>,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<User> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const user = await userProxy.get();

    if (user.avatar) {
      await this.uploadService.deleteFile(user.avatar);
    }
    const uploadedFiles = await this.uploadService.upload(
      [file],
      ['profile-picture'],
      user.id,
      user.roles,
    );
    const avatarUrl = uploadedFiles[0].path;
    return this.userService.updateUser(user.id, { avatar: avatarUrl }, user.id);
  }

  @Delete('profile-picture')
  @ApiOperation({ summary: 'Remove profile picture' })
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  async removeProfilePicture(
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<User> {
    const user = await userProxy.get();
    if (user.avatar) {
      await this.uploadService.deleteFile(user.avatar);
    }
    return this.userService.updateUser(user.id, { avatar: null }, user.id);
  }

  @Get('profile-picture')
  @ApiOperation({ summary: 'Get profile picture' })
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  async getProfilePicture(
    @CaslUser() userProxy?: UserProxy<User>,
    @Res() res?: any,
  ) {
    const user = await userProxy.get();
    if (!user.avatar) {
      throw new BadRequestException('User does not have a profile picture');
    }

    const fileKey = user.avatar.split('/').pop();
    const fileStream = await this.uploadService.downloadFile(fileKey);

    res.set({
      'Content-Type': 'image/jpeg', // Assuming jpeg for now, but really we should store/retrieve content type
      'Content-Disposition': `inline; filename="profile-picture"`,
    });

    fileStream.pipe(res);
  }

  /**
   * Patch user data.
   * @param userId The ID of the user to update.
   * @param updateUserRolesDTO The new roles to assign to the user.
   * @returns The updated user.
   */
  @Put(':userId')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Update user profile' })
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() updateUserDTO: UpdateUserDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.userService.updateUser(userId, updateUserDTO, user.id);
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param updateUserRolesDTO The new roles to assign to the user.
   * @returns The updated user.
   */
  @Put(':userId/roles')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Update user roles' })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() updateUserRolesDTO: UpdateUserRolesDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    const { roles } = updateUserRolesDTO;
    return this.userService.updateUserRoles(userId, roles, user.id);
  }

  /**
   * Set the role of a user.
   * @param userId The ID of the user to update.
   * @param setUserRoleDTO The new role to assign to the user.
   * @returns The updated user.
   */
  @Put(':userId/role')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Set user role' })
  async setUserRole(
    @Param('userId') userId: string,
    @Body() setUserRoleDTO: SetUserRoleDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    const { role } = setUserRoleDTO;
    return this.userService.setUserRole(userId, role, user.id);
  }

  /**
   * Delete a user.
   * @param userId The ID of the user to delete.
   * @returns A confirmation message.
   */
  @Delete(':userId')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.userService.deleteUser(userId, user.id);
  }

  /**
   * Activate a user account.
   * @param userId The ID of the user to activate.
   * @returns The updated user.
   */
  @Put(':userId/activate')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Activate user account' })
  async activateUser(
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.userService.activateUser(userId, user.id);
  }

  /**
   * Deactivate a user account.
   * @param userId The ID of the user to deactivate.
   * @returns The updated user.
   */
  @Put(':userId/deactivate')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Deactivate user account' })
  async deactivateUser(
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.userService.deactivateUser(userId, user.id);
  }

  /**
   * Verify a user account.
   * @param userId The ID of the user to verify.
   * @returns The updated user.
   */
  @Put(':userId/verify')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Verify user account' })
  async verifyUser(
    @Param('userId') userId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.userService.verifyUser(userId, user.id);
  }
}
