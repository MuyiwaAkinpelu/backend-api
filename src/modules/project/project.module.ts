import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectRepository } from './project.repository';
import { ApprovalRequestController } from './approval-request.controller';
import { ApprovalRequestService } from './approval-request.service';
import { ApprovalRequestRepository } from './approval-request.repository';
import { FileRepository } from '@modules/files/file.repository';
import { UserRepository } from '@modules/user/user.repository';

@Module({
  providers: [
    ProjectService,
    ApprovalRequestService,
    ProjectRepository,
    ApprovalRequestRepository,
    FileRepository,
    UserRepository,
  ],
  controllers: [ProjectController, ApprovalRequestController],
  exports: [ProjectRepository, ApprovalRequestRepository],
})
export class ProjectModule {}
