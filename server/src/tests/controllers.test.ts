import request from 'supertest';
import app from '../index';
import Intake from '../models/Intake';
import { 
    generateAIResponse, 
    getClauseSuggestions, 
    parseAssetsFromFile, 
    parseAssetsFromText,
    explainRisk,
    validateIntakeLogic, 
    runStressTest 
} from '../services/aiService';
import { getUsageSummary } from '../services/aiUsageTracker';
import { getAISettingsMetadata, updateAiRuntimeSettings } from '../services/aiSettingsService';
import { sendReminderEmail } from '../services/emailService';
import { authenticate, requireAuth } from '../middleware/authMiddleware';

import User from '../models/User';

// Mock dependencies
jest.mock('../models/Intake');
jest.mock('../models/User');
jest.mock('../services/aiService');
jest.mock('../services/aiUsageTracker');
jest.mock('../services/aiSettingsService', () => ({
    getAISettingsMetadata: jest.fn(),
    updateAiRuntimeSettings: jest.fn(),
}));
jest.mock('../services/emailService');
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn().mockReturnValue({ userId: 'test-user', role: 'client' }),
    sign: jest.fn().mockReturnValue('mock-token')
}));

// Mock Auth Middleware
jest.mock('../middleware/authMiddleware', () => ({
    authenticate: jest.fn((req: any, res: any, next: any) => {
        req.user = { userId: 'test-user', email: 'test@example.com', role: 'lawyer' };
        next();
    }),
    requireAuth: jest.fn((req: any, res: any, next: any) => {
        req.user = { userId: 'test-user', email: 'test@example.com', role: 'lawyer' };
        next();
    }),
    requireRole: jest.fn((...roles) => (req: any, res: any, next: any) => next()),
    requireOwnership: jest.fn((getter) => (req: any, res: any, next: any) => next()),
    optionalAuth: jest.fn((req: any, res: any, next: any) => next())
}));

// Mock CSRF Middleware
jest.mock('../middleware/csrfMiddleware', () => ({
    doubleSubmitCsrf: jest.fn((req: any, res: any, next: any) => next())
}));

describe('Controller Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Intake Controller', () => {
        const intakeId = '507f1f77bcf86cd799439011';
        const secondIntakeId = '507f1f77bcf86cd799439012';
        const missingIntakeId = '507f1f77bcf86cd799439099';
        const mockIntake = {
            _id: intakeId,
            clientId: 'test-user',
            type: 'will',
            data: { personalProfile: { fullName: 'Test Client' } },
            save: jest.fn().mockResolvedValue(true),
            markModified: jest.fn(),
            increment: jest.fn(),
            toObject() {
                return {
                    _id: this._id,
                    clientId: this.clientId,
                    type: this.type,
                    data: this.data,
                };
            }
        };

        describe('GET /api/intake/current', () => {
            it('should return user intake', async () => {
                (Intake.findOne as jest.Mock).mockReturnValue({
                    sort: jest.fn().mockResolvedValue(mockIntake)
                });

                const res = await request(app).get('/api/intake/current');
                expect(res.status).toBe(200);
                expect(res.body._id).toBe(intakeId);
            });

            it('queries only active started intakes for the current client', async () => {
                (Intake.findOne as jest.Mock).mockReturnValue({
                    sort: jest.fn().mockResolvedValue(mockIntake)
                });

                await request(app).get('/api/intake/current');

                expect(Intake.findOne).toHaveBeenCalledWith({
                    clientId: 'test-user',
                    status: 'started',
                    isDeleted: { $ne: true },
                });
            });
        });

        describe('GET /api/intake/me', () => {
            it('should return all user intakes', async () => {
                // The controller now chains .select().sort() for the projection fix (Bug 8)
                (Intake.find as jest.Mock).mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue([mockIntake, { ...mockIntake, _id: secondIntakeId }])
                    })
                });

                const res = await request(app).get('/api/intake/me');
                expect(res.status).toBe(200);
                expect(res.body).toHaveLength(2);
                expect(res.body[0]._id).toBe(intakeId);
            });

            it('excludes deleted intakes from the list query', async () => {
                (Intake.find as jest.Mock).mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue([])
                    })
                });

                await request(app).get('/api/intake/me');

                expect(Intake.find).toHaveBeenCalledWith({
                    clientId: 'test-user',
                    isDeleted: { $ne: true },
                });
            });
        });

        describe('GET /api/intake/:id', () => {
            it('should return intake data', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

                const res = await request(app).get(`/api/intake/${intakeId}`);

                expect(res.status).toBe(200);
                expect(res.body.data.personalProfile.fullName).toBe('Test Client');
            });

            it('should return 404 if not found', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(null);
                const res = await request(app).get(`/api/intake/${missingIntakeId}`);
                expect(res.status).toBe(404);
            });

            it('returns 404 for deleted intakes', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue({
                    ...mockIntake,
                    isDeleted: true,
                });

                const res = await request(app).get(`/api/intake/${intakeId}`);

                expect(res.status).toBe(404);
            });
        });

        describe('PUT /api/intake/:id', () => {
            it('should update intake data', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

                const res = await request(app)
                    .put(`/api/intake/${intakeId}`)
                    .send({ data: { personalProfile: { fullName: 'Updated' } } });

                expect(res.status).toBe(200);
            });

            it('strips client-only executor row keys and legacy decisionMode when updating', async () => {
                const mutableIntake: any = {
                    ...mockIntake,
                    __v: 2,
                    data: {},
                    save: jest.fn().mockResolvedValue(true),
                    toObject() {
                        return {
                            _id: this._id,
                            clientId: this.clientId,
                            type: this.type,
                            data: this.data,
                            __v: this.__v,
                        };
                    },
                };

                (Intake.findById as jest.Mock).mockResolvedValue(mutableIntake);

                const res = await request(app)
                    .put(`/api/intake/${intakeId}`)
                    .send({
                        data: {
                            executors: {
                                primary: { fullName: { name: 'Legacy Primary' }, relationship: 'Spouse', uiKey: 'primary-ui' },
                                alternates: [
                                    { fullName: 'Backup Executor', relationship: 'Sibling', uiKey: 'alt-ui' },
                                ],
                                decisionMode: 'majority',
                                compensation: 'guidelines',
                            },
                            _draftExecutors: {
                                primary: { fullName: 'Draft Primary' },
                                alternates: [{ fullName: 'Draft Backup', relationship: 'Friend', uiKey: 'draft-ui' }],
                            },
                        },
                    });

                expect(res.status).toBe(200);
                expect(res.body.data.executors).toEqual({
                    primary: { fullName: 'Legacy Primary', relationship: 'Spouse' },
                    alternates: [{ fullName: 'Backup Executor', relationship: 'Sibling' }],
                    compensation: 'guidelines',
                });
                expect(res.body.data._draftExecutors).toBeUndefined();
                expect(mutableIntake.data.executors).toEqual({
                    primary: { fullName: 'Legacy Primary', relationship: 'Spouse' },
                    alternates: [{ fullName: 'Backup Executor', relationship: 'Sibling' }],
                    compensation: 'guidelines',
                });
                expect((mutableIntake.data as any)._draftExecutors).toBeUndefined();
            });

            it('rejects client-supplied status transitions on the shared update route', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    ...mockIntake,
                    clientId: { toString: () => 'test-user' },
                });

                const res = await request(app)
                    .put(`/api/intake/${intakeId}`)
                    .send({ status: 'reviewing' });

                expect(res.status).toBe(403);
            });

            it('preserves untouched nested fields when applying partial updates', async () => {
                const nestedIntake: any = {
                    ...mockIntake,
                    data: {
                        personalProfile: {
                            fullName: 'Test Client',
                            dateOfBirth: '1985-01-01',
                            maritalStatus: 'single',
                            address: 'Old Address',
                        },
                    },
                    save: jest.fn().mockResolvedValue(true),
                    increment: jest.fn(),
                };
                (Intake.findById as jest.Mock).mockResolvedValue(nestedIntake);

                const res = await request(app)
                    .put(`/api/intake/${intakeId}`)
                    .send({ data: { personalProfile: { address: 'New Address' } } });

                expect(res.status).toBe(200);
                expect(res.body.data.personalProfile).toEqual({
                    fullName: 'Test Client',
                    dateOfBirth: '1985-01-01',
                    maritalStatus: 'single',
                    address: 'New Address',
                });
            });
        });

        describe('POST /api/intake/chat', () => {
            it('should return AI response map', async () => {
                // Mock generateAIResponse to return string
                (generateAIResponse as jest.Mock).mockResolvedValue("AI Reply");

                const res = await request(app)
                    .post('/api/intake/chat')
                    .send({ message: "Help", intakeData: {}, currentStep: 'general' });

                expect(res.status).toBe(200);
                expect(res.body.reply).toBe("AI Reply");
            });

            it('should handle service errors', async () => {
                (generateAIResponse as jest.Mock).mockRejectedValue(new Error('AI crash'));
                const res = await request(app)
                    .post('/api/intake/chat')
                    .send({ message: "Help" });
                expect(res.status).toBe(500);
            });
        });

        describe('GET /api/intake/:id/suggestions', () => {
            it('should return suggestions array', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
                (getClauseSuggestions as jest.Mock).mockResolvedValue([{ id: 'test' }]);
                const res = await request(app).get(`/api/intake/${intakeId}/suggestions`);
                expect(res.status).toBe(200);
                expect(res.body.suggestions).toEqual([{ id: 'test' }]);
            });

            it('returns 403 when a client requests suggestions for another client intake', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'other-user', email: 'other@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    ...mockIntake,
                    clientId: { toString: () => 'test-user' },
                });

                const res = await request(app).get(`/api/intake/${intakeId}/suggestions`);

                expect(res.status).toBe(403);
                expect(getClauseSuggestions).not.toHaveBeenCalled();
            });
        });

        describe('POST /api/intake/:id/notes', () => {
            it('should add note to intake', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
                const res = await request(app)
                    .post(`/api/intake/${intakeId}/notes`)
                    .send({ text: 'A new note' });
                expect(res.status).toBe(200);
                expect(mockIntake.save).toHaveBeenCalled();
            });

            it('should return 404 if intake missing', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(null);
                const res = await request(app)
                    .post(`/api/intake/${missingIntakeId}/notes`)
                    .send({ text: 'A new note' });
                expect(res.status).toBe(404);
            });
        });

        describe('POST /api/intake/:id/import-assets', () => {
            it('should return parsed assets on success', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
                (parseAssetsFromFile as jest.Mock).mockResolvedValue({
                    realEstate_items: [{ description: '123 Lake Rd', value: '500000', ownership: 'sole' }]
                });
                // We'd ideally mock multer file upload here, but supertest allows attaching files
                const res = await request(app)
                    .post(`/api/intake/${intakeId}/assets/import`)
                    .attach('file', Buffer.from('test file content'), 'test.txt');
                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('_id');
                expect(res.body.data).toHaveProperty('assets');
            });

            it('should fallback to 400 if no file provided', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({ clientId: { toString: () => 'test-user' }, type: 'will' });
                const res = await request(app)
                    .post(`/api/intake/${intakeId}/assets/import`);
                expect(res.status).toBe(400); // Because file is missing in request
            });

            it('returns expectedVersion and skips duplicate imported assets', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });

                const existingVehicleIntake: any = {
                    ...mockIntake,
                    __v: 7,
                    clientId: { toString: () => 'test-user' },
                    data: {
                        assets: {
                            list: [
                                { type: 'Other', category: 'vehicles', description: '2018 Tesla Model 3', value: 50000, ownership: 'sole' },
                            ],
                        },
                    },
                    save: jest.fn().mockResolvedValue(true),
                    toObject() {
                        return {
                            _id: this._id,
                            clientId: this.clientId,
                            type: this.type,
                            data: this.data,
                            __v: this.__v,
                        };
                    },
                };

                (Intake.findById as jest.Mock).mockResolvedValue(existingVehicleIntake);
                (parseAssetsFromText as jest.Mock).mockResolvedValue({
                    vehicles_items: [{ description: '2018 Tesla Model 3', value: '50000', ownership: 'sole' }],
                    realEstate_items: [],
                    bankAccounts_items: [],
                    investments_items: [],
                    business_items: [],
                    foreignAssets_items: [],
                    digital_items: [],
                    other_items: [],
                });

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/assets/import`)
                    .send({ text: '2018 Tesla Model 3' });

                expect(res.status).toBe(200);
                expect(res.body.expectedVersion).toBe(7);
                expect(res.body.data.assets.list).toHaveLength(1);
            });
        });

        describe('POST /api/intake/:id/submit', () => {
            it('submits a will intake for the owning client', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });

                const mockSubmittedIntake: any = {
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'will',
                    status: 'started',
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
                    notes: [],
                    save: jest.fn().mockResolvedValue(true),
                    markModified: jest.fn(),
                    flags: [],
                    logicWarnings: [],
                };

                (Intake.findById as jest.Mock).mockResolvedValue(mockSubmittedIntake);

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/submit`)
                    .send({ clientNotes: 'Please call after 5 PM' });

                expect(res.status).toBe(200);
                expect(res.body.status).toBe('submitted');
                expect(mockSubmittedIntake.save).toHaveBeenCalled();
                expect(mockSubmittedIntake.data.clientNotes).toBe('Please call after 5 PM');
                expect(mockSubmittedIntake.data.submitted).toBe(true);
            });

            it('returns 409 when a will intake is already submitted', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });

                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'will',
                    status: 'submitted',
                    data: {},
                });

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/submit`)
                    .send({ clientNotes: 'Final note' });

                expect(res.status).toBe(409);
            });

            it('returns 422 with blocking sections when the will draft is incomplete', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'will',
                    status: 'started',
                    data: { personalProfile: { fullName: 'Test Client' } },
                });

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/submit`)
                    .send({});

                expect(res.status).toBe(422);
                expect(res.body.code).toBe('UNPROCESSABLE_ENTITY');
                expect(res.body.blockingSections).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ context: 'personalProfile' }),
                        expect.objectContaining({ context: 'family' }),
                        expect.objectContaining({ context: 'assets' }),
                    ])
                );
            });

            it('returns 422 when POA is incomplete under the hardened validation rules', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'will',
                    status: 'started',
                    data: {
                        personalProfile: { fullName: 'Test Client', dateOfBirth: '1985-01-01', maritalStatus: 'single' },
                        family: { maritalStatus: 'single', children: [] },
                        executors: { primary: { fullName: 'Executor One' }, alternates: [], compensation: 'guidelines' },
                        beneficiaries: { beneficiaries: [{ fullName: 'Beneficiary One', relationship: 'Child', share: 100 }] },
                        assets: { confirmedNoSignificantAssets: true, list: [] },
                        poa: {
                            property: { primaryName: 'Property Attorney', primaryRelationship: '' },
                            personalCare: { primaryName: 'Care Attorney', primaryRelationship: 'Friend' },
                        },
                        funeral: { type: 'burial' },
                        priorWills: { hasPriorWill: 'no' },
                    },
                });

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/submit`)
                    .send({});

                expect(res.status).toBe(422);
                expect(res.body.blockingSections).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ context: 'poa' }),
                    ])
                );
            });
        });

        describe('POST /api/intake/:id/validate-logic', () => {
            it('should return validation string', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
                (validateIntakeLogic as jest.Mock).mockResolvedValue('Warning string');
                const res = await request(app)
                    .post(`/api/intake/${intakeId}/validate-logic`)
                    .send({ context: 'general' });
                expect(res.status).toBe(200);
                expect(res.body.warning).toBe('Warning string');
            });

            it('returns 403 when a client validates another client intake', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'other-user', email: 'other@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    data: {}
                });

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/validate-logic`)
                    .send({ context: 'general' });

                expect(res.status).toBe(403);
                expect(validateIntakeLogic).not.toHaveBeenCalled();
            });

            it('normalizes intake data before validate-logic runs', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'will',
                    data: {
                        executors: {
                            primary: { fullName: { name: 'Legacy Primary' } },
                            alternates: [{ fullName: { name: 'Legacy Alternate' }, relationship: 'Sibling' }],
                        },
                    },
                });
                (validateIntakeLogic as jest.Mock).mockResolvedValue(null);

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/validate-logic`)
                    .send({ context: 'executors' });

                expect(res.status).toBe(200);
                expect(validateIntakeLogic).toHaveBeenCalledWith(
                    expect.objectContaining({
                        executors: expect.objectContaining({
                            primary: { fullName: 'Legacy Primary' },
                            alternates: [{ fullName: 'Legacy Alternate', relationship: 'Sibling' }],
                        }),
                    }),
                    'executors'
                );
            });

        describe('POST /api/intake/:id/stress-test', () => {
            it('should return questions array', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
                (runStressTest as jest.Mock).mockResolvedValue(['Q1', 'Q2']);
                const res = await request(app)
                    .post(`/api/intake/${intakeId}/stress-test`)
                    .send({ context: 'executors' });
                expect(res.status).toBe(200);
                expect(res.body.questions).toEqual(['Q1', 'Q2']);
            });

            it('returns 403 when a client stress-tests another client intake', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'other-user', email: 'other@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    data: {}
                });

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/stress-test`)
                    .send({ context: 'executors' });

                expect(res.status).toBe(403);
                expect(runStressTest).not.toHaveBeenCalled();
            });

            it('normalizes intake data before stress-test runs', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'will',
                    data: {
                        assets: {
                            list: [{ type: 'Other', category: 'vehicles', description: 'Vehicle', value: '15000' }],
                        },
                    },
                });
                (runStressTest as jest.Mock).mockResolvedValue([]);

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/stress-test`)
                    .send({ context: 'assets' });

                expect(res.status).toBe(200);
                expect(runStressTest).toHaveBeenCalledWith(
                    expect.objectContaining({
                        assets: expect.objectContaining({
                            list: [expect.objectContaining({ value: 15000 })],
                        }),
                    }),
                    'assets'
                );
            });

            it('supports the incorporation stress-test alias route', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'incorporation',
                    data: { preIncorporation: { jurisdiction: 'obca' } },
                });
                (runStressTest as jest.Mock).mockResolvedValue(['Incorp question']);

                const res = await request(app)
                    .post(`/api/incorporation/${intakeId}/stress-test`)
                    .send({ context: 'preIncorporation' });

                expect(res.status).toBe(200);
                expect(res.body.questions).toEqual(['Incorp question']);
                expect(runStressTest).toHaveBeenCalledWith(
                    expect.objectContaining({
                        preIncorporation: expect.objectContaining({ jurisdiction: 'obca' }),
                    }),
                    'preIncorporation'
                );
            });
        });

        describe('POST /api/intake/:id/explain-flag', () => {
            it('normalizes intake data before explain-risk runs', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'will',
                    data: {
                        executors: {
                            primary: { fullName: { name: 'Legacy Primary' } },
                        },
                    },
                });
                (explainRisk as jest.Mock).mockResolvedValue('Risk explanation');

                const res = await request(app)
                    .post(`/api/intake/${intakeId}/explain-flag`)
                    .send({ flagCode: 'EXECUTOR_CAPABILITY' });

                expect(res.status).toBe(200);
                expect(explainRisk).toHaveBeenCalledWith(
                    'EXECUTOR_CAPABILITY',
                    expect.objectContaining({
                        executors: expect.objectContaining({
                            primary: { fullName: 'Legacy Primary' },
                        }),
                    })
                );
            });
        });

        describe('POST /api/intake/:id/legal-phrasing', () => {
            it('should return generated legal phrasing', async () => {
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
                (generateAIResponse as jest.Mock).mockResolvedValue('Legal Suggestion');
                const res = await request(app)
                    .post('/api/intake/legal-phrasing')
                    .send({ context: 'custom instruction' });
                expect(res.status).toBe(200);
                expect(res.body.suggestion).toBe('Legal Suggestion');
            });
        });

        describe('POST /api/intake/:id/nudge', () => {
            it('should send email and return message', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, res: any, next: any) => {
                    req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
                    next();
                });
                (Intake.findOne as jest.Mock).mockReturnValue({
                    populate: jest.fn().mockResolvedValue({
                        _id: intakeId,
                        clientId: { email: 'test@example.com' },
                        data: { personalProfile: { fullName: 'Test' } },
                        save: jest.fn().mockResolvedValue(true)
                    })
                });
                (sendReminderEmail as jest.Mock).mockResolvedValue(true);
                const res = await request(app).post(`/api/intake/${intakeId}/nudge`);
                expect(res.status).toBe(200);
                expect(res.body.message).toBe('Reminder sent');
            });

            it('should return 404 if intake not found', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, res: any, next: any) => {
                    req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
                    next();
                });
                (Intake.findOne as jest.Mock).mockReturnValue({
                    populate: jest.fn().mockResolvedValue(null)
                });
                (Intake.findById as jest.Mock).mockResolvedValue(null);
                const res = await request(app).post(`/api/intake/${missingIntakeId}/nudge`);
                expect(res.status).toBe(404);
            });

            it('returns 409 when the intake is no longer in draft status', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
                    next();
                });
                (Intake.findOne as jest.Mock).mockReturnValue({
                    populate: jest.fn().mockResolvedValue(null)
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    status: 'submitted',
                    isDeleted: false,
                });

                const res = await request(app).post(`/api/intake/${intakeId}/nudge`);

                expect(res.status).toBe(409);
            });

            it('uses incorporation-specific reminder logic for incorporation intakes', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
                    next();
                });
                (Intake.findOne as jest.Mock).mockReturnValue({
                    populate: jest.fn().mockResolvedValue({
                        _id: intakeId,
                        type: 'incorporation',
                        clientId: { email: 'corp@example.com' },
                        data: { preIncorporation: {} },
                        notes: [],
                        save: jest.fn().mockResolvedValue(true),
                    })
                });
                (sendReminderEmail as jest.Mock).mockResolvedValue(true);

                const res = await request(app).post(`/api/intake/${intakeId}/nudge`);

                expect(res.status).toBe(200);
                expect(sendReminderEmail).toHaveBeenCalledWith(
                    'corp@example.com',
                    'Client',
                    intakeId,
                    expect.stringContaining('incorporation')
                );
                expect(res.body.logic).toBe('preIncorporation');
            });

            it('uses hardened structure ownership reminder logic when no shareholders are defined', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
                    next();
                });
                (Intake.findOne as jest.Mock).mockReturnValue({
                    populate: jest.fn().mockResolvedValue({
                        _id: intakeId,
                        type: 'incorporation',
                        clientId: { email: 'corp@example.com' },
                        data: {
                            preIncorporation: {
                                jurisdiction: 'obca',
                                nameType: 'numbered',
                                nameConfirmed: true,
                            },
                            structureOwnership: {
                                shareClasses: [{ className: 'Common' }],
                                initialShareholders: [],
                                directors: [{ fullName: 'Jane Director', address: '123 Main St' }],
                                registeredOfficeAddress: '123 Main St',
                                registeredOfficeProvince: 'ON',
                            },
                        },
                        notes: [],
                        save: jest.fn().mockResolvedValue(true),
                    })
                });
                (sendReminderEmail as jest.Mock).mockResolvedValue(true);

                const res = await request(app).post(`/api/intake/${intakeId}/nudge`);

                expect(res.status).toBe(200);
                expect(res.body.logic).toBe('structureOwnership');
            });

            it('does not treat banking as incomplete when records location satisfies minute-book readiness', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
                    next();
                });
                (Intake.findOne as jest.Mock).mockReturnValue({
                    populate: jest.fn().mockResolvedValue({
                        _id: intakeId,
                        type: 'incorporation',
                        clientId: { email: 'corp@example.com' },
                        data: {
                            preIncorporation: {
                                jurisdiction: 'obca',
                                nameType: 'named',
                                proposedName: 'Acme',
                                legalEnding: 'Inc.',
                                nuansReport: { reportDate: '2026-03-01' },
                                nuansReviewed: true,
                                nameConfirmed: true,
                            },
                            structureOwnership: {
                                shareClasses: [{ id: 'class_1', className: 'Common' }],
                                initialShareholders: [{ id: 'holder_1', fullName: 'Alice', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 100 }],
                                directors: [{ id: 'dir_1', fullName: 'Jane Director', address: '123 Main St' }],
                                registeredOfficeAddress: '123 Main St',
                                registeredOfficeProvince: 'ON',
                            },
                            articles: {
                                corporateName: 'Acme Inc.',
                                registeredAddress: '123 Main St',
                                directorCountType: 'fixed',
                                directorCountFixed: 1,
                                shareCapitalDescription: 'Unlimited common shares',
                                filingMethod: 'obr',
                            },
                            postIncorpOrg: {
                                generalByLawDrafted: true,
                                orgResolutionsPrepared: true,
                                officeResolutionPassed: true,
                                directorConsents: [{ directorId: 'dir_1', directorName: 'Jane Director', consentSigned: true, consentDate: '2026-03-15' }],
                            },
                            shareIssuance: {
                                subscriptionAgreements: [{ shareholderId: 'holder_1', subscriberName: 'Alice', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 100, subscriberAddress: '123 Main St' }],
                                certificateType: 'uncertificated',
                                securitiesRegisterComplete: true,
                                considerationCollected: true,
                            },
                            corporateRecords: {
                                hasArticlesAndCertificate: true,
                                hasByLaws: true,
                                hasDirectorMinutes: true,
                                hasShareholderMinutes: true,
                                hasWrittenResolutions: true,
                                hasSecuritiesRegister: true,
                                hasDirectorRegister: true,
                                hasOfficerRegister: true,
                                hasISCRegister: true,
                                recordsLocationConfirmed: true,
                            },
                            registrations: {
                                craRegistered: true,
                                craBusinessNumber: '123456789',
                            },
                            bankingSetup: {
                                bankAccountOpened: true,
                                bankName: 'RBC Royal Bank',
                                minuteBookSetup: false,
                                shareCertificatesOrdered: false,
                            },
                        },
                        notes: [],
                        save: jest.fn().mockResolvedValue(true),
                    })
                });
                (sendReminderEmail as jest.Mock).mockResolvedValue(true);

                const res = await request(app).post(`/api/intake/${intakeId}/nudge`);

                expect(res.status).toBe(200);
                expect(res.body.logic).toBeNull();
            });
        });

        describe('GET /api/intake/:id/insight', () => {
            it('returns incorporation onboarding insight for empty incorporation intakes', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'incorporation',
                    data: {},
                });

                const res = await request(app).get(`/api/intake/${intakeId}/insight`);

                expect(res.status).toBe(200);
                expect(res.body).toEqual(expect.objectContaining({
                    insight: expect.stringContaining('jurisdiction'),
                    step: 'preIncorporation',
                }));
            });
        });

        describe('POST /api/intake/:id/summary', () => {
            it('returns cached incorporation summary', async () => {
                (authenticate as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
                    req.user = { userId: 'test-user', email: 'test@example.com', role: 'client' };
                    next();
                });
                (Intake.findById as jest.Mock).mockResolvedValue({
                    _id: intakeId,
                    clientId: { toString: () => 'test-user' },
                    type: 'incorporation',
                    data: {},
                    aiSummary: 'Your Ontario corporation is set up as a named company and is ready for lawyer review.',
                });

                const res = await request(app).post(`/api/intake/${intakeId}/summary`);

                expect(res.status).toBe(200);
                expect(res.body).toEqual({
                    summary: 'Your Ontario corporation is set up as a named company and is ready for lawyer review.',
                });
            });
        });
    });

    describe('Lawyer Controller', () => {
        const mockIntake = {
            _id: '123',
            clientId: { _id: 'user1', email: 'test@example.com' },
            status: 'submitted',
            save: jest.fn(),
            data: {}
        };

        describe('GET /api/lawyer/dashboard', () => {
            it('should return all intakes', async () => {
                (Intake.find as jest.Mock)
                    .mockReturnValueOnce({
                        populate: jest.fn().mockReturnValue({
                            sort: jest.fn().mockReturnValue({
                                skip: jest.fn().mockReturnValue({
                                    limit: jest.fn().mockResolvedValue([mockIntake])
                                })
                            })
                        })
                    });
                (Intake.countDocuments as jest.Mock).mockResolvedValue(1);
                (Intake.aggregate as jest.Mock).mockResolvedValue([{ totalMatters: 1, totalFlagged: 0, statusCounts: [] }]);
                (User.find as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

                (authenticate as jest.Mock).mockImplementation((req, res, next) => {
                    req.user = { userId: 'lawyer-1', email: 'lawyer@example.com', role: 'lawyer' };
                    next();
                });

                const res = await request(app).get('/api/lawyer/intakes');
                expect(res.status).toBe(200);
                expect(res.body.data).toHaveLength(1);
                expect(res.body.pagination.total).toBe(1);
                expect(res.body.summary).toBeDefined();
            });
        });
    });

    describe('Admin Controller', () => {
        describe('GET /api/admin/intakes', () => {
            it('returns paginated intake rows with summary data', async () => {
                const queueDoc = {
                    _id: 'admin-intake-1',
                    clientId: { email: 'client@example.com', name: 'Client Example' },
                    type: 'will',
                    status: 'reviewing',
                    flags: [{ code: 'FLAG_1' }],
                    data: { personalProfile: { fullName: 'Client Example' } },
                    createdAt: new Date('2026-04-01T00:00:00.000Z'),
                    updatedAt: new Date('2026-04-02T00:00:00.000Z'),
                };

                (Intake.find as jest.Mock).mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        sort: jest.fn().mockReturnValue({
                            skip: jest.fn().mockReturnValue({
                                limit: jest.fn().mockResolvedValue([queueDoc])
                            })
                        })
                    })
                });
                (Intake.countDocuments as jest.Mock).mockResolvedValue(1);
                (Intake.aggregate as jest.Mock).mockResolvedValue([{
                    total: 1,
                    started: 0,
                    submitted: 0,
                    reviewing: 1,
                    completed: 0,
                    will: 1,
                    incorporation: 0,
                }]);
                (User.find as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

                const res = await request(app).get('/api/admin/intakes?status=reviewing&type=will&sort=updated_desc&page=1');
                console.log('ADMIN INTAKES TEST RESPONSE:', res.body, res.status);
                expect(res.status).toBe(200);
                expect(res.body.data).toHaveLength(1);
                expect(res.body.data[0]).toMatchObject({
                    id: 'admin-intake-1',
                    clientEmail: 'client@example.com',
                    clientName: 'Client Example',
                    status: 'reviewing',
                });
                expect(res.body.summary).toEqual({
                    total: 1,
                    byStatus: { started: 0, submitted: 0, reviewing: 1, completed: 0 },
                    byType: { will: 1, incorporation: 0 },
                });
            });
        });

        describe('GET /api/admin/ai-usage', () => {
            it('returns grouped rows with summary totals and timeframe', async () => {
                (getUsageSummary as jest.Mock).mockResolvedValue([
                    {
                        _id: { date: '2026-04-02', endpoint: 'dashboard_insight' },
                        totalRequests: 2,
                        totalTokens: 300,
                        totalPromptTokens: 180,
                        totalCompletionTokens: 120,
                    },
                ]);

                const res = await request(app).get('/api/admin/ai-usage?days=14');

                expect(res.status).toBe(200);
                expect(res.body.rows).toHaveLength(1);
                expect(res.body.summary).toEqual({
                    totalTokens: 300,
                    promptTokens: 180,
                    completionTokens: 120,
                    requests: 2,
                });
                expect(res.body.timeframe.days).toBe(14);
            });
        });

        describe('GET /api/admin/ai-settings', () => {
            it('returns the available AI provider and model settings', async () => {
                (getAISettingsMetadata as jest.Mock).mockReturnValue({
                    current: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
                    defaults: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
                    providers: [
                        { id: 'gemini', label: 'Gemini', enabled: true },
                        { id: 'openai', label: 'ChatGPT', enabled: true },
                    ],
                    models: {
                        gemini: [{ id: 'gemini-3.1-flash-lite-preview', label: 'gemini-3.1-flash-lite-preview' }],
                        openai: [{ id: 'gpt-4o-mini', label: 'gpt-4o-mini' }],
                    },
                    credentials: { geminiConfigured: true, openaiConfigured: true },
                    initialized: true,
                });

                const res = await request(app).get('/api/admin/ai-settings');

                expect(res.status).toBe(200);
                expect(res.body.current).toEqual({
                    provider: 'gemini',
                    model: 'gemini-3.1-flash-lite-preview',
                });
                expect(res.body.providers).toHaveLength(2);
            });
        });

        describe('PATCH /api/admin/ai-settings', () => {
            it('updates the current AI provider and model', async () => {
                (updateAiRuntimeSettings as jest.Mock).mockResolvedValue({
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                });
                (getAISettingsMetadata as jest.Mock).mockReturnValue({
                    current: { provider: 'openai', model: 'gpt-4o-mini' },
                    defaults: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
                    providers: [
                        { id: 'gemini', label: 'Gemini', enabled: true },
                        { id: 'openai', label: 'ChatGPT', enabled: true },
                    ],
                    models: {
                        gemini: [{ id: 'gemini-3.1-flash-lite-preview', label: 'gemini-3.1-flash-lite-preview' }],
                        openai: [{ id: 'gpt-4o-mini', label: 'gpt-4o-mini' }],
                    },
                    credentials: { geminiConfigured: true, openaiConfigured: true },
                    initialized: true,
                });

                const res = await request(app)
                    .patch('/api/admin/ai-settings')
                    .send({ provider: 'openai', model: 'gpt-4o-mini' });

                expect(res.status).toBe(200);
                expect(updateAiRuntimeSettings).toHaveBeenCalledWith({
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                });
                expect(res.body.current).toEqual({
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                });
            });
        });
        });
    });
});
