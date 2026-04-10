import { Router } from 'express';
import { submitTriage } from '../controllers/triageController';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /triage/submit:
 *   post:
 *     summary: Submit a new triage questionnaire
 *     tags: [Triage]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: object
 *     responses:
 *       200:
 *         description: Triage submitted successfully and intake created
 *       400:
 *         description: Invalid request data
 */
router.post('/submit', requireRole('client'), submitTriage);

export default router;
