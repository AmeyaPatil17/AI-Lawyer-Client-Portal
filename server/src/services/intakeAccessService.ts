import mongoose from 'mongoose';
import { Response } from 'express';
import Intake from '../models/Intake';
import type { AuthRequest } from '../middleware/authMiddleware';

interface IntakeAccessOptions {
    ownerOnly?: boolean;
    expectedType?: 'will' | 'incorporation';
    action?: string;
    includeDeleted?: boolean;
}

const getRequestUserId = (req: AuthRequest): string | undefined =>
    req.user?.userId || (req.user as any)?.id;

export const loadAccessibleIntake = async (
    req: AuthRequest,
    res: Response,
    options: IntakeAccessOptions = {}
) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid intake id' });
        return null;
    }

    const intake = await Intake.findById(req.params.id);

    if (!intake) {
        res.status(404).json({ message: 'Intake not found' });
        return null;
    }

    if (!options.includeDeleted && intake.isDeleted) {
        res.status(404).json({ message: 'Intake not found' });
        return null;
    }

    if (options.expectedType && intake.type !== options.expectedType) {
        res.status(400).json({ message: `Not a ${options.expectedType} intake` });
        return null;
    }

    const requestUserId = getRequestUserId(req);
    const isOwner = intake.clientId.toString() === requestUserId;
    const isPrivileged = req.user?.role === 'lawyer' || req.user?.role === 'admin';

    if (options.ownerOnly) {
        if (!isOwner) {
            res.status(403).json({ message: `Not authorized to ${options.action || 'access'} this intake` });
            return null;
        }
        return intake;
    }

    if (!isOwner && !isPrivileged) {
        res.status(403).json({ message: `Not authorized to ${options.action || 'access'} this intake` });
        return null;
    }

    return intake;
};

export const getRequestUserIdOrUndefined = getRequestUserId;
