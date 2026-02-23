import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationRepository } from '../notification.repository';
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';

@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly repository: NotificationRepository) {}

  async getPreferences(userId: string) {
    return this.repository.getPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    return this.repository.updatePreferences(userId, dto);
  }

  async canReceive(
    userId: string,
    type: NotificationType,
    channel: 'push' | 'email' = 'push',
  ): Promise<boolean> {
    const preference = await this.getPreferences(userId);

    // Mapping NotificationType to preference fields
    // This depends on the schema. Current schema has 'updates' and 'approvals'
    if (
      type === NotificationType.PROJECT_UPDATE ||
      type === NotificationType.DOCUMENT_UPDATED
    ) {
      if (channel === 'email') return preference.email && preference.updates;
      return preference.push && preference.updates;
    }

    if (
      type === NotificationType.APPROVAL_STATUS ||
      type === NotificationType.DOCUMENT_APPROVED ||
      type === NotificationType.DOCUMENT_DECLINED ||
      type === NotificationType.REQUEST_SUBMITTED
    ) {
      if (channel === 'email') return preference.email && preference.approvals;
      return preference.push && preference.approvals;
    }

    return true;
  }
}
