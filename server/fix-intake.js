const fs = require('fs');
const path = './src/controllers/intakeController.ts';
let code = fs.readFileSync(path, 'utf8');

// Find the start of the function
const startIdentifier = 'export const sendNudge = async (req: AuthRequest, res: Response) => {';
// Find the next function to indicate the end
const nextIdentifier = '// G5: Legal Phrasing Suggestions';

const startIndex = code.indexOf(startIdentifier);
const nextIndex = code.indexOf(nextIdentifier);

if (startIndex === -1 || nextIndex === -1) {
  console.log('Could not find identifiers');
  process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(nextIndex);

const newFunction = `export const sendNudge = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // 1. Verify Lawyer
        if (!['lawyer', 'admin'].includes(req.user?.role ?? '')) {
            throw new ForbiddenError('send nudge');
        }

        const intake = await Intake.findById(id).populate('clientId');
        if (!intake) throw new NotFoundError('Intake');

        // Throttle: max 1 nudge per 24 hours
        const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
        if (intake.reminderSentAt && (Date.now() - intake.reminderSentAt.getTime()) < NUDGE_COOLDOWN_MS) {
            throw new ConflictError('A reminder was already sent in the last 24 hours. Please wait before sending another.');
        }

        const clientEmail = (intake.clientId as any).email;
        const clientName = (intake.data as IntakeData)?.personalProfile?.fullName || 'Client';

        // 2. Determine Context
        const missingStep = IntakeValidationService.getNextMissingStep(intake.data);
        let message = "We noticed you haven't completed your intake yet.";

        if (missingStep === 'personalProfile') {
            message = "It looks like you haven't started your Profile yet. Adding your basic details is the first step.";
        } else if (missingStep === 'family') {
            message = "We noticed you stopped at the Family section. Adding your spouse and children is crucial.";
        } else if (missingStep === 'executors') {
            message = "You haven't appointed an Executor yet. This is a very important role to fill.";
        } else if (missingStep === 'beneficiaries') {
            message = "You haven't listed any Beneficiaries. Who would you like to inherit your estate?";
        }

        // 3. Send Email
        await sendReminderEmail(clientEmail, clientName, id, message);

        // 4. Track nudge + log note
        intake.reminderSentAt = new Date();
        intake.reminderCount = (intake.reminderCount || 0) + 1;

        const note = {
            text: \`System: Reminder email sent to \${clientEmail}. Reason: \${missingStep || 'General'}\`,
            author: 'Lawyer (System)',
            createdAt: new Date()
        };
        intake.notes = intake.notes || [];
        intake.notes.push(note as any);
        await intake.save();

        res.json({ message: 'Reminder sent', note, logic: missingStep });

    } catch (error) {
        // Gap 27: Distinguish email failures from other errors
        if ((error as any)?.message?.includes('email') || (error as any)?.code?.includes('MAIL')) {
            throw new AppError(502, 'Failed to send reminder email — email service may be unavailable', 'EMAIL_ERROR');
        }
        throw error;
    }
};

`;

fs.writeFileSync(path, before + newFunction + after);
console.log('Fixed successfully');
