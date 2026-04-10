import mongoose from 'mongoose';
import '../setupIntegration';
import Intake from '../../models/Intake';

describe('Intake pre(save) validation hook', () => {
    const validClient = new mongoose.Types.ObjectId();

    beforeEach(async () => {
        await Intake.deleteMany({});
    });

    it('should save an intake if it meets partial schema requirements', async () => {
        // Zod validators in Intake.ts are generally optional or partial.
        const intake = new Intake({ 
            clientId: validClient,
            type: 'will'
        });
        await intake.save();
        expect(intake._id).toBeDefined();
    });

    it('should throw an error with invalid data according to Zod', async () => {
         const intake = new Intake({
             clientId: validClient,
             type: 'will',
             data: {
                 // Supplying clearly malformed email
                 profile: {
                     email: 'not-an-email'
                 }
             }
         });
         
         await expect(intake.save()).rejects.toThrow();
    });

    it('should pass validation with valid data', async () => {
         const intake = new Intake({
             clientId: validClient,
             type: 'will',
             data: {
                 profile: {
                     email: 'test@example.com',
                     firstName: 'John',
                     lastName: 'Doe'
                 }
             }
         });
         
         await intake.save();
         expect(intake._id).toBeDefined();
    });
});
