import { Router } from 'express';
import { getAllIntakes, getIntakeDetails, updateIntakeStatus, assignLawyer } from '../controllers/lawyerController';
import { downloadIntakeDoc } from '../controllers/documentController';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { handleGetSuggestions, sendNudge, addIntakeNote } from '../controllers/intakeController';
import { asyncHandler } from '../errors/AppError';

const router = Router();

// All lawyer routes require authentication + lawyer/admin role
router.use(authenticate);
router.use(requireRole('lawyer', 'admin'));

// Intake management
/**
 * @openapi
 * /lawyer/intakes:
 *   get:
 *     summary: Get all intakes for the dashboard
 *     tags: [Lawyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of intakes
 */
router.get('/intakes', asyncHandler(getAllIntakes));

/**
 * @openapi
 * /lawyer/intake/{id}:
 *   get:
 *     summary: Get detailed intake data
 *     tags: [Lawyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed intake object
 *       404:
 *         description: Intake not found
 */
router.get('/intake/:id', asyncHandler(getIntakeDetails));

/**
 * @openapi
 * /lawyer/intake/{id}/status:
 *   patch:
 *     summary: Update intake status
 *     tags: [Lawyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [started, submitted, reviewing, completed]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/intake/:id/status', asyncHandler(updateIntakeStatus));

/**
 * @openapi
 * /lawyer/intake/{id}/download:
 *   get:
 *     summary: Download generated document
 *     tags: [Lawyer, Document]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document file
 *       500:
 *         description: Generation failed
 */
router.get('/intake/:id/download', asyncHandler(downloadIntakeDoc));
/**
 * @openapi
 * /lawyer/intake/{id}/suggestions:
 *   get:
 *     summary: Get clause suggestions
 *     tags: [Lawyer, AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of suggested clauses
 */
router.get('/intake/:id/suggestions', asyncHandler(handleGetSuggestions));

/**
 * @openapi
 * /lawyer/intake/{id}/nudge:
 *   post:
 *     summary: Send a reminder nudge to the client
 *     tags: [Lawyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nudge sent successfully
 */
router.post('/intake/:id/nudge', asyncHandler(sendNudge));

/**
 * @openapi
 * /lawyer/intake/{id}/notes:
 *   post:
 *     summary: Add an internal note to the matter
 *     tags: [Lawyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note added successfully
 */
router.post('/intake/:id/notes', asyncHandler(addIntakeNote));

// Lawyer Assignment
router.patch('/intakes/:id/assign', asyncHandler(assignLawyer));

export default router;
