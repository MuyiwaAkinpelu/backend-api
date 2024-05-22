import { Prisma } from '@prisma/client';
import { Injectable, Inject } from '@nestjs/common';
import { DocumentElasticIndex } from '@modules/search/search-index/document.elastic.index';

@Injectable()
export class PrismaMiddleware {
  constructor(
    @Inject(DocumentElasticIndex)
    private readonly documentESIndex: DocumentElasticIndex,
  ) {}

  createFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result = await next(params);

      if (params.model === 'File' && params.action === 'create') {
        await this.documentESIndex.insertFileDocument(result);
      }

      return result;
    };
  }

  updateFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result = await next(params);

      if (params.model === 'File' && params.action === 'update') {
        await this.documentESIndex.updateFileDocument(result);
      }

      return result;
    };
  }
}
