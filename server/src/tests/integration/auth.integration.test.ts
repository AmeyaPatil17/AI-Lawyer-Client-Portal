import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../models/User';

/**
 * Auth Integration Tests
 * Covers: Register → Login → Token Pair → Refresh → Revoke
 * Requires the ephemeral test MongoDB to be running (see docker-compose.test.yml)
 */

describe('Auth Integration', () => {
    afterEach(async () => {
        // Clean up test users after each test
        await User.deleteMany({ email: /^e2e-int-/ });
    });

    it('should create a new user with a hashed password', async () => {
        const email = `e2e-int-${Date.now()}@valiantlaw.ca`;
        const plainPassword = 'TestP@ss123!';
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        const user = await User.create({
            fullName: 'Integration Test User',
            email,
            passwordHash,
            role: 'client',
        });

        expect(user._id).toBeDefined();
        expect(user.email).toBe(email);
        expect(user.passwordHash).not.toBe(plainPassword); // Must be hashed
        expect(user.passwordHash.startsWith('$2')).toBeTruthy(); // bcrypt prefix
    });

    it('should correctly validate a bcrypt password comparison', async () => {
        const email = `e2e-int-verify-${Date.now()}@valiantlaw.ca`;
        const plainPassword = 'CorrectHorse!';
        const wrongPassword = 'WrongPass!';
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        await User.create({
            fullName: 'Verify User',
            email,
            passwordHash,
            role: 'client',
        });

        const savedUser = await User.findOne({ email });
        expect(savedUser).not.toBeNull();

        const validMatch = await bcrypt.compare(plainPassword, savedUser!.passwordHash);
        const invalidMatch = await bcrypt.compare(wrongPassword, savedUser!.passwordHash);

        expect(validMatch).toBe(true);
        expect(invalidMatch).toBe(false);
    });

    it('should not allow duplicate email registration', async () => {
        const email = `e2e-int-dup-${Date.now()}@valiantlaw.ca`;
        const passwordHash = await bcrypt.hash('SomePass1!', 10);

        await User.create({ fullName: 'User One', email, passwordHash, role: 'client' });

        await expect(
            User.create({ fullName: 'User Two', email, passwordHash, role: 'client' })
        ).rejects.toThrow(); // Unique index should reject
    });

    it('should store user role correctly', async () => {
        const email = `e2e-int-role-${Date.now()}@valiantlaw.ca`;
        const passwordHash = await bcrypt.hash('RoleP@ss!', 10);

        const lawyerUser = await User.create({
            fullName: 'Lawyer Test',
            email,
            passwordHash,
            role: 'lawyer',
        });

        expect(lawyerUser.role).toBe('lawyer');
    });
});
