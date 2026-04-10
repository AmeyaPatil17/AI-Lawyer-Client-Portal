import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import Intake from '../models/Intake';
import AuditLog from '../models/AuditLog';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError';
import { getUsageSummary } from '../services/aiUsageTracker';
import { writeAuditLog } from '../services/auditLogService';
import { toAdminIntakeListDTO, toIntakeListDTO } from '../types/dtos';
import { getAISettingsMetadata, updateAiRuntimeSettings, getAiOperationalSettings, updateAiOperationalSettings } from '../services/aiSettingsService';
import { resetAIModel } from '../services/aiClient';
import { logger } from '../services/logger';
import { io } from '../index';

// Shared password policy (mirrors authController rules) — Gap 2
const validatePasswordPolicy = (password: string): string[] => {
    const errors: string[] = [];
    if (!password || password.length < 8)            errors.push('at least 8 characters');
    if (!/[A-Z]/.test(password))                     errors.push('an uppercase letter');
    if (!/[a-z]/.test(password))                     errors.push('a lowercase letter');
    if (!/[0-9]/.test(password))                     errors.push('a number');
    if (!/[^A-Za-z0-9]/.test(password))              errors.push('a special character');
    return errors;
};

type AdminIntakeSort = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseIntParam = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = parseInt(String(value ?? ''), 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
};

const parseAdminIntakeSort = (value: unknown): AdminIntakeSort => {
    if (value === 'updated_asc' || value === 'created_desc' || value === 'created_asc') {
        return value;
    }
    return 'updated_desc';
};

const buildAdminIntakeSort = (sort: AdminIntakeSort): Record<string, 1 | -1> => {
    switch (sort) {
        case 'updated_asc':
            return { updatedAt: 1, createdAt: 1 };
        case 'created_desc':
            return { createdAt: -1, updatedAt: -1 };
        case 'created_asc':
            return { createdAt: 1, updatedAt: 1 };
        default:
            return { updatedAt: -1, createdAt: -1 };
    }
};

const buildAdminIntakeSearchConditions = async (search: string) => {
    const trimmed = search.trim();
    if (!trimmed) return [];

    const escaped = escapeRegex(trimmed);
    const regex = new RegExp(escaped, 'i');
    const conditions: any[] = [
        { clientName: regex },
        { 'data.personalProfile.fullName': regex },
        { 'data.preIncorporation.proposedName': regex },
        { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: escaped, options: 'i' } } },
    ];

    if (mongoose.isValidObjectId(trimmed)) {
        conditions.push({ _id: new mongoose.Types.ObjectId(trimmed) });
    }

    const matchingUsers = await User.find({
        $or: [
            { email: regex },
            { name: regex },
        ],
    }).select('_id');

    const userIds = matchingUsers.map((user) => user._id);
    if (userIds.length > 0) {
        conditions.push({ clientId: { $in: userIds } });
    }

    return conditions;
};

const buildAdminIntakeQuery = async (req: AuthRequest) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const type = typeof req.query.type === 'string' ? req.query.type : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';

    const query: Record<string, any> = {};

    if (type && ['will', 'incorporation'].includes(type)) {
        query.type = type;
    }

    if (status && ['started', 'submitted', 'reviewing', 'completed'].includes(status)) {
        query.status = status;
    }

    const searchConditions = await buildAdminIntakeSearchConditions(search);
    if (searchConditions.length > 0) {
        query.$or = searchConditions;
    }

    return query;
};

const buildAdminIntakeSummary = async (query: Record<string, any>) => {
    const summaryRows = await Intake.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                started: { $sum: { $cond: [{ $eq: ['$status', 'started'] }, 1, 0] } },
                submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                reviewing: { $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                will: { $sum: { $cond: [{ $eq: ['$type', 'will'] }, 1, 0] } },
                incorporation: { $sum: { $cond: [{ $eq: ['$type', 'incorporation'] }, 1, 0] } },
            },
        },
    ]);

    const summary = summaryRows[0] || {
        total: 0,
        started: 0,
        submitted: 0,
        reviewing: 0,
        completed: 0,
        will: 0,
        incorporation: 0,
    };

    return {
        total: summary.total,
        byStatus: {
            started: summary.started,
            submitted: summary.submitted,
            reviewing: summary.reviewing,
            completed: summary.completed,
        },
        byType: {
            will: summary.will,
            incorporation: summary.incorporation,
        },
    };
};

const buildUsageSummaryTotals = (rows: Array<Record<string, any>>) => rows.reduce((acc, row) => {
    acc.totalTokens += row.totalTokens || 0;
    acc.promptTokens += row.totalPromptTokens || 0;
    acc.completionTokens += row.totalCompletionTokens || 0;
    acc.requests += row.totalRequests || 0;
    return acc;
}, {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    requests: 0,
});

// Get Users with Pagination and Filtering
export const getUsers = async (req: AuthRequest, res: Response) => {
    const page = parseIntParam(req.query.page, 1, 1, 10_000);
    const limit = parseIntParam(req.query.limit, 20, 1, 50);
    const skip = (page - 1) * limit;

    const roleFilter = typeof req.query.role === 'string' ? req.query.role : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const query: Record<string, any> = {};
    if (roleFilter && ['client', 'lawyer', 'admin'].includes(roleFilter)) {
        query.role = roleFilter;
    }
    if (search) {
        query.email = { $regex: escapeRegex(search), $options: 'i' };
    }

    const [users, total] = await Promise.all([
        User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(query),
    ]);

    const userIds = users.map((user) => user._id);
    const intakeCounts = await Intake.aggregate([
        { $match: { clientId: { $in: userIds } } },
        { $group: { _id: '$clientId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(intakeCounts.map((item) => [item._id.toString(), item.count]));

    const mappedUsers = users.map((user) => ({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive !== false,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        intakeCount: countMap.get(user._id.toString()) || 0,
    }));

    res.json({
        data: mappedUsers,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    });
};

export const createUser = async (req: AuthRequest, res: Response) => {
    const { password, role, name } = req.body;
    // Gap 1: normalize email before lookup
    const email = typeof req.body.email === 'string'
        ? req.body.email.toLowerCase().trim()
        : '';

    if (!email || !password || !role) {
        throw new BadRequestError('Email, password, and role are required');
    }
    if (!['client', 'lawyer', 'admin'].includes(role)) {
        throw new BadRequestError('Invalid role');
    }

    // Gap 2: enforce password policy for admin-created users
    const policyErrors = validatePasswordPolicy(password);
    if (policyErrors.length > 0) {
        throw new BadRequestError(`Password must contain ${policyErrors.join(', ')}.`);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new BadRequestError('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
        email,
        passwordHash,
        role,
        isActive: true,
        name: typeof name === 'string' ? name.trim() : '',
    });
    await newUser.save();

    await writeAuditLog({
        action: 'admin.user_created',
        actorId: req.user?.userId,
        targetId: newUser._id,
        targetType: 'User',
        metadata: { email: newUser.email, role: newUser.role },
        req,
    });

    res.status(201).json({
        message: 'User created successfully',
        user: { id: newUser._id, email: newUser.email, role: newUser.role, name: newUser.name },
    });
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['client', 'lawyer', 'admin'].includes(role)) {
        throw new BadRequestError('Invalid role');
    }

    if (id === req.user?.userId && role !== 'admin') {
        throw new ForbiddenError('demote your own admin account');
    }

    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User');

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await writeAuditLog({
        action: 'admin.role_changed',
        actorId: req.user?.userId,
        targetId: user._id,
        targetType: 'User',
        metadata: { previousRole, role: user.role, email: user.email },
        req,
    });

    res.json({ message: 'User role updated', id: user._id, role: user.role });
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
        throw new BadRequestError('isActive must be a boolean');
    }

    if (id === req.user?.userId && !isActive) {
        throw new ForbiddenError('disable your own admin account');
    }

    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User');

    const previousIsActive = user.isActive !== false;
    user.isActive = isActive;
    await user.save();

    await writeAuditLog({
        action: 'admin.user_status_changed',
        actorId: req.user?.userId,
        targetId: user._id,
        targetType: 'User',
        metadata: {
            previousIsActive,
            isActive: user.isActive,
            email: user.email,
        },
        req,
    });

    res.json({ message: `User account ${isActive ? 'enabled' : 'disabled'}`, id: user._id, isActive: user.isActive });
};

export const getSystemStats = async (_req: AuthRequest, res: Response) => {
    // Gap 39: Reduce 13 DB round-trips to 2 using $facet aggregation
    const [userStats] = await User.aggregate([
        {
            $facet: {
                total:    [{ $count: 'n' }],
                active:   [{ $match: { isActive: { $ne: false } } }, { $count: 'n' }],
                disabled: [{ $match: { isActive: false } },          { $count: 'n' }],
                client:   [{ $match: { role: 'client' } },           { $count: 'n' }],
                lawyer:   [{ $match: { role: 'lawyer' } },           { $count: 'n' }],
                admin:    [{ $match: { role: 'admin' } },            { $count: 'n' }],
            },
        },
    ]);

    const [intakeStats] = await Intake.aggregate([
        {
            $facet: {
                total:       [{ $count: 'n' }],
                started:     [{ $match: { status: 'started' } },     { $count: 'n' }],
                submitted:   [{ $match: { status: 'submitted' } },   { $count: 'n' }],
                reviewing:   [{ $match: { status: 'reviewing' } },   { $count: 'n' }],
                completed:   [{ $match: { status: 'completed' } },   { $count: 'n' }],
                will:        [{ $match: { type: 'will' } },          { $count: 'n' }],
                incorp:      [{ $match: { type: 'incorporation' } }, { $count: 'n' }],
            },
        },
    ]);

    const u = (key: string) => userStats?.[key]?.[0]?.n   ?? 0;
    const i = (key: string) => intakeStats?.[key]?.[0]?.n ?? 0;

    res.json({
        users: {
            total:   u('total'),
            active:  u('active'),
            disabled: u('disabled'),
            byRole: {
                client: u('client'),
                lawyer: u('lawyer'),
                admin:  u('admin'),
            },
        },
        intakes: {
            total: i('total'),
            byStatus: {
                started:   i('started'),
                submitted: i('submitted'),
                reviewing: i('reviewing'),
                completed: i('completed'),
            },
            byType: {
                will:          i('will'),
                incorporation: i('incorp'),
            },
        },
    });
};

export const getAdminIntakes = async (req: AuthRequest, res: Response) => {
    const page = parseIntParam(req.query.page, 1, 1, 10_000);
    const limit = parseIntParam(req.query.limit, 20, 1, 50);
    const skip = (page - 1) * limit;
    const sort = parseAdminIntakeSort(req.query.sort);
    const query = await buildAdminIntakeQuery(req);

    const [intakes, total, summary] = await Promise.all([
        Intake.find(query)
            .populate('clientId', 'email name')
            .sort(buildAdminIntakeSort(sort))
            .skip(skip)
            .limit(limit),
        Intake.countDocuments(query),
        buildAdminIntakeSummary(query),
    ]);

    res.json({
        data: intakes.map(toAdminIntakeListDTO),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
        summary,
    });
};

export const deleteIntake = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const intake = await Intake.findByIdAndDelete(id);

    if (!intake) {
        throw new NotFoundError('Intake');
    }

    await writeAuditLog({
        action: 'admin.intake_deleted',
        actorId: req.user?.userId,
        targetId: intake._id,
        targetType: 'Intake',
        metadata: { status: intake.status, type: intake.type, clientId: intake.clientId?.toString?.() },
        req,
    });

    res.json({ message: 'Intake deleted successfully', id });
};

export const overrideIntakeStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['started', 'submitted', 'reviewing', 'completed'].includes(status)) {
        throw new BadRequestError('Invalid status');
    }

    const intake = await Intake.findById(id).populate('clientId', 'email name');
    if (!intake) {
        throw new NotFoundError('Intake');
    }

    const previousStatus = intake.status;
    intake.status = status;
    await intake.save();

    // Gap 88: Log a warning when admin overrides lifecycle
    logger.warn({ adminId: req.user?.userId, intakeId: id, previousStatus, newStatus: status }, 'Admin manually overrode intake status');

    await writeAuditLog({
        action: 'admin.intake_status_overridden',
        actorId: req.user?.userId,
        targetId: intake._id,
        targetType: 'Intake',
        metadata: { previousStatus, status: intake.status, type: intake.type },
        req,
    });

    io.to('lawyer_updates').emit('intake_updated', toIntakeListDTO(intake));

    res.json({
        message: 'Intake status overridden',
        intake: toAdminIntakeListDTO(intake),
    });
};

export const getAdminAiUsage = async (req: AuthRequest, res: Response) => {
    const days = parseIntParam(req.query.days, 30, 1, 365);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const rows = await getUsageSummary(startDate, endDate);

    res.json({
        rows,
        summary: buildUsageSummaryTotals(rows),
        timeframe: { startDate, endDate, days },
    });
};

export const getAdminAiSettings = async (_req: AuthRequest, res: Response) => {
    res.json(getAISettingsMetadata());
};

export const updateAdminAiSettings = async (req: AuthRequest, res: Response) => {
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : '';
    const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';

    if (!provider || !model) {
        throw new BadRequestError('provider and model are required');
    }

    try {
        const previousSettings = getAISettingsMetadata().current;
        const settings = await updateAiRuntimeSettings({
            provider: provider as any,
            model,
        });
        resetAIModel();
        const metadata = getAISettingsMetadata();

        await writeAuditLog({
            action: 'admin.ai_runtime_updated',
            actorId: req.user?.userId,
            metadata: {
                previous: previousSettings,
                current: settings,
            },
            req,
        });

        res.json({
            message: 'AI model settings updated',
            ...metadata,
            current: settings,
        });
    } catch (error: any) {
        throw new BadRequestError(error?.message || 'Unable to update AI settings');
    }
};

export const updateAdminAiOperationalSettings = async (req: AuthRequest, res: Response) => {
    const { rateLimitPerMinute, maxRetries, cacheTtlSeconds } = req.body ?? {};

    const isValidInt = (v: unknown, min: number, max: number) =>
        Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

    if (
        !isValidInt(rateLimitPerMinute, 1, 600) ||
        !isValidInt(maxRetries,         0, 10)  ||
        !isValidInt(cacheTtlSeconds,    0, 86400)
    ) {
        throw new BadRequestError(
            'Invalid operational settings: rateLimitPerMinute (1–600), maxRetries (0–10), cacheTtlSeconds (0–86400) must be integers within the stated ranges.',
        );
    }

    const previous = getAiOperationalSettings();
    const updated  = await updateAiOperationalSettings({ rateLimitPerMinute, maxRetries, cacheTtlSeconds });

    await writeAuditLog({
        action: 'admin.ai_operational_updated',
        actorId: req.user?.userId,
        metadata: { previous, current: updated },
        req,
    });

    res.json({ message: 'AI operational settings updated', operational: updated });
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    const page = parseIntParam(req.query.page, 1, 1, 10_000);
    const limit = parseIntParam(req.query.limit, 50, 1, 200);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (req.query.action) {
        query.action = req.query.action;
    }
    if (req.query.targetType) {
        query.targetType = req.query.targetType;
    }

    const [logs, total] = await Promise.all([
        AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('actorId', 'name email role')
            .lean(),
        AuditLog.countDocuments(query),
    ]);

    res.json({
        data: logs,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    });
};
