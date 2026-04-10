import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { generateIntakeDoc } from '../services/docxService';
import path from 'path';
import { loadAccessibleIntake } from '../services/intakeAccessService';
import { logger } from '../services/logger';
import { NotFoundError } from '../errors/AppError';

export const downloadIntakeDoc = async (req: AuthRequest, res: Response) => {
    const intake = await loadAccessibleIntake(req, res, { action: 'download' });
    if (!intake) return;

    const outputDir = path.join(__dirname, '../../temp_docs');
    const filename = await generateIntakeDoc(intake, outputDir);

    const filePath = path.join(outputDir, filename);

    // Gap 26: Respond with 500 if download fails (previously console.error only)
    res.download(filePath, filename, (err) => {
        if (err && !res.headersSent) {
            logger.error({ err, intakeId: req.params.id }, 'Will intake doc download error');
            res.status(500).json({ message: 'Document download failed' });
        }
        // Best-effort cleanup after send
        import('fs').then(fs => fs.unlink(filePath, () => {})).catch(() => {});
    });
};
