import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { documentIndex } from './constant/document.elastic';

@Injectable()
export class IndexService implements OnModuleInit {
  private readonly logger = new Logger(IndexService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) { }

  async onModuleInit() {
    try {
      await this.createIndex(documentIndex._index);
    } catch (e) {
      this.logger.error('Elasticsearch unavailable, continuing startup');
    }
  }


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
                    char_filter: ['replace_punctuation'],
                    tokenizer: 'standard',
                    filter: ['lowercase'],
                  },
                },
                char_filter: {
                  replace_punctuation: {
                    type: 'mapping',
                    mappings: ['_ =>  ', '- =>  '],
                  },
                },
              },
            },
            mappings: {
              properties: {
                visibility: {
                  type: 'keyword',
                },
                originalFilename: {
                  type: 'text',
                  analyzer: 'case_insensitive_analyzer',
                },
                filenameKeywords: {
                  type: 'search_as_you_type',
                },
                tags: {
                  type: 'text',
                  analyzer: 'case_insensitive_analyzer',
                  fields: {
                    suggest: {
                      type: 'search_as_you_type',
                    },
                    keyword: {
                      type: 'keyword',
                    },
                  },
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
        .then(() => {
          this.logger.log(`Index "${index}" created successfully`);
        })
        .catch((err) => {
          this.logger.error('Error creating index', err);
        });
    }
  }
}
