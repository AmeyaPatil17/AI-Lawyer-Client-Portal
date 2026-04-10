import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest, validateBody, validateQuery, validateParams } from '../middleware/validateRequest';

const testSchema = z.object({
    name: z.string().min(3),
    age: z.number().optional()
});

describe('ValidateRequest Middleware', () => {
    let mockRequest: Partial<Request>;
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

    describe('validateBody', () => {
        it('should call next and replace body with parsed data on success', () => {
            mockRequest = { body: { name: 'John', extraField: 'removeThis' } };
            const middleware = validateBody(testSchema);

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            // testSchema strips extra fields implicitly
            expect(mockRequest.body).toEqual({ name: 'John' });
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should return 400 with details on validation failure', () => {
            mockRequest = { body: { name: 'Jo' } }; // too short
            const middleware = validateBody(testSchema);

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Validation failed',
                details: expect.any(Array)
            }));
            expect(jsonMock.mock.calls[0][0].details[0].field).toBe('name');
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should pass non-Zod errors to error handler (next)', () => {
            mockRequest = { body: null }; // Will throw TypeError in parse
            const explodingSchema = { parse: () => { throw new Error('Boom'); } } as any;
            const middleware = validateBody(explodingSchema);

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('validateQuery', () => {
        it('should validate query params', () => {
            mockRequest = { query: { name: 'Jane' } };
            const middleware = validateQuery(testSchema);

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            // Note: Does not replace req.query
        });
    });

    describe('validateParams', () => {
        it('should validate route params', () => {
            mockRequest = { params: { name: 'Alice' } };
            const middleware = validateParams(testSchema);

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            // Note: Does not replace req.params
        });
    });
});
