import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalRequestRepository } from './approval-request.repository';
import { PrismaService } from '@providers/prisma';
import { ApprovalRequest, ApprovalStatus, Prisma } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import {
  DOCUMENT_NOT_FOUND,
  USER_NOT_FOUND,
  DOCUMENT_ALREADY_SUBMITTED,
  USER_NOT_IN_PROJECT,
  USER_NOT_MANAGER,
  REQUEST_NOT_FOUND,
  APPROVAL_REQUEST_NOT_PENDING,
  UNAUTHORIZED_RESOURCE,
} from '@constants/errors.constants';
import { ListRequestsDTO } from './dto/list-requests.dto';
import { ProjectRepository } from '@modules/project/project.repository';
import { UserRepository } from '@modules/user/user.repository';
import { FileRepository } from '../files/file.repository';
import { RequestsFiltersDTO } from './dto/requests-filter.dto';

@Injectable()
export class ApprovalRequestService {
  constructor(
    private readonly approvalRequestRepository: ApprovalRequestRepository,
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string): Promise<ApprovalRequest> {
    const approvalRequest = await this.approvalRequestRepository.findById(id);
    if (!approvalRequest) {
      throw new NotFoundException(REQUEST_NOT_FOUND);
    }
    return approvalRequest;
  }

  async findOne(id: string): Promise<ApprovalRequest> {
    return this.approvalRequestRepository.findById(id);
  }

  async findAll(
    requestsDTO: ListRequestsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<ApprovalRequest>> {
    const { page, limit, sortBy, order, ...filters } = requestsDTO;

    const where: Prisma.ApprovalRequestWhereInput =
      this.buildWhereClause(filters);
    const include: Prisma.ApprovalRequestInclude = {
      document: true,
      project: true,
      submittedBy: true,
      approvedBy: true,
      disapprovedBy: true,
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.ApprovalRequestOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.approvalRequestRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  async submitDocument(
    documentId: string,
    userId: string,
    projectId: string,
  ): Promise<ApprovalRequest> {
    const document = await this.fileRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException(DOCUMENT_NOT_FOUND);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    const isUserPartOfProject =
      await this.projectRepository.isUserPartOfProject(projectId, userId);
    if (!isUserPartOfProject) {
      throw new ForbiddenException(USER_NOT_IN_PROJECT);
    }

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
    return this.prisma.$transaction(
      async (transactionClient) => {
        // Associate the document with the project
        await this.projectRepository.addDocumentToProject(
          request.projectId,
          request.documentId,
          transactionClient,
        );

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

        return updatedRequest;
      },
      { timeout: 20000 },
    );
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
    );

    return updatedRequest;
  }

  async listApprovalRequestsForManager(
    userId: string,
    requestsDTO: ListRequestsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<ApprovalRequest>> {
    const { page, limit, sortBy, order, ...filters } = requestsDTO;

    const where: Prisma.ApprovalRequestWhereInput =
      this.buildWhereClause(filters);

    where.project = {
      managers: {
        some: {
          id: userId,
        },
      },
    };

    const include: Prisma.ApprovalRequestInclude = {
      document: true,
      project: true,
      submittedBy: true,
      approvedBy: true,
      disapprovedBy: true,
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.ApprovalRequestOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.approvalRequestRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  async cancelRequest(requestId: string, userId: string): Promise<void> {
    const request = await this.findById(requestId);

    if (request.submittedById !== userId) {
      throw new ForbiddenException(UNAUTHORIZED_RESOURCE);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(APPROVAL_REQUEST_NOT_PENDING);
    }

    await this.approvalRequestRepository.delete(requestId);
  }

  private buildWhereClause(filters: RequestsFiltersDTO) {
    const where: Prisma.ApprovalRequestWhereInput = {};

    if (filters) {
      if (filters.submittedById) {
        where.submittedById = filters.submittedById;
      }
      if (filters.approvedById) {
        where.approvedById = filters.approvedById;
      }
      if (filters.disapprovedById) {
        where.disapprovedById = filters.disapprovedById;
      }
      if (filters.projectId) {
        where.projectId = filters.projectId;
      }
      if (filters.documentId) {
        where.documentId = filters.documentId;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.createdAfter) {
        where.createdAt = { gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        where.createdAt = { lte: new Date(filters.createdBefore) };
      }
    }

    return where;
  }
}
