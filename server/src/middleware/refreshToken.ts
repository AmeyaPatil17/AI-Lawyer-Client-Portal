import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken';

import { JWT_CONFIG } from '../config/jwtConfig';

/**
 * Hash a raw refresh token string using SHA-256.
 * The raw token is sent to the client; only the hash is stored in MongoDB.
 */
const hashToken = (rawToken: string): string =>
    crypto.createHash('sha256').update(rawToken).digest('hex');

export const generateTokenPair = async (user: { _id: any, email: string, role: string }) => {
    // Access Token (15 minutes) - keeping short lived for security
    const accessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_CONFIG.secret,
        { expiresIn: JWT_CONFIG.accessTokenExpiry as any }
    );

    // Refresh Token (crypto random strong token)
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + JWT_CONFIG.refreshTokenExpiryDays);

    const refreshToken = new RefreshToken({
        tokenHash: hashToken(refreshTokenString),
        userId: user._id,
        expiresAt
    });

    await refreshToken.save();

    return {
        accessToken,
        refreshToken: refreshTokenString   // Raw token returned to client
    };
};

export const verifyAndRefresh = async (tokenString: string) => {
    // Look up by hash — raw token never stored in DB
    const tokenDoc = await RefreshToken.findOne({ tokenHash: hashToken(tokenString) }).populate('userId');
    
    if (!tokenDoc) {
        throw new Error('Invalid refresh token');
    }

    if (new Date() > tokenDoc.expiresAt) {
        await RefreshToken.deleteOne({ _id: tokenDoc._id });
        throw new Error('Refresh token expired');
    }

    const user = tokenDoc.userId as any; // populated User doc

    // Generate new Access Token
    const accessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_CONFIG.secret,
        { expiresIn: JWT_CONFIG.accessTokenExpiry as any }
    );

    // Generate a new refresh token (refresh token rotation)
    await RefreshToken.deleteOne({ _id: tokenDoc._id });
    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + JWT_CONFIG.refreshTokenExpiryDays);
    await new RefreshToken({ tokenHash: hashToken(newRefreshTokenString), userId: user._id, expiresAt: newExpiresAt }).save();
    
    return {
        accessToken,
        refreshToken: newRefreshTokenString,   // Raw token returned to client
        user: { id: user._id, email: user.email, role: user.role }
    };
};

export const revokeRefreshToken = async (tokenString: string) => {
    await RefreshToken.deleteOne({ tokenHash: hashToken(tokenString) });
};
