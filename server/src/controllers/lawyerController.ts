import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Intake from '../models/Intake';
import User from '../models/User';
import { toIntakeDetailDTO, toIntakeDashboardDTO, toIntakeListDTO } from '../types/dtos';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import { io } from '../index';

type LawyerStatusGroup = 'active' | 'pipeline' | 'completed' | 'all';
type LawyerSort = 'recent' | 'priority';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseStatusGroup = (value: unknown): LawyerStatusGroup => {
    const normalized = typeof value === 'string' ? value : '';
    if (normalized === 'pipeline' || normalized === 'completed' || normalized === 'all') {
        return normalized;
    }
    if (normalized === 'active') {
        return 'active';
    }
    return 'all';
};

const parseSort = (value: unknown): LawyerSort =>
    value === 'priority' ? 'priority' : 'recent';

const matchesBooleanQuery = (value: unknown): boolean =>
    value === true || value === 'true' || value === '1' || value === 1;

const resolveStatusQuery = (statusGroup: LawyerStatusGroup) => {
    if (statusGroup === 'completed') {
        return 'completed';
    }

    if (statusGroup === 'pipeline') {
        return { $in: ['submitted', 'reviewing'] };
    }

    if (statusGroup === 'active') {
        return { $in: ['started', 'submitted', 'reviewing'] };
    }

    return undefined;
};

const buildSearchConditions = async (search: string) => {
    const trimmed = search.trim();
    if (!trimmed) return [];

    const escaped = escapeRegex(trimmed);
    const regex = new RegExp(escaped, 'i');
    const conditions: any[] = [
        { clientName: regex },
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

const buildLawyerIntakeQuery = async (req: AuthRequest) => {
    const statusGroup = parseStatusGroup(req.query.statusGroup);
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : '';
    const flaggedOnly = matchesBooleanQuery(req.query.flaggedOnly);
    const search = typeof req.query.search === 'string' ? req.query.search : '';

    const query: Record<string, any> = {};
    const statusQuery = resolveStatusQuery(statusGroup);
    if (statusQuery) {
        query.status = statusQuery;
    }

    if (typeFilter && ['will', 'incorporation'].includes(typeFilter)) {
        query.type = typeFilter;
    }

    if (flaggedOnly) {
        query['flags.0'] = { $exists: true };
    }

    const searchConditions = await buildSearchConditions(search);
    if (searchConditions.length > 0) {
        query.$or = searchConditions;
    }

    if (req.query.assignedToMe === 'true' && req.user?.userId) {
        query.assignedLawyerId = req.user.userId;
    }

    return query;
};

const computePortfolioSummary = async () => {
    // Gap 38: Use aggregation instead of loading all documents into memory
    const [result] = await Intake.aggregate([
        {
            $group: {
                _id: null,
                total:          { $sum: 1 },
                started:        { $sum: { $cond: [{ $eq: ['$status', 'started'] },   1, 0] } },
                submitted:      { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                reviewing:      { $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] } },
                completed:      { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                flaggedMatters: {
                    $sum: {
                        $cond: [{ $gt: [{ $size: { $ifNull: ['$flags', []] } }, 0] }, 1, 0]
                    }
                },
            },
        },
    ]);

    return {
        portfolioValue: result?.total ?? 0,   // intake count used as proxy (asset values require data deserialization)
        started:        result?.started        ?? 0,
        submitted:      result?.submitted      ?? 0,
        reviewing:      result?.reviewing      ?? 0,
        completed:      result?.completed      ?? 0,
        flaggedMatters: result?.flaggedMatters ?? 0,
    };
};

// Get all intakes (Lawyer/Admin)
export const getAllIntakes = async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;
    const sort = parseSort(req.query.sort);
    const query = await buildLawyerIntakeQuery(req);

    const sortSpec: Record<string, 1 | -1> = sort === 'priority'
        ? { priorityScore: -1, updatedAt: -1, createdAt: -1 }
        : { updatedAt: -1, createdAt: -1 };

    const [intakes, total, summary] = await Promise.all([
        Intake.find(query)
            .populate('clientId', 'email name')
            .sort(sortSpec)
            .skip(skip)
            .limit(limit),
        Intake.countDocuments(query),
        computePortfolioSummary(),
    ]);

    res.json({
        data: intakes.map(toIntakeDashboardDTO),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        summary,
    });
};

export const getIntakeDetails = async (req: AuthRequest, res: Response) => {
    const intake = await Intake.findById(req.params.id).populate('clientId', 'email name');
    if (!intake) {
        throw new NotFoundError('Intake');
    }
    res.json(toIntakeDetailDTO(intake));
};

export const updateIntakeStatus = async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    if (!status || !['started', 'submitted', 'reviewing', 'completed'].includes(status)) {
        throw new BadRequestError('Invalid status provided.');
    }

    const intake = await Intake.findById(req.params.id);
    if (!intake) {
        throw new NotFoundError('Intake');
    }

    if (intake.status === status) {
        return res.json({ message: 'Status unchanged', status: intake.status });
    }

    const isValidTransition =
        (intake.status === 'submitted' && status === 'reviewing')
        || (intake.status === 'reviewing' && status === 'submitted')
        || (intake.status === 'reviewing' && status === 'completed');

    if (!isValidTransition) {
        throw new BadRequestError('Illegal status transition.');
    }

    intake.status = status;
    await intake.save();

    io.to('lawyer_updates').emit('intake_updated', toIntakeListDTO(intake));

    res.json({ message: 'Status updated successfully', status: intake.status });
};

export const assignLawyer = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { lawyerId } = req.body;

    const intake = await Intake.findById(id);
    if (!intake) throw new NotFoundError('Intake not found');

    if (lawyerId) {
        const lawyer = await User.findOne({ _id: lawyerId, role: 'lawyer', isActive: true });
        if (!lawyer) throw new BadRequestError('Invalid or inactive lawyer ID');
    }

    intake.assignedLawyerId = lawyerId || null;
    await intake.save();

    io.to('lawyer_updates').emit('intake_updated', toIntakeListDTO(intake));

    res.json({ message: 'Lawyer assignment updated', assignedLawyerId: intake.assignedLawyerId });
};
