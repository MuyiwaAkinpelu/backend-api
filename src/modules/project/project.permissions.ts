import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import ProjectEntity from './entities/project.entity';
import ApprovalRequestEntity from './entities/approval-request.entity';

export type Subjects = InferSubjects<typeof ProjectEntity | typeof ApprovalRequestEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
    SYSTEM_ADMIN({ can }) {
        can(Actions.manage, ProjectEntity);
        can(Actions.manage, ApprovalRequestEntity);
    },
    MANAGEMENT_STAFF({ can }) {
        can(Actions.read, ProjectEntity);
        can(Actions.manage, ApprovalRequestEntity);
    },
    PROGRAM_OPERATION_STAFF({ can }) {
        can(Actions.read, ProjectEntity);
    },
    NEW_STAFF({ can }) {
        can(Actions.read, ProjectEntity);
    },
};
