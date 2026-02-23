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
import { UserModule } from '@modules/user/user.module';
import { ProjectModule } from '@modules/project/project.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    SearchModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: seconds(configService.get(UPLOAD_RATE_TTL) || 60), // default is 60 seconds
          limit: configService.get(UPLOAD_RATE_LIMIT) || 100, // default is 10 requests
        },
      ],
    }),
    forwardRef(() => PrismaModule),
    SearchModule,
    CaslModule.forFeature({ permissions }),
    UserModule,
    forwardRef(() => ProjectModule),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    FileRepository,
    UploadService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [DocumentService, FileRepository, UploadService],
})
export class FilesModule {}
