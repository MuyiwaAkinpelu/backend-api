import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import DailyUploadStatEntity from './entities/daily-upload-stat.entity';
import ProjectDocumentStatEntity from './entities/project-document-stat.entity';
import SecurityEventStatEntity from './entities/security-event-stat.entity';
import UserActivityDailyEntity from './entities/user-activity-daily.entity';

export type Subjects = InferSubjects<
  | typeof DailyUploadStatEntity
  | typeof ProjectDocumentStatEntity
  | typeof SecurityEventStatEntity
  | typeof UserActivityDailyEntity
>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  SYSTEM_ADMIN({ can }) {
    can(Actions.manage, DailyUploadStatEntity);
    can(Actions.manage, ProjectDocumentStatEntity);
    can(Actions.manage, SecurityEventStatEntity);
    can(Actions.manage, UserActivityDailyEntity);
  },
};
