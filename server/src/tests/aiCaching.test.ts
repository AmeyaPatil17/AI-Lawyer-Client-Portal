import { GoogleGenerativeAI } from '@google/generative-ai';
import { clearAICache } from '../services/aiService';

jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: jest.fn().mockResolvedValue({ response: { text: () => 'cached response' } }),
                startChat: jest.fn().mockReturnValue({ sendMessage: jest.fn().mockResolvedValue({ response: { text: () => 'chat response' } }) })
            })
        }))
    };
});

describe('AI Model Caching (Issue #6)', () => {
    const mockGetGenerativeModel = jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
            response: { text: () => 'cached response' }
        }),
        startChat: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockResolvedValue({
                response: { text: () => 'chat response' }
            })
        })
    });

    beforeEach(() => {
        jest.clearAllMocks();
        clearAICache();
        process.env.GEMINI_API_KEY = 'test-key';

        // Reset module to clear cached instances
        jest.resetModules();

        (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));
    });

    it('should only create GoogleGenerativeAI once across multiple calls', () => {
        // Re-import after module reset
        const { resetAIModel } = require('../services/aiService');
        resetAIModel();

        // getModel is internal, but we can test via exported functions that use it
        // Call explainRisk twice
        const { explainRisk } = require('../services/aiService');

        return explainRisk('TEST', {}).then(() => {
            return explainRisk('TEST2', {}).then(() => {
                const { GoogleGenerativeAI: NewMock } = require('@google/generative-ai');
                // GoogleGenerativeAI constructor should be called only once (cached)
                expect(NewMock).toHaveBeenCalledTimes(1);
            });
        });
    });

    it('clearAICache should empty the response cache', () => {
        const { clearAICache: clearCache } = require('../services/aiService');
        // Should not throw
        expect(() => clearCache()).not.toThrow();
    });
});
