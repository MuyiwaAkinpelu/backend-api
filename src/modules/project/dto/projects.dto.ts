import { IntersectionType } from '@nestjs/swagger';
import { ProjectFiltersDTO } from './project-filters.dto';
import { ProjectsPaginationDTO } from './project-pagination.dto';

export class ListProjectsDTO extends IntersectionType(
  ProjectsPaginationDTO,
  ProjectFiltersDTO,
) {}
