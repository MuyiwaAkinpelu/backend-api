import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SearchService } from '../search.service';
import { DocumentSearchDTO } from '@modules/files/dto/document-search.dto';
import { DocumentSearchObject } from '../objects/document.search.object';
import { CaslUser, UserProxy } from '@modules/casl';
import { User, DocumentVisibility } from '@prisma/client';
import { SkipAuth } from '@modules/auth/guard/skip-auth.guard';
import { documentIndex } from '../constant/document.elastic';
import { SkipThrottle } from '@nestjs/throttler';
import { cleanFilename } from '../../../common/utils';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @SkipThrottle()
  @ApiOperation({ summary: 'Search within documents' })
  @ApiResponse({ status: 200, description: 'Search successful' })
  @SkipAuth()
  @Get()
  public async search(
    @Query() query: DocumentSearchDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<any> {
    const user = userProxy ? await userProxy.get().catch(() => null) : null;
    // Authenticated users see all documents, unauthenticated see only public
    const visibility = user ? undefined : DocumentVisibility.PUBLIC;
    const data = DocumentSearchObject.searchObject(query.q, visibility);
    const result = await this.searchService.searchIndex(data);

    // Transform Elasticsearch response to return only relevant fields
    const documents =
      result.map((hit: any) => ({
        id: hit._id,
        filename: cleanFilename(hit._source.originalFilename),
        filenameKeywords: hit._source.filenameKeywords,
        description: hit._source.description,
        tags: hit._source.tags,
        contentType: hit._source.contentType,
        uploadDate: hit._source.createdAt,
        visibility: hit._source.visibility,
        score: hit._score,
      })) || [];

    return documents;
  }

  @SkipThrottle()
  @ApiOperation({ summary: 'Suggest keywords for documents' })
  @ApiResponse({ status: 200, description: 'Suggestion successful' })
  @SkipAuth()
  @Get('suggestions')
  public async suggest(
    @Query() query: DocumentSearchDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<any> {
    const user = userProxy ? await userProxy.get().catch(() => null) : null;
    // Authenticated users see all documents, unauthenticated see only public
    const visibility = user ? undefined : DocumentVisibility.PUBLIC;
    const data = DocumentSearchObject.suggestObject(query.q, visibility);
    const result = await this.searchService.suggest(data);

    // Extract keywords that match the user's query from all matching documents
    const queryLower = query.q.toLowerCase();
    const matchingKeywords = new Set<string>();

    result.forEach((hit: any) => {
      // Check filenameKeywords
      const keywords: string[] = hit._source.filenameKeywords || [];
      keywords.forEach((keyword: string) => {
        if (keyword.toLowerCase().includes(queryLower)) {
          matchingKeywords.add(keyword);
        }
      });

      // Check tags
      const tags: string[] = hit._source.tags || [];
      tags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(queryLower)) {
          matchingKeywords.add(tag);
        }
      });
    });

    // Return unique keywords as suggestions
    const suggestions = Array.from(matchingKeywords).slice(0, 10);

    return suggestions;
  }

  @ApiOperation({ summary: 'Debug: Get all documents in Elasticsearch' })
  @ApiResponse({ status: 200, description: 'All documents retrieved' })
  @SkipAuth()
  @Get('debug')
  public async debug(): Promise<any> {
    return this.searchService.debugGetAll(documentIndex._index);
  }

  @ApiOperation({
    summary: 'Debug: Sync all documents from database to Elasticsearch',
  })
  @ApiResponse({ status: 200, description: 'Documents synced successfully' })
  @SkipAuth()
  @Get('sync')
  public async sync(): Promise<any> {
    return this.searchService.syncAllDocuments();
  }
}
