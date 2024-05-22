import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SearchServiceInterface } from './interface/search.service.interface';
import { SearchConfig } from './config/search.config';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_SERVER_ERROR } from '@constants/errors.constants';

@Injectable()
export class SearchService
  extends ElasticsearchService
  implements SearchServiceInterface<any>
{
  logger = new Logger(SearchService.name);

  constructor(@Inject() private readonly configService: ConfigService) {
    super(SearchConfig.searchConfig(process.env.ELASTIC_SEARCH_URL));
  }

  public async insertIndex(bulkData: any): Promise<any> {
    return await this.bulk(bulkData)
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async updateIndex(updateData: any): Promise<any> {
    return await this.update(updateData)
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async searchIndex(searchData: any): Promise<any> {
    return await this.search(searchData)
      .then((res) => {
        this.logger.log(res);
        return res.hits.hits;
      })
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async deleteIndex(indexData: any): Promise<any> {
    return await this.indices
      .delete(indexData)
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }

  public async deleteDocument(indexData: any): Promise<any> {
    return await this.delete(indexData)
      .then((res) => res)
      .catch((err) => {
        this.logger.error(err); // Log error
        throw new InternalServerErrorException(INTERNAL_SERVER_ERROR);
      });
  }
}
