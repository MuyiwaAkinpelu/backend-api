import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { FileEntity } from '@modules/files/entities/file.entity';
import { Roles } from '@prisma/client';
import { NotificationEntity } from './entities/notification.entity';

export type Subjects = InferSubjects<typeof FileEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can }) {
    can(Actions.manage, NotificationEntity);
  },
};
