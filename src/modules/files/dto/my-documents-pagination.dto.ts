import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { DocumentsPaginationDTO } from './documents-pagination.dto';
import { MyDocumentFiltersDTO } from './my-document-filter.dto';

export class MyDocumentsPaginationDTO extends OmitType(DocumentsPaginationDTO, [
  'filters',
]) {
  @IsOptional()
  @ValidateNested()
  @Type(() => MyDocumentFiltersDTO)
  @ApiPropertyOptional({
    description: 'Filters to apply to the file query',
    type: MyDocumentFiltersDTO,
    required: false,
  })
  filters?: MyDocumentFiltersDTO;
}
