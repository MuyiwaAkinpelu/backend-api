import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentVisibility, File, Prisma, ApprovalStatus, Roles, ActivityVerb, ActivityEntity, ActivityOutcome, SecurityEventType } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { DocumentSearchObject } from '@modules/search/objects/document.search.object';
import { SearchService } from '@modules/search/search.service';
import { DocumentFiltersDTO } from './dto/document-filter.dto';
import { MyDocumentFiltersDTO } from './dto/my-document-filter.dto';
import { FileRepository } from './file.repository';

import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { ApprovalRequestRepository } from '../project/approval-request.repository';
import { UserRepository } from '@modules/user/user.repository';
import { ProjectRepository } from '@modules/project/project.repository';
import { ListDocumentsDTO } from './dto/list-documents.dto';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityLogEvent } from '@modules/activity-logs/constants';

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
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger = new Logger(DocumentService.name);
  }

  public async search(q: any, visibility?: DocumentVisibility): Promise<any> {
    this.logger.log(q);
    const data = DocumentSearchObject.searchObject(q, visibility);
    this.logger.log(data);
    return await this.searchService.searchIndex(data);
  }

  async getDocumentById(id: string, incrementView = false): Promise<File> {
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
        approvalRequests: {
          select: {
            status: true,
          },
        },
      },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if document is approved before incrementing views
    const isApproved = document.approvalRequests?.some(
      (req) => req.status === ApprovalStatus.APPROVED,
    );

    if (incrementView && isApproved) {
      this.incrementView(id);
    }
    return document;
  }

  async incrementView(id: string) {
    await this.prisma.file.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  async incrementDownload(id: string) {
    await this.prisma.file.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
  }

  @OnEvent(ActivityLogEvent.DOCUMENT_DOWNLOADED, { async: true })
  async handleDocumentDownloaded(documentId: string) {
    try {
      console.log('Document downloaded:', documentId);

      await this.incrementDownload(documentId);
    } catch (error) {
      this.logger.error("Failed to increment download count", error);
    }
  }

  async getDocuments(
    paginationDTO: ListDocumentsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    const { page, limit, sortBy, order, ...filters } = paginationDTO;

    const where = await this.buildWhereClause(filters);
    const include: Prisma.FileInclude = {
      // ... unchanged include block ...
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
          submittedById: true,
          approvedById: true,
          disapprovedById: true,
          disapprovalReason: true,
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          disapprovedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          managers: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
        },
      },
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

    const where = await this.buildWhereClause(filters);
    where.uploaderId = userId;

    const include: Prisma.FileInclude = {
      // ... unchanged include block ...
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
          submittedById: true,
          approvedById: true,
          disapprovedById: true,
          disapprovalReason: true,
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          disapprovedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              category: true,
              managers: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          managers: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
        },
      },
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

  async deleteDocument(id: string, performedBy: string) {
    const document = await this.getDocumentById(id);

    const requests = await this.prisma.approvalRequest.findMany({
      where: { documentId: id },
      select: { status: true },
    });

    let approvalStatus = 'DRAFT';
    if (requests.length > 0) {
      if (requests.some(r => r.status === ApprovalStatus.APPROVED)) approvalStatus = 'APPROVED';
      else if (requests.some(r => r.status === ApprovalStatus.PENDING)) approvalStatus = 'PENDING';
      else if (requests.some(r => r.status === ApprovalStatus.DECLINED)) approvalStatus = 'DECLINED';
    }

    try {
      await this.prisma.$transaction(async (prisma) => {
        // Delete related approval requests first
        await prisma.approvalRequest.deleteMany({
          where: { documentId: id },
        });

        // Now delete the document
        await prisma.file.delete({
          where: { id: id },
        });
      });

      this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
        userId: performedBy,
        verb: ActivityVerb.DELETE,
        entity: ActivityEntity.FILE,
        entityId: id,
        outcome: ActivityOutcome.SUCCESS,
        securityEvent: SecurityEventType.DOCUMENT_DELETED,
        metadata: {
          filename: document.originalFilename,
          approvalStatus: approvalStatus,
          projectsIDs: document.projectsIDs,
        },
        occurredAt: new Date(),
      });

      return { message: 'Document deleted successfully' };
    } catch (error) {
      this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
        userId: performedBy,
        verb: ActivityVerb.DELETE,
        entity: ActivityEntity.FILE,
        entityId: id,
        outcome: ActivityOutcome.FAILURE,
        securityEvent: SecurityEventType.DOCUMENT_DELETED,
        metadata: {
          filename: document.originalFilename,
          approvalStatus: approvalStatus,
          projectsIDs: document.projectsIDs,
          error: error.message
        },
        occurredAt: new Date(),
      });
      throw error;
    }
  }

  private async buildWhereClause(filters: any) {
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

      // Optimization: Manual Join for approvalStatus to avoid slow Prisma relation lookups in Mongo
      if (filters.approvalStatus !== undefined) {
        const requests = await this.prisma.approvalRequest.findMany({
          where: { status: filters.approvalStatus },
          select: { documentId: true },
        });
        const documentIds = requests.map((req) => req.documentId);
        where.id = { in: documentIds };
      } else if (filters.isDraft === true) {
        where.approvalRequests = {
          none: {},
        };
      } else if (filters.isDraft === false) {
        where.approvalRequests = {
          some: {},
        };
      }

      if (filters.projectIDs) {
        where.projectsIDs = { hasSome: filters.projectIDs };
      }
      if (filters.sizeMin !== undefined || filters.sizeMax !== undefined) {
        where.size = {};
        if (filters.sizeMin !== undefined) {
          where.size.gte = filters.sizeMin;
        }
        if (filters.sizeMax !== undefined) {
          where.size.lte = filters.sizeMax;
        }
      }
      if (filters.fileType) {
        where.fileType = { in: filters.fileType, mode: 'insensitive' };
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
        where.contentType = { in: filters.contentType, mode: 'insensitive' };
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
