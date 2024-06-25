import { IntersectionType } from '@nestjs/swagger';
import { RequestsPaginationDTO } from './requests-pagination.dto';
import { RequestsFiltersDTO } from './requests-filter.dto';

export class ListRequestsDTO extends IntersectionType(
  RequestsPaginationDTO,
  RequestsFiltersDTO,
) {}
