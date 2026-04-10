import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Intake from '../models/Intake';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/willguide';

async function migrate() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    
    console.log('Running migration: Backfill type="will" on existing intakes...');
    
    const result = await Intake.updateMany(
        { type: { $exists: false } },
        { $set: { type: 'will' } }
    );
    
    console.log(`Migration complete. Modified ${result.modifiedCount} documents.`);
    
    await mongoose.disconnect();
    console.log('Disconnected.');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
