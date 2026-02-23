import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectRepository } from './project.repository';
import { ApprovalRequestController } from './approval-request.controller';
import { ApprovalRequestService } from './approval-request.service';
import { ApprovalRequestRepository } from './approval-request.repository';
import { FileRepository } from '@modules/files/file.repository';
import { UserRepository } from '@modules/user/user.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from './project.permissions';
import { UserModule } from '@modules/user/user.module';
import { FilesModule } from '@modules/files/files.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    UserModule,
    forwardRef(() => FilesModule),
  ],
  providers: [
    ProjectService,
    ApprovalRequestService,
    ProjectRepository,
    ApprovalRequestRepository,
  ],
  controllers: [ProjectController, ApprovalRequestController],
  exports: [ProjectRepository, ApprovalRequestRepository],
})
export class ProjectModule {}
