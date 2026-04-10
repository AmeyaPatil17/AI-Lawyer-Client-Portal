import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../services/logger';

export const doubleSubmitCsrf = (req: Request, res: Response, next: NextFunction) => {
    // 1. Generate token if missing (useful for initial page load or login)
    let cookieToken = req.cookies['XSRF-TOKEN'];
    if (!cookieToken) {
        cookieToken = crypto.randomBytes(32).toString('hex');
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('XSRF-TOKEN', cookieToken, {
            secure: isProd,
            sameSite: 'strict',
            // No httpOnly, so JS can read it for the header
        });
    }

    // 2. Validate on state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // Skip API clients using Bearer tokens (mobile apps, external services)
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return next();
        }

        // Skip auth endpoints that don't depend on existing session state
        // (Login CSRF is lower risk than mutation CSRF, and clients often won't have the cookie yet)
        const publicAuthRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
        const isPublicAuthRoute = publicAuthRoutes.some(route => req.originalUrl.startsWith(route));
        
        if (isPublicAuthRoute) {
            return next();
        }

        const headerToken = req.header('X-XSRF-TOKEN');
        
        if (!headerToken || cookieToken !== headerToken) {
            logger.warn({
                path: req.originalUrl,
                method: req.method,
                ip: req.ip
            }, 'CSRF token mismatch or missing');
            return res.status(403).json({ error: 'CSRF token validation failed' });
        }
    }

    next();
};
