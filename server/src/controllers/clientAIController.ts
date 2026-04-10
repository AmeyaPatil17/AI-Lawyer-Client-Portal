import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { generateAIResponse, generateAIResponseStream, SYSTEM_PROMPT, INCORPORATION_SYSTEM_PROMPT } from '../services/aiService';

export const handleGuideQuery = async (req: AuthRequest, res: Response) => {
    try {
        const { message, intakeData, currentStep, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const isIncorporation = req.baseUrl.includes('incorporation');
        const systemPrompt = isIncorporation ? INCORPORATION_SYSTEM_PROMPT : SYSTEM_PROMPT;

        // Pass the sensitive intake data securely to the AI service
        const aiResponse = await generateAIResponse(message, intakeData || {}, currentStep || 'unknown', history || [], systemPrompt);

        res.json({ reply: aiResponse });
    } catch (error) {
        console.error('Controller Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const handleGuideQueryStream = async (req: AuthRequest, res: Response) => {
    try {
        const { message, intakeData, currentStep, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const isIncorporation = req.baseUrl.includes('incorporation');
        const systemPrompt = isIncorporation ? INCORPORATION_SYSTEM_PROMPT : SYSTEM_PROMPT;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const result = await generateAIResponseStream(message, intakeData || {}, currentStep || 'unknown', history || [], systemPrompt);
        
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error: any) {
        console.error('Stream Controller Error:', error);
        res.write(`data: ${JSON.stringify({ text: "\n\n(Error reaching Knowledge Base: " + (error.message || "Unknown") + ")" })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
};
