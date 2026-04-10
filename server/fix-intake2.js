const fs = require('fs');
const path = './src/controllers/intakeController.ts';
let code = fs.readFileSync(path, 'utf8');

const startIdentifier = 'export const getAllUserIntakes = async (req: AuthRequest, res: Response) => {';
const nextIdentifier = '// Get Intake by ID (ensure user owns it)';

const startIndex = code.indexOf(startIdentifier);
const nextIndex = code.indexOf(nextIdentifier);

if (startIndex === -1 || nextIndex === -1) {
  console.log('Could not find identifiers');
  process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(nextIndex);

const newFunction = `export const getAllUserIntakes = async (req: AuthRequest, res: Response) => {
    try {
        // Project out lawyer-internal fields — clients only need the portal-facing fields.
        // notes, logicWarnings, aiSummary, priorityScore are for the lawyer dashboard only.
        const intakes = await Intake
            .find({ clientId: req.user?.userId })
            .select('-notes -logicWarnings -aiSummary -priorityScore')
            .sort({ createdAt: -1 });
        res.json(intakes.map(toNormalizedIntakeResponse));
    } catch (error) {
        throw error;
    }
};

// Reset (Delete) a draft intake — only allowed when status === 'started'
export const resetIntake = async (req: AuthRequest, res: Response) => {
    try {
        const intake = await Intake.findById(req.params.id);

        if (!intake) {
            throw new NotFoundError('Intake');
        }

        // Security: only the owning client may delete
        if (intake.clientId.toString() !== getRequestUserIdOrUndefined(req)) {
            throw new ForbiddenError('reset');
        }
        
        // Business rule: cannot reset once submitted or beyond
        if (intake.status !== 'started') {
            throw new ConflictError(\`Cannot reset an intake with status '\${intake.status}'. Only draft (started) intakes may be reset.\`);
        }

        // Gap 89: Before deleting, log the intake document to allow recovery if accidental
        logger.warn({
            intakeId: intake._id,
            clientId: intake.clientId,
            type: intake.type,
            dataSnapshot: intake.data,
            action: 'client_reset_intake'
        }, 'Intake permanently deleted by client reset');

        await Intake.findByIdAndDelete(req.params.id);
        return res.status(204).send();
    } catch (error) {
        throw error;
    }
};

`;

fs.writeFileSync(path, before + newFunction + after);
console.log('Fixed successfully');
