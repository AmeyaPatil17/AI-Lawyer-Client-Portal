import mongoose, { Schema, Document } from 'mongoose';
import { IntakeData } from '../types/intake';
import { IntakeDataSchema } from '../schemas/intake';
import { IncorporationDataSchema, IncorporationData } from '../schemas/incorporationSchema';
import { ValidationError } from '../errors/AppError';

export interface IIntake extends Document {
    clientId: mongoose.Types.ObjectId;
    type: 'will' | 'incorporation';
    status: 'started' | 'submitted' | 'reviewing' | 'completed';
    data: IntakeData | IncorporationData;
    clientName?: string;
    jurisdiction?: string;
    flags: Array<{
        type: 'hard' | 'soft';
        message: string;
        code: string;
    }>;
    logicWarnings?: Array<{
        code: string;
        message: string;
        severity: 'warning' | 'info';
    }>;
    aiSummary?: string;
    priorityScore?: number;
    notes?: Array<{
        text: string;
        author: string;
        createdAt: Date;
    }>;
    assignedLawyerId?: mongoose.Types.ObjectId;
    submittedAt?: Date;
    completedAt?: Date;
    lastActivityAt?: Date;
    reminderSentAt?: Date;
    reminderCount?: number;
    createdAt: Date;
    updatedAt: Date;
    isDeleted?: boolean;
    deletedAt?: Date;
}

const IntakeSchema: Schema = new Schema({
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:     { type: String, enum: ['will', 'incorporation'], default: 'will' },
    status:   { type: String, enum: ['started', 'submitted', 'reviewing', 'completed'], default: 'started' },

    // Design Decision: Using Mixed type because intake data is a dynamic, deeply nested
    // document that evolves across wizard steps. Validation is handled by Zod in the
    // pre-save hook below, not by Mongoose's schema validation.
    data: { type: Schema.Types.Mixed, default: {} },

    flags: [{
        type:    { type: String, enum: ['hard', 'soft'] },
        message: String,
        code:    String,
        _id:     false,
    }],
    logicWarnings: [{
        code:     String,
        message:  String,
        severity: { type: String, enum: ['warning', 'info'], default: 'warning' },
        _id:      false,
    }],
    notes: [{
        text:      String,
        author:    String,
        createdAt: { type: Date, default: Date.now },
        _id:       false,
    }],

    aiSummary:      { type: String },
    priorityScore:  { type: Number, default: 0 },
    clientName:     { type: String, default: '' },
    jurisdiction:   { type: String, default: 'ontario' },

    // — Production lifecycle fields —
    assignedLawyerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    submittedAt:      { type: Date },
    completedAt:      { type: Date },
    lastActivityAt:   { type: Date },
    reminderSentAt:   { type: Date },
    reminderCount:    { type: Number, default: 0 },
    isDeleted:        { type: Boolean, default: false, index: true },
    deletedAt:        { type: Date },
}, {
    timestamps: true,
    minimize: false,    // Preserve empty objects in data: {} (critical for wizard resume)
});

// ============================================
// Compound Indexes — matched to real query patterns
// ============================================
IntakeSchema.index({ status: 1, type: 1, createdAt: -1 });    // Lawyer dashboard (primary query)
IntakeSchema.index({ clientId: 1, createdAt: -1 });            // Client's own intakes
IntakeSchema.index({ clientId: 1, isDeleted: 1, status: 1, updatedAt: -1 });
IntakeSchema.index({ assignedLawyerId: 1, status: 1 });        // Lawyer's assigned caseload
IntakeSchema.index({ priorityScore: -1 });                     // Priority ranking sort
IntakeSchema.index({ status: 1, lastActivityAt: 1 });          // Stale intake detection / nudge candidates

// ============================================
// Pre-save: Zod validation + auto-populate indexed fields
// ============================================
IntakeSchema.pre('save', function (next) {
    // Always update lastActivityAt on every save
    (this as any).lastActivityAt = new Date();

    if (this.isModified('data')) {
        const intakeType = (this as any).type || 'will';
        const schema = intakeType === 'incorporation' ? IncorporationDataSchema : IntakeDataSchema;
        const result = schema.safeParse((this as any).data);
        if (!result.success) {
            return next(new ValidationError('Validation Failed', result.error.issues) as any);
        }

        // Auto-populate indexed fields
        (this as any).clientName = (this as any).data?.personalProfile?.fullName
            || (this as any).data?.preIncorporation?.proposedName
            || '';
        (this as any).jurisdiction = (this as any).data?.preIncorporation?.jurisdiction
            || 'ontario';
    }

    // Auto-set lifecycle timestamps on status transitions
    if (this.isModified('status')) {
        const status = (this as any).status;
        if (status === 'submitted') {
            (this as any).submittedAt = new Date();
        }
        if (status === 'completed') {
            (this as any).completedAt = new Date();
        }
    }

    next();
});

export default mongoose.model<IIntake>('Intake', IntakeSchema);
