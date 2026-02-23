import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { IndexService } from './index.service';
import { SearchServiceInterface } from './interface/search.service.interface';
import { INTERNAL_SERVER_ERROR } from '@constants/errors.constants';
import { PrismaService } from '@providers/prisma/prisma.service';
import { DocumentElasticIndex } from './search-index/document.elastic.index';

@Injectable()
export class SearchService implements SearchServiceInterface<any> {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly indexService: IndexService,
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
    private readonly documentElasticIndex: DocumentElasticIndex,
  ) {}

  public async insertIndex(bulkData: any[]): Promise<any> {
    bulkData.forEach((item, i) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        this.logger.error(
          `Invalid bulk item at index ${i}: ${JSON.stringify(item)}`,
        );
        throw new Error('Invalid Elasticsearch bulk payload');
      }
    });

    return await this.elasticsearchService
      .bulk({
        body: bulkData,
        refresh: true,
      })
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async updateIndex(updateData: any): Promise<any> {
    return await this.elasticsearchService
      .update(updateData)
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async searchIndex(searchData: any): Promise<any> {
    return await this.elasticsearchService
      .search(searchData)
      .then((res) => {
        this.logger.log(res);
        return res.hits.hits;
      })
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async suggest(suggestData: any): Promise<any> {
    return await this.elasticsearchService
      .search(suggestData)
      .then((res) => {
        return res.hits.hits;
      })
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async deleteIndex(indexData: any): Promise<any> {
    return await this.elasticsearchService.indices
      .delete(indexData)
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async deleteDocument(indexData: any): Promise<any> {
    return await this.elasticsearchService
      .delete(indexData)
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async debugGetAll(index: string): Promise<any> {
    return await this.elasticsearchService
      .search({
        index,
        body: {
          query: {
            match_all: {},
          },
          size: 1000, // Retrieve up to 1000 documents
        },
      })
      .then((res) => {
        return {
          total: res.hits.total,
          documents: res.hits.hits,
        };
      })
      .catch((err) => {
        this.logger.error(err);
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async syncAllDocuments(): Promise<any> {
    try {
      // Fetch all files from database
      const files = await this.prisma.file.findMany();

      this.logger.log(`Found ${files.length} documents to sync`);

      if (files.length === 0) {
        return {
          success: true,
          indexed: 0,
          message: 'No documents found in database',
        };
      }

      // Sync to Elasticsearch
      const result = await this.documentElasticIndex.syncAllDocuments(files);

      return {
        success: true,
        ...result,
      };
    } catch (err) {
      this.logger.error('Error syncing documents:', err);
      throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
    }
  }
}
