import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordResetToken extends Document {
    userId: mongoose.Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    used: boolean;
    requestedFromIp?: string;
    usedAt?: Date;
}

const PasswordResetTokenSchema: Schema = new Schema({
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used:      { type: Boolean, default: false },

    // Audit fields
    requestedFromIp: { type: String },
    usedAt:          { type: Date },
});

// Compound index for the most common query: find valid (unused, unexpired) token for a user
PasswordResetTokenSchema.index({ userId: 1, used: 1, expiresAt: 1 });

// Auto-delete expired documents (MongoDB TTL index)
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
