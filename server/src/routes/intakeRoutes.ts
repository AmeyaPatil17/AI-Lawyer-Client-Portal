import { Router } from 'express';
import { createIntake, getIntake, updateIntake, getUserIntake, getAllUserIntakes, resetIntake, handleCopilotChat, addIntakeNote, handleGetInsight, handleGenerateSummary, submitWillIntake } from '../controllers/intakeController';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import { UpdateIntakeRequestSchema, ChatRequestSchema, NoteRequestSchema } from '../schemas/intake';
import { aiLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../errors/AppError';

const router = Router();

// All intake routes require authentication
router.use(authenticate);

// ============================================
// Client Intake Routes (client-only unless noted)
// ============================================

// Retrieve all intakes for the current user (Multi-service dashboard) — client only
router.get('/me', requireRole('client'), asyncHandler(getAllUserIntakes));

// Retrieve current user intake (Resume) — client only
router.get('/current', requireRole('client'), asyncHandler(getUserIntake));

// Retrieve intake by ID — client owns it OR lawyer/admin reviewing it
router.get('/:id', requireRole('client', 'lawyer', 'admin'), asyncHandler(getIntake));

// Update intake — shared data edit route for clients and legal reviewers
router.put('/:id', requireRole('client', 'lawyer', 'admin'), validateBody(UpdateIntakeRequestSchema), asyncHandler(updateIntake));

// Submit will intake — owner only
router.post('/:id/submit', requireRole('client'), asyncHandler(submitWillIntake));

// Reset (delete) a draft intake — client only; only 'started' intakes can be reset
router.delete('/:id', requireRole('client'), asyncHandler(resetIntake));

// ============================================
// AI-Powered Routes (with stricter rate limiting)
// ============================================

// Client AI Chat — client only
import { handleGuideQuery, handleGuideQueryStream } from '../controllers/clientAIController';
router.post('/chat', aiLimiter, requireRole('client'), asyncHandler(handleGuideQuery));
router.post('/chat/stream', aiLimiter, requireRole('client'), asyncHandler(handleGuideQueryStream));

// Legal Phrasing Suggestions — client only
import { handleLegalPhrasing } from '../controllers/intakeController';
router.post('/legal-phrasing', aiLimiter, requireRole('client'), asyncHandler(handleLegalPhrasing));

// Lawyer Copilot Chat — lawyer/admin only
router.post('/lawyer/copilot/chat', aiLimiter, requireRole('lawyer', 'admin'), asyncHandler(handleCopilotChat));

// ============================================
// Document & Asset Routes
// ============================================

// Download Doc — R6: must be owner (client) or reviewing lawyer/admin
import { downloadIntakeDoc } from '../controllers/documentController';
router.get('/:id/doc', requireRole('client', 'lawyer', 'admin'), asyncHandler(downloadIntakeDoc));

// Draft Suggestions — both clients and lawyers may request suggestions
import { handleGetSuggestions } from '../controllers/intakeController';
router.get('/:id/suggestions', requireRole('client', 'lawyer', 'admin'), asyncHandler(handleGetSuggestions));

// AI Import — client only
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

import { smartImportAssets, handleExplainRisk, handleValidateLogic, handleStressTest } from '../controllers/intakeController';
router.post('/:id/assets/import', requireRole('client'), upload.single('file'), asyncHandler(smartImportAssets));

// Explain/validate/stress — both clients reviewing their own and lawyers reviewing matters
router.post('/:id/explain-flag', aiLimiter, requireRole('client', 'lawyer', 'admin'), asyncHandler(handleExplainRisk));
router.post('/:id/validate-logic', aiLimiter, requireRole('client', 'lawyer', 'admin'), asyncHandler(handleValidateLogic));
router.post('/:id/stress-test', aiLimiter, requireRole('client', 'lawyer', 'admin'), asyncHandler(handleStressTest));

// D1: AI Insight — client dashboard only
router.get('/:id/insight', aiLimiter, requireRole('client'), asyncHandler(handleGetInsight));

// D5: AI Estate Summary — client only
router.post('/:id/summary', aiLimiter, requireRole('client'), asyncHandler(handleGenerateSummary));

// ============================================
// Notes & Nudge
// ============================================

// Notes on intake route — lawyer/admin only (clients see notes via their dashboard; lawyers can also use /lawyer/intake/:id/notes)
router.post('/:id/notes', requireRole('lawyer', 'admin'), validateBody(NoteRequestSchema), asyncHandler(addIntakeNote));

import { sendNudge } from '../controllers/intakeController';
router.post('/:id/nudge', requireRole('lawyer', 'admin'), asyncHandler(sendNudge));

export default router;
