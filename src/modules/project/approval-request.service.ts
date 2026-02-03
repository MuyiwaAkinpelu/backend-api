import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalRequestRepository } from './approval-request.repository';
import { PrismaService } from '@providers/prisma';
import { ApprovalRequest, ApprovalStatus, Prisma, Roles, ActivityVerb, ActivityEntity, ActivityOutcome, SecurityEventType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityLogEvent } from '@modules/activity-logs/constants';
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
    private readonly eventEmitter: EventEmitter2,
  ) { }

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

    if (!user.roles.includes(Roles.SYSTEM_ADMIN)) {
      // Validate project existence and user membership (as manager)
      const isUserManagerOfProject =
        await this.projectRepository.isUserManagerOfProject(
          request.projectId,
          userId,
        );
      if (!isUserManagerOfProject) {
        throw new ForbiddenException(USER_NOT_MANAGER);
      }
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

        // Emit log
        const fullRequest = await this.prisma.approvalRequest.findUnique({
          where: { id: requestId },
          include: {
            document: { select: { originalFilename: true } },
            project: { select: { name: true } }
          }
        });

        this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
          userId: userId,
          verb: ActivityVerb.APPROVE,
          entity: ActivityEntity.APPROVAL,
          entityId: requestId,
          outcome: ActivityOutcome.SUCCESS,
          securityEvent: null,
          metadata: {
            documentName: fullRequest?.document?.originalFilename,
            projectId: request.projectId,
          },
          occurredAt: new Date(),
        });

        this.eventEmitter.emit('approval.status_changed', {
          userId: request.submittedById,
          status: 'APPROVED',
          projectName: (fullRequest as any)?.project?.name,
          requestId: requestId,
        });

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

    if (!user.roles.includes(Roles.SYSTEM_ADMIN)) {

      // Validate project existence and user membership (as manager)
      const isUserManagerOfProject =
        await this.projectRepository.isUserManagerOfProject(
          request.projectId,
          userId,
        );
      if (!isUserManagerOfProject) {
        throw new ForbiddenException(USER_NOT_MANAGER);
      }
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

    // Emit log
    const fullRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        document: { select: { originalFilename: true } },
        project: { select: { name: true } }
      }
    });

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: userId,
      verb: ActivityVerb.DECLINE,
      entity: ActivityEntity.APPROVAL,
      entityId: requestId,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: null,
      metadata: {
        documentName: fullRequest?.document?.originalFilename,
        projectId: request.projectId,
        reason: disapprovalReason,
      },
      occurredAt: new Date(),
    });

    this.eventEmitter.emit('approval.status_changed', {
      userId: request.submittedById,
      status: 'DECLINED',
      projectName: (fullRequest as any)?.project?.name,
      requestId: requestId,
    });

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
      managersIDs: {
        has: userId,
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

  async bulkApproveRequests(
    requestIds: string[],
    userId: string,
  ): Promise<{
    successful: ApprovalRequest[];
    failed: Array<{ requestId: string; error: string }>;
  }> {
    const successful: ApprovalRequest[] = [];
    const failed: Array<{ requestId: string; error: string }> = [];

    // Validate user existence once
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    for (const requestId of requestIds) {
      try {
        // Validate request existence
        const request = await this.approvalRequestRepository.findById(requestId);
        if (!request) {
          failed.push({ requestId, error: REQUEST_NOT_FOUND });
          continue;
        }

        if (!user.roles.includes(Roles.SYSTEM_ADMIN)) {
          // Validate project existence and user membership (as manager)
          const isUserManagerOfProject =
            await this.projectRepository.isUserManagerOfProject(
              request.projectId,
              userId,
            );
          if (!isUserManagerOfProject) {
            failed.push({ requestId, error: USER_NOT_MANAGER });
            continue;
          }
        }

        // Perform operations within a transaction
        const updatedRequest = await this.prisma.$transaction(
          async (transactionClient) => {
            // Associate the document with the project
            await this.projectRepository.addDocumentToProject(
              request.projectId,
              request.documentId,
              transactionClient,
            );

            // Update the approval request status
            const updated = await this.approvalRequestRepository.update(
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

            return updated;
          },
          { timeout: 20000 },
        );

        // Emit log
        const fullRequest = await this.prisma.approvalRequest.findUnique({
          where: { id: requestId },
          include: { document: { select: { originalFilename: true } } }
        });

        this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
          userId: userId,
          verb: ActivityVerb.APPROVE,
          entity: ActivityEntity.APPROVAL,
          entityId: requestId,
          outcome: ActivityOutcome.SUCCESS,
          securityEvent: null,
          metadata: {
            documentName: fullRequest?.document?.originalFilename,
            projectId: request.projectId,
            bulkOperation: true,
          },
          occurredAt: new Date(),
        });

        successful.push(updatedRequest);
      } catch (error) {
        failed.push({
          requestId,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { successful, failed };
  }

  async bulkDeclineRequests(
    requestIds: string[],
    userId: string,
    disapprovalReason?: string,
  ): Promise<{
    successful: ApprovalRequest[];
    failed: Array<{ requestId: string; error: string }>;
  }> {
    const successful: ApprovalRequest[] = [];
    const failed: Array<{ requestId: string; error: string }> = [];

    // Validate user existence once
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    for (const requestId of requestIds) {
      try {
        // Validate request existence
        const request = await this.approvalRequestRepository.findById(requestId);
        if (!request) {
          failed.push({ requestId, error: REQUEST_NOT_FOUND });
          continue;
        }

        if (!user.roles.includes(Roles.SYSTEM_ADMIN)) {
          // Validate project existence and user membership (as manager)
          const isUserManagerOfProject =
            await this.projectRepository.isUserManagerOfProject(
              request.projectId,
              userId,
            );
          if (!isUserManagerOfProject) {
            failed.push({ requestId, error: USER_NOT_MANAGER });
            continue;
          }
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

        // Emit log
        const fullRequest = await this.prisma.approvalRequest.findUnique({
          where: { id: requestId },
          include: { document: { select: { originalFilename: true } } }
        });

        this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
          userId: userId,
          verb: ActivityVerb.DECLINE,
          entity: ActivityEntity.APPROVAL,
          entityId: requestId,
          outcome: ActivityOutcome.SUCCESS,
          securityEvent: null,
          metadata: {
            documentName: fullRequest?.document?.originalFilename,
            projectId: request.projectId,
            reason: disapprovalReason,
            bulkOperation: true,
          },
          occurredAt: new Date(),
        });

        successful.push(updatedRequest);
      } catch (error) {
        failed.push({
          requestId,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { successful, failed };
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
      if (filters.category) {
        where.project.category = filters.category;
      }

      // Apply search filter
      if (filters.search) {
        where.OR = [
          {
            document: {
              originalFilename: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
          {
            project: {
              name: { contains: filters.search, mode: 'insensitive' },
            },
          },
          {
            submittedBy: {
              OR: [
                {
                  firstName: { contains: filters.search, mode: 'insensitive' },
                },
                {
                  lastName: { contains: filters.search, mode: 'insensitive' },
                },
                {
                  email: { contains: filters.search, mode: 'insensitive' },
                },
              ],
            },
          },
        ];
      }
    }

    return where;
  }
}
