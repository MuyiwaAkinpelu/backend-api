import { Inject, Injectable } from '@nestjs/common';
import { SearchServiceInterface } from '../interface/search.service.interface';
import { documentIndex } from '../constant/document.elastic';
import { File } from '@prisma/client';

@Injectable()
export class DocumentElasticIndex {
  constructor(
    @Inject('SearchServiceInterface')
    private readonly searchService: SearchServiceInterface<any>,
  ) {}

  public async insertFileDocument(file: File): Promise<any> {
    const data = this.fileDocument(file);
    return await this.searchService.insertIndex(data);
  }

  public async updateFileDocument(file: File): Promise<any> {
    const data = this.fileDocument(file);
    await this.deleteFileDocument(file.id);
    return await this.searchService.insertIndex(data);
  }

  private async deleteFileDocument(docId: string): Promise<any> {
    const data = {
      index: documentIndex._index,
      id: docId,
    };
    return await this.searchService.deleteDocument(data);
  }

  private bulkIndex(documentId: string): any {
    return {
      _index: documentIndex._index,
      _id: documentId,
    };
  }

  private fileDocument(file: File): any {
    const bulk = [];
    bulk.push({
      index: this.bulkIndex(file.id),
    });
    bulk.push(file);
    return {
      body: bulk,
      index: documentIndex._index,
    };
  }
}
