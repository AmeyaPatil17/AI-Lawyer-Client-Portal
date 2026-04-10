import type { IncorpValidationContext } from './incorpRules';

export type IncorpStepPath =
    | 'jurisdiction-name'
    | 'structure-ownership'
    | 'articles'
    | 'post-incorp'
    | 'share-issuance'
    | 'corporate-records'
    | 'registrations'
    | 'banking-setup'
    | 'review';

export type IncorpStepContext = IncorpValidationContext | 'review';

export interface IncorpWizardStepDef {
    label: string;
    path: IncorpStepPath;
    context: IncorpStepContext;
}

export const INCORP_WIZARD_STEPS: IncorpWizardStepDef[] = [
    {
        label: 'Jurisdiction & Name',
        path: 'jurisdiction-name',
        context: 'preIncorporation',
    },
    {
        label: 'Structure & Ownership',
        path: 'structure-ownership',
        context: 'structureOwnership',
    },
    {
        label: 'Articles of Incorporation',
        path: 'articles',
        context: 'articles',
    },
    {
        label: 'Post-Incorporation',
        path: 'post-incorp',
        context: 'postIncorpOrg',
    },
    {
        label: 'Share Issuance',
        path: 'share-issuance',
        context: 'shareIssuance',
    },
    {
        label: 'Corporate Records',
        path: 'corporate-records',
        context: 'corporateRecords',
    },
    {
        label: 'Registrations & Filings',
        path: 'registrations',
        context: 'registrations',
    },
    {
        label: 'Banking & Compliance',
        path: 'banking-setup',
        context: 'bankingSetup',
    },
    {
        label: 'Review & Submit',
        path: 'review',
        context: 'review',
    },
];

export const INCORP_FLOW_STEPS = INCORP_WIZARD_STEPS.filter(
    (step): step is IncorpWizardStepDef & { context: IncorpValidationContext } =>
        step.context !== 'review'
);

export const DEFAULT_INCORP_STEP: IncorpStepPath = INCORP_WIZARD_STEPS[0].path;

export const isValidIncorpStepPath = (value: string): value is IncorpStepPath =>
    INCORP_WIZARD_STEPS.some((step) => step.path === value);

export const getIncorpStepIndex = (path: string): number =>
    INCORP_WIZARD_STEPS.findIndex((step) => step.path === path);
