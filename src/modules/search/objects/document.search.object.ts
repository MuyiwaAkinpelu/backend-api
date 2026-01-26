import { DocumentVisibility } from '@prisma/client';
import { documentIndex } from '../constant/document.elastic';

export class ElasticSearchBody {
  size: number;
  from: number;
  query: any;
  highlight?: any;

  constructor(size: number, from: number, query: any, highlight?: any) {
    this.size = size;
    this.from = from;
    this.query = query;
    this.highlight = highlight;
  }
}

export class DocumentSearchObject {
  public static searchObject(q: string, visibility?: DocumentVisibility) {
    const body = this.elasticSearchBody(q, visibility);
    return { index: documentIndex._index, body };
  }

  public static suggestObject(q: string, visibility?: DocumentVisibility) {
    const body = this.elasticSuggestBody(q, visibility);
    return { index: documentIndex._index, body };
  }

  public static elasticSuggestBody(
    q: string,
    visibility?: DocumentVisibility,
  ): ElasticSearchBody {
    const query: any = {
      bool: {
        should: [
          {
            multi_match: {
              query: q,
              type: 'bool_prefix',
              fields: [
                'filenameKeywords',
                'filenameKeywords._2gram',
                'filenameKeywords._3gram',
                'tags.suggest',
                'tags.suggest._2gram',
                'tags.suggest._3gram',
              ],
            },
          },
          {
            multi_match: {
              query: q,
              fields: ['originalFilename', 'tags'],
              fuzziness: 'AUTO',
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    if (visibility) {
      query.bool.filter = [
        {
          term: { visibility },
        },
      ];
    }

    return new ElasticSearchBody(10, 0, query); // Increased size to 10
  }

  public static elasticSearchBody(
    q: string,
    visibility?: DocumentVisibility,
  ): ElasticSearchBody {
    const query: any = {
      bool: {
        should: [
          {
            multi_match: {
              query: q,
              fields: [
                'originalFilename^3', // Boost original filename matches
                'tags^2', // Boost tags matches
                'description',
                'fileType',
                'contentType',
                'content',
              ],
            },
          },
        ],
      },
    };

    // Apply visibility filter if specified
    if (visibility) {
      query.bool.filter = [
        {
          term: { visibility }, // Filter based on visibility (PUBLIC or PRIVATE)
        },
      ];
    }

    const highlight = {
      require_field_match: false,
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fields: {
        originalFilename: {},
        tags: {},
        description: {},
        content: {},
      },
    };

    return new ElasticSearchBody(10, 0, query, highlight);
  }
}
