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
  public static searchObject(q: string) {
    const body = this.elasticSearchBody(q);
    return { index: documentIndex._index, body };
  }

  public static elasticSearchBody(q: string): ElasticSearchBody {
    const query = {
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

    return new ElasticSearchBody(10, 0, query);
  }
}
