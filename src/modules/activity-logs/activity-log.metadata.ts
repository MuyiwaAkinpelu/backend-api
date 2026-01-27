import { SecurityEventType } from "@prisma/client";

export interface AuthActivityMetadata {
    outcome: 'SUCCESS' | 'FAILURE';
    reason?: 'INVALID_PASSWORD' | 'USER_NOT_FOUND' | 'NO_PERMISSION';
    ip?: string;
}

export interface SecurityMetadata {
    securityEvent?: SecurityEventType;
}

export interface FileActivityMetadata {
    filename?: string;
    fileSize?: number;
    fileType?: string;
    approvalStatus?: string;
}

export interface ProjectActivityMetadata {
    projectName?: string;
    projectId?: string;
    action?: string;
}

export interface ApprovalActivityMetadata {
    documentName?: string;
    documentId?: string;
    status?: string;
}

export interface UserActivityMetadata {
    targetUserEmail?: string;
    targetUserId?: string;
    action?: string;
}
