import {
  INestApplication,
  INestMicroservice,
  Inject,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaServiceOptions } from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from './prisma.constants';
import { PrismaMiddleware } from './prisma.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error'
  >
  implements OnModuleInit
{
  constructor(
    @Optional()
    @Inject(PRISMA_SERVICE_OPTIONS)
    private readonly prismaServiceOptions: PrismaServiceOptions = {},
    private readonly prismaMiddleware: PrismaMiddleware,
  ) {
    super(prismaServiceOptions.prismaOptions);

    if (this.prismaServiceOptions.middlewares) {
      this.prismaServiceOptions.middlewares.forEach((middleware) =>
        this.$use(middleware),
      );
    }

    // Use the default middlewares
    this.$use(this.prismaMiddleware.createFileMiddleware());
    this.$use(this.prismaMiddleware.updateFileMiddleware());
  }

  async onModuleInit() {
    if (this.prismaServiceOptions.explicitConnect) {
      await this.$connect();
    }
  }

  async enableShutdownHooks(app: INestApplication | INestMicroservice) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
