import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@valiantai.ca';

if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

export const sendReminderEmail = async (clientEmail: string, clientName: string, intakeId: string, customMessage?: string): Promise<boolean> => {
    // Determine if simulation is needed
    if (!SENDGRID_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log(`\n--- [EMAIL SIMULATION] ---`);
        console.log(`TO: ${clientEmail}`);
        console.log(`SUBJECT: Action Required: Your Estate Plan`);
        console.log(`BODY:`);
        console.log(`Hi ${clientName || 'Valued Client'},`);

        if (customMessage) {
            console.log(customMessage);
        } else {
            console.log(`This is a friendly reminder to complete your estate planning intake.`);
        }

        const simBaseUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
        console.log(`\nPlease log in to continue where you left off.`);
        console.log(`Link: ${simBaseUrl}/login?intake=${intakeId}`);
        console.log(`--------------------------\n`);

        return true;
    }

    try {
        const messageBody = customMessage || `This is a friendly reminder to complete your estate planning intake.`;
        const baseUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
        const link = `${baseUrl}/login?intake=${intakeId}`;

        const msg = {
            to: clientEmail,
            from: SENDGRID_FROM_EMAIL,
            subject: 'Action Required: Your Estate Plan',
            text: `Hi ${clientName || 'Valued Client'},\n\n${messageBody}\n\nPlease log in to continue where you left off at: ${link}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #7c3aed;">Valiant AI</h2>
                    <p>Hi ${clientName || 'Valued Client'},</p>
                    <p>${messageBody}</p>
                    <div style="margin: 30px 0;">
                        <a href="${link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Continue Intake</a>
                    </div>
                    <p style="font-size: 12px; color: #6b7280;">If you're having trouble clicking the button, copy and paste this link into your browser:<br>${link}</p>
                </div>
            `,
        };

        await sgMail.send(msg);
        console.log(`[SendGrid] Email sent to ${clientEmail}`);
        return true;
    } catch (error) {
        console.error('[SendGrid] Error sending email:', error);
        return false;
    }
};

export const sendVerificationEmail = async (clientEmail: string, clientName: string, token: string): Promise<boolean> => {
    const baseUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    const link = `${baseUrl}/verify-email?token=${token}`;

    if (!SENDGRID_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 800));
        console.log(`\n--- [EMAIL SIMULATION] ---`);
        console.log(`TO: ${clientEmail}`);
        console.log(`SUBJECT: Action Required: Verify your email address`);
        console.log(`BODY:\nHi ${clientName || 'Valued Client'},\nPlease verify your email address to continue.\nLink: ${link}`);
        console.log(`--------------------------\n`);
        return true;
    }

    try {
        const msg = {
            to: clientEmail,
            from: SENDGRID_FROM_EMAIL,
            subject: 'Action Required: Verify your email address',
            text: `Hi ${clientName || 'Valued Client'},\n\nPlease verify your email address to complete registration.\n\nLink: ${link}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #7c3aed;">Valiant AI</h2>
                    <p>Hi ${clientName || 'Valued Client'},</p>
                    <p>Please verify your email address by clicking the link below.</p>
                    <div style="margin: 30px 0;">
                        <a href="${link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
                    </div>
                </div>
            `,
        };
        await sgMail.send(msg);
        return true;
    } catch (error) {
        console.error('[SendGrid] Error sending verification email:', error);
        return false;
    }
};
