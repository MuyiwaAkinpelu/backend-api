import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { UPLOAD_RATE_LIMIT, UPLOAD_RATE_TTL } from '@constants/env.constants';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

import { SearchModule } from '@modules/search/search.module';
import { PrismaModule } from '@providers/prisma';
import { FileRepository } from './file.repository';
import { ApprovalRequestRepository } from '../project/approval-request.repository';
import { UserRepository } from '@modules/user/user.repository';
import { ProjectRepository } from '@modules/project/project.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from './files.permissions';

@Module({
  imports: [
    SearchModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: seconds(configService.get(UPLOAD_RATE_TTL) || 60), // default is 60 seconds
          limit: configService.get(UPLOAD_RATE_LIMIT) || 3, // default is 3 requests
        },
      ],
    }),
    PrismaModule,
    SearchModule,
    CaslModule.forFeature({ permissions }),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    FileRepository,
    UserRepository,
    ProjectRepository,
    ApprovalRequestRepository,
    UploadService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

  ],
})
export class FilesModule { }
