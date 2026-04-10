import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    role: 'client' | 'lawyer' | 'admin';
    isActive: boolean;
    name: string;
    phone?: string;
    barNumber?: string;
    lastLoginAt?: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    isEmailVerified?: boolean;
    emailVerificationToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,   // Never returned unless explicitly requested via .select('+passwordHash')
    },
    role: {
        type: String,
        enum: ['client', 'lawyer', 'admin'],
        default: 'client',
        index: true,
    },
    isActive: { type: Boolean, default: true },

    // Profile
    name:      { type: String, trim: true, default: '' },
    phone:     { type: String, trim: true },
    barNumber: { type: String },           // Lawyers only

    // Security audit
    lastLoginAt:        { type: Date },
    failedLoginAttempts:{ type: Number, default: 0 },
    lockedUntil:        { type: Date },
    isEmailVerified:    { type: Boolean },            // undefined for legacy users, false for new
    emailVerificationToken: { type: String, select: false },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
