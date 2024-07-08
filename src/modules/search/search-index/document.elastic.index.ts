import { Inject, Injectable } from '@nestjs/common';
import { SearchServiceInterface } from '../interface/search.service.interface';
import { documentIndex } from '../constant/document.elastic';
import { File } from '@prisma/client';
import { FileWithContent } from '@modules/files/types';
// import { IndexService } from '../index.service';

@Injectable()
export class DocumentElasticIndex {
  constructor(
    @Inject('SearchServiceInterface')
    private readonly searchService: SearchServiceInterface<any>, // private readonly indexService: IndexService,
  ) {
    //this.indexService.createIndex(documentIndex._index); // Ensure index is created
  }

  public async insertFileDocument(file: FileWithContent): Promise<any> {
    const data = this.fileDocument(file);
    return await this.searchService.insertIndex(data);
  }

  public async deleteFileDocument(file: FileWithContent): Promise<any> {
    return await this.deleteIndex(file.id);
  }

  public async updateFileDocument(file: FileWithContent): Promise<any> {
    const data = this.fileDocument(file);
    await this.deleteIndex(file.id);
    return await this.searchService.insertIndex(data);
  }

  private async deleteIndex(docId: string): Promise<any> {
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
