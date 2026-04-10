import mongoose from 'mongoose';

/**
 * Global setup for integration tests.
 * Connects to the ephemeral Docker-Compose test MongoDB instance.
 * See: docker-compose.test.yml (port 27018)
 */
beforeAll(async () => {
    const MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27018/willguide_test';
    await mongoose.connect(MONGO_URI);
});

afterAll(async () => {
    // Drop the test database and close the connection cleanly
    if (mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
    }
    await mongoose.connection.close();
});
