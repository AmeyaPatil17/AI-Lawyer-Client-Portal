import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, optionalAuth, requireOwnership, AuthRequest } from '../middleware/authMiddleware';

jest.mock('jsonwebtoken');

describe('AuthMiddleware', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        nextFunction = jest.fn();
        jest.clearAllMocks();
    });

    describe('authenticate', () => {
        it('should attach user and call next if token is valid', () => {
            mockRequest = { header: jest.fn().mockReturnValue('Bearer valid-token') };
            const decodedPayload = { userId: '123', role: 'client' };
            (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);

            authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
            expect(mockRequest.user).toEqual(decodedPayload);
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should return 401 if header is missing', () => {
            mockRequest = { header: jest.fn().mockReturnValue(undefined) };

            authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should return 401 if token is invalid or expired', () => {
            mockRequest = { header: jest.fn().mockReturnValue('Bearer invalid-token') };
            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Expired'); });

            authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('requireRole', () => {
        it('should call next if user has an allowed role', () => {
            mockRequest = { user: { userId: '123', email: 'a@a.com', role: 'lawyer' } };
            const middleware = requireRole('lawyer', 'admin');

            middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should return 403 if user role is not allowed', () => {
            mockRequest = { user: { userId: '123', email: 'a@a.com', role: 'client' } };
            const middleware = requireRole('lawyer', 'admin');

            middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Insufficient permissions' }));
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should return 401 if user is missing', () => {
            mockRequest = {};
            const middleware = requireRole('lawyer');

            middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
        });
    });

    describe('optionalAuth', () => {
        it('should attach user if valid token exists', () => {
            mockRequest = { header: jest.fn().mockReturnValue('Bearer valid') };
            (jwt.verify as jest.Mock).mockReturnValue({ userId: '1', role: 'client' });

            optionalAuth(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(mockRequest.user).toBeDefined();
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should call next without attaching user if error', () => {
            mockRequest = { header: jest.fn().mockReturnValue('Bearer invalid') };
            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error(); });

            optionalAuth(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(mockRequest.user).toBeUndefined();
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should call next if no token provided', () => {
            mockRequest = { header: jest.fn().mockReturnValue(undefined) };

            optionalAuth(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(mockRequest.user).toBeUndefined();
            expect(nextFunction).toHaveBeenCalled();
        });
    });

    describe('requireOwnership', () => {
        const getOwnerId = (req: AuthRequest) => req.params?.id;

        it('should call next if user owns the resource', () => {
            mockRequest = { user: { userId: 'u1', email: 'a@a', role: 'client' }, params: { id: 'u1' } };
            const middleware = requireOwnership(getOwnerId);

            middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should bypass ownership check if user is admin', () => {
            mockRequest = { user: { userId: 'admin1', email: 'a@a', role: 'admin' }, params: { id: 'different' } };
            const middleware = requireOwnership(getOwnerId);

            middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should return 403 if user does not own resource', () => {
            mockRequest = { user: { userId: 'u1', email: 'a@a', role: 'client' }, params: { id: 'u2' } };
            const middleware = requireOwnership(getOwnerId);

            middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Access denied' });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should return 401 if user is not authenticated', () => {
            mockRequest = { params: { id: 'u1' } };
            const middleware = requireOwnership(getOwnerId);

            middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
        });
    });
});
