import * as bcrypt from 'bcrypt';
import {
  ApprovalRequest,
  ApprovalStatus,
  File,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { DocumentElasticIndex } from '@modules/search/search-index/document.elastic.index';
import { MailService } from '@modules/mail/services/mail.service';
import { UploadService } from '@modules/files/upload.service';
import { extractKeywords, extractDescription } from '../../common/utils';

@Injectable()
export class PrismaMiddleware {
  logger: Logger;
  constructor(
    @Inject(DocumentElasticIndex)
    private readonly documentESIndex: DocumentElasticIndex,
    @Inject(forwardRef(() => UploadService))
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaClient,
    private readonly mailService: MailService,
  ) {
    this.logger = new Logger(PrismaMiddleware.name);
    this.logger.log(
      `PrismaMiddleware initialized. IS_SEEDING: ${process.env.IS_SEEDING}`,
    );
  }

  createFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result: File = await next(params);

      if (params.model === 'File' && params.action === 'create') {
        const isSeeding = process.env.IS_SEEDING === 'true';
        if (isSeeding) return result;
        try {
          const content = await this.uploadService.extractTextFromFile(
            result.filename,
            result.contentType,
          );

          const description = extractDescription(content);

          const filenameKeywords = extractKeywords(result.originalFilename);

          this.prisma.file
            .update({
              where: { id: result.id },
              data: {
                description,
                filenameKeywords,
              },
            })
            .catch((err) =>
              this.logger.error('Failed to save description/keywords', err),
            );

          // removed await so that document will be indexed asynchronously
          this.documentESIndex.insertFileDocument({
            ...result,
            content,
            filenameKeywords,
          });
        } catch (error) {
          this.logger.error(error);
        }
      }

      return result;
    };
  }

  updateFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result: File = await next(params);

      if (params.model === 'File' && params.action === 'update') {
        try {
          if (process.env.IS_SEEDING === 'true') {
            return result;
          }

          // Skip expensive text extraction if only updating counter fields
          const updateData = params.args.data || {};
          const updatingCountersOnly =
            (updateData.downloads || updateData.views) &&
            Object.keys(updateData).every((key) =>
              ['downloads', 'views'].includes(key),
            );

          if (updatingCountersOnly) {
            console.log(
              'Skipping text extraction and ES update for counter-only updates',
            );

            // Skip text extraction and ES update for counter-only updates
            return result;
          }

          const content = await this.uploadService.extractTextFromFile(
            result.filename,
            result.contentType,
          );

          // Regenerate filenameKeywords if name was updated
          const filenameKeywords = extractKeywords(result.originalFilename);

          await this.documentESIndex.updateFileDocument({
            ...result,
            content,
            filenameKeywords,
          });
        } catch (error) {
          this.logger.error(error);
        }
      }

      return result;
    };
  }

  deleteFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result: File = await next(params);

      if (params.model === 'File' && params.action === 'delete') {
        try {
          if (process.env.IS_SEEDING === 'true') {
            return result;
          }
          await this.documentESIndex.deleteFileDocument(result);
        } catch (error) {
          this.logger.error(error);
        }
      }

      return result;
    };
  }

  onApprovalRequestCreate(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result: ApprovalRequest = await next(params);

      if (params.model === 'ApprovalRequest' && params.action === 'create') {
        // Fetch the project, document, and user details
        const request = await this.prisma.approvalRequest.findUnique({
          where: { id: result.id },
          include: {
            project: {
              include: {
                managers: true,
              },
            },
            submittedBy: true,
            document: true,
          },
        });

        const { project, document, submittedBy } = request;

        if (request.project && request.submittedBy && request.document) {
          if (process.env.IS_SEEDING === 'true') {
            return result;
          }
          const managerEmails = request.project.managers.map(
            (manager) => manager.email,
          );
          // Send an email to the project manager
          this.mailService.sendApprovalRequestNotification(managerEmails, {
            projectName: project.name,
            documentName: document.originalFilename,
            requestedBy: `${submittedBy.firstName} ${submittedBy.lastName}`,
            submissionDate: new Date().toISOString(),
            reviewLink: `https://drs.scidar.org/audit-approval`,
          });
        }
      }
      return result;
    };
  }

  onApprovalRequestUpdate(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      if (params.model === 'ApprovalRequest' && params.action === 'update') {
        const approvalRequestBeforeUpdate =
          await this.prisma.approvalRequest.findUnique({
            where: params.args.where,
          });

        const result: ApprovalRequest = await next(params);

        const request = await this.prisma.approvalRequest.findUnique({
          where: { id: result.id },
          include: {
            project: true,
            submittedBy: true,
            document: true,
          },
        });

        const { document, submittedBy, project } = request;

        if (
          approvalRequestBeforeUpdate &&
          approvalRequestBeforeUpdate.status !== ApprovalStatus.APPROVED &&
          result.status === ApprovalStatus.APPROVED
        ) {
          if (process.env.IS_SEEDING === 'true') {
            return result;
          }
          if (document && submittedBy) {
            try {
              this.mailService.sendApprovalNotification(submittedBy.email, {
                documentName: document.originalFilename,
                approvalDate: new Date().toISOString(),
                requestedBy: `${submittedBy.firstName} ${submittedBy.lastName}`,
                projectLink: `https://drs.scidar.org/projects/${project.id}`,
              });
            } catch (error) {
              this.logger.error(error);
            }
          }
        } else if (
          approvalRequestBeforeUpdate &&
          approvalRequestBeforeUpdate.status !== ApprovalStatus.DECLINED &&
          result.status === ApprovalStatus.DECLINED
        ) {
          const { submittedBy, project, disapprovalReason } = request;

          if (process.env.IS_SEEDING === 'true') {
            return result;
          }
          if (document && submittedBy) {
            try {
              this.mailService.sendDisapprovalNotification(submittedBy.email, {
                documentName: document.filename,
                disapprovalDate: new Date().toISOString(),
                disapprovalReason: disapprovalReason,
                requestedBy: `${submittedBy.firstName} ${submittedBy.lastName}`,
                projectLink: `https://drs.scidar.org/projects/${project.id}`,
              });
            } catch (error) {
              this.logger.error(error);
            }
          }
        }
        return result;
      }
      return next(params);
    };
  }

  onAccountCreate(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      if (params.model === 'User' && params.action === 'create') {
        // hash user password
        params.args.data.password = await bcrypt.hash(
          params.args.data.password,
          10,
        );
        return next(params);
      }

      return next(params);
    };
  }
}
