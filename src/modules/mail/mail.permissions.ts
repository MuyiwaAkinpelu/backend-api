import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';

export type Subjects = 'Mail';

export const permissions: Permissions<Roles, Subjects, Actions> = {
    SYSTEM_ADMIN({ can }) {
        can(Actions.manage, 'Mail');
    },
};
