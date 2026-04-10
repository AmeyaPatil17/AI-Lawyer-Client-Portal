import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Intake from '../models/Intake';

export const submitTriage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { triageData } = req.body;

        // Create Intake Record for the authenticated user
        const newIntake = new Intake({
            clientId: userId,
            type: 'will',
            status: 'started',
            data: { triage: triageData }, 
            flags: []
        });

        if (!triageData.ontarioResidency) {
            newIntake.flags.push({ type: 'hard', message: 'User is not an Ontario resident.', code: 'RESIDENCY_FAIL' });
        }

        await newIntake.save();

        res.status(201).json({
            intakeId: newIntake._id
        });

    } catch (error: any) {
        console.error('Triage submission error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
