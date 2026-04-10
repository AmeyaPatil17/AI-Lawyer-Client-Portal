import { Request, Response } from 'express';
import { getAllIntakes, getIntakeDetails, updateIntakeStatus } from '../controllers/lawyerController';
import Intake from '../models/Intake';
import User from '../models/User';

jest.mock('../models/Intake');
jest.mock('../models/User');

describe('LawyerController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        mockResponse = { json: jsonMock };
        jest.clearAllMocks();
    });

    describe('getAllIntakes', () => {
        it('fetches the filtered queue and returns portfolio summary metrics', async () => {
            const queueDocs = [{
                _id: '1',
                clientId: { email: 'test@test.com', name: 'Test User' },
                status: 'submitted',
                type: 'will',
                data: {},
                flags: [{ type: 'hard', message: 'Foreign assets', code: 'FOREIGN_ASSETS' }],
                priorityScore: 42,
                createdAt: new Date('2026-04-01T00:00:00.000Z'),
                updatedAt: new Date('2026-04-02T00:00:00.000Z'),
            }];
            const portfolioDocs = [{
                status: 'submitted',
                type: 'will',
                data: {},
                flags: [{ type: 'hard', message: 'Foreign assets', code: 'FOREIGN_ASSETS' }],
            }, {
                status: 'completed',
                type: 'will',
                data: {},
                flags: [],
            }];

            const limitMock = jest.fn().mockResolvedValue(queueDocs);
            const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
            const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
            const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
            (Intake.find as jest.Mock)
                .mockReturnValueOnce({ populate: populateMock });
            (Intake.aggregate as jest.Mock).mockResolvedValue([{
                total: 3,
                started: 0,
                submitted: 1,
                reviewing: 0,
                completed: 1,
                flaggedMatters: 1
            }]);
            (Intake.countDocuments as jest.Mock).mockResolvedValue(1);

            mockRequest = {
                query: {
                    page: '1',
                    limit: '20',
                    statusGroup: 'pipeline',
                    sort: 'priority',
                    flaggedOnly: 'true',
                    type: 'will',
                },
            };

            await getAllIntakes(mockRequest as Request, mockResponse as Response);

            expect(Intake.find).toHaveBeenNthCalledWith(1, {
                status: { $in: ['submitted', 'reviewing'] },
                type: 'will',
                'flags.0': { $exists: true },
            });
            expect(populateMock).toHaveBeenCalledWith('clientId', 'email name');
            expect(sortMock).toHaveBeenCalledWith({ priorityScore: -1, updatedAt: -1, createdAt: -1 });
            expect(skipMock).toHaveBeenCalledWith(0);
            expect(limitMock).toHaveBeenCalledWith(20);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.any(Array),
                pagination: expect.objectContaining({ page: 1, limit: 20 }),
                summary: expect.objectContaining({
                    completed: 1,
                    flaggedMatters: 1,
                    submitted: 1,
                    portfolioValue: 3
                }),
            }));
        });

        it('supports search by client email and id fragments through the query builder', async () => {
            const limitMock = jest.fn().mockResolvedValue([]);
            const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
            const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
            const populateMock = jest.fn().mockReturnValue({ sort: sortMock });

            (User.find as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'user-1' }]) });
            (Intake.find as jest.Mock).mockReturnValueOnce({ populate: populateMock });
            (Intake.aggregate as jest.Mock).mockResolvedValueOnce([{
                total: 3,
                started: 0,
                submitted: 1,
                reviewing: 0,
                completed: 1,
                flaggedMatters: 1
            }]);
            (Intake.countDocuments as jest.Mock).mockResolvedValue(0);

            mockRequest = {
                query: {
                    page: '1',
                    limit: '20',
                    statusGroup: 'active',
                    sort: 'recent',
                    search: 'abc123',
                },
            };

            await getAllIntakes(mockRequest as Request, mockResponse as Response);

            expect(User.find).toHaveBeenCalledWith({
                $or: [
                    { email: /abc123/i },
                    { name: /abc123/i },
                ],
            });
            expect(Intake.find).toHaveBeenNthCalledWith(1, expect.objectContaining({
                status: { $in: ['started', 'submitted', 'reviewing'] },
                $or: expect.arrayContaining([
                    { clientName: /abc123/i },
                    { clientId: { $in: ['user-1'] } },
                    expect.objectContaining({
                        $expr: expect.any(Object),
                    }),
                ]),
            }));
        });
    });

    describe('getIntakeDetails', () => {
        it('returns intake detail DTO if found', async () => {
            mockRequest = { params: { id: '123' } };
            const mockIntake = {
                _id: '123',
                clientId: { email: 'test@test.com', name: 'Test User' },
                status: 'started',
                type: 'will',
                data: {},
                flags: [],
                notes: [],
                priorityScore: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const populateMock = jest.fn().mockResolvedValue(mockIntake);
            (Intake.findById as jest.Mock).mockReturnValue({ populate: populateMock });

            await getIntakeDetails(mockRequest as Request, mockResponse as Response);

            expect(Intake.findById).toHaveBeenCalledWith('123');
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                id: '123',
                clientEmail: 'test@test.com',
                status: 'started',
            }));
        });
    });

    describe('updateIntakeStatus', () => {
        it('allows submitted to reviewing', async () => {
            const save = jest.fn().mockResolvedValue(true);
            (Intake.findById as jest.Mock).mockResolvedValue({
                _id: '123',
                status: 'submitted',
                save,
            });

            mockRequest = {
                params: { id: '123' },
                body: { status: 'reviewing' },
            };

            await updateIntakeStatus(mockRequest as Request, mockResponse as Response);

            expect(save).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Status updated successfully', status: 'reviewing' });
        });

        it('rejects illegal transitions', async () => {
            (Intake.findById as jest.Mock).mockResolvedValue({
                _id: '123',
                status: 'started',
                save: jest.fn(),
            });

            mockRequest = {
                params: { id: '123' },
                body: { status: 'reviewing' },
            };

            await expect(
                updateIntakeStatus(mockRequest as Request, mockResponse as Response)
            ).rejects.toMatchObject({ statusCode: 400, message: 'Illegal status transition.' });
        });
    });
});
