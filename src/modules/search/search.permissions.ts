import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import ProjectEntity from '@modules/project/entities/project.entity';
import { FileEntity } from '@modules/files/entities/file.entity';

export type Subjects = InferSubjects<typeof ProjectEntity | typeof FileEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  SYSTEM_ADMIN({ can }) {
    can(Actions.read, ProjectEntity);
    can(Actions.read, FileEntity);
  },
  MANAGEMENT_STAFF({ can }) {
    can(Actions.read, ProjectEntity);
    can(Actions.read, FileEntity);
  },
  PROGRAM_OPERATION_STAFF({ can }) {
    can(Actions.read, ProjectEntity);
    can(Actions.read, FileEntity);
  },
  NEW_STAFF({ can }) {
    can(Actions.read, ProjectEntity);
    can(Actions.read, FileEntity);
  },
};
