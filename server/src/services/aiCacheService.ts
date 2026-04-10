import crypto from 'crypto';
import redis from './redisClient';
import { getAiOperationalSettings } from './aiSettingsService';

export const hashKey = (prefix: string, data: any): string => {
    const str = typeof data === 'string' ? data : JSON.stringify(data || {});
    const hash = crypto.createHash('sha256').update(str).digest('hex');
    return `${prefix}_${hash}`;
};

export const getCached = async (key: string): Promise<any> => {
    try {
        const val = await redis.get(key);
        if (val) return JSON.parse(val);
    } catch (e) {
        console.warn('Redis get fail:', e);
    }
    return null;
};

export const setCache = async (key: string, data: any): Promise<void> => {
    try {
        const ttl = getAiOperationalSettings().cacheTtlSeconds;
        await redis.setex(key, ttl, JSON.stringify(data));
    } catch (e) {
        console.warn('Redis set fail:', e);
    }
};

export const clearAICache = async (): Promise<void> => {
    await redis.flushdb();
};
