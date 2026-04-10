import { Router } from 'express';
import { register, login, refresh, getActivityLogs, verifyEmail } from '../controllers/authController';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Password does not meet policy
 *       429:
 *         description: Too many attempts
 */
router.post('/register', authLimiter, register);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify email via token
 *     tags: [Auth]
 */
router.post('/verify-email', authLimiter, verifyEmail);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Login successful
 *       429:
 *         description: Too many attempts
 */
router.post('/login', authLimiter, login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh', refresh);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Generic response (user enumeration prevention)
 *       429:
 *         description: Too many attempts
 */
router.post('/forgot-password', authLimiter, forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many attempts
 */
router.post('/reset-password', authLimiter, resetPassword);

/**
 * @openapi
 * /auth/activity:
 *   get:
 *     summary: Get recent activity logs for current user
 *     tags: [Auth]
 */
router.get('/activity', authenticate, getActivityLogs);

export default router;
