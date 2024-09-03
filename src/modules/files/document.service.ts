import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentVisibility, File, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { DocumentSearchObject } from '@modules/search/objects/document.search.object';
import { SearchService } from '@modules/search/search.service';
import { DocumentFiltersDTO } from './dto/document-filter.dto';
import { FileRepository } from './file.repository';

import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { ApprovalRequestRepository } from '../project/approval-request.repository';
import { UserRepository } from '@modules/user/user.repository';
import { ProjectRepository } from '@modules/project/project.repository';
import { ListDocumentsDTO } from './dto/list-documents.dto';

@Injectable()
export class DocumentService {
  logger: Logger;
  constructor(
    @Inject('SearchServiceInterface')
    private readonly searchService: SearchService,
    private readonly prisma: PrismaService,
    private readonly fileRepository: FileRepository,
    private readonly approvalRequestRepository: ApprovalRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly projectRepository: ProjectRepository,
  ) {
    this.logger = new Logger(DocumentService.name);
  }

  public async search(q: any, visibility?: DocumentVisibility): Promise<any> {
    this.logger.log(q);
    const data = DocumentSearchObject.searchObject(q, visibility);
    this.logger.log(data);
    return await this.searchService.searchIndex(data);
  }

  async getDocumentById(id: string): Promise<File> {
    const document = await this.prisma.file.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async getDocuments(
    paginationDTO: ListDocumentsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    const { page, limit, sortBy, order, ...filters } = paginationDTO;

    const where = this.buildWhereClause(filters);
    const include: Prisma.FileInclude = {
      uploader: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      sharedWith: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      approvalRequests: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          approvedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          disapprovedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          project: {
            select: {
              managers: true,
              name: true,
            },
          },
        },
      },
      projects: true,
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.FileOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.fileRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  async getMyDocuments(
    paginationDTO: ListDocumentsDTO,
    userId: string,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    const { page, limit, sortBy, order, ...filters } = paginationDTO;

    const where = this.buildWhereClause(filters);
    where.uploaderId = userId;

    const include: Prisma.FileInclude = {
      uploader: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      sharedWith: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      approvalRequests: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          approvedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          disapprovedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          project: {
            select: {
              managers: true,
              name: true,
            },
          },
        },
      },
      projects: true,
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.FileOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.fileRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  async setDocumentVisibilityToPublic(id: string) {
    const document = await this.getDocumentById(id);
    const updatedDocument = await this.prisma.file.update({
      where: { id },
      data: { visibility: DocumentVisibility.PUBLIC },
    });
    return updatedDocument;
  }

  async setDocumentVisibilityToPrivate(id: string) {
    const document = await this.getDocumentById(id);
    const updatedDocument = await this.prisma.file.update({
      where: { id },
      data: { visibility: DocumentVisibility.PRIVATE },
    });
    return updatedDocument;
  }

  async renameDocument(id: string, newName: string) {
    const document = await this.getDocumentById(id);
    const renamedDocument = await this.prisma.file.update({
      where: { id },
      data: { originalFilename: newName },
    });
    return renamedDocument;
  }

  async deleteDocument(id: string) {
    await this.getDocumentById(id);
    await this.prisma.$transaction(async (prisma) => {
      // Delete related approval requests first
      await prisma.approvalRequest.deleteMany({
        where: { documentId: id },
      });

      // Now delete the document
      await prisma.file.delete({
        where: { id },
      });
    });
    return { message: 'Document deleted successfully' };
  }

  private buildWhereClause(filters: DocumentFiltersDTO) {
    const where: Prisma.FileWhereInput = {};

    if (filters) {
      if (filters.filename) {
        where.filename = { contains: filters.filename, mode: 'insensitive' };
      }
      if (filters.uploaderId) {
        where.uploaderId = filters.uploaderId;
      }
      if (filters.visibility !== undefined) {
        where.visibility = filters.visibility;
      }
      if (filters.approvalStatus !== undefined) {
        where.approvalRequests = {
          some: {
            status: filters.approvalStatus,
          },
        };
      }
      if (filters.projectIDs) {
        where.projectsIDs = { hasSome: filters.projectIDs };
      }
      if (filters.sizeMin !== undefined) {
        where.size = { gte: filters.sizeMin };
      }
      if (filters.sizeMax !== undefined) {
        where.size = { lte: filters.sizeMax };
      }
      if (filters.fileType) {
        where.fileType = filters.fileType;
      }
      if (filters.uploadedAfter) {
        where.uploadDate = {
          gte: new Date(filters.uploadedAfter),
        };
      }
      if (filters.uploadedBefore) {
        where.uploadDate = {
          lte: new Date(filters.uploadedBefore),
        };
      }
      if (filters.tags) {
        where.tags = { hasSome: filters.tags };
      }
      if (filters.contentType) {
        where.contentType = filters.contentType;
      }
      if (filters.description) {
        where.description = {
          contains: filters.description,
          mode: 'insensitive',
        };
      }
      if (filters.originalFilename) {
        where.originalFilename = {
          contains: filters.originalFilename,
          mode: 'insensitive',
        };
      }
      if (filters.sharedWithIDs) {
        where.sharedWithIDs = { hasSome: filters.sharedWithIDs };
      }

      // Apply search filter
      if (filters.search) {
        where.OR = [
          {
            originalFilename: { contains: filters.search, mode: 'insensitive' },
          },
          {
            uploader: {
              firstName: { contains: filters.search, mode: 'insensitive' },
              lastName: { contains: filters.search, mode: 'insensitive' },
            },
          },
        ];
      }
    }

    return where;
  }
}
