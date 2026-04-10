import pinoHttp from 'pino-http';
import { logger } from '../services/logger';

/**
 * HTTP request logging middleware
 * Logs every incoming request with method, url, status, and response time
 */
export const requestLogger = pinoHttp({
    logger,
    autoLogging: {
        ignore: (req) => {
            // Don't log health checks or static files
            if (req.url === '/health') return true;
            if (req.url?.startsWith('/static')) return true;
            return false;
        }
    },
    customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err?.message || 'Error'}`;
    }
});
