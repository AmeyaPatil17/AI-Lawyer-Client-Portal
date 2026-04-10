import mongoose, { Schema, Document } from 'mongoose';

export interface IAiUsageLog extends Document {
    userId?: mongoose.Types.ObjectId;
    intakeId?: mongoose.Types.ObjectId;
    endpoint: string;
    aiModel: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    createdAt: Date;
}

const AiUsageLogSchema = new Schema({
    userId:     { type: Schema.Types.ObjectId, ref: 'User' },
    intakeId:   { type: Schema.Types.ObjectId, ref: 'Intake' },
    endpoint:   { type: String, required: true },
    aiModel:    { type: String, required: true },
    promptTokens:     { type: Number, required: true, default: 0 },
    completionTokens: { type: Number, required: true, default: 0 },
    totalTokens:      { type: Number, required: true, default: 0 },
    latencyMs:        { type: Number, default: 0 },
    success:          { type: Boolean, default: true },
    errorMessage:     { type: String },
    createdAt:        { type: Date, default: Date.now },
});

// TTL: auto-purge after 90 days
AiUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 });

// Analytics compound indexes
AiUsageLogSchema.index({ userId: 1, createdAt: -1 });       // Usage by user
AiUsageLogSchema.index({ endpoint: 1, createdAt: -1 });     // Usage by endpoint
AiUsageLogSchema.index({ intakeId: 1 });                    // AI calls per matter

export default mongoose.model<IAiUsageLog>('AiUsageLog', AiUsageLogSchema);
