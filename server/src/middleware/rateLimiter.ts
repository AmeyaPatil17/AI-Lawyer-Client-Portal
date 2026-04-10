import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const getUserKey = (req: any) => {
    if (req.user && req.user.userId) {
        return `user:${req.user.userId}`;
    }
    return ipKeyGenerator(req.ip ?? '');
};

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per user/IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserKey,
});

/**
 * Auth-specific rate limiter (stricter)
 * 20 attempts per hour per IP — production-safe value
 * (was 500 during development; reduced for security)
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 200,
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
});

/**
 * AI endpoint rate limiter
 * 30 requests per minute per user/IP (matches env AI_RATE_LIMIT)
 */
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.AI_RATE_LIMIT || '30'),
    message: { error: 'AI rate limit exceeded, please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserKey,
});
