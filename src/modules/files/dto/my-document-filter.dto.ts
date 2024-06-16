import { OmitType } from '@nestjs/swagger';
import { DocumentFiltersDTO } from './document-filter.dto';

export class MyDocumentFiltersDTO extends OmitType(DocumentFiltersDTO, [
  'uploaderId',
] as const) {}
