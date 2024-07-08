import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async createIndex(index: string) {
    const indexExists = await this.elasticsearchService.indices.exists({
      index,
    });

    if (!indexExists) {
      await this.elasticsearchService.indices
        .create({
          index,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  case_insensitive_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                originalFilename: {
                  type: 'text',
                  analyzer: 'case_insensitive_analyzer',
                },
                tags: {
                  type: 'keyword', // exact match
                },
                description: {
                  type: 'text',
                  analyzer: 'case_insensitive_analyzer',
                },
                fileType: {
                  type: 'text',
                  analyzer: 'case_insensitive_analyzer',
                },
                contentType: {
                  type: 'text',
                  analyzer: 'case_insensitive_analyzer',
                },
                content: {
                  type: 'text',
                  analyzer: 'case_insensitive_analyzer',
                },
              },
            },
          },
        })
        .catch((err) => {
          this.logger.error('Error creating index', err);
        });
    }
  }
}
