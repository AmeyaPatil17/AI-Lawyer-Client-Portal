import mongoose from 'mongoose';

// Import all models so their schemas are registered
import User from '../models/User';
import Intake from '../models/Intake';
import RefreshToken from '../models/RefreshToken';
import PasswordResetToken from '../models/PasswordResetToken';
import AiUsageLog from '../models/AiUsageLog';
import AuditLog from '../models/AuditLog';

/**
 * Synchronize all Mongoose model indexes with MongoDB.
 *
 * For each model:
 *   - Creates indexes defined in the schema that don't exist in the DB
 *   - Drops indexes that exist in the DB but are not in the schema
 *
 * Call on server startup in development. In production, run via:
 *   npx ts-node src/utils/syncIndexes.ts
 */
export async function syncAllIndexes(): Promise<void> {
    const models = [User, Intake, RefreshToken, PasswordResetToken, AiUsageLog, AuditLog];

    for (const model of models) {
        try {
            await model.syncIndexes();
            console.log(`✅ Indexes synced: ${model.modelName}`);
        } catch (err) {
            console.error(`❌ Index sync failed for ${model.modelName}:`, err);
        }
    }
}

// CLI entry point: `npx ts-node src/utils/syncIndexes.ts`
if (require.main === module) {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/willguide';
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('Connected to MongoDB for index sync');
            return syncAllIndexes();
        })
        .then(() => {
            console.log('Index sync complete.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Index sync error:', err);
            process.exit(1);
        });
}
