import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Structured logger using Pino
 * - Development: Pretty-printed output
 * - Production: JSON format for log aggregation
 * - Test: Silent
 */
export const logger = pino({
    level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
    transport: !isProduction && !isTest ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    } : undefined,
    base: isProduction ? { pid: process.pid } : {},
    redact: {
        paths: ['req.headers.authorization', 'body.password', 'body.passwordHash'],
        censor: '[REDACTED]'
    }
});

// Child logger factory for context-specific logging
export const createLogger = (context: string) => logger.child({ context });

// Convenience exports
export const authLogger = createLogger('auth');
export const intakeLogger = createLogger('intake');
export const aiLogger = createLogger('ai');
