import Redis from 'ioredis';

type CacheClient = Pick<Redis, 'get' | 'setex' | 'flushdb' | 'quit' | 'disconnect' | 'on'>;

const createMemoryRedisClient = (): CacheClient => {
    const store = new Map<string, string>();

    return {
        get: async (key: string) => store.get(key) ?? null,
        setex: async (key: string, _ttlSeconds: number, value: string) => {
            store.set(key, value);
            return 'OK';
        },
        flushdb: async () => {
            store.clear();
            return 'OK';
        },
        quit: async () => 'OK',
        disconnect: () => undefined,
        on: () => undefined as any
    };
};

const redis: CacheClient = process.env.NODE_ENV === 'test'
    ? createMemoryRedisClient()
    : new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

if (process.env.NODE_ENV !== 'test') {
    redis.on('error', (err) => {
        console.error('Redis error:', err);
    });

    redis.on('connect', () => {
        console.log('Connected to Redis for AI Caching');
    });
}

export default redis;
