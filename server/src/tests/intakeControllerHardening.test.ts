import request from 'supertest';
import app, { io } from '../index';
import Intake from '../models/Intake';
import {
    parseAssetsFromText,
} from '../services/aiService';
import { sendReminderEmail } from '../services/emailService';
import { createIntake } from '../controllers/intakeController';

jest.mock('../models/Intake');
jest.mock('../services/aiService', () => ({
    generateAIResponse: jest.fn(),
    calculatePriorityScore: jest.fn(() => 42),
    generateAutoNote: jest.fn(() => 'Auto note'),
    getClauseSuggestions: jest.fn(),
    parseAssetsFromText: jest.fn(),
    explainRisk: jest.fn(),
    parseAssetsFromFile: jest.fn(),
    validateIntakeLogic: jest.fn(),
    runStressTest: jest.fn(),
}));
jest.mock('../services/emailService', () => ({
    sendReminderEmail: jest.fn(),
}));
jest.mock('../middleware/authMiddleware', () => ({
    authenticate: jest.fn((req: any, _res: any, next: any) => {
        req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
        next();
    }),
    requireAuth: jest.fn((_req: any, _res: any, next: any) => next()),
    requireRole: jest.fn(() => (_req: any, _res: any, next: any) => next()),
    requireOwnership: jest.fn(() => (_req: any, _res: any, next: any) => next()),
    optionalAuth: jest.fn((_req: any, _res: any, next: any) => next()),
}));
jest.mock('../middleware/csrfMiddleware', () => ({
    doubleSubmitCsrf: jest.fn((_req: any, _res: any, next: any) => next()),
}));

const intakeId = '507f1f77bcf86cd799439011';
const missingIntakeId = '507f1f77bcf86cd799439099';

const makeResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const buildBaseIntake = (overrides: Record<string, any> = {}): any => ({
    _id: intakeId,
    clientId: { toString: () => 'test-user' },
    type: 'will',
    status: 'started',
    data: {},
    flags: [],
    logicWarnings: [],
    notes: [],
    aiSummary: 'Cached summary',
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    save: jest.fn().mockResolvedValue(true),
    markModified: jest.fn(),
    increment: jest.fn(),
    toObject(): any {
        return {
            _id: this._id,
            clientId: this.clientId,
            type: this.type,
            status: this.status,
            data: this.data,
            flags: this.flags,
            logicWarnings: this.logicWarnings,
            notes: this.notes,
            aiSummary: this.aiSummary,
            __v: this.__v,
        };
    },
    ...overrides,
});

describe('intakeController hardening regressions', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('createIntake ignores deleted drafts when checking for an active draft', async () => {
        const created = buildBaseIntake();
        (Intake.findOne as jest.Mock).mockReturnValue({
            sort: jest.fn().mockResolvedValue(null),
        });
        (Intake as unknown as jest.Mock).mockImplementationOnce(() => created);

        const req: any = {
            user: { userId: 'test-user', role: 'client' },
            body: { type: 'will' },
        };
        const res = makeResponse();

        await createIntake(req, res);

        expect(Intake.findOne).toHaveBeenCalledWith({
            clientId: 'test-user',
            type: 'will',
            status: 'started',
            isDeleted: { $ne: true },
        });
        expect(created.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('resetIntake soft-deletes started drafts and sets deletedAt', async () => {
        const intake = buildBaseIntake();
        (Intake.findById as jest.Mock).mockResolvedValue(intake);

        const res = await request(app).delete(`/api/intake/${intakeId}`);

        expect(res.status).toBe(204);
        expect(intake.isDeleted).toBe(true);
        expect(intake.deletedAt).toBeInstanceOf(Date);
        expect(intake.save).toHaveBeenCalled();
    });

    it('updateIntake returns 404 for deleted intakes', async () => {
        (Intake.findById as jest.Mock).mockResolvedValue({
            ...buildBaseIntake(),
            isDeleted: true,
        });

        const res = await request(app)
            .put(`/api/intake/${intakeId}`)
            .send({ data: { personalProfile: { fullName: 'Updated' } } });

        expect(res.status).toBe(404);
    });

    it('updateIntake synchronizes submission timestamps when staff move drafts to reviewing', async () => {
        const intake = buildBaseIntake({
            data: {
                personalProfile: {
                    fullName: 'Test Client',
                    dateOfBirth: '1985-01-01',
                    maritalStatus: 'single',
                },
            },
        });
        const emitMock = jest.fn();
        const toSpy = jest.spyOn(io, 'to').mockImplementation(() => ({ emit: emitMock } as any));
        const authModule = jest.requireMock('../middleware/authMiddleware');

        authModule.authenticate.mockImplementationOnce((req: any, _res: any, next: any) => {
            req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
            next();
        });
        (Intake.findById as jest.Mock).mockResolvedValue(intake);

        const res = await request(app)
            .put(`/api/intake/${intakeId}`)
            .send({ status: 'reviewing' });

        expect(res.status).toBe(200);
        expect(intake.status).toBe('reviewing');
        expect(intake.data.submitted).toBe(true);
        expect(intake.data.submissionDate).toEqual(expect.any(String));
        expect(intake.submittedAt).toBeInstanceOf(Date);
        expect(intake.completedAt).toBeUndefined();
        expect(toSpy).toHaveBeenCalledWith('lawyer_updates');
        expect(toSpy).toHaveBeenCalledWith('client_test-user');
    });

    it('submitWillIntake clears cached summaries and emits client-room updates', async () => {
        const intake = buildBaseIntake({
            data: {
                personalProfile: { fullName: 'Test Client', dateOfBirth: '1985-01-01', maritalStatus: 'single' },
                family: { maritalStatus: 'single', children: [] },
                executors: { primary: { fullName: 'Executor One' }, alternates: [], compensation: 'guidelines' },
                beneficiaries: { beneficiaries: [{ fullName: 'Beneficiary One', relationship: 'Child', share: 100 }] },
                assets: { confirmedNoSignificantAssets: true, list: [] },
                poa: {
                    property: { primaryName: 'Property Attorney', primaryRelationship: 'Sibling' },
                    personalCare: { primaryName: 'Care Attorney', primaryRelationship: 'Friend' },
                },
                funeral: { type: 'burial' },
                priorWills: { hasPriorWill: 'no' },
            },
        });
        const emitMock = jest.fn();
        const toSpy = jest.spyOn(io, 'to').mockImplementation(() => ({ emit: emitMock } as any));
        (Intake.findById as jest.Mock).mockResolvedValue(intake);

        const res = await request(app)
            .post(`/api/intake/${intakeId}/submit`)
            .send({ clientNotes: 'Please call after 5 PM' });

        expect(res.status).toBe(200);
        expect(intake.aiSummary).toBeUndefined();
        expect(intake.submittedAt).toBeInstanceOf(Date);
        expect(toSpy).toHaveBeenCalledWith('lawyer_updates');
        expect(toSpy).toHaveBeenCalledWith('client_test-user');
    });

    it('smartImportAssets clears explicit empty-assets confirmation, invalidates summary cache, and emits updates', async () => {
        const intake = buildBaseIntake({
            __v: 4,
            data: {
                assets: {
                    confirmedNoSignificantAssets: true,
                    list: [],
                },
            },
        });
        const emitMock = jest.fn();
        const toSpy = jest.spyOn(io, 'to').mockImplementation(() => ({ emit: emitMock } as any));
        (Intake.findById as jest.Mock).mockResolvedValue(intake);
        (parseAssetsFromText as jest.Mock).mockResolvedValue({
            realEstate_items: [{ description: '123 Lake Rd', value: '500000', ownership: 'sole' }],
        });

        const res = await request(app)
            .post(`/api/intake/${intakeId}/assets/import`)
            .send({ text: '123 Lake Rd $500,000' });

        expect(res.status).toBe(200);
        expect(intake.data.assets.confirmedNoSignificantAssets).toBe(false);
        expect(intake.data.assets.list).toHaveLength(1);
        expect(intake.aiSummary).toBeUndefined();
        expect(intake.increment).toHaveBeenCalled();
        expect(toSpy).toHaveBeenCalledWith('lawyer_updates');
        expect(toSpy).toHaveBeenCalledWith('client_test-user');
    });

    it('sendNudge hides deleted intakes from reminder requests', async () => {
        const authModule = jest.requireMock('../middleware/authMiddleware');
        authModule.authenticate.mockImplementationOnce((req: any, _res: any, next: any) => {
            req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
            next();
        });
        (Intake.findOne as jest.Mock).mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });
        (Intake.findById as jest.Mock).mockResolvedValue({
            _id: missingIntakeId,
            status: 'started',
            isDeleted: true,
        });

        const res = await request(app).post(`/api/intake/${missingIntakeId}/nudge`);

        expect(res.status).toBe(404);
        expect(sendReminderEmail).not.toHaveBeenCalled();
    });

    it('sendNudge fails fast when the client email is unavailable', async () => {
        const authModule = jest.requireMock('../middleware/authMiddleware');
        authModule.authenticate.mockImplementationOnce((req: any, _res: any, next: any) => {
            req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
            next();
        });
        (Intake.findOne as jest.Mock).mockReturnValue({
            populate: jest.fn().mockResolvedValue({
                _id: intakeId,
                type: 'will',
                clientId: {},
                data: {},
                save: jest.fn().mockResolvedValue(true),
            }),
        });

        const res = await request(app).post(`/api/intake/${intakeId}/nudge`);

        expect(res.status).toBe(400);
        expect(sendReminderEmail).not.toHaveBeenCalled();
    });

    it('uses the next applicable will step for reminder copy beyond the core four sections', async () => {
        const authModule = jest.requireMock('../middleware/authMiddleware');
        authModule.authenticate.mockImplementationOnce((req: any, _res: any, next: any) => {
            req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
            next();
        });
        (Intake.findOne as jest.Mock).mockReturnValue({
            populate: jest.fn().mockResolvedValue({
                _id: intakeId,
                type: 'will',
                clientId: { email: 'test@example.com' },
                data: {
                    personalProfile: { fullName: 'Test Client', dateOfBirth: '1985-01-01', maritalStatus: 'single' },
                    family: { maritalStatus: 'single', children: [] },
                    executors: { primary: { fullName: 'Executor One' }, alternates: [], compensation: 'guidelines' },
                    beneficiaries: { beneficiaries: [{ fullName: 'Beneficiary One', relationship: 'Child', share: 100 }] },
                },
                notes: [],
                save: jest.fn().mockResolvedValue(true),
            }),
        });
        (sendReminderEmail as jest.Mock).mockResolvedValue(true);

        const res = await request(app).post(`/api/intake/${intakeId}/nudge`);

        expect(res.status).toBe(200);
        expect(res.body.logic).toBe('assets');
        expect(sendReminderEmail).toHaveBeenCalledWith(
            'test@example.com',
            'Test Client',
            intakeId,
            expect.stringContaining('asset')
        );
    });
});
