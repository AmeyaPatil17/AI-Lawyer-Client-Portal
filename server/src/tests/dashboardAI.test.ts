// Server uses Jest — follows exact same pattern as authController.test.ts

import { handleGetInsight, handleGenerateSummary } from '../controllers/intakeController';
import { Response } from 'express';
import Intake from '../models/Intake';
import { generateAIResponse } from '../services/aiService';

// All jest.mock calls are hoisted by Jest babel transform regardless of position
jest.mock('../models/Intake');
jest.mock('../services/aiService', () => ({
    generateAIResponse: jest.fn(),
    calculatePriorityScore: jest.fn(),
    generateAutoNote: jest.fn(),
    getClauseSuggestions: jest.fn(),
    parseAssetsFromText: jest.fn(),
    explainRisk: jest.fn(),
    parseAssetsFromFile: jest.fn(),
    validateIntakeLogic: jest.fn(),
    runStressTest: jest.fn(),
}));
jest.mock('../services/intakeValidationService', () => ({
    IntakeValidationService: { getNextMissingStep: jest.fn(() => 'executors') }
}));
jest.mock('../index', () => ({ io: { to: jest.fn().mockReturnThis(), emit: jest.fn() } }));
jest.mock('../services/emailService', () => ({ sendReminderEmail: jest.fn() }));
jest.mock('../services/rulesEngine', () => ({
    generateFlags: jest.fn(() => []),
    validateLogic: jest.fn()
}));

// --- Helpers ---

const mockRes = (): Response => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res) as any;
    res.json = jest.fn().mockReturnValue(res) as any;
    return res as Response;
};

const mockReq = (overrides: object = {}) =>
    ({ user: { userId: 'user-1', role: 'client' }, params: {}, body: {}, ...overrides }) as any;

const intakeId = '507f1f77bcf86cd799439011';

// ============================================================
// D1: handleGetInsight
// ============================================================

describe('handleGetInsight — D1', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 404 if intake not found', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue(null);
        const res = mockRes();
        await handleGetInsight(mockReq({ params: { id: intakeId } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Intake not found' });
    });

    it('returns 403 if user does not own the intake', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'will',
            clientId: { toString: () => 'other-user' },
            data: { profile: {} }
        });
        const res = mockRes();
        await handleGetInsight(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns static onboarding message for empty-data intake without calling Gemini', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'will',
            clientId: { toString: () => 'user-1' },
            data: {}
        });
        const res = mockRes();
        await handleGetInsight(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            insight: expect.stringContaining('Personal Profile'),
            step: 'profile'
        }));
    });

    it('calls Gemini and returns trimmed insight for a populated intake', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'will',
            clientId: { toString: () => 'user-1' },
            data: { personalProfile: { fullName: 'Alice Smith' } }
        });
        (generateAIResponse as jest.Mock).mockResolvedValue("  You haven't named an executor yet.  ");
        const res = mockRes();
        await handleGetInsight(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            insight: "You haven't named an executor yet.",
            step: 'executors'
        }));
    });

    it('returns deterministic onboarding insight for an empty incorporation intake', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'incorporation',
            clientId: { toString: () => 'user-1' },
            data: {}
        });
        const res = mockRes();
        await handleGetInsight(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            insight: expect.stringContaining('jurisdiction'),
            step: 'preIncorporation'
        }));
    });

    it('calls Gemini and returns trimmed incorporation insight for a populated incorporation intake', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'incorporation',
            clientId: { toString: () => 'user-1' },
            data: {
                preIncorporation: {
                    jurisdiction: 'obca',
                    nameType: 'named',
                    proposedName: 'Blue Heron Consulting',
                    legalEnding: 'Inc.',
                    nameConfirmed: true,
                    nuansReport: { reportDate: '2026-03-01' },
                    nuansReviewed: true,
                },
                structureOwnership: {},
            }
        });
        (generateAIResponse as jest.Mock).mockResolvedValue('  You still need to define your share classes and your initial shareholder list.  ');
        const res = mockRes();
        await handleGetInsight(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).toHaveBeenCalledWith(
            expect.stringContaining('Canadian incorporation assistant'),
            {},
            'dashboard_insight'
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            insight: 'You still need to define your share classes and your initial shareholder list.',
            step: 'structureOwnership'
        }));
    });

    it('propagates unexpected DB errors (caught by Express error handler)', async () => {
        (Intake.findById as jest.Mock).mockRejectedValue(new Error('DB error'));
        const res = mockRes();
        await expect(
            handleGetInsight(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res)
        ).rejects.toThrow('DB error');
    });
});

// ============================================================
// D5: handleGenerateSummary
// ============================================================

describe('handleGenerateSummary — D5', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 404 if intake not found', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue(null);
        const res = mockRes();
        await handleGenerateSummary(mockReq({ params: { id: intakeId } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Intake not found' });
    });

    it('returns 403 if user does not own the intake', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'will',
            clientId: { toString: () => 'other-user' },
            data: {}
        });
        const res = mockRes();
        await handleGenerateSummary(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns cached aiSummary without calling Gemini', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'will',
            clientId: { toString: () => 'user-1' },
            data: {},
            aiSummary: 'You are leaving your estate to Alice and Bob.'
        });
        const res = mockRes();
        await handleGenerateSummary(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ summary: 'You are leaving your estate to Alice and Bob.' });
    });

    it('calls Gemini, saves, and returns new summary when no cache exists', async () => {
        const saveMock = jest.fn().mockResolvedValue(undefined);
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'will',
            clientId: { toString: () => 'user-1' },
            data: { personalProfile: { fullName: 'Alice' } },
            aiSummary: undefined,
            save: saveMock
        });
        (generateAIResponse as jest.Mock).mockResolvedValue('You are leaving your estate equally to your spouse.');
        const res = mockRes();
        await handleGenerateSummary(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).toHaveBeenCalledWith(
            expect.stringContaining('estate plan'),
            expect.any(Object),
            'estate_summary'
        );
        expect(saveMock).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ summary: 'You are leaving your estate equally to your spouse.' });
    });

    it('returns cached incorporation aiSummary without calling Gemini', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'incorporation',
            clientId: { toString: () => 'user-1' },
            data: {},
            aiSummary: 'Blue Heron Consulting Inc. is set up as an Ontario named corporation with one director and one shareholder.'
        });
        const res = mockRes();
        await handleGenerateSummary(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            summary: 'Blue Heron Consulting Inc. is set up as an Ontario named corporation with one director and one shareholder.'
        });
    });

    it('calls Gemini, saves, and returns a new incorporation summary when no cache exists', async () => {
        const saveMock = jest.fn().mockResolvedValue(undefined);
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'incorporation',
            status: 'reviewing',
            clientId: { toString: () => 'user-1' },
            data: {
                preIncorporation: {
                    jurisdiction: 'obca',
                    nameType: 'named',
                    proposedName: 'Blue Heron Consulting',
                    legalEnding: 'Inc.',
                    nameConfirmed: true,
                    nuansReport: { reportDate: '2026-03-01' },
                    nuansReviewed: true,
                },
                structureOwnership: {
                    shareClasses: [{ id: 'class_1', className: 'Common', votingRights: true }],
                    initialShareholders: [{ id: 'holder_1', fullName: 'Jane Founder', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 100 }],
                    directors: [{ id: 'director_1', fullName: 'Jane Founder', address: '100 King St W' }],
                    registeredOfficeAddress: '100 King St W',
                    registeredOfficeProvince: 'ON',
                },
            },
            aiSummary: undefined,
            save: saveMock
        });
        (generateAIResponse as jest.Mock).mockResolvedValue('Blue Heron Consulting Inc. is being incorporated in Ontario as a named corporation. Jane Founder is currently listed as both the sole director and sole shareholder. The company has one Common share class in place. The matter is now under review.');
        const res = mockRes();
        await handleGenerateSummary(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);
        expect(generateAIResponse).toHaveBeenCalledWith(
            expect.stringContaining('business incorporation setup'),
            {},
            'estate_summary'
        );
        expect(saveMock).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            summary: 'Blue Heron Consulting Inc. is being incorporated in Ontario as a named corporation. Jane Founder is currently listed as both the sole director and sole shareholder. The company has one Common share class in place. The matter is now under review.'
        });
    });

    it('prompt uses <context> tag and does NOT contain raw PII fields (address, phone, email)', async () => {
        const saveMock = jest.fn().mockResolvedValue(undefined);
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: intakeId,
            type: 'will',
            clientId: { toString: () => 'user-1' },
            data: {
                personalProfile: {
                    fullName: 'Alice Smith',
                    address: '123 Main St, Toronto ON',
                    phone: '416-555-0100',
                    email: 'alice@example.com',
                    dateOfBirth: '1975-06-12'
                },
                family: { maritalStatus: 'Married', spouseName: 'Bob Smith' }
            },
            aiSummary: undefined,
            save: saveMock
        });
        (generateAIResponse as jest.Mock).mockResolvedValue('You are leaving your estate to Bob Smith.');
        const res = mockRes();
        await handleGenerateSummary(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res);

        // Verify the prompt sent to Gemini
        const [promptArg, contextArg] = (generateAIResponse as jest.Mock).mock.calls[0];

        // Prompt must use <context> tag (scoped, not raw JSON)
        expect(promptArg).toContain('<context>');

        // Prompt must NOT contain raw PII fields
        expect(promptArg).not.toContain('123 Main St');
        expect(promptArg).not.toContain('416-555-0100');
        expect(promptArg).not.toContain('alice@example.com');
        expect(promptArg).not.toContain('1975-06-12');

        // Context arg passed to generateAIResponse must be empty object (not full intake.data)
        expect(contextArg).toEqual({});
    });

    it('propagates unexpected DB errors (caught by Express error handler)', async () => {
        (Intake.findById as jest.Mock).mockRejectedValue(new Error('DB timeout'));
        const res = mockRes();
        await expect(
            handleGenerateSummary(mockReq({ user: { userId: 'user-1' }, params: { id: intakeId } }), res)
        ).rejects.toThrow('DB timeout');
    });
});
