import { Router } from 'express';
import {
    createIncorpIntake,
    getCurrentIncorpIntake,
    getIncorpIntake,
    updateIncorpIntake,
    submitIncorpIntake,
    addIncorpNote,
} from '../controllers/incorporationController';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import { UpdateIncorpRequestSchema, } from '../schemas/incorporationSchema';
import { NoteRequestSchema } from '../schemas/intake';
import { aiLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../errors/AppError';
import { handleStressTest } from '../controllers/intakeController';

const router = Router();

// All incorporation routes require authentication
router.use(authenticate);

// ============================================
// Incorporation Intake CRUD
// ============================================

// Create — client only (lawyers don't create intakes on behalf of clients)
router.post('/', requireRole('client'), asyncHandler(createIncorpIntake));

// Get current user's intake — client only
router.get('/current', requireRole('client'), asyncHandler(getCurrentIncorpIntake));

// Get by ID — client (owns it) or lawyer/admin (reviewing)
router.get('/:id', requireRole('client', 'lawyer', 'admin'), asyncHandler(getIncorpIntake));

// Update — client only
router.put('/:id', requireRole('client'), validateBody(UpdateIncorpRequestSchema), asyncHandler(updateIncorpIntake));

// V19: Submit — dedicated endpoint for final submission (client only)
router.post('/:id/submit', requireRole('client'), asyncHandler(submitIncorpIntake));

// ============================================
// AI-Powered Routes — client only
// ============================================

import { handleGuideQuery, handleGuideQueryStream } from '../controllers/clientAIController';
router.post('/chat', aiLimiter, requireRole('client'), asyncHandler(handleGuideQuery));
router.post('/chat/stream', aiLimiter, requireRole('client'), asyncHandler(handleGuideQueryStream));
router.post('/:id/stress-test', aiLimiter, requireRole('client', 'lawyer', 'admin'), asyncHandler(handleStressTest));

// ============================================
// Notes — lawyer/admin only on this route
// ============================================

router.post('/:id/notes', requireRole('lawyer', 'admin'), validateBody(NoteRequestSchema), asyncHandler(addIncorpNote));

// ============================================
// Document Generation — owner or reviewing lawyer/admin
// ============================================

import { downloadIncorpDoc } from '../controllers/incorporationController';
router.get('/:id/doc', requireRole('client', 'lawyer', 'admin'), asyncHandler(downloadIncorpDoc));

export default router;
