import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import AuditLog from '../models/AuditLog';
import crypto from 'crypto';
import { logger } from '../services/logger';
import { sendVerificationEmail } from '../services/emailService';
import { generateTokenPair, verifyAndRefresh } from '../middleware/refreshToken';
import { AppError } from '../errors/AppError';

import { JWT_CONFIG } from '../config/jwtConfig';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const register = async (req: Request, res: Response) => {
    try {
        // Gap 1: Normalize email before all DB operations
        const normalizedEmail = typeof req.body.email === 'string'
            ? req.body.email.toLowerCase().trim()
            : '';
        const { password, name } = req.body;

        if (!normalizedEmail) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Server-side password policy — all five rules required
        const policyErrors: string[] = [];
        if (!password || password.length < 8)            policyErrors.push('at least 8 characters');
        if (!/[A-Z]/.test(password))                     policyErrors.push('an uppercase letter');
        if (!/[a-z]/.test(password))                     policyErrors.push('a lowercase letter');
        if (!/[0-9]/.test(password))                     policyErrors.push('a number');
        if (!/[^A-Za-z0-9]/.test(password))              policyErrors.push('a special character');

        if (policyErrors.length > 0) {
            return res.status(400).json({
                message: `Password must contain ${policyErrors.join(', ')}.`
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = new User({
            email: normalizedEmail,
            passwordHash,
            role: 'client',
            name: name?.trim() || '',
            isEmailVerified: false,
            emailVerificationToken: verificationToken,
        });
        await newUser.save();

        await sendVerificationEmail(normalizedEmail, name?.trim() || '', verificationToken);

        res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });

    } catch (error) {
        // Gap 3: Do not leak raw error to client
        logger.error({ err: error }, 'Register error');
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        // Gap 1: Normalize email before DB lookup
        const normalizedEmail = typeof req.body.email === 'string'
            ? req.body.email.toLowerCase().trim()
            : '';
        const { password } = req.body;

        if (!normalizedEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // select('+passwordHash') required because passwordHash has select: false
        const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
        if (!user || !user.passwordHash) return res.status(400).json({ message: 'Invalid credentials' });
        
        if (user.isActive === false) return res.status(403).json({ message: 'Account is disabled. Please contact support.' });
        if (user.isEmailVerified === false) return res.status(403).json({ message: 'Please verify your email address to log in.' });

        // Brute-force protection: check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMs = user.lockedUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            return res.status(429).json({
                message: `Account temporarily locked. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            // Increment failed attempts
            const attempts = (user.failedLoginAttempts || 0) + 1;
            const updateFields: Record<string, unknown> = { failedLoginAttempts: attempts };

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                updateFields.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            }

            await User.findByIdAndUpdate(user._id, updateFields);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Successful login: reset brute-force counters, update lastLoginAt
        await User.findByIdAndUpdate(user._id, {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
        });

        const tokens = await generateTokenPair(user);

        res.cookie('access_token', tokens.accessToken, JWT_CONFIG.cookieOptions(process.env.NODE_ENV === 'production'));

        res.json({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: user._id, email: user.email, role: user.role, name: user.name }
        });
    } catch (error) {
        // Gap 4: use structured Pino logger instead of console.error
        logger.error({ err: error }, 'Login error');
        res.status(500).json({ message: 'Server error' });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Verification token is required' });

        const user = await User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken');
        if (!user) return res.status(400).json({ message: 'Invalid or expired verification token' });

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully. You may now log in.' });
    } catch (error) {
        logger.error({ err: error }, 'Email verification error');
        res.status(500).json({ message: 'Server error during verification' });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });
        
        const newTokens = await verifyAndRefresh(refreshToken);
        
        res.cookie('access_token', newTokens.accessToken, JWT_CONFIG.cookieOptions(process.env.NODE_ENV === 'production'));

        res.json({ token: newTokens.accessToken, refreshToken: newTokens.refreshToken, user: newTokens.user });
    } catch (error: any) {
        res.status(401).json({ message: 'Invalid or expired refresh token', error: error.message });
    }
};

export const getActivityLogs = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
        throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    const logs = await AuditLog.find({ actorId: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('action createdAt metadata');
    res.json(logs);
};
