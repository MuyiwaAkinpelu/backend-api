import { Module, forwardRef } from '@nestjs/common';
import { SearchService } from './search.service';
import { IndexService } from './index.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { CaslModule } from '@modules/casl';
import { permissions } from './search.permissions';
import { SearchController } from './controllers/search.controller';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { DocumentElasticIndex } from './search-index/document.elastic.index';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => PrismaModule),
    CaslModule.forFeature({ permissions }),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule], // important
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const node = config.get<string>('ELASTICSEARCH_NODE');
        if (!node) {
          throw new Error('ELASTICSEARCH_NODE is missing');
        }
        return { node };
      },
    }),
  ],
  providers: [
    {
      provide: 'SearchServiceInterface',
      useClass: SearchService,
    },
    SearchService,
    IndexService,
    DocumentElasticIndex,
  ],
  controllers: [SearchController],
  exports: ['SearchServiceInterface', SearchService, IndexService, DocumentElasticIndex],
})
export class SearchModule { }
