import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import { FileEntity } from './entities/file.entity';

export type Subjects = InferSubjects<typeof FileEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  SYSTEM_ADMIN({ can }) {
    can(Actions.manage, FileEntity);
  },
  MANAGEMENT_STAFF({ can }) {
    can(Actions.read, FileEntity);
    can(Actions.create, FileEntity);
    can(Actions.update, FileEntity);
    can(Actions.delete, FileEntity);
  },
  PROGRAM_OPERATION_STAFF({ can }) {
    can(Actions.read, FileEntity);
    can(Actions.create, FileEntity);
    can(Actions.delete, FileEntity);
  },
  NEW_STAFF({ can }) {
    can(Actions.read, FileEntity);
  },
};
