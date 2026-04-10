import { FullConfig } from '@playwright/test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: false });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/valiant_law_dev';

const E2E_EMAILS = [
    'ameya@synergyit.ca',
    'lawyer@synergyit.ca',
    'info@synergyit.ca',
];

/**
 * Global teardown — A5 fix.
 *
 * Removes test intakes created by E2E users so repeated runs don't accumulate
 * stale data that can affect "Start Over", duplicate-detection, and list tests.
 * Test user accounts themselves are kept (upserted fresh each setup run).
 */
async function globalTeardown(_config: FullConfig) {
    console.log('[Teardown] Cleaning up E2E test data from MongoDB...');

    try {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
        const db = mongoose.connection.db;

        // Remove intakes owned by E2E users so dashboard/list tests start clean
        const users = await db!.collection('users')
            .find({ email: { $in: E2E_EMAILS } }, { projection: { _id: 1 } })
            .toArray();

        const userIds = users.map(u => u._id);

        if (userIds.length > 0) {
            const result = await db!.collection('intakes').deleteMany({
                userId: { $in: userIds }
            });
            console.log(`[Teardown] Deleted ${result.deletedCount} E2E intake records.`);
        }
    } catch (error) {
        // Log but don't throw — teardown failures should not mark the suite as failed
        console.error('[Teardown] Warning: could not clean up test data:', error);
    } finally {
        await mongoose.disconnect();
    }
}

export default globalTeardown;
