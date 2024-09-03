import { DocumentVisibility } from '@prisma/client';
import { documentIndex } from '../constant/document.elastic';

export class ElasticSearchBody {
  size: number;
  from: number;
  query: any;

  constructor(size: number, from: number, query: any) {
    this.size = size;
    this.from = from;
    this.query = query;
  }
}

export class DocumentSearchObject {
  public static searchObject(q: string, visibility?: DocumentVisibility) {
    const body = this.elasticSearchBody(q, visibility);
    return { index: documentIndex._index, body };
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
                'description',
                'fileType',
                'contentType',
                'content',
              ],
            },
          },
          {
            term: { tags: q }, // Exact match for tags
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

    return new ElasticSearchBody(10, 0, query);
  }
}
