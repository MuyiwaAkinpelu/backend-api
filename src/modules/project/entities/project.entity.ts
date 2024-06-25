import { Project, ProjectCategory } from '@prisma/client';

export default class ProjectEntity implements Project {
  readonly id!: string;

  readonly name!: string | null;

  readonly description!: string | null;

  readonly projectManagers!: string[] | null;

  readonly projectMembers!: string[] | null;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

  readonly category: ProjectCategory;
  readonly tags: string[];
  readonly createdByUserId: string;
  readonly updatedByUserId: string;
  readonly projectMembersIDs: string[];
  readonly projectManagersIDs: string[];
  readonly membersIDs: string[];
  readonly managersIDs: string[];
  readonly documentsIDs: string[];
}
