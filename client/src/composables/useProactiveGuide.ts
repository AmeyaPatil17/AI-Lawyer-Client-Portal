import type { IntakeData } from '../types/intake';
import type { IncorporationData } from '../stores/incorpTypes';
import { useAiChatStore, type AIChatFlow, type SystemMessageDraft } from '../stores/aiChat';
import { resolveContext, type WizardContext } from './useWizardContext';
import { ref, onUnmounted } from 'vue';

type GuideData = IntakeData | IncorporationData;

interface ProactiveRule {
    id: string;
    flow: AIChatFlow;
    contexts: WizardContext[];
    condition: (data: GuideData, path: string) => boolean;
    message: string | ((data: GuideData) => string);
    severity?: 'info' | 'warning';
    delay?: number;
}

const RULES: ProactiveRule[] = [
    {
        id: 'profile_domestic_contract',
        flow: 'wills',
        contexts: ['profile'],
        condition: (data) => (data as IntakeData).personalProfile?.hasDomesticContract === 'yes',
        message: 'A domestic contract can affect how your estate is distributed. Your lawyer will need to review it alongside your will.',
        delay: 1200,
    },
    {
        id: 'profile_support_obligations',
        flow: 'wills',
        contexts: ['profile'],
        condition: (data) => (data as IntakeData).personalProfile?.hasSupportObligations === 'yes',
        message: 'Support obligations can survive death in Ontario and become a claim against the estate before beneficiaries are paid.',
        delay: 1200,
    },
    {
        id: 'family_blended',
        flow: 'wills',
        contexts: ['family'],
        condition: (data) => ((data as IntakeData).family?.children || []).some((child: any) => child.parentage === 'previous'),
        message: 'Blended families often need more precise estate instructions. Separate trusts or tailored distribution language may be worth discussing with your lawyer.',
        delay: 1500,
    },
    {
        id: 'family_disabled_dependant',
        flow: 'wills',
        contexts: ['family'],
        condition: (data) => ((data as IntakeData).family?.children || []).some((child: any) => child.isDisabled === true),
        message: "A Henson Trust may help protect a disabled dependant's ODSP eligibility by holding their inheritance indirectly.",
        delay: 1500,
    },
    {
        id: 'exec_rel_warn',
        flow: 'wills',
        contexts: ['executors'],
        condition: (data) => {
            const relationship = (data as IntakeData).executors?.primary?.relationship?.toLowerCase() ?? '';
            return ['brother', 'sister', 'friend', 'neighbor'].includes(relationship);
        },
        message: (data) => {
            const relationship = (data as IntakeData).executors?.primary?.relationship?.toLowerCase() ?? 'this person';
            return `Your ${relationship} will be responsible for paying taxes and distributing the estate. Make sure they have the time and comfort level to handle that role.`;
        },
        delay: 1200,
    },
    {
        id: 'tip_exec',
        flow: 'wills',
        contexts: ['executors'],
        condition: (data) => !(data as IntakeData).executors?.primary?.fullName,
        message: 'Most people choose a spouse or a close, organized relative as executor. Someone detail-oriented and reachable in Canada is usually easiest for administration.',
        delay: 1200,
    },
    {
        id: 'stirpes_info',
        flow: 'wills',
        contexts: ['beneficiaries'],
        condition: (data) => (data as any).beneficiaries?.contingency === 'perStirpes',
        message: 'Per stirpes means a deceased beneficiary’s share flows down to their children automatically.',
    },
    {
        id: 'ben_charity',
        flow: 'wills',
        contexts: ['beneficiaries'],
        condition: (data) => ((data as IntakeData).beneficiaries?.beneficiaries || []).some((beneficiary: any) => beneficiary.isCharity === true),
        message: 'Charitable gifts in a will can create donation tax credits that help offset taxes in the year of death.',
        delay: 1800,
    },
    {
        id: 'ben_shares_warn',
        flow: 'wills',
        contexts: ['beneficiaries'],
        condition: (data) => {
            const beneficiaries = (data as IntakeData).beneficiaries?.beneficiaries || [];
            if (beneficiaries.length === 0) return false;
            const total = beneficiaries.reduce((sum: number, beneficiary: any) => sum + (Number(beneficiary.share) || 0), 0);
            return total > 0 && Math.abs(total - 100) > 1;
        },
        message: (data) => {
            const total = ((data as IntakeData).beneficiaries?.beneficiaries || [])
                .reduce((sum: number, beneficiary: any) => sum + (Number(beneficiary.share) || 0), 0);
            return `Your beneficiary shares currently total ${total}%. They should add up to 100%.`;
        },
        severity: 'warning',
        delay: 800,
    },
    {
        id: 'guard_warn',
        flow: 'wills',
        contexts: ['guardians'],
        condition: (data) => (data as IntakeData).guardians?.primary?.relationship?.toLowerCase() === 'grandparent',
        message: 'Grandparents can be loving guardians, but it is worth considering their long-term capacity if the children may remain minors for many years.',
    },
    {
        id: 'tip_guard',
        flow: 'wills',
        contexts: ['guardians'],
        condition: (data) => !(data as IntakeData).guardians?.primary?.fullName,
        message: 'You can choose different people for day-to-day guardianship and for managing money held in trust for children.',
    },
    {
        id: 'tip_assets',
        flow: 'wills',
        contexts: ['assets'],
        condition: (data) => !((data as any).assets?.list?.length),
        message: 'Focus on major assets: real estate, investment accounts, retirement accounts, business interests, and vehicles.',
    },
    {
        id: 'asset_desc_warn',
        flow: 'wills',
        contexts: ['assets'],
        condition: (data) => (((data as any).assets?.list) || []).some(
            (asset: any) => asset.type === 'RealEstate' && (!asset.description || asset.description.length < 5)
        ),
        message: 'Use the full municipal address for real estate so the property can be identified clearly.',
        severity: 'warning',
    },
    {
        id: 'tip_poa',
        flow: 'wills',
        contexts: ['poa'],
        condition: (_data, path) => path.includes('poa'),
        message: 'Ontario typically uses two powers of attorney: one for property and one for personal care.',
    },
    {
        id: 'foreign_will_warn',
        flow: 'wills',
        contexts: ['prior-wills'],
        condition: (data) => (data as IntakeData).priorWills?.hasForeignWill === 'yes',
        message: 'A foreign will needs careful drafting so the Ontario will does not revoke it accidentally.',
        severity: 'warning',
    },
    {
        id: 'funeral_tip',
        flow: 'wills',
        contexts: ['funeral'],
        condition: (_data, path) => path.includes('funeral'),
        message: 'Funeral wishes are helpful guidance for your family, but they are not usually legally binding.',
    },
    {
        id: 'review_complete',
        flow: 'wills',
        contexts: ['review'],
        condition: (data) => !(data as any).submitted && !!(data as IntakeData).executors?.primary?.fullName,
        message: 'Your plan looks substantially complete. Review the summary carefully before submitting.',
        delay: 2000,
    },
    {
        id: 'review_incomplete',
        flow: 'wills',
        contexts: ['review'],
        condition: (data) => !(data as any).submitted && !(data as IntakeData).executors?.primary?.fullName,
        message: (data) => {
            const intake = data as IntakeData;
            const missing: string[] = [];
            if (!intake.executors?.primary?.fullName) missing.push('Executors');
            if (!intake.beneficiaries?.beneficiaries?.length) missing.push('Beneficiaries');
            if (!intake.assets) missing.push('Assets');
            if (!(intake.personalProfile as any)?.fullName) missing.push('Personal Profile');
            return `${missing.join(', ')} still look incomplete. You can submit, but completing them may speed up review.`;
        },
        severity: 'warning',
        delay: 2500,
    },
    {
        id: 'incorp_name_conflict',
        flow: 'incorporation',
        contexts: ['incorp-jurisdiction'],
        condition: (data) => (data as IncorporationData).preIncorporation?.nameType === 'named' && !!(data as IncorporationData).preIncorporation?.nuansReport?.hasConflicts,
        message: 'Your NUANS review appears to show name conflicts. That should be resolved before filing.',
        severity: 'warning',
        delay: 1200,
    },
    {
        id: 'incorp_named_company_tip',
        flow: 'incorporation',
        contexts: ['incorp-jurisdiction'],
        condition: (data) => (data as IncorporationData).preIncorporation?.nameType === 'named' && !(data as IncorporationData).preIncorporation?.nameConfirmed,
        message: 'For a named corporation, confirm the final name and legal ending before filing so downstream documents stay consistent.',
        delay: 1200,
    },
    {
        id: 'incorp_structure_tip',
        flow: 'incorporation',
        contexts: ['incorp-structure'],
        condition: (data) => !((data as IncorporationData).structureOwnership?.initialShareholders || []).length,
        message: 'Before you finalize the structure, define the initial shareholders and how many shares each person will receive.',
        delay: 1400,
    },
    {
        id: 'incorp_articles_certificate',
        flow: 'incorporation',
        contexts: ['incorp-articles'],
        condition: (data) => !!(data as IncorporationData).articles?.filingFeePaid && !(data as IncorporationData).articles?.certificateReceived,
        message: 'If the filing fee has been paid but the certificate has not been received yet, keep the file in review until the certificate details are confirmed.',
        delay: 1400,
    },
    {
        id: 'incorp_records_usa',
        flow: 'incorporation',
        contexts: ['incorp-records'],
        condition: (data) => !!(data as IncorporationData).structureOwnership?.requiresUSA && !(data as IncorporationData).corporateRecords?.hasUSACopy,
        message: 'A unanimous shareholders agreement is flagged as required, but the corporate records do not yet show a copy on file.',
        severity: 'warning',
        delay: 1000,
    },
    {
        id: 'incorp_registrations_hst',
        flow: 'incorporation',
        contexts: ['incorp-registrations'],
        condition: (data) => !!(data as IncorporationData).registrations?.hstGstRegistered && !(data as IncorporationData).registrations?.hstGstNumber,
        message: 'HST/GST registration is marked as complete, but the registration number is still missing.',
        severity: 'warning',
        delay: 1000,
    },
    {
        id: 'incorp_banking_tip',
        flow: 'incorporation',
        contexts: ['incorp-banking'],
        condition: (data) => !!(data as IncorporationData).bankingSetup && !(data as IncorporationData).bankingSetup?.bankAccountOpened,
        message: 'Once filing and records are complete, opening the corporate bank account is usually the next operational milestone.',
        delay: 1500,
    },
    {
        id: 'incorp_review_ready',
        flow: 'incorporation',
        contexts: ['incorp-review'],
        condition: (data) => !(data as any).submitted && !!(data as IncorporationData).preIncorporation?.jurisdiction,
        message: 'Review the incorporation summary for filing details, minute book readiness, and missing registrations before submitting.',
        delay: 1800,
    },
];

export function useProactiveGuide() {
    const aiChatStore = useAiChatStore();
    const pendingTimeouts = ref<ReturnType<typeof setTimeout>[]>([]);
    const activeBatch = ref(0);

    const clearPendingLocalRules = () => {
        pendingTimeouts.value.forEach((timeoutId) => clearTimeout(timeoutId));
        pendingTimeouts.value = [];
        activeBatch.value++;
    };

    const checkLocalRules = (currentPath: string, intakeData: GuideData, flow: AIChatFlow) => {
        clearPendingLocalRules();

        const context = resolveContext(currentPath);
        if (context === 'general') {
            return;
        }

        const matchingRules = RULES
            .filter((rule) => rule.flow === flow && rule.contexts.includes(context))
            .filter((rule) => {
                try {
                    return rule.condition(intakeData, currentPath);
                } catch (error) {
                    console.warn(`[ProactiveGuide] Rule "${rule.id}" evaluation failed:`, error);
                    return false;
                }
            });

        if (matchingRules.length === 0) {
            aiChatStore.setSystemMessages(context, 'proactive', []);
            return;
        }

        const batchId = activeBatch.value;
        const revealedDrafts: SystemMessageDraft[] = [];

        const sortedRules = [...matchingRules].sort((a, b) => (a.delay || 1500) - (b.delay || 1500));
        for (const rule of sortedRules) {
            const timeoutId = setTimeout(() => {
                if (batchId !== activeBatch.value) return;

                const text = typeof rule.message === 'function'
                    ? rule.message(intakeData)
                    : rule.message;

                revealedDrafts.push({
                    id: `proactive:${context}:${rule.id}`,
                    text,
                    context,
                    source: 'proactive',
                    severity: rule.severity || 'info',
                });

                aiChatStore.setSystemMessages(context, 'proactive', [...revealedDrafts]);
            }, rule.delay || 1500);

            pendingTimeouts.value.push(timeoutId);
        }
    };

    onUnmounted(clearPendingLocalRules);

    return {
        checkLocalRules,
        clearPendingLocalRules,
    };
}
