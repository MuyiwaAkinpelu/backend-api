import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';

export type Subjects = 'Health';

export const permissions: Permissions<Roles, Subjects, Actions> = {
    // everyone({ can }) {
    //     can(Actions.read, 'Health');
    // },

    SYSTEM_ADMIN({ can }) {
        can(Actions.manage, 'Health');
    },
};
