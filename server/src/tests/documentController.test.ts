import { Request, Response } from 'express';
import { downloadIntakeDoc } from '../controllers/documentController';
import Intake from '../models/Intake';
import { generateIntakeDoc } from '../services/docxService';

jest.mock('../models/Intake');
jest.mock('../services/docxService');

describe('DocumentController', () => {
    const intakeId = '507f1f77bcf86cd799439011';
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let downloadMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        downloadMock = jest.fn((path, filename, callback) => {
            if (callback) callback(null); // simulate success
        });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
            download: downloadMock,
        };
        jest.clearAllMocks();
    });

    describe('downloadIntakeDoc', () => {
        it('should generate and download document successfully', async () => {
            mockRequest = { params: { id: intakeId }, user: { userId: 'owner-1', email: 'owner@test.com', role: 'client' } } as any;
            const mockIntake = { _id: intakeId, clientId: { toString: () => 'owner-1' } };

            (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
            (generateIntakeDoc as jest.Mock).mockResolvedValue('test_file.docx');

            await downloadIntakeDoc(mockRequest as Request, mockResponse as Response);

            expect(Intake.findById).toHaveBeenCalledWith(intakeId);
            expect(generateIntakeDoc).toHaveBeenCalledWith(mockIntake, expect.any(String));
            expect(downloadMock).toHaveBeenCalledWith(expect.stringContaining('test_file.docx'), 'test_file.docx', expect.any(Function));
        });

        it('should throw if intake is not found', async () => {
            mockRequest = { params: { id: intakeId }, user: { userId: 'owner-1', email: 'owner@test.com', role: 'client' } } as any;
            (Intake.findById as jest.Mock).mockResolvedValue(null);

            await downloadIntakeDoc(mockRequest as Request, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Intake not found' });
            expect(generateIntakeDoc).not.toHaveBeenCalled();
        });

        it('should throw if generation fails', async () => {
            mockRequest = { params: { id: intakeId }, user: { userId: 'owner-1', email: 'owner@test.com', role: 'client' } } as any;
            const mockIntake = { _id: intakeId, clientId: { toString: () => 'owner-1' } };

            (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);
            (generateIntakeDoc as jest.Mock).mockRejectedValue(new Error('Docx Error'));

            await expect(downloadIntakeDoc(mockRequest as Request, mockResponse as Response)).rejects.toThrow('Docx Error');
        });

        it('should throw when a client requests another client intake document', async () => {
            mockRequest = { params: { id: intakeId }, user: { userId: 'owner-2', email: 'other@test.com', role: 'client' } } as any;
            const mockIntake = { _id: intakeId, clientId: { toString: () => 'owner-1' } };

            (Intake.findById as jest.Mock).mockResolvedValue(mockIntake);

            await downloadIntakeDoc(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Not authorized to download this intake' });
            expect(generateIntakeDoc).not.toHaveBeenCalled();
        });
    });
});
