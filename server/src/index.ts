import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import path from 'path';

// Load environment from root .env, then override with .env.local (for secrets)
const envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');
const result = dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath, override: true });

if (result.error) {
    if (process.env.NODE_ENV !== 'test') {
        console.warn(`WARNING: Failed to load .env from ${envPath}`);
    }
} else if (process.env.NODE_ENV !== 'test') {
    console.log(`Loaded environment from ${envPath}`);
    console.log(`GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
    console.log(`AI_PROVIDER default: ${process.env.AI_PROVIDER === 'openai' ? 'openai' : 'gemini'}`);
}

// Telemetry Bootstrapping
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
    console.log(`[APM] Sentry tracking enabled via ${process.env.SENTRY_DSN}`);
    // require('@sentry/node').init({ dsn: process.env.SENTRY_DSN });
}

// Services & Middleware
import { logger } from './services/logger';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { setupSwagger } from './swagger';
import { AppError } from './errors/AppError';

const app = express();
app.set('trust proxy', true); // Trust all prior proxy hops (Cloud Run + LBs)
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware Stack
// ============================================

import cookieParser from 'cookie-parser';

// Security
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser() as any);

// Logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
}

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ============================================
// Health Check (Gap 95 — already existed; kept here)
// ============================================
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        dbState: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        dbHost: process.env.MONGODB_URI ? 'Configured' : 'Using Default (Localhost)'
    });
});

// ============================================
// Database Connection
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/willguide';

if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(MONGODB_URI, { maxPoolSize: 50 })
        .then(async () => {
            logger.info('Connected to MongoDB');
            // Sync indexes on startup — creates missing indexes, drops orphaned ones
            const { syncAllIndexes } = await import('./utils/syncIndexes');
            await syncAllIndexes();
            const { initializeAiRuntimeSettings, initializeAiOperationalSettings } = await import('./services/aiSettingsService');
            await initializeAiRuntimeSettings();
            await initializeAiOperationalSettings();
            const { startTempDocCleanup } = await import('./services/tempDocCleanup');
            startTempDocCleanup();
        })
        .catch((err) => logger.error({ err }, 'MongoDB connection error'));
}

// ============================================
// Routes
// ============================================
import authRoutes from './routes/authRoutes';
import triageRoutes from './routes/triageRoutes';
import intakeRoutes from './routes/intakeRoutes';
import lawyerRoutes from './routes/lawyerRoutes';
import incorporationRoutes from './routes/incorporationRoutes';
import adminRoutes from './routes/adminRoutes';
import { doubleSubmitCsrf } from './middleware/csrfMiddleware';

app.use('/api', doubleSubmitCsrf);

app.use('/api/auth', authRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/incorporation', incorporationRoutes);
app.use('/api/admin', adminRoutes);

// Setup Swagger UI
if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
}

// ============================================
// Error Handler
// ============================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Typed AppError — format and return structured response
    if (err instanceof AppError) {
        if (!err.isOperational) {
            logger.error({ err, path: req.path }, 'Non-operational AppError');
        }
        const body: Record<string, any> = { error: err.message, code: err.code };
        if ((err as any).errors) body.errors = (err as any).errors;
        return res.status(err.statusCode).json(body);
    }

    // Unexpected / programming errors
    logger.error({ err, path: req.path }, 'Unhandled error');
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : (err.message || 'Internal server error'),
        code: 'INTERNAL_ERROR'
    });
});

// ============================================
// Production: Serve Static Frontend
// ============================================
if (process.env.NODE_ENV === 'production') {
    const prodPath = require('path');
    app.use(express.static(prodPath.join(__dirname, '../public')));

    // SPA fallback
    app.get('*', (req, res) => {
        res.sendFile(prodPath.join(__dirname, '../public', 'index.html'));
    });
} else {
    app.get('/', (_req, res) => {
        res.send('Valiant AI API is running (Development Mode)');
    });
}

// ============================================
// Start Server
// ============================================
import http from 'http';
import { Server } from 'socket.io';

const server = http.createServer(app);

import jwt from 'jsonwebtoken';

export const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

import { JWT_CONFIG } from './config/jwtConfig';

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        const decoded = jwt.verify(token, JWT_CONFIG.secret);
        (socket as any).user = decoded;
        next();
    } catch (err) {
        return next(new Error('Invalid token'));
    }
});

// Gap 95: Cloud Run Health Check
app.get('/healthz', (req, res) => res.status(200).json({ status: 'OK' }));

io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: (socket as any).user?.userId }, 'A client connected to WebSocket');

    socket.on('join_lawyer_room', () => {
        const userRole = (socket as any).user?.role;
        if (userRole === 'lawyer' || userRole === 'admin') {
            socket.join('lawyer_updates');
            logger.info({ socketId: socket.id }, 'Client joined lawyer_updates room');
        } else {
            logger.warn({ socketId: socket.id, userRole }, 'Unauthorized attempt to join lawyer_updates room');
        }
    });

    // ── Client-specific room for real-time status push ────────────────────
    // Clients join `client_${userId}` so the server can push intake updates
    // directly to them (e.g. when a lawyer moves status to 'reviewing').
    socket.on('join_client_room', () => {
        const userId = (socket as any).user?.userId;
        const userRole = (socket as any).user?.role;
        if (userId && userRole === 'client') {
            socket.join(`client_${userId}`);
            logger.info({ socketId: socket.id, userId }, 'Client joined personal room');
        }
    });

    // ── AI Chat Streaming via WebSocket ──────────────────────────────────
    socket.on('ai:chat', async (payload) => {
        const { message, intakeData, currentStep, history, isIncorporation } = payload;

        if (!message || typeof message !== 'string') {
                socket.emit('ai:error', { message: 'Message is required' });
            return;
        }

        try {
            const aiService = await import('./services/aiService');
            const systemPrompt = isIncorporation
                ? aiService.INCORPORATION_SYSTEM_PROMPT
                : aiService.SYSTEM_PROMPT;
            const chatHistory = (history || []).map((m: { role: string; text: string }) => ({
                role: m.role,
                text: m.text,
            }));

            const result = await aiService.generateAIResponseStream(
                message,
                intakeData || {},
                currentStep || 'general',
                chatHistory,
                systemPrompt
            );

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) socket.emit('ai:chunk', { text: chunkText });
            }

            socket.emit('ai:done', {});
        } catch (error) {
            const err = error as Error;
            logger.error(
                { socketId: socket.id, error: err.message },
                'WebSocket AI stream error'
            );
            socket.emit('ai:error', {
                message: 'Unable to reach the AI knowledge base. Please try again.',
            });
        }
    });

    socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Client disconnected from WebSocket');
    });
});

if (require.main === module) {
    server.listen(PORT, () => {
        logger.info({ port: PORT }, 'Server and WebSocket started');
    });
}

// ============================================
// Gap 22: Handle unhandled promise rejections
// ============================================
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection — this should never happen in production');
    // Do NOT exit: Cloud Run will restart a crashing container; better to log and keep serving.
});

// ============================================
// Gap 96: Graceful shutdown on SIGTERM (Cloud Run sends this on scale-down)
// ============================================
process.on('SIGTERM', () => {
    logger.info('SIGTERM received — beginning graceful shutdown');
    io.close();                        // Stop accepting new WebSocket connections
    server.close(async () => {         // Drain existing HTTP connections
        logger.info('HTTP server closed');
        await mongoose.disconnect();
        logger.info('MongoDB disconnected — exiting');
        process.exit(0);
    });
    // Force exit if shutdown takes too long (10 s)
    setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
    }, 10_000);
});

export default app;
