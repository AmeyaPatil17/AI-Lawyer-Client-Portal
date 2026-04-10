import { Response } from 'express';
import { submitTriage } from '../controllers/triageController';
import Intake from '../models/Intake';
import { AuthRequest } from '../middleware/authMiddleware';

jest.mock('../models/Intake');

describe('TriageController', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });

    describe('submitTriage', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockRequest = {
                body: { triageData: { ontarioResidency: true } }
            };

            await submitTriage(mockRequest as AuthRequest, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        it('should create intake successfully for authenticated user', async () => {
            mockRequest = {
                user: { userId: 'user123', email: 'test@example.com', role: 'client' },
                body: {
                    triageData: { ontarioResidency: true }
                }
            };

            const saveIntakeMock = jest.fn().mockResolvedValue(true);
            const mockFlags: any[] = [];
            (Intake as unknown as jest.Mock).mockImplementation(() => ({
                _id: 'intake123',
                flags: mockFlags,
                save: saveIntakeMock
            }));

            await submitTriage(mockRequest as AuthRequest, mockResponse as Response);

            expect(saveIntakeMock).toHaveBeenCalled();
            expect(mockFlags).toHaveLength(0); // Ontario resident, no flag
            
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                intakeId: 'intake123'
            });
        });

        it('should add flag if user is not Ontario resident', async () => {
             mockRequest = {
                user: { userId: 'user123', email: 'test@example.com', role: 'client' },
                body: {
                    triageData: { ontarioResidency: false }
                }
            };

            const saveIntakeMock = jest.fn().mockResolvedValue(true);
            const mockFlags: any[] = [];
            (Intake as unknown as jest.Mock).mockImplementation(() => ({
                _id: 'intake123',
                flags: mockFlags,
                save: saveIntakeMock
            }));

            await submitTriage(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockFlags).toHaveLength(1);
            expect(mockFlags[0].code).toBe('RESIDENCY_FAIL');
        });

        it('should handle server errors gracefully', async () => {
            mockRequest = { 
                user: { userId: 'user123', email: 'test@example.com', role: 'client' },
                body: { triageData: {} } 
            };
            
            (Intake as unknown as jest.Mock).mockImplementation(() => {
                throw new Error('Database Crash');
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await submitTriage(mockRequest as AuthRequest, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server error' }));
            consoleSpy.mockRestore();
        });
    });
});
