import mongoose from 'mongoose';
import '../setupIntegration';
import User from '../../models/User';
import RefreshToken from '../../models/RefreshToken';
import { generateTokenPair, verifyAndRefresh, revokeRefreshToken } from '../../middleware/refreshToken';

describe('refreshToken integration', () => {
    let mockUser: any;

    beforeEach(async () => {
        await User.deleteMany({});
        await RefreshToken.deleteMany({});
        
        mockUser = await User.create({
            email: 'test@example.com',
            passwordHash: 'hashed',
            role: 'client'
        });
    });

    it('should generate a token pair and store hashed refresh token', async () => {
        const tokens = await generateTokenPair(mockUser);
        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();

        const storedTokens = await RefreshToken.find();
        expect(storedTokens.length).toBe(1);
        expect(storedTokens[0].tokenHash).not.toBe(tokens.refreshToken); // Must be a hash, not raw
        expect(storedTokens[0].userId.toString()).toBe(mockUser._id.toString());
    });

    it('should verify and refresh a valid token, rotating it', async () => {
        const tokens = await generateTokenPair(mockUser);
        const originalRefreshToken = tokens.refreshToken;

        const newTokens = await verifyAndRefresh(originalRefreshToken);

        expect(newTokens.accessToken).toBeDefined();
        expect(newTokens.refreshToken).toBeDefined();
        expect(newTokens.refreshToken).not.toBe(originalRefreshToken);
        expect(newTokens.user.id.toString()).toBe(mockUser._id.toString());

        const tokensInDb = await RefreshToken.find();
        expect(tokensInDb.length).toBe(1); 
    });

    it('should throw an error for an invalid refresh token', async () => {
        await expect(verifyAndRefresh('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw an error and delete if token is expired', async () => {
        const tokens = await generateTokenPair(mockUser);
        
        const doc = await RefreshToken.findOne();
        doc!.expiresAt = new Date(Date.now() - 1000);
        await doc!.save();

        await expect(verifyAndRefresh(tokens.refreshToken)).rejects.toThrow('Refresh token expired');
        
        const remaining = await RefreshToken.countDocuments();
        expect(remaining).toBe(0);
    });

    it('should revoke token', async () => {
        const tokens = await generateTokenPair(mockUser);
        await revokeRefreshToken(tokens.refreshToken);
        const count = await RefreshToken.countDocuments();
        expect(count).toBe(0);
    });
});
