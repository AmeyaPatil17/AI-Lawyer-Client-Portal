import mongoose from 'mongoose';
import Intake from '../../models/Intake';
import { IntakeDataSchema } from '../../schemas/intake';

/**
 * Intake Integration Tests
 * Covers: CRUD, Zod pre-validation, version stamp (OCC), field stripping
 * Requires the ephemeral test MongoDB to be running (see docker-compose.test.yml)
 */

describe('Intake Integration & Zod Validation', () => {
    afterEach(async () => {
        await Intake.deleteMany({});
    });

    it('should save valid intake data and allow schema validation', async () => {
        const rawData = {
            personalProfile: { fullName: 'Test User' },
            family: { maritalStatus: 'Single' },
        };

        const validatedData = IntakeDataSchema.parse(rawData);

        const intake = await Intake.create({
            userId: new mongoose.Types.ObjectId(),
            status: 'in-progress',
            data: validatedData,
        });

        expect(intake._id).toBeDefined();
        expect((intake.data as any).personalProfile?.fullName).toBe('Test User');
        expect(intake.__v).toBe(0); // OCC version starts at 0
    });

    it('should strip unknown fields via Zod and save successfully', async () => {
        const rawData = {
            personalProfile: { fullName: 'Jane Doe' },
            unknownHackerField: 'Mwahaha',
        };

        const validatedData = IntakeDataSchema.parse(rawData);
        expect((validatedData as any).unknownHackerField).toBeUndefined();

        const intake = await Intake.create({
            userId: new mongoose.Types.ObjectId(),
            status: 'in-progress',
            data: validatedData,
        });

        expect((intake.data as any).personalProfile?.fullName).toBe('Jane Doe');
        expect((intake.data as any).unknownHackerField).toBeUndefined();
    });

    it('should increment __v on each save (OCC version stamp)', async () => {
        const intake = await Intake.create({
            userId: new mongoose.Types.ObjectId(),
            status: 'in-progress',
            data: { personalProfile: { fullName: 'V-Test' } },
        });

        expect(intake.__v).toBe(0);

        intake.data = { ...intake.data, personalProfile: { fullName: 'V-Test Updated' } };
        intake.markModified('data');
        await intake.save();

        expect(intake.__v).toBe(1); // Mongoose increments __v on update
    });

    it('should transition status from in-progress to submitted', async () => {
        const intake = await Intake.create({
            userId: new mongoose.Types.ObjectId(),
            status: 'in-progress',
            data: { personalProfile: { fullName: 'Submit Test' } },
        });

        intake.status = 'submitted';
        await intake.save();

        const refreshed = await Intake.findById(intake._id);
        expect(refreshed?.status).toBe('submitted');
    });

    it('should query intakes by userId', async () => {
        const userId = new mongoose.Types.ObjectId();
        await Intake.create({
            userId,
            status: 'in-progress',
            data: { personalProfile: { fullName: 'Query Test' } },
        });

        const results = await Intake.find({ userId });
        expect(results.length).toBe(1);
        expect((results[0].data as any)?.personalProfile?.fullName).toBe('Query Test');
    });
});
