import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export const startTempDocCleanup = () => {
    // Run cleanup every hour
    setInterval(() => {
        const outputDir = path.join(__dirname, '../../temp_docs');
        if (!fs.existsSync(outputDir)) return;

        fs.readdir(outputDir, (err, files) => {
            if (err) {
                logger.error({ err }, 'Failed to read temp_docs directory for cleanup');
                return;
            }

            const now = Date.now();
            // Files older than 1 hour get deleted
            const ONE_HOUR = 60 * 60 * 1000;

            files.forEach(file => {
                const filePath = path.join(outputDir, file);
                // Skip .gitkeep or other hidden files
                if (file.startsWith('.')) return;

                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    if (now - stats.mtimeMs > ONE_HOUR) {
                        fs.unlink(filePath, (err) => {
                            if (!err) {
                                logger.info({ file }, 'Cleaned up stale DOCX file');
                            }
                        });
                    }
                });
            });
        });
    }, 60 * 60 * 1000).unref(); // unref so it doesn't block shutdown
};
