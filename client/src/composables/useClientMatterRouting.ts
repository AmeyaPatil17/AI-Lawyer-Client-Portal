import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { useIntakeStore } from '../stores/intake';
import type { ClientIntake } from '../types/clientIntake';
import { useIncorpValidation } from './useIncorpValidation';
import { useIntakeValidation } from './useIntakeValidation';
import { hasMinorChildrenInFamily } from '../utils/family';
import { INCORP_FLOW_STEPS } from '../utils/incorpWizardSteps';

type StepDef = {
    context: string;
    path: string;
    condition?: (data: any) => boolean;
};

type ServiceType = ClientIntake['type'];

export type HomeCardModel = {
    primaryMatter: ClientIntake | null;
    otherMatterCount: number;
    hasOtherActiveMatters: boolean;
    latestCompletedMatter: ClientIntake | null;
    ctaLabel: string;
    helperText: string;
    to: string;
    summaryLink: string | null;
    summaryLinkLabel: string | null;
};

const ESTATE_STEPS: StepDef[] = [
    { context: 'personalProfile', path: 'profile' },
    { context: 'family', path: 'family' },
    { context: 'executors', path: 'executors' },
    { context: 'beneficiaries', path: 'beneficiaries' },
    {
        context: 'guardians',
        path: 'guardians',
        condition: (data) => hasMinorChildrenInFamily(data?.family),
    },
    { context: 'assets', path: 'assets' },
    { context: 'poa', path: 'poa' },
    { context: 'funeral', path: 'funeral' },
    { context: 'prior-wills', path: 'prior-wills' },
];

const INCORP_STEPS: StepDef[] = INCORP_FLOW_STEPS.map((step) => ({
    context: step.context,
    path: step.path,
}));

const getMatterBaseRoute = (type: ServiceType): string =>
    type === 'incorporation' ? '/incorporation' : '/wizard';

const getMatterTimestamp = (intake: ClientIntake): number => {
    const updatedAt = Date.parse(intake.updatedAt || '');
    if (Number.isFinite(updatedAt)) return updatedAt;

    const createdAt = Date.parse(intake.createdAt || '');
    if (Number.isFinite(createdAt)) return createdAt;

    return 0;
};

const HOME_STATUS_PRIORITY: Record<ClientIntake['status'], number> = {
    started: 0,
    reviewing: 1,
    submitted: 2,
    completed: 3,
};

const sortByHomePriority = (intakes: ClientIntake[]) =>
    [...intakes].sort((a, b) => {
        const statusDelta = HOME_STATUS_PRIORITY[a.status] - HOME_STATUS_PRIORITY[b.status];
        if (statusDelta !== 0) return statusDelta;
        return getMatterTimestamp(b) - getMatterTimestamp(a);
    });

const isLegacyEmptyAssetsSnapshot = (assets: any): boolean => {
    if (!assets || typeof assets !== 'object') {
        return false;
    }

    if (!Object.prototype.hasOwnProperty.call(assets, 'list')) {
        return false;
    }

    if (!Array.isArray(assets.list) || assets.list.length > 0) {
        return false;
    }

    if (Array.isArray(assets.liabilities) && assets.liabilities.length > 0) {
        return false;
    }

    return assets.confirmedNoSignificantAssets !== true;
};

export const selectPreferredMatter = (
    intakes: ClientIntake[],
    type: ServiceType
): ClientIntake | null => {
    const matches = intakes
        .filter((intake) => intake.type === type)
        .sort((a, b) => getMatterTimestamp(b) - getMatterTimestamp(a));

    return matches.find((intake) => intake.status === 'started') ?? matches[0] ?? null;
};

export function useClientMatterRouting() {
    const estateStore = useIntakeStore();
    const incorpStore = useIncorpIntakeStore();
    const { isStepComplete: isEstateStepComplete } = useIntakeValidation();
    const { isStepComplete: isIncorpStepComplete } = useIncorpValidation();

    const resolveSteps = (intake: ClientIntake): StepDef[] => {
        const defs = intake.type === 'incorporation' ? INCORP_STEPS : ESTATE_STEPS;
        return defs.filter((step) => !step.condition || step.condition(intake.data || {}));
    };

    const isStepCompleteForIntake = (intake: ClientIntake, context: string): boolean => {
        const data = intake.data || {};
        if (intake.type === 'incorporation') {
            return isIncorpStepComplete(context, data);
        }

        const isComplete = isEstateStepComplete(context, data);
        if (isComplete) {
            return true;
        }

        // Preserve 100%-complete progress/routing for older will drafts that predate
        // the explicit "no significant assets" acknowledgement.
        if (context === 'assets' && isLegacyEmptyAssetsSnapshot(data.assets)) {
            return true;
        }

        return false;
    };

    const getProgress = (intake: ClientIntake): number => {
        const steps = resolveSteps(intake);
        const completed = steps.filter((step) => isStepCompleteForIntake(intake, step.context)).length;
        return steps.length ? Math.min(Math.round((completed / steps.length) * 100), 100) : 0;
    };

    const getMatterLink = (intake: ClientIntake): string => {
        const base = getMatterBaseRoute(intake.type);

        if (intake.status !== 'started') {
            return `${base}/review`;
        }

        for (const step of resolveSteps(intake)) {
            if (!isStepCompleteForIntake(intake, step.context)) {
                return `${base}/${step.path}`;
            }
        }

        return `${base}/review`;
    };

    const getDashboardCtaLabel = (intake: ClientIntake): string => {
        if (intake.status === 'submitted' || intake.status === 'reviewing' || intake.status === 'completed') {
            return 'View Summary';
        }

        return getProgress(intake) === 100 ? 'Review Summary' : 'Resume ->';
    };

    const getHomeCtaLabel = (intake: ClientIntake | null): string => {
        if (!intake) return 'Begin Intake';
        if (intake.status === 'started') {
            return getProgress(intake) === 100 ? 'Review Summary' : 'Continue';
        }
        if (intake.status === 'submitted') return 'Submission Received';
        if (intake.status === 'reviewing') return 'Under Lawyer Review';
        return 'View Summary';
    };

    const resolveHomeCard = (
        intakes: ClientIntake[],
        type: ServiceType,
        startRoute: string
    ): HomeCardModel => {
        const matches = sortByHomePriority(intakes.filter((intake) => intake.type === type));
        const completedMatters = matches.filter((intake) => intake.status === 'completed');
        const latestCompletedMatter = completedMatters[0] ?? null;
        const primaryMatter = matches.find((intake) => intake.status !== 'completed') ?? null;

        if (!primaryMatter && latestCompletedMatter) {
            return {
                primaryMatter: null,
                otherMatterCount: Math.max(matches.length - 1, 0),
                hasOtherActiveMatters: false,
                latestCompletedMatter,
                ctaLabel: 'Start New Intake',
                helperText: 'Your last matter is complete. Start a fresh intake when you are ready.',
                to: startRoute,
                summaryLink: getMatterLink(latestCompletedMatter),
                summaryLinkLabel: 'View Latest Summary',
            };
        }

        if (!primaryMatter) {
            return {
                primaryMatter: null,
                otherMatterCount: 0,
                hasOtherActiveMatters: false,
                latestCompletedMatter: null,
                ctaLabel: 'Begin Intake',
                helperText: '',
                to: startRoute,
                summaryLink: null,
                summaryLinkLabel: null,
            };
        }

        const latestCompletedSummary =
            latestCompletedMatter && latestCompletedMatter._id !== primaryMatter._id
                ? getMatterLink(latestCompletedMatter)
                : null;

        const otherActiveMatterCount = matches.filter((intake) =>
            intake.status !== 'completed' && intake._id !== primaryMatter._id
        ).length;

        if (primaryMatter.status === 'started') {
            const isComplete = getProgress(primaryMatter) === 100;
            return {
                primaryMatter,
                otherMatterCount: Math.max(matches.length - 1, 0),
                hasOtherActiveMatters: otherActiveMatterCount > 0,
                latestCompletedMatter,
                ctaLabel: isComplete ? 'Review Summary' : 'Continue',
                helperText: isComplete
                    ? 'Your questionnaire is complete. Review your answers before submitting.'
                    : 'Resume where you left off.',
                to: getMatterLink(primaryMatter),
                summaryLink: latestCompletedSummary,
                summaryLinkLabel: latestCompletedSummary ? 'View Latest Completed Summary' : null,
            };
        }

        if (primaryMatter.status === 'reviewing') {
            return {
                primaryMatter,
                otherMatterCount: Math.max(matches.length - 1, 0),
                hasOtherActiveMatters: otherActiveMatterCount > 0,
                latestCompletedMatter,
                ctaLabel: 'Under Lawyer Review',
                helperText: 'A Valiant Law lawyer is actively reviewing this matter.',
                to: getMatterLink(primaryMatter),
                summaryLink: latestCompletedSummary,
                summaryLinkLabel: latestCompletedSummary ? 'View Latest Completed Summary' : null,
            };
        }

        return {
            primaryMatter,
            otherMatterCount: Math.max(matches.length - 1, 0),
            hasOtherActiveMatters: otherActiveMatterCount > 0,
            latestCompletedMatter,
            ctaLabel: 'Submission Received',
            helperText: 'Your submission has been received and is queued for review.',
            to: getMatterLink(primaryMatter),
            summaryLink: latestCompletedSummary,
            summaryLinkLabel: latestCompletedSummary ? 'View Latest Completed Summary' : null,
        };
    };

    const activateMatter = (intake: ClientIntake) => {
        if (intake.type === 'incorporation') {
            incorpStore.setIncorpId(intake._id, { selection: 'explicit' });
            return;
        }

        estateStore.setIntakeId(intake._id);
    };

    const clearMatterSelection = (type: ServiceType) => {
        if (type === 'incorporation') {
            incorpStore.clearIncorpSelection();
            incorpStore.setCurrentStep('jurisdiction-name');
            return;
        }

        estateStore.currentIntakeId = null;
        estateStore.setCurrentStep('profile');
        localStorage.removeItem('intakeId');
    };

    return {
        activateMatter,
        clearMatterSelection,
        getDashboardCtaLabel,
        getHomeCtaLabel,
        getMatterLink,
        getProgress,
        resolveHomeCard,
        selectPreferredMatter,
    };
}
