import { IntersectionType } from '@nestjs/swagger';
import { DocumentsPaginationDTO } from './documents-pagination.dto';
import { MyDocumentFiltersDTO } from './my-document-filter.dto';

export class ListMyDocumentsDTO extends IntersectionType(
  DocumentsPaginationDTO,
  MyDocumentFiltersDTO,
) {}
