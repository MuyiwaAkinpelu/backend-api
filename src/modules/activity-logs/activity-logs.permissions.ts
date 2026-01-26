import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import ActivityLogEntity from './entities/activity-log.entity';

export type Subjects = InferSubjects<typeof ActivityLogEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
    SYSTEM_ADMIN({ can }) {
        can(Actions.manage, ActivityLogEntity);
    },
    MANAGEMENT_STAFF({ can }) {
        can(Actions.read, ActivityLogEntity);
    },
    PROGRAM_OPERATION_STAFF({ can }) {
        can(Actions.read, ActivityLogEntity);
    },
};
