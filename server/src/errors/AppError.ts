/**
 * AppError.ts
 *
 * Typed error hierarchy for the Valiant Law API.
 * Controllers throw these; the centralized error handler in index.ts formats responses.
 *
 * Usage:
 *   throw new NotFoundError('Intake');
 *   throw new ForbiddenError('update');
 *   throw new ValidationError('Validation failed', zodIssues);
 */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(statusCode: number, message: string, code: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        // Maintain proper prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(404, `${resource} not found`, 'NOT_FOUND');
    }
}

export class ForbiddenError extends AppError {
    constructor(action = 'access') {
        super(403, `Not authorized to ${action} this resource`, 'FORBIDDEN');
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message, 'CONFLICT');
    }
}

export class ValidationError extends AppError {
    public readonly errors?: any[];
    constructor(message: string, errors?: any[]) {
        super(400, message, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class AIServiceError extends AppError {
    constructor(operation: string) {
        super(502, `AI service unavailable during: ${operation}`, 'AI_SERVICE_ERROR');
    }
}

export class BadRequestError extends AppError {
    constructor(message: string) {
        super(400, message, 'BAD_REQUEST');
    }
}

/**
 * asyncHandler — Express middleware wrapper for async route handlers.
 * Catches rejected promises and forwards them to the centralized error handler.
 *
 * Usage:
 *   router.get('/foo', asyncHandler(myAsyncController));
 */
import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncRouteHandler) =>
    (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);
