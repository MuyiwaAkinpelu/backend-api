import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalRequest,
  ApprovalStatus,
  DocumentVisibility,
  File,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { DocumentSearchObject } from '@modules/search/objects/document.search.object';
import { SearchService } from '@modules/search/search.service';
import { DocumentFiltersDTO } from './dto/document-filter.dto';
import { DocumentsPaginationDTO } from './dto/documents-pagination.dto';
import { MyDocumentsPaginationDTO } from './dto/my-documents-pagination.dto';
import { FileRepository } from './file.repository';
import {
  DOCUMENT_ALREADY_SUBMITTED,
  DOCUMENT_NOT_FOUND,
  PROJECT_NOT_FOUND,
  REQUEST_NOT_FOUND,
  USER_NOT_FOUND,
  USER_NOT_IN_PROJECT,
  USER_NOT_MANAGER,
} from '@constants/errors.constants';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { ApprovalRequestRepository } from './approval-request.repository';
import { UserRepository } from '@modules/user/user.repository';
import { ProjectRepository } from '@modules/project/project.repository';

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

  public async search(q: any): Promise<any> {
    this.logger.log(q);
    const data = DocumentSearchObject.searchObject(q);
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
    paginationDTO: DocumentsPaginationDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    const { page, limit, filters, sortBy, order } = paginationDTO;

    const where = this.buildWhereClause(filters);
    const include = {
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
    paginationDTO: MyDocumentsPaginationDTO,
    userId: string,
  ) {
    const { page, limit, skip } = paginationDTO;
    const documents = await this.prisma.file.findMany({
      where: {
        uploader: {
          id: userId,
        },
      },
      take: limit,
      skip,
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
    const totalDocuments = await this.prisma.file.count();
    return {
      data: documents,
      page,
      limit,
      totalDocuments,
    };
  }

  async submitDocument(
    documentId: string,
    userId: string,
    projectId: string,
  ): Promise<ApprovalRequest> {
    // Validate document existence
    const document = await this.fileRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException(DOCUMENT_NOT_FOUND);
    }

    // Validate user existence
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    // Validate project existence
    const isUserPartOfProject =
      await this.projectRepository.isUserPartOfProject(projectId, userId);
    if (!isUserPartOfProject) {
      throw new ForbiddenException(USER_NOT_IN_PROJECT);
    }

    // Check if the document is already submitted for approval for this project
    const existingRequest = await this.approvalRequestRepository.findOne({
      where: {
        documentId,
        projectId,
      },
    });
    if (existingRequest) {
      throw new ConflictException(DOCUMENT_ALREADY_SUBMITTED);
    }

    return this.approvalRequestRepository.create({
      document: {
        connect: {
          id: documentId,
        },
      },
      project: {
        connect: {
          id: projectId,
        },
      },
      submittedBy: {
        connect: {
          id: userId,
        },
      },
    });
  }

  async approveRequest(
    requestId: string,
    userId: string,
  ): Promise<ApprovalRequest> {
    // Validate request existence
    const request = await this.approvalRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException(REQUEST_NOT_FOUND);
    }

    // Validate user existence
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    // Validate project existence and user membership (as manager)
    const isUserManagerOfProject =
      await this.projectRepository.isUserManagerOfProject(
        request.projectId,
        userId,
      );
    if (!isUserManagerOfProject) {
      throw new ForbiddenException(USER_NOT_MANAGER);
    }

    // Perform operations within a transaction
    return this.prisma.$transaction(async (transactionClient) => {
      // Update the approval request status
      const updatedRequest = await this.approvalRequestRepository.update(
        requestId,
        {
          status: ApprovalStatus.APPROVED,
          approvedBy: {
            connect: {
              id: userId,
            },
          },
        },
        transactionClient,
      );

      // Associate the document with the project
      await this.projectRepository.addDocumentToProject(
        request.projectId,
        request.documentId,
        transactionClient,
      );

      return updatedRequest;
    });
  }

  async declineRequest(
    requestId: string,
    userId: string,
    disapprovalReason?: string,
  ): Promise<ApprovalRequest> {
    // Validate request existence
    const request = await this.approvalRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException(REQUEST_NOT_FOUND);
    }

    // Validate user existence
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    // Validate project existence and user membership (as manager)
    const isUserManagerOfProject =
      await this.projectRepository.isUserManagerOfProject(
        request.projectId,
        userId,
      );
    if (!isUserManagerOfProject) {
      throw new ForbiddenException(USER_NOT_MANAGER);
    }

    // Perform operations within a transaction
    return this.prisma.$transaction(async (transactionClient) => {
      // Update the approval request status
      const updatedRequest = await this.approvalRequestRepository.update(
        requestId,
        {
          status: ApprovalStatus.DECLINED,
          disapprovalReason,
          disapprovedBy: {
            connect: {
              id: userId,
            },
          },
        },
        transactionClient,
      );

      // Associate the document with the project
      await this.projectRepository.addDocumentToProject(
        request.projectId,
        request.documentId,
        transactionClient,
      );

      return updatedRequest;
    });
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
      data: { filename: newName },
    });
    return renamedDocument;
  }

  async deleteDocument(id: string) {
    const document = await this.getDocumentById(id);
    // Implement deletion logic (e.g., delete the file from storage)
    await this.prisma.file.delete({ where: { id } });
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
        where.approvalRequests.some.status = filters.approvalStatus;
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
          { filename: { contains: filters.search, mode: 'insensitive' } },
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
