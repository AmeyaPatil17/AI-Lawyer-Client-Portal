import { Request } from 'express';
import AuditLog, { AuditAction } from '../models/AuditLog';
import { logger } from './logger';

interface AuditLogInput {
    action: AuditAction;
    actorId?: unknown;
    targetId?: unknown;
    targetType?: 'User' | 'Intake';
    metadata?: Record<string, any>;
    req?: Request;
}

export const writeAuditLog = async ({
    action,
    actorId,
    targetId,
    targetType,
    metadata,
    req,
}: AuditLogInput): Promise<void> => {
    if (!actorId) return;

    try {
        await AuditLog.create({
            action,
            actorId,
            targetId,
            targetType,
            metadata,
            ipAddress: req?.ip,
            userAgent: req?.get?.('user-agent'),
        });
    } catch (error: any) {
        logger.error({ err: error, action, actorId, targetId }, 'Failed to persist audit log');
    }
};
