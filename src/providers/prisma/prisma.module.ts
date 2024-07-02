import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
  PrismaModuleAsyncOptions,
  PrismaModuleOptions,
  PrismaOptionsFactory,
} from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from './prisma.constants';
import { PrismaService } from './prisma.service';
import { PrismaMiddleware } from './prisma.middleware';
import { SearchModule } from '@modules/search/search.module';
import { DocumentElasticIndex } from '@modules/search/search-index/document.elastic.index';
import { SearchService } from '@modules/search/search.service';
import { DocumentService } from '@modules/files/document.service';
import { FileRepository } from '@modules/files/file.repository';
import { ApprovalRequestRepository } from '@modules/project/approval-request.repository';
import { UserRepository } from '@modules/user/user.repository';
import { ProjectRepository } from '@modules/project/project.repository';
import { MailService } from '@modules/mail/services/mail.service';
import { MailModule } from '@modules/mail/mail.module';
import { PrismaClient } from '@prisma/client';

@Module({
  providers: [
    PrismaService,
    PrismaClient,
    PrismaMiddleware,
    {
      provide: 'SearchServiceInterface',
      useClass: SearchService,
    },
    DocumentService,
    UserRepository,
    FileRepository,
    ProjectRepository,
    ApprovalRequestRepository,
    DocumentElasticIndex,
    MailService,
  ],
  exports: [PrismaService],
  imports: [SearchModule, MailModule],
})
export class PrismaModule {
  static forRoot(options: PrismaModuleOptions = {}): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      providers: [
        {
          provide: PRISMA_SERVICE_OPTIONS,
          useValue: options.prismaServiceOptions,
        },
      ],
    };
  }

  static forRootAsync(options: PrismaModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      imports: options.imports || [],
      providers: this.createAsyncProviders(options),
    };
  }

  private static createAsyncProviders(
    options: PrismaModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return this.createAsyncOptionsProvider(options);
    }

    return [
      ...this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: PrismaModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: PRISMA_SERVICE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }
    return [
      {
        provide: PRISMA_SERVICE_OPTIONS,
        useFactory: async (optionsFactory: PrismaOptionsFactory) =>
          await optionsFactory.createPrismaOptions(),
        inject: [options.useExisting || options.useClass],
      },
    ];
  }
}
