import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { logger } from '../services/logger';

/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
export const validateRequest = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
            const result = schema.parse(data);

            // Replace with validated/transformed data
            if (source === 'body') req.body = result;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                logger.warn({
                    path: req.path,
                    issues: error.issues
                }, 'Validation failed');

                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.issues.map((issue: ZodIssue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    })),
                });
            }
            next(error);
        }
    };
};

/**
 * Validate body specifically
 */
export const validateBody = (schema: ZodSchema) => validateRequest(schema, 'body');

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => validateRequest(schema, 'query');

/**
 * Validate URL parameters
 */
export const validateParams = (schema: ZodSchema) => validateRequest(schema, 'params');
