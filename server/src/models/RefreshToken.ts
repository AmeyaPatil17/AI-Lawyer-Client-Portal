import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
    tokenHash: string;
    userId: mongoose.Types.ObjectId;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
}

const RefreshTokenSchema: Schema = new Schema({
    tokenHash: { type: String, required: true, unique: true },
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },

    // Session metadata — enables "active sessions" UI and stolen-token detection
    userAgent: { type: String },
    ipAddress: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// TTL index to automatically remove expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
