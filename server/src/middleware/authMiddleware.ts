import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../services/logger';

import { JWT_CONFIG } from '../config/jwtConfig';

/**
 * Extended Request interface with user payload
 */
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: 'client' | 'lawyer' | 'admin';
    };
}

/**
 * Authenticate middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Read from cookie first, fallback to auth header for API clients
    const token = req.cookies?.access_token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_CONFIG.secret) as AuthRequest['user'];
        req.user = decoded;
        next();
    } catch (err) {
        logger.warn({ err }, 'Invalid token attempt');
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Alias for authenticate (for consistency with implementation plan)
 */
export const requireAuth = authenticate;

/**
 * Role-based authorization middleware factory
 * Use after authenticate middleware
 * 
 * @example
 * router.get('/matters', authenticate, requireRole('lawyer', 'admin'), getMatters);
 */
export const requireRole = (...allowedRoles: Array<'client' | 'lawyer' | 'admin'>) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn({
                userId: req.user.userId,
                role: req.user.role,
                requiredRoles: allowedRoles
            }, 'Insufficient permissions');

            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't require it
 */
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.access_token || req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_CONFIG.secret) as AuthRequest['user'];
            req.user = decoded;
        } catch {
            // Token invalid, but continue without user
        }
    }

    next();
};

/**
 * Ownership check middleware factory
 * Ensures the resource belongs to the requesting user (or user is admin)
 * 
 * @param getOwnerId - Function to extract owner ID from request
 */
export const requireOwnership = (getOwnerId: (req: AuthRequest) => string | undefined) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role === 'admin') {
            return next(); // Admins bypass ownership check
        }

        const ownerId = getOwnerId(req);
        if (ownerId && ownerId !== req.user.userId) {
            logger.warn({
                userId: req.user.userId,
                resourceOwnerId: ownerId
            }, 'Ownership violation attempt');

            return res.status(403).json({ error: 'Access denied' });
        }

        next();
    };
};
