import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { ActivityLogWithUser, LogActivityInput } from './types';
import {
  ActivityLog,
  ActivityEntity,
  ActivityVerb,
  Prisma,
  ActivityOutcome,
  SecurityEventType,
} from '@prisma/client';
import {
  ApprovalActivityMetadata,
  FileActivityMetadata,
  ProjectActivityMetadata,
  UserActivityMetadata,
} from './activity-log.metadata';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityEvent } from './events/activity-logs.event';
import ActivityLogBaseEntity from './entities/activity-log.base-entity'; // <- BaseEntity import
import { plainToInstance } from 'class-transformer';
import { ActivityLogEvent, ActivityAction } from './constants';

import { ActivityLogsFiltersDTO } from './dtos/activity-logs-filter.dto';
import { ActivityLogsDTO } from './dtos/activity-logs.dto';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { ActivityLogRepository } from './activity-logs.repository';
import { normalizeIp } from 'src/common/utils';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  // --- Internal DB writer ---
  private async create(data: LogActivityInput): Promise<ActivityLog> {
    return this.prisma.activityLog.create({
      data: {
        ...(data.userId && { user: { connect: { id: data.userId } } }),
        verb: data.verb,
        entity: data.entity,
        entityId: data.entityId,
        actorId: data.actorId,
        actorName: data.actorName,
        actorEmail: data.actorEmail,
        metadata: data.metadata,
        outcome: data.outcome,
        securityEvent: data.securityEvent,
        ip: data.ip,
        userAgent: data.userAgent,
        occurredAt: data.occurredAt || new Date(),
      },
    });
  }

  // --- Event listener for async logging ---
  @OnEvent(ActivityLogEvent.ACTIVITY_LOG, { async: true })
  async handleActivityLog(payload: ActivityEvent) {
    console.log('Received activity log event:');
    try {
      const actorId = payload.userId;
      let actorName = 'Unknown';
      let actorEmail = null;

      if (payload.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
          select: { firstName: true, lastName: true, email: true },
        });
        if (user) {
          actorName =
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            user.email;
          actorEmail = user.email;
        }
      }

      await this.create({
        userId: payload.userId,
        verb: payload.verb,
        entity: payload.entity,
        securityEvent: payload.securityEvent,
        outcome: payload.outcome,
        entityId: payload.entityId,
        actorId: actorId,
        actorName: actorName,
        actorEmail: actorEmail,
        metadata: payload.metadata,
        ip: normalizeIp(payload.ip),
        userAgent: payload.userAgent,
        occurredAt: payload.occurredAt,
      });
      // console.log('Activity log created successfully');
    } catch (error) {
      this.logger.error('Failed to write activity log', error);
    }
  }

  async findAll(
    dto: ActivityLogsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<ActivityLogBaseEntity>> {
    const { page, limit, sortBy, order, ...filters } = dto;

    const where = this.buildWhereClause(filters);

    const paginationOptions = {
      page,
      perPage: limit,
    };

    const orderBy = {
      [sortBy]: order,
    };

    const result = await this.activityLogRepository.findAll(
      where,
      { user: true },
      orderBy,
      paginationOptions,
    );

    return {
      ...result,
      data: result.data.map((log) => this.toBaseEntity(log)),
    };
  }

  async findAllLogs(): Promise<ActivityLogBaseEntity[]> {
    const logs = await this.prisma.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => this.toBaseEntity(log));
  }

  // --- Return logs for a single user ---
  async findForUser(params: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<ActivityLogBaseEntity[]> {
    const { userId, limit = 20, cursor } = params;

    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    return logs.map((log) => this.toBaseEntity(log));
  }

  // --- Return logs for a specific entity ---
  async findForEntity(params: {
    entity: ActivityEntity;
    entityId: string;
    limit?: number;
  }): Promise<ActivityLogBaseEntity[]> {
    const { entity, entityId, limit = 20 } = params;

    const logs = await this.prisma.activityLog.findMany({
      where: { entity, entityId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => this.toBaseEntity(log));
  }

  // --- Convert a raw Prisma log to a BaseEntity with description ---
  private toBaseEntity(log: ActivityLogWithUser): ActivityLogBaseEntity {
    const entity = plainToInstance(ActivityLogBaseEntity, {
      id: log.id,
      verb: log.verb,
      entity: log.entity,
      entityId: log.entityId,
      actorId: log.actorId,
      actorName: log.actorName,
      actorEmail: log.actorEmail,
      outcome: log.outcome,
      description: this.format(log),
      createdAt: log.occurredAt || log.createdAt,
    });

    return entity;
  }

  // --- Human-readable formatter ---
  format(log: ActivityLogWithUser): string {
    const actor =
      log.actorName ||
      [log.user?.firstName, log.user?.lastName].filter(Boolean).join(' ') ||
      log.user?.email ||
      'Unknown';

    switch (log.entity) {
      case ActivityEntity.FILE:
        return this.formatFileActivity(log, actor);
      case ActivityEntity.PROJECT:
        return this.formatProjectActivity(log, actor);
      case ActivityEntity.APPROVAL:
        return this.formatApprovalActivity(log, actor);
      case ActivityEntity.AUTH:
        return this.formatAuthActivity(log, actor);
      case ActivityEntity.USER:
        return this.formatUserActivity(log, actor);
      default:
        return `${actor} performed an action`;
    }
  }

  private formatFileActivity(log: ActivityLog, actor: string): string {
    const meta = this.asObject(log.metadata) as FileActivityMetadata;
    const filename = meta.filename ?? 'a file';
    switch (log.verb) {
      case ActivityVerb.CREATE:
        return `${actor} uploaded ${filename}`;
      case ActivityVerb.VIEW:
        return `${actor} viewed ${filename}`;
      case ActivityVerb.DOWNLOAD:
        return `${actor} downloaded ${filename}`;
      case ActivityVerb.UPDATE: {
        if (meta.action === ActivityAction.SET_VISIBILITY_PUBLIC)
          return `${actor} made ${filename} public`;
        if (meta.action === ActivityAction.SET_VISIBILITY_PRIVATE)
          return `${actor} made ${filename} private`;
        if (meta.oldFilename && meta.newFilename)
          return `${actor} renamed ${meta.oldFilename} to ${meta.newFilename}`;
        return `${actor} updated ${filename}`;
      }

      case ActivityVerb.DELETE: {
        const status = meta.approvalStatus ? ` (${meta.approvalStatus})` : '';
        return `${actor} deleted a file - ${filename}${status}`;
      }
      case ActivityVerb.SHARE:
        return `${actor} shared ${filename}`;
      default:
        return `${actor} interacted with ${filename}`;
    }
  }

  private formatProjectActivity(log: ActivityLog, actor: string): string {
    const meta = this.asObject(log.metadata) as ProjectActivityMetadata;
    const projectName = meta.projectName ?? 'a project';
    switch (log.verb) {
      case ActivityVerb.CREATE:
        return `${actor} created project "${projectName}"`;
      case ActivityVerb.UPDATE: {
        if (meta.action === ActivityAction.DEACTIVATED)
          return `${actor} deactivated project "${projectName}"`;
        if (meta.action === ActivityAction.ADD_MEMBER)
          return `${actor} added a member to project "${projectName}"`;
        if (meta.action === ActivityAction.REMOVE_MEMBER)
          return `${actor} removed a member from project "${projectName}"`;
        if (meta.action === ActivityAction.ADD_MANAGER)
          return `${actor} added a manager to project "${projectName}"`;
        if (meta.action === ActivityAction.REMOVE_MANAGER)
          return `${actor} removed a manager from project "${projectName}"`;
        return `${actor} updated project "${projectName}"`;
      }

      case ActivityVerb.DELETE:
        return `${actor} deleted project "${projectName}"`;
      default:
        return `${actor} interacted with project "${projectName}"`;
    }
  }

  private formatApprovalActivity(log: ActivityLog, actor: string): string {
    const meta = this.asObject(log.metadata) as ApprovalActivityMetadata;
    const documentName = meta.documentName ?? 'a document';
    switch (log.verb) {
      case ActivityVerb.CREATE:
        return `${actor} submitted a document for approval - ${documentName}`;
      case ActivityVerb.APPROVE:
        return `${actor} approved a document - ${documentName}`;
      case ActivityVerb.DECLINE:
        return `${actor} declined a document - ${documentName}`;
      default:
        return `${actor} processed an approval - ${documentName}`;
    }
  }

  private formatAuthActivity(log: ActivityLog, actor: string): string {
    const meta = this.asObject(log.metadata);
    switch (log.verb) {
      case ActivityVerb.LOGIN:
        if (log.outcome === ActivityOutcome.FAILURE) {
          return `Unknown user ${
            meta.targetUserEmail ?? 'N/A'
          } failed to log in`;
        }
        return `${actor} logged in`;
      case ActivityVerb.LOGOUT:
        return `${actor} logged out`;
      case ActivityVerb.UPDATE: {
        if (meta.action === ActivityAction.PASSWORD_RESET_REQUESTED)
          return `${actor} requested a password reset`;
        if (meta.action === ActivityAction.PASSWORD_RESET_COMPLETED)
          return `${actor} completed a password reset`;
        if (meta.action === ActivityAction.RESENT_INVITE)
          return `${actor} resent an account invitation to ${
            meta.email ?? meta.targetUserEmail ?? 'a user'
          }`;
        if (meta.action === ActivityAction.PASSWORD_CHANGED)
          return `${actor} changed their password`;
        return `${actor} updated security settings`;
      }

      default:
        return `${actor} performed an authentication action`;
    }
  }

  private formatUserActivity(log: ActivityLog, actor: string): string {
    const meta = this.asObject(log.metadata) as UserActivityMetadata;
    const targetUser = meta.targetUserEmail ?? 'a user';

    switch (log.verb) {
      case ActivityVerb.CREATE:
        return `${actor} created user - ${targetUser}`;
      case ActivityVerb.UPDATE: {
        if (meta.action === ActivityAction.MARK_ALL_NOTIFICATIONS_READ)
          return `${actor} marked all notifications as read`;
        if (meta.action === ActivityAction.MARK_NOTIFICATION_READ)
          return `${actor} marked a notification as read`;
        if (meta.action === ActivityAction.ACTIVATED)
          return `${actor} activated user - ${targetUser}`;
        if (meta.action === ActivityAction.VERIFIED)
          return `${actor} verified user - ${targetUser}`;
        return `${actor} ${
          meta.action?.toLowerCase() ?? 'updated'
        } user - ${targetUser}`;
      }

      case ActivityVerb.DELETE:
        return `${actor} deleted user - ${targetUser}`;
      default:
        return `${actor} managed user - ${targetUser}`;
    }
  }

  // --- Helper to safely cast JSON metadata ---
  private asObject(
    metadata: Prisma.JsonValue | null | undefined,
  ): Record<string, any> {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, any>)
      : {};
  }

  private buildWhereClause(
    filters: ActivityLogsFiltersDTO,
  ): Prisma.ActivityLogWhereInput {
    const where: Prisma.ActivityLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;
    if (filters.verb) where.verb = filters.verb;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.occurredAfter || filters.occurredBefore) {
      where.occurredAt = {
        gte: filters.occurredAfter
          ? new Date(filters.occurredAfter)
          : undefined,
        lte: filters.occurredBefore
          ? new Date(filters.occurredBefore)
          : undefined,
      };
    }

    return where;
  }
}
