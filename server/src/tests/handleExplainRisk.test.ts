import request from 'supertest';
import app from '../index';
import Intake from '../models/Intake';
import { explainRisk } from '../services/aiService';

// Mock dependencies
jest.mock('../models/Intake');
jest.mock('../services/aiService');
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn().mockReturnValue({ userId: 'test-user', role: 'client' }),
    sign: jest.fn().mockReturnValue('mock-token')
}));
jest.mock('../middleware/authMiddleware', () => ({
    authenticate: jest.fn((req: any, res: any, next: any) => {
        req.user = { id: 'test-user', role: 'client' };
        next();
    }),
    requireAuth: jest.fn((req: any, res: any, next: any) => {
        req.user = { id: 'test-user', role: 'client' };
        next();
    }),
    requireRole: jest.fn((..._roles: string[]) => (req: any, res: any, next: any) => next()),
    requireOwnership: jest.fn((_getter: any) => (req: any, res: any, next: any) => next()),
    optionalAuth: jest.fn((req: any, res: any, next: any) => next())
}));

jest.mock('../middleware/csrfMiddleware', () => ({
    doubleSubmitCsrf: jest.fn((req: any, res: any, next: any) => next())
}));

describe('handleExplainRisk Error Response (Issue #3)', () => {
    const intakeId = '507f1f77bcf86cd799439011';
    const originalError = console.error;

    beforeEach(() => {
        jest.clearAllMocks();
        // Suppress expected console.error from controller's catch block
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = originalError;
    });

    it('should return 500 with JSON error when explainRisk throws', async () => {
        const mockIntake = {
            _id: intakeId,
            clientId: 'test-user',
            data: { personalProfile: { fullName: 'Test' } },
        };

        (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
        (explainRisk as jest.Mock).mockRejectedValue(new Error('AI service unavailable'));

        const res = await request(app)
            .post(`/api/intake/${intakeId}/explain-flag`)
            .send({ flagCode: 'FOREIGN_ASSETS' });

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('unavailable');
    });

    it('should return explanation when explainRisk succeeds', async () => {
        const mockIntake = {
            _id: intakeId,
            clientId: 'test-user',
            data: { personalProfile: { fullName: 'Test' } },
        };

        (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
        (explainRisk as jest.Mock).mockResolvedValue('This is a risk because...');

        const res = await request(app)
            .post(`/api/intake/${intakeId}/explain-flag`)
            .send({ flagCode: 'FOREIGN_ASSETS' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('explanation');
        expect(res.body.explanation).toBe('This is a risk because...');
    });

    it('should return 403 when a client explains another client intake flag', async () => {
        const mockIntake = {
            _id: intakeId,
            clientId: { toString: () => 'other-user' },
            data: { personalProfile: { fullName: 'Test' } },
        };

        (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

        const res = await request(app)
            .post(`/api/intake/${intakeId}/explain-flag`)
            .send({ flagCode: 'FOREIGN_ASSETS' });

        expect(res.status).toBe(403);
        expect(explainRisk).not.toHaveBeenCalled();
    });
});
