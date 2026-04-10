import { formatAssetValueLabel, generateIntakeDoc } from '../services/docxService';
import fs from 'fs';
import path from 'path';

// Note: docx generation involves complex internals, we focus on 
// the service building and saving the file appropriately.
jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn()
}));

describe('DocxService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateIntakeDoc', () => {
        it('should generate a .docx file and return its filename for a complete intake', async () => {
            const mockIntakeRecord = {
                _id: 'intake123',
                data: {
                    personalProfile: { fullName: 'John Doe', occupation: 'Engineer' },
                    executors: { primary: { fullName: 'Jane Doe', relationship: 'Spouse' }, alternates: [] },
                    beneficiaries: { contingencies: 'perStirpes', beneficiaries: [{ fullName: 'Child1' }] },
                    family: { maritalStatus: 'married', spouseName: 'Jane Doe', children: [] },
                    assets: { realEstate: true, realEstate_items: [{ description: '123 Main' }] }
                },
                flags: [{ label: 'High Risk', description: 'Test flag', severity: 'high' }]
            };

            const outputDir = '/mock/temp_docs';
            
            const filename = await generateIntakeDoc(mockIntakeRecord, outputDir);

            expect(filename).toMatch(/^DraftWill_John.*Doe_.*\.docx$/);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join(outputDir, filename),
                expect.any(Buffer)
            );
        });

        it('should handle missing data gracefully (fallback structures)', async () => {
            const emptyIntakeRecord = {
                _id: 'empty_intake'
                // No data, no flags
            };

            const outputDir = '/mock/temp_docs';
            
            const filename = await generateIntakeDoc(emptyIntakeRecord, outputDir);

            expect(filename).toMatch(/^DraftWill_Client_.*\.docx$/);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should accept canonical asset list data', async () => {
            const mockIntakeRecord = {
                _id: 'intake456',
                data: {
                    personalProfile: { fullName: 'Jane Doe' },
                    assets: {
                        list: [
                            { type: 'Business', category: 'business', description: 'OpCo shares', value: 250000, ownership: 'sole' }
                        ]
                    }
                },
                flags: []
            };

            const filename = await generateIntakeDoc(mockIntakeRecord, '/mock/temp_docs');

            expect(filename).toMatch(/^DraftWill_Jane.*Doe_.*\.docx$/);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('formats zero asset values instead of dropping them', () => {
            expect(formatAssetValueLabel(0)).toBe('$0');
            expect(formatAssetValueLabel(undefined)).toBe('-');
        });
    });
});
