import { Request, Response } from 'express';
import {
    createUser,
    deleteIntake,
    getAdminAiUsage,
    getAdminAiSettings,
    getAdminIntakes,
    getSystemStats,
    overrideIntakeStatus,
    updateAdminAiSettings,
    updateAdminAiOperationalSettings,
    updateUserRole,
    updateUserStatus,
} from '../controllers/adminController';
import User from '../models/User';
import Intake from '../models/Intake';
import { getUsageSummary } from '../services/aiUsageTracker';
import { writeAuditLog } from '../services/auditLogService';
import { getAISettingsMetadata, updateAiRuntimeSettings, getAiOperationalSettings, updateAiOperationalSettings } from '../services/aiSettingsService';

jest.mock('../models/User');
jest.mock('../models/Intake');
jest.mock('../services/aiUsageTracker');
jest.mock('../services/auditLogService');
jest.mock('../services/aiSettingsService');
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hash'),
}));

describe('AdminController', () => {
    let mockRequest: any;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = { json: jsonMock, status: statusMock as any };
        jest.clearAllMocks();
    });

    describe('getSystemStats', () => {
        it('returns structured user and intake summary blocks', async () => {
            (User.aggregate as jest.Mock).mockResolvedValue([{
                total: [{ n: 10 }],
                active: [{ n: 8 }],
                disabled: [{ n: 2 }],
                client: [{ n: 6 }],
                lawyer: [{ n: 3 }],
                admin: [{ n: 1 }],
            }]);
            (Intake.aggregate as jest.Mock).mockResolvedValue([{
                total: [{ n: 12 }],
                started: [{ n: 4 }],
                submitted: [{ n: 3 }],
                reviewing: [{ n: 2 }],
                completed: [{ n: 3 }],
                will: [{ n: 7 }],
                incorp: [{ n: 5 }],
            }]);

            await getSystemStats({} as any, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith({
                users: {
                    total: 10,
                    active: 8,
                    disabled: 2,
                    byRole: { client: 6, lawyer: 3, admin: 1 },
                },
                intakes: {
                    total: 12,
                    byStatus: { started: 4, submitted: 3, reviewing: 2, completed: 3 },
                    byType: { will: 7, incorporation: 5 },
                },
            });
        });
    });

    describe('getAdminIntakes', () => {
        it('returns paginated admin intake rows and matched summary data', async () => {
            const queueDocs = [{
                _id: 'intake-1',
                clientId: { email: 'client@test.com', name: 'Client Test' },
                type: 'incorporation',
                status: 'reviewing',
                flags: [{ code: 'FOREIGN_ASSETS', message: 'Foreign assets', type: 'hard' }],
                data: { preIncorporation: { jurisdiction: 'obca', proposedName: 'TestCo' } },
                createdAt: new Date('2026-04-01T00:00:00.000Z'),
                updatedAt: new Date('2026-04-02T00:00:00.000Z'),
            }];

            const limitMock = jest.fn().mockResolvedValue(queueDocs);
            const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
            const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
            const populateMock = jest.fn().mockReturnValue({ sort: sortMock });

            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([{ _id: 'user-1' }]),
            });
            (Intake.find as jest.Mock).mockReturnValue({ populate: populateMock });
            (Intake.countDocuments as jest.Mock).mockResolvedValue(1);
            (Intake.aggregate as jest.Mock).mockResolvedValue([{
                total: 1,
                started: 0,
                submitted: 0,
                reviewing: 1,
                completed: 0,
                will: 0,
                incorporation: 1,
            }]);

            mockRequest = {
                query: {
                    page: '1',
                    limit: '20',
                    search: 'client',
                    type: 'incorporation',
                    status: 'reviewing',
                    sort: 'updated_desc',
                },
            };

            await getAdminIntakes(mockRequest as Request, mockResponse as Response);

            expect(Intake.find).toHaveBeenCalledWith(expect.objectContaining({
                type: 'incorporation',
                status: 'reviewing',
                $or: expect.arrayContaining([
                    { clientName: /client/i },
                    { 'data.personalProfile.fullName': /client/i },
                    { clientId: { $in: ['user-1'] } },
                    expect.objectContaining({ $expr: expect.any(Object) }),
                ]),
            }));
            expect(sortMock).toHaveBeenCalledWith({ updatedAt: -1, createdAt: -1 });
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                data: [expect.objectContaining({
                    id: 'intake-1',
                    clientEmail: 'client@test.com',
                    clientName: 'Client Test',
                    highlights: 'OBCA | TESTCO',
                })],
                pagination: expect.objectContaining({ page: 1, total: 1 }),
                summary: {
                    total: 1,
                    byStatus: { started: 0, submitted: 0, reviewing: 1, completed: 0 },
                    byType: { will: 0, incorporation: 1 },
                },
            }));
        });
    });

    describe('createUser', () => {
        it('creates a user and writes an audit log entry', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            const save = jest.fn().mockResolvedValue(true);
            (User as unknown as jest.Mock).mockImplementation(function (this: any, payload: any) {
                Object.assign(this, { _id: 'new-user-1', email: payload.email, role: payload.role, name: payload.name, save });
                return this;
            });

            mockRequest = {
                user: { userId: 'admin-1' } as any,
                body: { email: 'new@example.com', password: 'StrongPassword1!', role: 'lawyer', name: 'New User' },
            };

            await createUser(mockRequest as any, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
                action: 'admin.user_created',
                actorId: 'admin-1',
                targetId: 'new-user-1',
                targetType: 'User',
            }));
        });

        it('rejects invalid roles', async () => {
            mockRequest = { body: { email: 'x@example.com', password: 'secret', role: 'bad-role' } };

            await expect(createUser(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400, message: 'Invalid role' });
        });
    });

    describe('updateUserRole', () => {
        it('rejects invalid roles', async () => {
            mockRequest = { params: { id: 'user-1' }, body: { role: 'bad-role' } };

            await expect(updateUserRole(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400, message: 'Invalid role' });
        });
    });

    describe('updateUserStatus', () => {
        it('updates user status and writes an audit log entry', async () => {
            const save = jest.fn().mockResolvedValue(true);
            (User.findById as jest.Mock).mockResolvedValue({
                _id: 'user-1',
                email: 'user@test.com',
                isActive: true,
                save,
            });

            mockRequest = {
                user: { userId: 'admin-1' } as any,
                params: { id: 'user-1' },
                body: { isActive: false },
            };

            await updateUserStatus(mockRequest as any, mockResponse as Response);

            expect(save).toHaveBeenCalled();
            expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
                action: 'admin.user_status_changed',
                actorId: 'admin-1',
                targetId: 'user-1',
                targetType: 'User',
            }));
        });
    });

    describe('overrideIntakeStatus', () => {
        it('returns the updated intake row and audit entry', async () => {
            const save = jest.fn().mockResolvedValue(true);
            (Intake.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: 'intake-1',
                    clientId: { email: 'client@test.com', name: 'Client Test' },
                    type: 'will',
                    status: 'submitted',
                    clientName: 'Client Test',
                    flags: [],
                    data: { personalProfile: { fullName: 'Client Test' } },
                    createdAt: new Date('2026-04-01T00:00:00.000Z'),
                    updatedAt: new Date('2026-04-02T00:00:00.000Z'),
                    save,
                }),
            });

            mockRequest = {
                user: { userId: 'admin-1' } as any,
                params: { id: 'intake-1' },
                body: { status: 'completed' },
            };

            await overrideIntakeStatus(mockRequest as any, mockResponse as Response);

            expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
                action: 'admin.intake_status_overridden',
                actorId: 'admin-1',
                targetId: 'intake-1',
                targetType: 'Intake',
            }));
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Intake status overridden',
                intake: expect.objectContaining({ id: 'intake-1', status: 'completed' }),
            }));
        });

        it('rejects invalid statuses', async () => {
            mockRequest = {
                params: { id: 'intake-1' },
                body: { status: 'bad-status' },
            };

            await expect(overrideIntakeStatus(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400, message: 'Invalid status' });
        });
    });

    describe('deleteIntake', () => {
        it('deletes the intake and writes an audit log entry', async () => {
            (Intake.findByIdAndDelete as jest.Mock).mockResolvedValue({
                _id: 'intake-1',
                status: 'started',
                type: 'will',
                clientId: { toString: () => 'client-1' },
            });

            mockRequest = {
                user: { userId: 'admin-1' } as any,
                params: { id: 'intake-1' },
            };

            await deleteIntake(mockRequest as any, mockResponse as Response);

            expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
                action: 'admin.intake_deleted',
                actorId: 'admin-1',
                targetId: 'intake-1',
                targetType: 'Intake',
            }));
        });
    });

    describe('getAdminAiUsage', () => {
        it('returns grouped rows with server-side totals', async () => {
            (getUsageSummary as jest.Mock).mockResolvedValue([
                { totalTokens: 200, totalPromptTokens: 120, totalCompletionTokens: 80, totalRequests: 2 },
                { totalTokens: 100, totalPromptTokens: 60, totalCompletionTokens: 40, totalRequests: 1 },
            ]);

            mockRequest = { query: { days: '14' } };

            await getAdminAiUsage(mockRequest as any, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                rows: expect.any(Array),
                summary: {
                    totalTokens: 300,
                    promptTokens: 180,
                    completionTokens: 120,
                    requests: 3,
                },
                timeframe: expect.objectContaining({ days: 14 }),
            }));
        });
    });

    describe('getAdminAiSettings', () => {
        it('returns the current AI runtime metadata', async () => {
            (getAISettingsMetadata as jest.Mock).mockReturnValue({
                current: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
                defaults: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
                providers: [{ id: 'gemini', label: 'Gemini', enabled: true }],
                models: { gemini: [{ id: 'gemini-3.1-flash-lite-preview', label: 'gemini-3.1-flash-lite-preview' }], openai: [] },
                credentials: { geminiConfigured: true, openaiConfigured: false },
                initialized: true,
            });

            await getAdminAiSettings({} as any, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                current: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
                initialized: true,
            }));
        });
    });

    describe('updateAdminAiSettings', () => {
        it('updates the active AI runtime selection', async () => {
            (updateAiRuntimeSettings as jest.Mock).mockResolvedValue({
                provider: 'openai',
                model: 'gpt-4o-mini',
            });
            (getAISettingsMetadata as jest.Mock)
                .mockReturnValueOnce({
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
                })
                .mockReturnValueOnce({
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

            mockRequest = {
                user: { userId: 'admin-1' } as any,
                body: { provider: 'openai', model: 'gpt-4o-mini' },
                ip: '127.0.0.1',
                get: jest.fn().mockReturnValue('jest'),
            };

            await updateAdminAiSettings(mockRequest as any, mockResponse as Response);

            expect(updateAiRuntimeSettings).toHaveBeenCalledWith({
                provider: 'openai',
                model: 'gpt-4o-mini',
            });
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                message: 'AI model settings updated',
                current: { provider: 'openai', model: 'gpt-4o-mini' },
            }));
            expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
                action: 'admin.ai_runtime_updated',
                actorId: 'admin-1',
                metadata: {
                    previous: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
                    current: { provider: 'openai', model: 'gpt-4o-mini' },
                },
            }));
        });

        it('rejects missing provider or model input', async () => {
            mockRequest = {
                body: { provider: 'openai', model: '' },
            };

            await expect(updateAdminAiSettings(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400, message: 'provider and model are required' });
        });
    });

    describe('updateAdminAiOperationalSettings', () => {
        const validBody = { rateLimitPerMinute: 60, maxRetries: 5, cacheTtlSeconds: 900 };

        beforeEach(() => {
            (getAiOperationalSettings as jest.Mock).mockReturnValue({
                rateLimitPerMinute: 30,
                maxRetries: 3,
                cacheTtlSeconds: 3600,
            });
            (updateAiOperationalSettings as jest.Mock).mockResolvedValue(validBody);
        });

        it('persists new operational settings and writes an audit log', async () => {
            mockRequest = {
                user: { userId: 'admin-1' } as any,
                body: validBody,
                ip: '127.0.0.1',
                get: jest.fn().mockReturnValue('jest'),
            };

            await updateAdminAiOperationalSettings(mockRequest as any, mockResponse as Response);

            expect(updateAiOperationalSettings).toHaveBeenCalledWith(validBody);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                message: 'AI operational settings updated',
                operational: validBody,
            }));
            expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
                action: 'admin.ai_operational_updated',
                actorId: 'admin-1',
                metadata: expect.objectContaining({ current: validBody }),
            }));
        });

        it('rejects rateLimitPerMinute out of range (0 is below minimum 1)', async () => {
            mockRequest = { body: { rateLimitPerMinute: 0, maxRetries: 3, cacheTtlSeconds: 3600 } };

            await expect(updateAdminAiOperationalSettings(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400 });
        });

        it('rejects rateLimitPerMinute out of range (601 exceeds max 600)', async () => {
            mockRequest = { body: { rateLimitPerMinute: 601, maxRetries: 3, cacheTtlSeconds: 3600 } };

            await expect(updateAdminAiOperationalSettings(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400 });
        });

        it('rejects maxRetries above the maximum of 10', async () => {
            mockRequest = { body: { rateLimitPerMinute: 30, maxRetries: 11, cacheTtlSeconds: 3600 } };

            await expect(updateAdminAiOperationalSettings(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400 });
        });

        it('rejects cacheTtlSeconds above the maximum of 86400', async () => {
            mockRequest = { body: { rateLimitPerMinute: 30, maxRetries: 3, cacheTtlSeconds: 86401 } };

            await expect(updateAdminAiOperationalSettings(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400 });
        });

        it('rejects non-integer values', async () => {
            mockRequest = { body: { rateLimitPerMinute: 30.5, maxRetries: 3, cacheTtlSeconds: 3600 } };

            await expect(updateAdminAiOperationalSettings(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400 });
        });

        it('rejects missing fields (undefined values)', async () => {
            mockRequest = { body: { rateLimitPerMinute: 30 } }; // maxRetries and cacheTtlSeconds missing

            await expect(updateAdminAiOperationalSettings(mockRequest as any, mockResponse as Response))
                .rejects
                .toMatchObject({ statusCode: 400 });
        });
    });
});
