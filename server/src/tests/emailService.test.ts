import { sendReminderEmail } from '../services/emailService';

describe('EmailService', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        // Suppress actual console logs to keep test output clean,
        // but we spy on it to verify behavior.
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        // Ensure no env var leak between tests
        delete process.env.CLIENT_URL;
        delete process.env.CORS_ORIGIN;
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        delete process.env.CLIENT_URL;
        delete process.env.CORS_ORIGIN;
    });

    describe('sendReminderEmail', () => {
        it('should simulate sending an email with default message (falls back to localhost)', async () => {
            const result = await sendReminderEmail('test@example.com', 'John Doe', '12345');

            expect(result).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TO: test@example.com'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hi John Doe,'));
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('This is a friendly reminder to complete your estate planning intake.')
            );
            // Falls back to localhost when no env var is set
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('http://localhost:5173/login?intake=12345')
            );
        });

        it('should use CLIENT_URL env var for the reminder link when set', async () => {
            process.env.CLIENT_URL = 'https://portal.valiantlaw.ca';

            const result = await sendReminderEmail('prod@example.com', 'Jane Prod', 'abc-123');

            expect(result).toBe(true);
            // Link must use the production URL, not localhost
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('https://portal.valiantlaw.ca/login?intake=abc-123')
            );
            expect(consoleSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('localhost')
            );
        });

        it('should fall back to CORS_ORIGIN when CLIENT_URL is not set', async () => {
            process.env.CORS_ORIGIN = 'https://staging.valiantlaw.ca';

            const result = await sendReminderEmail('staging@example.com', 'Bob Stage', 'stg-456');

            expect(result).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('https://staging.valiantlaw.ca/login?intake=stg-456')
            );
        });

        it('should simulate an email with a custom message', async () => {
            const customMsg = 'We need your ID verification.';
            const result = await sendReminderEmail('client@test.com', 'Jane', '987', customMsg);

            expect(result).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hi Jane,'));
            expect(consoleSpy).toHaveBeenCalledWith(customMsg);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('http://localhost:5173/login?intake=987')
            );
        });

        it('should use fallback name if name is empty', async () => {
            await sendReminderEmail('anon@test.com', '', '111');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hi Valued Client,'));
        });
    });
});
