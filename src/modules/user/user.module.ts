import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from '@modules/user/user.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/user/user.permissions';
import { FilesModule } from '@modules/files/files.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    forwardRef(() => FilesModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
