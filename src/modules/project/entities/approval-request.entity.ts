import { ApprovalRequest, ApprovalStatus } from '@prisma/client';

export default class ApprovalRequestEntity implements ApprovalRequest {
  readonly id!: string;

  readonly documentId!: string;

  readonly projectId!: string;

  readonly submittedById!: string;

  readonly approvedById!: string | null;

  readonly disapprovedById!: string | null;

  readonly disapprovalReason!: string | null;

  readonly status!: ApprovalStatus;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;
}
