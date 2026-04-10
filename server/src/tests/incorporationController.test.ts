import { Request, Response } from 'express';
import {
    createIncorpIntake,
    getCurrentIncorpIntake,
    getIncorpIntake,
    updateIncorpIntake,
    addIncorpNote,
} from '../controllers/incorporationController';
import Intake from '../models/Intake';
import { ValidationError } from '../errors/AppError';

jest.mock('../models/Intake');
jest.mock('../services/incorporationRulesEngine', () => ({
    generateIncorpFlags: jest.fn().mockReturnValue([]),
    validateIncorpLogic: jest.fn().mockReturnValue([]),
}));
jest.mock('../services/aiService', () => ({
    generateAIResponse: jest.fn(),
    calculatePriorityScore: jest.fn().mockReturnValue(50),
    generateAutoNote: jest.fn().mockResolvedValue(null),
}));

describe('IncorporationController', () => {
    const intakeId = '507f1f77bcf86cd799439011';
    let req: any;
    let res: any;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = { status: statusMock, json: jsonMock } as Partial<Response>;
        jest.clearAllMocks();
    });

    const mockSortedFindOneResults = (...results: any[]) => {
        results.forEach((result) => {
            (Intake.findOne as jest.Mock).mockReturnValueOnce({
                sort: jest.fn().mockResolvedValue(result),
            });
        });
    };

    describe('createIncorpIntake', () => {
        it('should create a new incorporation intake when only completed matters exist', async () => {
            req = { user: { userId: 'user1' }, body: { data: {} } };
            mockSortedFindOneResults(
                null,
                null,
                { _id: 'completed1', type: 'incorporation', status: 'completed', data: {} }
            );
            (Intake as any).mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true),
                toObject: jest.fn(),
            }));

            // Mock the constructor
            const mockSave = jest.fn().mockResolvedValue(true);
            const mockInstance = { _id: 'new1', type: 'incorporation', data: {}, save: mockSave };
            (Intake as unknown as jest.Mock).mockImplementation(() => mockInstance);

            await createIncorpIntake(req as Request, res as Response);

            expect(Intake.findOne).toHaveBeenNthCalledWith(1, {
                clientId: 'user1',
                type: 'incorporation',
                isDeleted: { $ne: true },
                status: 'started',
            });
            expect(Intake.findOne).toHaveBeenNthCalledWith(2, {
                clientId: 'user1',
                type: 'incorporation',
                isDeleted: { $ne: true },
                status: { $in: ['reviewing', 'submitted'] },
            });
            expect(Intake.findOne).toHaveBeenNthCalledWith(3, {
                clientId: 'user1',
                type: 'incorporation',
                isDeleted: { $ne: true },
                status: 'completed',
            });
            expect(statusMock).toHaveBeenCalledWith(201);
        });

        it('should return the prioritized started intake if one exists', async () => {
            req = { user: { userId: 'user1' }, body: {} };
            const existing = { _id: 'existing1', type: 'incorporation', status: 'started' };
            mockSortedFindOneResults(existing);

            await createIncorpIntake(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ ...existing, data: {} });
        });

        it('should resume the newest submitted or reviewing matter when no started matter exists', async () => {
            req = { user: { userId: 'user1' }, body: {} };
            const existing = { _id: 'reviewing1', type: 'incorporation', status: 'reviewing' };
            mockSortedFindOneResults(null, existing);

            await createIncorpIntake(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ ...existing, data: {} });
        });

        it('should throw if no userId', async () => {
            req = { user: {}, body: {} };
            await expect(createIncorpIntake(req as Request, res as Response)).rejects.toThrow('create an incorporation intake');
        });
    });

    describe('getCurrentIncorpIntake', () => {
        it('should return the prioritized started incorporation intake', async () => {
            req = { user: { userId: 'user1' } };
            const mockIntake = { _id: 'inc1', type: 'incorporation', status: 'started' };
            mockSortedFindOneResults(mockIntake);

            await getCurrentIncorpIntake(req as Request, res as Response);

            expect(Intake.findOne).toHaveBeenNthCalledWith(1, {
                clientId: 'user1',
                type: 'incorporation',
                isDeleted: { $ne: true },
                status: 'started',
            });
            expect(jsonMock).toHaveBeenCalledWith({ ...mockIntake, data: {} });
        });

        it('should fall back to the newest submitted or reviewing matter when no started draft exists', async () => {
            req = { user: { userId: 'user1' } };
            const mockIntake = { _id: 'inc-reviewing', type: 'incorporation', status: 'reviewing' };
            mockSortedFindOneResults(null, mockIntake);

            await getCurrentIncorpIntake(req as Request, res as Response);

            expect(jsonMock).toHaveBeenCalledWith({ ...mockIntake, data: {} });
        });

        it('should return 404 if no intake found', async () => {
            req = { user: { userId: 'user1' } };
            mockSortedFindOneResults(null, null, null);

            await expect(getCurrentIncorpIntake(req as Request, res as Response)).rejects.toThrow('Incorporation intake');
        });
    });

        describe('getIncorpIntake', () => {
            it('should return intake by ID for owner', async () => {
                req = { user: { userId: 'user1', role: 'client' }, params: { id: intakeId } };
                const mockIntake = { _id: intakeId, type: 'incorporation', clientId: { toString: () => 'user1' } };
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await getIncorpIntake(req as Request, res as Response);

            expect(jsonMock).toHaveBeenCalledWith({ ...mockIntake, data: {} });
            });

            it('should return 403 for non-owner non-lawyer', async () => {
                req = { user: { userId: 'otherUser', role: 'client' }, params: { id: intakeId } };
                const mockIntake = { _id: intakeId, type: 'incorporation', clientId: { toString: () => 'user1' } };
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await getIncorpIntake(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            });

            it('should return 400 for non-incorporation intake', async () => {
                req = { user: { userId: 'user1' }, params: { id: intakeId } };
                const mockIntake = { _id: intakeId, type: 'will', clientId: { toString: () => 'user1' } };
                (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await expect(getIncorpIntake(req as Request, res as Response)).rejects.toThrow('Not an incorporation intake');
        });
    });

    describe('addIncorpNote', () => {
        it('should add a note to an intake', async () => {
            req = { user: { email: 'test@test.com', userId: 'user1' }, params: { id: 'inc1' }, body: { text: 'Test note' } };
            const mockIntake = { _id: 'inc1', clientId: { toString: () => 'user1' }, notes: [] as any[], save: jest.fn().mockResolvedValue(true) };
            (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await addIncorpNote(req as Request, res as Response);

            expect(mockIntake.notes).toHaveLength(1);
            expect(mockIntake.notes[0].text).toBe('Test note');
            expect(mockIntake.save).toHaveBeenCalled();
        });

        it('should return 404 if intake not found', async () => {
            req = { user: { userId: 'user1' }, params: { id: 'doesNotExist' }, body: { text: 'Note' } };
            (Intake.findById as jest.Mock).mockResolvedValue(null);

            await expect(addIncorpNote(req as Request, res as Response)).rejects.toThrow('Intake');
        });
    });

    describe('updateIncorpIntake', () => {
        it('deep-merges nested section updates instead of replacing the whole section', async () => {
            req = {
                user: { userId: 'user1', role: 'client' },
                params: { id: intakeId },
                body: {
                    data: {
                        preIncorporation: {
                            nuansReport: {
                                conflictDetails: 'Updated conflict details',
                            },
                        },
                    },
                },
            };

            const mockIntake: any = {
                _id: intakeId,
                type: 'incorporation',
                clientId: { toString: () => 'user1' },
                __v: 2,
                data: {
                    preIncorporation: {
                        jurisdiction: 'obca',
                        nameType: 'named',
                        proposedName: 'Acme',
                        legalEnding: 'Inc.',
                        nuansReport: {
                            reportDate: '2026-03-01',
                            hasConflicts: true,
                            conflictDetails: 'Original details',
                            fileReference: 'NUANS-123',
                        },
                        nuansReviewed: true,
                        nameConfirmed: true,
                    },
                },
                markModified: jest.fn(),
                increment: jest.fn(),
                save: jest.fn().mockResolvedValue(true),
                toObject() {
                    return {
                        _id: this._id,
                        type: this.type,
                        clientId: this.clientId,
                        data: this.data,
                        __v: this.__v,
                    };
                },
            };

            (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await updateIncorpIntake(req as Request, res as Response);

            expect(mockIntake.increment).toHaveBeenCalled();
            expect(mockIntake.data.preIncorporation).toEqual({
                jurisdiction: 'obca',
                nameType: 'named',
                proposedName: 'Acme',
                legalEnding: 'Inc.',
                nuansReport: {
                    reportDate: '2026-03-01',
                    hasConflicts: true,
                    conflictDetails: 'Updated conflict details',
                    fileReference: 'NUANS-123',
                },
                nuansReviewed: true,
                nameConfirmed: true,
            });
        });

        it('returns a typed validation error when the merged payload is invalid', async () => {
            req = {
                user: { userId: 'user1', role: 'client' },
                params: { id: intakeId },
                body: {
                    data: {
                        articles: {
                            filingMethod: '',
                        },
                    },
                },
            };

            const mockIntake: any = {
                _id: intakeId,
                type: 'incorporation',
                clientId: { toString: () => 'user1' },
                __v: 2,
                data: {
                    articles: {
                        registeredAddress: '123 Main St',
                    },
                },
                markModified: jest.fn(),
                increment: jest.fn(),
                save: jest.fn().mockResolvedValue(true),
            };

            (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await expect(updateIncorpIntake(req as Request, res as Response)).rejects.toBeInstanceOf(ValidationError);
            expect(mockIntake.save).not.toHaveBeenCalled();
        });

        it('accepts draft placeholder rows created by incorporation add buttons', async () => {
            req = {
                user: { userId: 'user1', role: 'client' },
                params: { id: intakeId },
                body: {
                    data: {
                        structureOwnership: {
                            shareClasses: [{
                                id: 'share_class_1',
                                className: '',
                                votingRights: true,
                                dividendRights: true,
                                liquidationRights: true,
                                maxShares: 0,
                            }],
                            initialShareholders: [{
                                id: 'shareholder_1',
                                fullName: '',
                                numberOfShares: 1,
                                considerationType: 'cash',
                                considerationAmount: 0,
                            }],
                            directors: [{
                                id: 'director_1',
                                fullName: '',
                                address: '',
                                isCanadianResident: true,
                            }],
                        },
                        registrations: {
                            municipalLicences: [{
                                id: 'municipal_1',
                                municipality: '',
                                licenceType: '',
                                obtained: false,
                            }],
                        },
                    },
                },
            };

            const mockIntake: any = {
                _id: intakeId,
                type: 'incorporation',
                clientId: { toString: () => 'user1' },
                __v: 2,
                data: {},
                flags: [],
                markModified: jest.fn(),
                increment: jest.fn(),
                save: jest.fn().mockResolvedValue(true),
                toObject() {
                    return {
                        _id: this._id,
                        type: this.type,
                        clientId: this.clientId,
                        data: this.data,
                        __v: this.__v,
                    };
                },
            };

            (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await updateIncorpIntake(req as Request, res as Response);

            expect(mockIntake.save).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    structureOwnership: expect.objectContaining({
                        shareClasses: expect.arrayContaining([
                            expect.objectContaining({ className: '' }),
                        ]),
                        initialShareholders: expect.arrayContaining([
                            expect.objectContaining({ fullName: '' }),
                        ]),
                        directors: expect.arrayContaining([
                            expect.objectContaining({ fullName: '' }),
                        ]),
                    }),
                    registrations: expect.objectContaining({
                        municipalLicences: expect.arrayContaining([
                            expect.objectContaining({ municipality: '' }),
                        ]),
                    }),
                }),
            }));
        });
    });
});
