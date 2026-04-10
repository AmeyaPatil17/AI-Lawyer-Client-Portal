
import { calculatePriorityScore, generateAutoNote, explainRisk } from '../services/aiService';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn()
}));

describe('AIService', () => {
    // Define stable spy outside
    let mockGenerateContent: jest.Mock;
    const { resetAIModel } = require('../services/aiService'); // Import here

    afterEach(() => {
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        process.env.GEMINI_API_KEY = 'test-key'; // Prevent "Offline Mode" fallback
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockGenerateContent = jest.fn();
        resetAIModel(); // Reset singleton

        // Control the object returned by 'new GoogleGenerativeAI()'
        (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
                startChat: jest.fn().mockReturnValue({
                    sendMessage: jest.fn().mockResolvedValue({ response: { text: () => "Chat Response" } })
                })
            })
        }));
    });

    describe('explainRisk', () => {
        it('should return AI explanation when API succeeds', async () => {
            mockGenerateContent.mockResolvedValueOnce({
                response: { text: () => "AI Explanation Risk found." }
            });

            const result = await explainRisk('TEST_RISK', {});
            expect(result).toBe("AI Explanation Risk found.");
        });

        it('should fallback to hardcoded string on API error', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('API Fail'));

            const result = await explainRisk('Foreign Assets', {});
            expect(result).toContain("Owning assets in another jurisdiction");
        });
    });

    // ... Keep other tests ...
    describe('calculatePriorityScore', () => {
        it('should score 0 for empty intake', () => {
            expect(calculatePriorityScore({})).toBe(0);
        });

        it('should add points for business assets', () => {
            const data = { assets: { business_items: [{}] } };
            expect(calculatePriorityScore(data)).toBeGreaterThanOrEqual(30);
        });

        it('should add points for business assets in the canonical asset list', () => {
            const data = {
                assets: {
                    list: [{ type: 'Business', category: 'business', description: 'OpCo shares' }]
                }
            };
            expect(calculatePriorityScore(data)).toBeGreaterThanOrEqual(30);
        });

        it('should cap score at 100', () => {
            const data = {
                assets: { business_items: [{}], realEstate_items: [{}, {}, {}] },
                priorWills: { hasForeignWill: 'yes' }
            };
            expect(calculatePriorityScore(data)).toBe(100);
        });
    });

    describe('generateAutoNote', () => {
        it('should detect beneficiary removal', () => {
            const oldData = { beneficiaries: { beneficiaries: [{}, {}] } };
            const newData = { beneficiaries: { beneficiaries: [{}] } };
            const note = generateAutoNote(oldData, newData);
            expect(note).toContain('removed a beneficiary');
        });

        it('should detect executor change', () => {
            const oldData = { executors: { primary: { fullName: 'Old Ex' } } };
            const newData = { executors: { primary: { fullName: 'New Ex' } } };
            const note = generateAutoNote(oldData, newData);
            expect(note).toContain('Primary Executor changed');
        });

        it('should return null for no changes', () => {
            const data = { executors: { primary: { fullName: 'Same' } } };
            expect(generateAutoNote(data, data)).toBeNull();
        });
    });
    // ... (Previous tests for explainRisk, calculatePriorityScore, generateAutoNote)



    describe('generateAIResponse', () => {
        const { generateAIResponse } = require('../services/aiService');

        it('should return chat response', async () => {
            // Default mock from top-level beforeEach is sufficient for success case
            // But let's be explicit if needed. The top-level describes uses a default mock that returns "Chat Response".
            // So we don't need to override anything here.

            const response = await generateAIResponse('Hello', {}, 'general');
            expect(response).toBe('Chat Response');
        });

        it('should handle chat errors', async () => {
            // Mock the constructor to throw on startChat
            (GoogleGenerativeAI as unknown as jest.Mock).mockImplementationOnce(() => ({
                getGenerativeModel: jest.fn().mockReturnValue({
                    startChat: jest.fn().mockImplementation(() => { throw new Error('Chat Fail'); })
                })
            }));

            const response = await generateAIResponse('Hi', {}, 'general');
            expect(response).toContain('trouble connecting');
        });
    });

    describe('validateIntakeLogic', () => {
        const { validateIntakeLogic } = require('../services/aiService');

        it('should return warning string from AI', async () => {
            mockGenerateContent.mockResolvedValueOnce({ response: { text: () => "Critical Risk found." } });
            const result = await validateIntakeLogic({}, 'general');
            expect(result).toBe('Critical Risk found.');
        });

        it('should return null if AI says null', async () => {
            mockGenerateContent.mockResolvedValueOnce({ response: { text: () => "NULL" } });
            const result = await validateIntakeLogic({}, 'general');
            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const result = await validateIntakeLogic({}, 'general');
            expect(result).toBeNull();
        });
    });

    describe('runStressTest', () => {
        const { runStressTest } = require('../services/aiService');

        it('should return parsed questions from AI', async () => {
            const localMock = jest.fn().mockResolvedValue({ response: { text: () => '["Question 1?"]' } });

            (GoogleGenerativeAI as unknown as jest.Mock).mockImplementationOnce(() => ({
                getGenerativeModel: jest.fn().mockReturnValue({
                    generateContent: localMock
                })
            }));

            const questions = await runStressTest({}, 'general');
            expect(questions).toHaveLength(1);
            expect(questions[0]).toBe('Question 1?');
        });

        it('should fallback to rule-based questions on AI error', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const data = {
                executors: { primary: { fullName: 'Solo' }, alternates: [] }
            };
            const questions = await runStressTest(data, 'executors');
            expect(questions[0]).toContain('only named Solo');
        });

        it('should fallback logic for beneficiaries (total != 100)', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const data = {
                beneficiaries: { beneficiaries: [{ share: 90 }] }
            };
            const questions = await runStressTest(data, 'general');
            expect(questions.some((q: any) => q.includes('total 90%'))).toBe(true);
        });

        it('should fallback logic for vague assets', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const data = {
                assets: { realEstate_items: [{ description: 'Hi' }] } // < 5 chars
            };
            const questions = await runStressTest(data, 'assets');
            expect(questions[0]).toContain('vague description');
        });

        it('should fallback logic for vague canonical real-estate assets', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const data = {
                assets: {
                    list: [{ type: 'RealEstate', category: 'realEstate', description: 'Hi' }]
                }
            };
            const questions = await runStressTest(data, 'assets');
            expect(questions[0]).toContain('vague description');
        });
    });

    describe('getClauseSuggestions', () => {
        const { getClauseSuggestions } = require('../services/aiService');

        it('should suggest international clause for foreign wills', async () => {
            const data = { priorWills: { hasForeignWill: 'yes' } };
            const suggestions = await getClauseSuggestions(data);
            expect(suggestions.some((s: any) => s.id === 'foreign_1')).toBe(true);
        });

        it('should suggest business powers', async () => {
            const data = { assets: { business_items: [{}] } };
            const suggestions = await getClauseSuggestions(data);
            expect(suggestions.some((s: any) => s.id === 'biz_1')).toBe(true);
        });

        it('should suggest business powers for canonical business assets', async () => {
            const data = {
                assets: {
                    list: [{ type: 'Business', category: 'business', description: 'Holdco shares' }]
                }
            };
            const suggestions = await getClauseSuggestions(data);
            expect(suggestions.some((s: any) => s.id === 'biz_1')).toBe(true);
        });

        it('should suggest guardianship funding', async () => {
            const data = { guardians: { primary: { fullName: 'G1' } } };
            const suggestions = await getClauseSuggestions(data);
            expect(suggestions.some((s: any) => s.id === 'guard_1')).toBe(true);
        });
    });

    describe('parseAssets', () => {
        const { parseAssetsFromText } = require('../services/aiService');

        it('should return parsed JSON from AI', async () => {
            const mockAssets = { realEstate_items: [{ description: 'House' }] };
            const localMock = jest.fn().mockResolvedValue({
                response: { text: () => JSON.stringify(mockAssets) }
            });

            (GoogleGenerativeAI as unknown as jest.Mock).mockImplementationOnce(() => ({
                getGenerativeModel: jest.fn().mockReturnValue({
                    generateContent: localMock
                })
            }));

            const result = await parseAssetsFromText("I have a house");
            expect(result.realEstate_items[0].description).toBe('House');
        });

        it('should use fallback mock on error', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const result = await parseAssetsFromText("I have a cottage and a bank account");
            expect(result.realEstate_items[0].description).toBe('Cottage');
            expect(result.bankAccounts_items[0].description).toBe('Bank Account');
        });

        it('returns the expanded asset buckets and supported ownership values from the fallback parser', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const result = await parseAssetsFromText('I have a Tesla, bitcoin, and a Florida condo');

            expect(result.vehicles_items[0].ownership).toBe('sole');
            expect(result.digital_items[0].ownership).toBe('sole');
            expect(result.foreignAssets_items[0].ownership).toBe('sole');
        });
    });

    describe('Wrapper Functions', () => {
        const { parseAssetsFromFile } = require('../services/aiService');

        it('parseAssetsFromFile should call AI and parse result', async () => {
            // Similar to parseAssetsFromText, but passing a buffer
            const mockBuffer = Buffer.from('PDF content mock', 'utf-8');
            const mockAssets = { realEstate_items: [{ description: 'Office' }] };
            
            // Mock generateContent to return the stringified JSON
            const localMock = jest.fn().mockResolvedValue({
                response: { text: () => JSON.stringify(mockAssets) }
            });

            (GoogleGenerativeAI as unknown as jest.Mock).mockImplementationOnce(() => ({
                getGenerativeModel: jest.fn().mockReturnValue({
                    generateContent: localMock
                })
            }));

            const result = await parseAssetsFromFile(mockBuffer, 'application/pdf');
            expect(result.realEstate_items[0].description).toBe('Office');
            // Check that the prompt includes the correct instructions
            expect(localMock).toHaveBeenCalledWith(expect.arrayContaining([
                expect.stringContaining('Extract all financial assets')
            ]));
        });

        it('parseAssetsFromFile should fallback on error', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Fail'));
            const result = await parseAssetsFromFile(Buffer.from('test'), 'application/pdf');
             // The fallback mechanism should still return an object matching the schema structure
            expect(result).toHaveProperty('realEstate_items');
        });
    });
});
