import { SecurityEventType } from "@prisma/client";
import { ActivityAction } from "./constants";


export interface AuthActivityMetadata {
    outcome: 'SUCCESS' | 'FAILURE';
    reason?: 'INVALID_PASSWORD' | 'USER_NOT_FOUND' | 'NO_PERMISSION';
    ip?: string;
    action?: ActivityAction;
    email?: string;
}



export interface SecurityMetadata {
    securityEvent?: SecurityEventType;
}

export interface FileActivityMetadata {
    filename?: string;
    fileSize?: number;
    fileType?: string;
    approvalStatus?: string;
    action?: ActivityAction;
    oldFilename?: string;
    newFilename?: string;
}



export interface ProjectActivityMetadata {
    projectName?: string;
    projectId?: string;
    action?: ActivityAction;
    updates?: any;
    targetUserId?: string;
}




export interface ApprovalActivityMetadata {
    documentName?: string;
    documentId?: string;
    status?: string;
}

export interface UserActivityMetadata {
    targetUserEmail?: string;
    targetUserId?: string;
    action?: ActivityAction;
    updates?: any;
    newRoles?: string[];
    newRole?: string;
}


