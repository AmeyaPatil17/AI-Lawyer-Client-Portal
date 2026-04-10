import mongoose, { Schema, Document } from 'mongoose';

/**
 * AuditLog — Immutable audit trail for legal compliance.
 *
 * Records significant actions: logins, intake changes, status transitions,
 * nudge emails, document downloads, admin operations.
 *
 * Uses a capped collection (50 MB / 500k documents) so old entries are
 * automatically pruned without needing TTL cleanup.
 */

export type AuditAction =
    | 'user.login' | 'user.logout' | 'user.register' | 'user.password_reset'
    | 'intake.create' | 'intake.update' | 'intake.submit' | 'intake.reset'
    | 'intake.status_change' | 'intake.nudge_sent' | 'intake.doc_downloaded'
    | 'intake.note_added' | 'intake.assigned'
    | 'admin.user_created' | 'admin.user_deactivated' | 'admin.role_changed'
    | 'admin.user_status_changed' | 'admin.intake_deleted' | 'admin.intake_status_overridden'
    | 'admin.ai_runtime_updated' | 'admin.ai_operational_updated';

export interface IAuditLog extends Document {
    action: AuditAction;
    actorId: mongoose.Types.ObjectId;
    targetId?: mongoose.Types.ObjectId;
    targetType?: 'User' | 'Intake';
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const AuditLogSchema = new Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'user.login', 'user.logout', 'user.register', 'user.password_reset',
            'intake.create', 'intake.update', 'intake.submit', 'intake.reset',
            'intake.status_change', 'intake.nudge_sent', 'intake.doc_downloaded',
            'intake.note_added', 'intake.assigned',
            'admin.user_created', 'admin.user_deactivated', 'admin.role_changed',
            'admin.user_status_changed', 'admin.intake_deleted', 'admin.intake_status_overridden',
            'admin.ai_runtime_updated', 'admin.ai_operational_updated',
        ],
    },
    actorId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId:   { type: Schema.Types.ObjectId },
    targetType: { type: String, enum: ['User', 'Intake'] },
    metadata:   { type: Schema.Types.Mixed },
    ipAddress:  { type: String },
    userAgent:  { type: String },
    createdAt:  { type: Date, default: Date.now },
});

// Query indexes
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
