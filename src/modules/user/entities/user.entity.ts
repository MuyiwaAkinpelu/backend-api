import { Notification, NotificationPreference, Roles, User } from '@prisma/client';

export default class UserEntity implements User {
  lastLogin: Date;
  designation: string;
  readonly id!: string;

  readonly phone!: string | null;

  readonly email!: string;
  readonly googleId!: string | null;

  readonly firstName!: string | null;

  readonly lastName!: string | null;

  readonly password!: string | null;

  readonly avatar!: string | null;

  readonly department!: string | null;

  readonly roles!: Roles[];

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

  readonly isVerified!: boolean;

  readonly isActive!: boolean;

  readonly fileSharedIDs!: string[];

  readonly projectMemberProjectIDs: string[];
  readonly projectManagerProjectIDs: string[];
  readonly isOnline!: boolean;
  readonly lastSeen!: Date;
  readonly notificationPreference?: NotificationPreference;
  readonly notifications?: Notification[];
}
