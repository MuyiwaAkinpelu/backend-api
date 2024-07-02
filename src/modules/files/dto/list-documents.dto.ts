import { IntersectionType } from '@nestjs/swagger';
import { DocumentsPaginationDTO } from './documents-pagination.dto';
import { DocumentFiltersDTO } from './document-filter.dto';

export class ListDocumentsDTO extends IntersectionType(
  DocumentsPaginationDTO,
  DocumentFiltersDTO,
) {}
