import { PrismaService } from '../prisma.service';

export type PrismaRepositoryClient =
  | PrismaService
  | Omit<
      PrismaService,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
    >;
