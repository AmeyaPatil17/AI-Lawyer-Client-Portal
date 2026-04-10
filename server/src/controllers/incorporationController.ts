import { Response } from 'express';
import Intake from '../models/Intake';
import { AuthRequest } from '../middleware/authMiddleware';
import { generateIncorpFlags, validateIncorpLogic } from '../services/incorporationRulesEngine';
import { generateAIResponse, calculatePriorityScore, generateAutoNote } from '../services/aiService';
import { generateIncorpDoc } from '../services/incorpDocxService';
import { IncorporationDataSchema, type IncorporationData } from '../schemas/incorporationSchema';
import path from 'path';
import { normalizeIncorpData } from '../services/incorpDataNormalizer';
import { AppError, NotFoundError, ForbiddenError, BadRequestError, ValidationError } from '../errors/AppError';
import { logger } from '../services/logger';
import { getRequestUserIdOrUndefined, loadAccessibleIntake } from '../services/intakeAccessService';

const toResponseObject = (value: any) =>
    typeof value?.toObject === 'function'
        ? value.toObject()
        : { ...value };

const cloneSerializable = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value ?? {}));

const isPlainObject = (value: unknown): value is Record<string, any> =>
    !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const deepMergeIncorpData = (base: any, patch: any): any => {
    if (patch === undefined) {
        return cloneSerializable(base);
    }

    if (Array.isArray(patch)) {
        return cloneSerializable(patch);
    }

    if (isPlainObject(base) && isPlainObject(patch)) {
        const merged: Record<string, any> = { ...cloneSerializable(base) };

        for (const [key, patchValue] of Object.entries(patch)) {
            if (patchValue === undefined) {
                continue;
            }

            const baseValue = merged[key];
            if (Array.isArray(patchValue)) {
                merged[key] = cloneSerializable(patchValue);
            } else if (isPlainObject(patchValue) && isPlainObject(baseValue)) {
                merged[key] = deepMergeIncorpData(baseValue, patchValue);
            } else if (isPlainObject(patchValue)) {
                merged[key] = deepMergeIncorpData({}, patchValue);
            } else {
                merged[key] = patchValue;
            }
        }

        return merged;
    }

    return cloneSerializable(patch);
};

const findNewestIncorpMatter = (filter: Record<string, any>) =>
    Intake.findOne(filter).sort({ updatedAt: -1, createdAt: -1 });

const findCurrentIncorpMatter = async (userId: string) => {
    const baseFilter = { clientId: userId, type: 'incorporation', isDeleted: { $ne: true } };

    const started = await findNewestIncorpMatter({
        ...baseFilter,
        status: 'started',
    });
    if (started) return started;

    const submittedOrReviewing = await findNewestIncorpMatter({
        ...baseFilter,
        status: { $in: ['reviewing', 'submitted'] },
    });
    if (submittedOrReviewing) return submittedOrReviewing;

    return findNewestIncorpMatter({
        ...baseFilter,
        status: 'completed',
    });
};

// ============================================
// CRUD — Incorporation Intakes
// ============================================

export const createIncorpIntake = async (req: AuthRequest, res: Response) => {
    const userId = getRequestUserIdOrUndefined(req);
    if (!userId) throw new ForbiddenError('create an incorporation intake');

    // Resume the prioritized active matter instead of creating a duplicate.
    const existing = await findCurrentIncorpMatter(userId);
    if (existing) {
        if (existing.status === 'completed') {
            // Completed matters do not block a fresh incorporation draft.
        } else {
            const response = toResponseObject(existing);
            response.data = normalizeIncorpData(response.data);
            return res.status(200).json(response);
        }
    }

    const newIntake = new Intake({
        clientId: userId,
        type: 'incorporation',
        status: 'started',
        data: normalizeIncorpData(req.body.data || {}),
        flags: [],
    });
    await newIntake.save();
    const response = toResponseObject(newIntake);
    response.data = normalizeIncorpData(response.data);
    res.status(201).json(response);
};

export const getCurrentIncorpIntake = async (req: AuthRequest, res: Response) => {
    const userId = getRequestUserIdOrUndefined(req);
    if (!userId) throw new ForbiddenError('access incorporation intakes');

    const intake = await findCurrentIncorpMatter(userId);
    if (!intake) throw new NotFoundError('Incorporation intake');

    const response = toResponseObject(intake);
    response.data = normalizeIncorpData(response.data);
    res.json(response);
};

export const getIncorpIntake = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, { action: 'view' });
    if (!intake) return;
    if (intake.type !== 'incorporation') throw new BadRequestError('Not an incorporation intake');

    const response = toResponseObject(intake);
    response.data = normalizeIncorpData(response.data);
    res.json(response);
};

export const updateIncorpIntake = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, { action: 'update' });
    if (!intake) return;
    if (intake.type !== 'incorporation') throw new BadRequestError('Not an incorporation intake');

    // Gap 86: Optimistic Concurrency Control — same pattern as will intakes
    if (req.body.expectedVersion !== undefined) {
        const clientVersion = Number(req.body.expectedVersion);
        const serverVersion = Number((intake as any).__v ?? 0);
        if (serverVersion !== clientVersion) {
            throw new AppError(409, 'The data was changed in another tab or device. Please reload.', 'CONFLICT');
        }
    }

    const oldData = normalizeIncorpData((intake as any).data || {});
    const mergedData = deepMergeIncorpData(oldData, req.body.data || {});
    const validation = IncorporationDataSchema.safeParse(normalizeIncorpData(mergedData));
    if (!validation.success) {
        throw new ValidationError('Validation Failed', validation.error.issues);
    }

    const nextData = validation.data;
    (intake as any).data = nextData;
    intake.markModified('data');

    intake.flags = generateIncorpFlags(nextData as IncorporationData);
    (intake as any).logicWarnings = validateIncorpLogic(nextData as IncorporationData);

    try { intake.priorityScore = calculatePriorityScore(nextData); } catch { /* non-critical */ }

    let autoNoteSuggestion: string | null | undefined;
    try { autoNoteSuggestion = await generateAutoNote(oldData, nextData); } catch { /* non-critical */ }

    if (req.body.status) intake.status = req.body.status;

    intake.increment();
    await intake.save();

    res.json({
        ...toResponseObject(intake),
        data: normalizeIncorpData(nextData),
        autoNoteSuggestion,
        expectedVersion: Number((intake as any).__v ?? 0),
    });
};

export const submitIncorpIntake = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, { action: 'update' });
    if (!intake) return;
    if (intake.type !== 'incorporation') throw new BadRequestError('Not an incorporation intake');
    if (req.user?.role !== 'client') throw new ForbiddenError('Only clients can submit intakes');

    // Prevent double-submission
    if (intake.status === 'submitted' || intake.status === 'completed') {
        throw new AppError(409, 'Intake has already been submitted', 'CONFLICT');
    }

    const data = normalizeIncorpData((intake as any).data || {});

    if (req.body.clientNotes !== undefined) {
        data.incorpNotes = {
            ...(data.incorpNotes || {}),
            clientNotes: req.body.clientNotes || undefined,
        };
    }

    data.submitted      = true;
    data.submissionDate = new Date().toISOString();
    (intake as any).data = data;
    intake.markModified('data');
    intake.status = 'submitted';

    const flags         = generateIncorpFlags(data as IncorporationData);
    intake.flags        = flags;
    const logicWarnings = validateIncorpLogic(data as IncorporationData);
    (intake as any).logicWarnings = logicWarnings;

    try {
        const autoNote = await generateAutoNote({}, data);
        if (autoNote) {
            if (!intake.notes) intake.notes = [];
            intake.notes.push({
                text: `[Auto] Incorporation intake submitted by client. ${autoNote}`,
                author: 'System',
                createdAt: new Date(),
            });
        }
    } catch { /* non-critical */ }

    await intake.save();

    res.json({
        message: 'Intake submitted successfully',
        id: intake._id,
        status: intake.status,
        submissionDate: data.submissionDate,
        flags,
        logicWarnings,
    });
};

export const addIncorpNote = async (req: AuthRequest, res: Response) => {
    const intake = await Intake.findById(req.params.id);
    if (!intake) throw new NotFoundError('Intake');

    // Gap 10: Authorization — only owner, lawyers, or admins may add notes
    const userId = getRequestUserIdOrUndefined(req);
    const role   = req.user?.role ?? '';
    const isOwner = intake.clientId.toString() === userId;
    const isStaff = role === 'lawyer' || role === 'admin';
    if (!isOwner && !isStaff) {
        throw new ForbiddenError('add notes to this incorporation intake');
    }

    const text = req.body.text;
    if (!text || typeof text !== 'string' || !text.trim()) {
        throw new BadRequestError('Note text is required');
    }

    const authorName = (req.user as any)?.name || req.user?.email || 'User';
    const roleLabel = role === 'lawyer' ? 'Lawyer' : role === 'admin' ? 'Admin' : 'Client';

    if (!intake.notes) intake.notes = [];

    intake.notes.push({
        text: text.trim(),
        author: `${authorName} (${roleLabel})`,
        createdAt: new Date(),
    });

    await intake.save();
    res.json(intake.notes);
};

export const downloadIncorpDoc = async (req: AuthRequest, res: Response) => {
    const intake = await Intake.findById(req.params.id);
    if (!intake) throw new NotFoundError('Intake');
    if (intake.type !== 'incorporation') throw new BadRequestError('Not an incorporation intake');

    const outputDir = path.join(__dirname, '../../temp_docs');
    const filename  = await generateIncorpDoc(intake, outputDir);
    const filePath  = path.join(outputDir, filename);

    // Gap 26 partial: respond with 500 on download failure instead of swallowing
    res.download(filePath, filename, (err) => {
        if (err && !res.headersSent) {
            logger.error({ err, intakeId: req.params.id }, 'Incorp doc download error');
            res.status(500).json({ message: 'Document download failed' });
        }
        // Best-effort cleanup after send
        import('fs').then(fs => fs.unlink(filePath, () => {})).catch(() => {});
    });
};
