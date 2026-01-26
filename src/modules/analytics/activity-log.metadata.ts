import { SecurityEventType } from "@prisma/client";

export interface AuthActivityMetadata {
    outcome: 'SUCCESS' | 'FAILURE';
    reason?: 'INVALID_PASSWORD' | 'USER_NOT_FOUND' | 'NO_PERMISSION';
    ip?: string;
}

export interface SecurityMetadata {
    securityEvent?: SecurityEventType;
}
