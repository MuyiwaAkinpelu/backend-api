import { Module } from '@nestjs/common';
import { UploadService } from './services/upload.service';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { UPLOAD_RATE_LIMIT, UPLOAD_RATE_TTL } from '@constants/env.constants';
import { DocumentController } from './controllers/document.controller';
import { DocumentService } from './services/document.service';
import { SearchService } from '@modules/search/search.service';
import { PrismaModule } from '@providers/prisma';

@Module({
  imports: [
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
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    UploadService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: 'SearchServiceInterface',
      useClass: SearchService,
    },
    SearchService,
  ],
})
export class FilesModule {}
