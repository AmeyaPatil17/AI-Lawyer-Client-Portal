import express from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { asyncHandler } from '../errors/AppError';

import { 
    getUsers, 
    createUser,
    updateUserRole, 
    updateUserStatus, 
    getSystemStats,
    getAdminAiUsage,
    getAdminAiSettings,
    getAdminIntakes,
    deleteIntake, 
    overrideIntakeStatus,
    updateAdminAiSettings,
    updateAdminAiOperationalSettings,
    getAuditLogs
} from '../controllers/adminController';
import { assignLawyer } from '../controllers/lawyerController';

const router = express.Router();

// Apply auth & admin requirement to all routes in this file
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/ai-usage', asyncHandler(getAdminAiUsage));
router.get('/ai-settings', asyncHandler(getAdminAiSettings));
router.patch('/ai-settings', asyncHandler(updateAdminAiSettings));
router.patch('/ai-operational', asyncHandler(updateAdminAiOperationalSettings));

// User Management
router.get('/users', asyncHandler(getUsers));
router.post('/users', asyncHandler(createUser));
router.patch('/users/:id/role', asyncHandler(updateUserRole));
router.patch('/users/:id/status', asyncHandler(updateUserStatus));

// System Metrics
router.get('/stats', asyncHandler(getSystemStats));

// Intake Oversight
router.get('/intakes', asyncHandler(getAdminIntakes));
router.delete('/intakes/:id', asyncHandler(deleteIntake));
router.patch('/intakes/:id/status', asyncHandler(overrideIntakeStatus));
router.patch('/intakes/:id/assign', asyncHandler(assignLawyer));

// Audit Logs
router.get('/audit-logs', asyncHandler(getAuditLogs));

export default router;
