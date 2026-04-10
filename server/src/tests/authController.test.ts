import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login } from '../controllers/authController';
import User from '../models/User';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../models/User');
jest.mock('../middleware/refreshToken', () => ({
    generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'mocked-token',
        refreshToken: 'mocked-refresh-token',
    }),
    verifyAndRefresh: jest.fn(),
}));

/**
 * Creates a chainable mock for User.findOne that supports .select('+passwordHash').
 * The login controller chains: User.findOne({ email }).select('+passwordHash')
 */
const mockFindOneChain = (resolvedValue: any) => ({
    select: jest.fn().mockResolvedValue(resolvedValue),
});

const mockFindOneChainRejected = (error: Error) => ({
    select: jest.fn().mockRejectedValue(error),
});

describe('AuthController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let cookieMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        cookieMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
            cookie: cookieMock,
        };
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            mockRequest = {
                body: { email: 'test@example.com', password: 'Password123!', role: 'client' },
            };

            (User.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

            const saveMock = jest.fn().mockResolvedValue(true);
            (User as unknown as jest.Mock).mockImplementation(() => ({
                save: saveMock,
            }));

            await register(mockRequest as Request, mockResponse as Response);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'salt');
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User registered successfully. Please check your email to verify your account.' });
        });

        it('should return 400 if user already exists', async () => {
            mockRequest = {
                body: { email: 'existing@example.com', password: 'Password123!' },
            };

            (User.findOne as jest.Mock).mockResolvedValue({ email: 'existing@example.com' });

            await register(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User already exists' });
        });

        it('should handle server errors', async () => {
            mockRequest = { body: { email: 'test@example.com', password: 'Password123!' } };
            (User.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await register(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server error' }));
        });
    });

    describe('login', () => {
        const mockUser = {
            _id: 'user123',
            email: 'test@example.com',
            passwordHash: 'hashedPassword',
            role: 'client',
            name: '',
            isActive: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
        };

        // Helper: mock User.findOne to return a chainable .select()
        const mockLogin = (resolvedUser: any) => {
            (User.findOne as jest.Mock).mockReturnValue(mockFindOneChain(resolvedUser));
            // findByIdAndUpdate is called on success/failure to update login state
            (User.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({});
        };

        it('should login successfully and return token', async () => {
            mockRequest = {
                body: { email: 'test@example.com', password: 'Password123!' },
            };

            mockLogin(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await login(mockRequest as Request, mockResponse as Response);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashedPassword');
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    refreshToken: 'mocked-refresh-token',
                    user: expect.objectContaining({ id: mockUser._id, email: mockUser.email, role: mockUser.role }),
                })
            );
            expect(cookieMock).toHaveBeenCalledWith('access_token', 'mocked-token', expect.any(Object));
        });

        it('should return 400 if user not found', async () => {
            mockRequest = { body: { email: 'notfound@example.com', password: 'Password123!' } };
            (User.findOne as jest.Mock).mockReturnValue(mockFindOneChain(null));

            await login(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid credentials' });
        });

        it('should return 400 if password does not match', async () => {
            mockRequest = { body: { email: 'test@example.com', password: 'wrongpassword!' } };
            mockLogin(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await login(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid credentials' });
        });

        it('should handle server errors', async () => {
            mockRequest = { body: { email: 'test@example.com', password: 'Password123!' } };
            // Mock findOne to return chain where .select() rejects
            (User.findOne as jest.Mock).mockReturnValue(mockFindOneChainRejected(new Error('DB Error')));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await login(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server error' }));
            consoleSpy.mockRestore();
        });

        it('should return 429 if account is locked', async () => {
            const lockedUser = {
                ...mockUser,
                lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
            };
            mockRequest = { body: { email: 'test@example.com', password: 'Password123!' } };
            (User.findOne as jest.Mock).mockReturnValue(mockFindOneChain(lockedUser));

            await login(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(429);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('locked') }));
        });
    });
});
