import AiUsageLog from '../models/AiUsageLog';
import { logger } from './logger';

export const trackUsage = async (
    metadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    },
    endpoint: string,
    modelName: string,
    latencyMs: number,
    userId?: any
): Promise<void> => {
    try {
        await AiUsageLog.create({
            userId,
            endpoint,
            aiModel: modelName,
            promptTokens: metadata.promptTokenCount,
            completionTokens: metadata.candidatesTokenCount,
            totalTokens: metadata.totalTokenCount,
            latencyMs
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to log AI usage');
    }
};

export const getUsageSummary = async (startDate: Date, endDate: Date) => {
    const pipeline = [
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    endpoint: "$endpoint"
                },
                totalRequests: { $sum: 1 },
                totalPromptTokens: { $sum: "$promptTokens" },
                totalCompletionTokens: { $sum: "$completionTokens" },
                totalTokens: { $sum: "$totalTokens" }
            }
        },
        {
            $sort: { "_id.date": -1, "_id.endpoint": 1 } as any
        }
    ];

    return await AiUsageLog.aggregate(pipeline);
};
