import type { AssetCategoryKey } from './assetList';
import type { QuestionHelperAiStep } from '../types/questionHelper';

type WillsHelperCommon = {
    example?: string;
    whyItMatters?: string;
    aiStep: QuestionHelperAiStep;
    hasLegalWording?: boolean;
    allowLegalInsert?: boolean;
    legalContext?: string;
};

export type WillsAtomicHelperFieldConfig = WillsHelperCommon & {
    helperKind: 'field';
    label: string;
    inputId: string;
    required?: boolean;
};

export type WillsGroupHelperFieldConfig = WillsHelperCommon & {
    helperKind: 'group';
    label: string;
    inputId: string;
    required?: boolean;
};

export type WillsHelperFieldConfig =
    | WillsAtomicHelperFieldConfig
    | WillsGroupHelperFieldConfig;

type WillsHelperFieldInput = Omit<WillsHelperFieldConfig, 'aiStep'>;

type WillsHelperSectionKeys = {
    personalProfile:
        | 'fullName'
        | 'dateOfBirth'
        | 'maritalStatus'
        | 'address'
        | 'occupation'
        | 'employer'
        | 'placeOfBirth'
        | 'citizenship'
        | 'marriageDate'
        | 'marriagePlace'
        | 'hasDomesticContract'
        | 'domesticContractDetails'
        | 'hasSupportObligations'
        | 'supportObligationDetails'
        | 'accountant'
        | 'advisor';
    family:
        | 'maritalStatus'
        | 'spouseName'
        | 'childName'
        | 'childDob'
        | 'childPob'
        | 'residesInCanada'
        | 'isMarried'
        | 'hasChildren'
        | 'isDisabled'
        | 'hasSpendthrift';
    guardians:
        | 'primaryFullName'
        | 'primaryRelationship'
        | 'alternateName'
        | 'alternateRelationship'
        | 'trusteeSameAsGuardian'
        | 'trusteeName'
        | 'trusteeRelationship';
    executors:
        | 'primaryFullName'
        | 'primaryRelationship'
        | 'alternateName'
        | 'alternateRelationship'
        | 'compensation'
        | 'compensationDetails';
    beneficiaries:
        | 'personalEffectsSpouseAll'
        | 'specificItem'
        | 'specificItemBen'
        | 'legacyName'
        | 'legacyRelationship'
        | 'legacyAmount'
        | 'benName'
        | 'benRelationship'
        | 'benShare'
        | 'contingency'
        | 'trustType'
        | 'trustAge'
        | 'separateTrustee'
        | 'separateTrusteeName'
        | 'spendthrift'
        | 'stagedDist'
        | 'disaster';
    assets:
        | 'ownership'
        | 'shareholderAgm'
        | 'liabilityDesc'
        | 'liabilityAmt';
    poa:
        | 'primaryNameProp'
        | 'primaryRelProp'
        | 'alternateNameProp'
        | 'alternateRelProp'
        | 'primaryNameCare'
        | 'primaryRelCare'
        | 'healthInstructions'
        | 'hasLivingWill'
        | 'alternateNameCare'
        | 'alternateRelCare';
    funeral:
        | 'type'
        | 'ashesDetails'
        | 'burialDetails'
        | 'serviceType'
        | 'serviceDetails';
    priorWills:
        | 'hasPriorWill'
        | 'priorWillDate'
        | 'priorWillLocation'
        | 'hasForeignWill'
        | 'foreignWillDetails';
};

type WillsHelperRegistry = {
    [K in keyof WillsHelperSectionKeys]: Record<WillsHelperSectionKeys[K], WillsHelperFieldConfig>;
};

type AssetCategoryHelpers = Record<
    AssetCategoryKey,
    {
        description: WillsAtomicHelperFieldConfig;
        value: WillsAtomicHelperFieldConfig;
    }
>;

const withAiStep = <
    Step extends QuestionHelperAiStep,
    T extends Record<string, WillsHelperFieldInput>,
>(
    aiStep: Step,
    fields: T,
): { [K in keyof T]: T[K] & { aiStep: Step } } =>
    Object.fromEntries(
        Object.entries(fields).map(([key, field]) => [key, { ...field, aiStep }]),
    ) as { [K in keyof T]: T[K] & { aiStep: Step } };

const fieldHelper = (
    field: Omit<WillsAtomicHelperFieldConfig, 'aiStep' | 'helperKind'>,
): WillsHelperFieldInput => ({
    helperKind: 'field',
    ...field,
});

const groupHelper = (
    field: Omit<WillsGroupHelperFieldConfig, 'aiStep' | 'helperKind'>,
): WillsHelperFieldInput => ({
    helperKind: 'group',
    ...field,
});

const legalTemplate = (legalContext: string) => ({
    hasLegalWording: true,
    allowLegalInsert: true,
    legalContext,
} as const);

const assetDescriptionBase = fieldHelper({
    label: 'Asset Description',
    inputId: 'asset-description',
    whyItMatters: 'Identifies the asset clearly so your executor can locate it, confirm ownership, and deal with it correctly.',
});

const assetValueBase = fieldHelper({
    label: 'Estimated Value',
    inputId: 'asset-value',
    whyItMatters: 'Helps your lawyer estimate the estate value, flag planning issues, and assess possible Estate Administration Tax exposure.',
});

/**
 * Form field helper text and AI-step metadata for the wills wizard.
 */
export const willsHelpers = {
    personalProfile: withAiStep('personalProfile', {
        fullName: fieldHelper({
            label: 'Legal Full Name',
            inputId: 'personal-fullname',
            required: true,
            example: 'John Michael Doe',
            whyItMatters: 'Your legal name must exactly match government-issued ID so you are identified correctly in your will and related documents.',
        }),
        dateOfBirth: fieldHelper({
            label: 'Date of Birth',
            inputId: 'personal-dob',
            required: true,
            example: '1980-01-01',
            whyItMatters: 'Used to confirm identity, flag age-based planning issues, and distinguish you from someone with a similar name.',
        }),
        maritalStatus: fieldHelper({
            label: 'Marital Status',
            inputId: 'personal-marital',
            required: true,
            example: 'Married, Single, Common-law',
            whyItMatters: "Your status determines spousal rights under the Family Law Act. 'Common Law' has different property rights than 'Married' in Ontario.",
        }),
        address: fieldHelper({
            label: 'Home Address',
            inputId: 'personal-address',
            example: '123 Maple Street, Apt 4B, Toronto, ON, M4A 1B2',
            whyItMatters: "Your address helps establish which province's or country's laws apply to your estate plan.",
        }),
        occupation: fieldHelper({
            label: 'Occupation',
            inputId: 'personal-occupation',
            example: 'Software Engineer, Retired, Teacher',
            whyItMatters: 'Helps identify you and can matter for profession-related assets, insurance, or business interests.',
        }),
        employer: fieldHelper({
            label: 'Employer',
            inputId: 'personal-employer',
            example: 'Acme Corp, Self-Employed',
            whyItMatters: 'Your executor may need to contact your employer about pension, life insurance, or final pay.',
        }),
        placeOfBirth: fieldHelper({
            label: 'Place of Birth',
            inputId: 'personal-pob',
            example: 'Toronto, Ontario',
            whyItMatters: 'Provides an additional identifying detail that can help when institutions verify your records.',
        }),
        citizenship: fieldHelper({
            label: 'Citizenship(s)',
            inputId: 'personal-citizenship',
            example: 'Canadian, U.S., Dual (Canada/UK)',
            whyItMatters: 'Citizenship can change tax, reporting, and cross-border estate-planning obligations.',
        }),
        marriageDate: fieldHelper({
            label: 'Date of Marriage',
            inputId: 'personal-marriage-date',
            example: '2015-06-12',
            whyItMatters: 'Marriage timing can affect spousal rights and how your lawyer reviews earlier estate-planning documents.',
        }),
        marriagePlace: fieldHelper({
            label: 'Place of Marriage',
            inputId: 'personal-marriage-place',
            example: 'Banff, Alberta',
            whyItMatters: 'Provides context for family-law and jurisdiction issues that may affect your estate plan.',
        }),
        hasDomesticContract: groupHelper({
            label: 'Do you have a Domestic Contract?',
            inputId: 'personal-has-domestic-contract',
            example: 'Yes / No',
            whyItMatters: 'A marriage contract, cohabitation agreement, or separation agreement can override what you put in your will.',
        }),
        domesticContractDetails: fieldHelper({
            label: 'Domestic Contract Details',
            inputId: 'personal-contract-details',
            example: 'Prenup signed in 2018 dividing family home 50/50.',
            whyItMatters: 'Your lawyer needs enough detail to understand whether an existing contract limits what your will can do.',
            ...legalTemplate('personal_contract_details'),
        }),
        hasSupportObligations: groupHelper({
            label: 'Do you have support obligations?',
            inputId: 'personal-has-support-obligations',
            example: 'Yes / No',
            whyItMatters: 'Spousal or child support obligations may continue after death and can reduce what is available to beneficiaries.',
        }),
        supportObligationDetails: fieldHelper({
            label: 'Support Obligations Details',
            inputId: 'personal-support-details',
            example: 'Paying $1,200/month in child support to ex-spouse Jane Doe.',
            whyItMatters: 'Support obligations become claims against the estate, so your lawyer needs the key facts.',
            ...legalTemplate('personal_support_details'),
        }),
        accountant: fieldHelper({
            label: 'Accountant',
            inputId: 'personal-accountant',
            example: 'John Smith from Smith & Associates',
            whyItMatters: "Your executor may need this contact for final tax filings and outstanding accounting matters.",
        }),
        advisor: fieldHelper({
            label: 'Financial Advisor',
            inputId: 'personal-advisor',
            example: 'Sarah Jenkins, RBC Wealth Management',
            whyItMatters: 'Your advisor may be the fastest route to locating and freezing investment accounts.',
        }),
    }),

    family: withAiStep('family', {
        maritalStatus: fieldHelper({
            label: 'Marital Status',
            inputId: 'family-marital-status',
            required: true,
            example: 'Married, Single, Common-law',
            whyItMatters: 'Spousal status affects inheritance rights, equalization issues, and how your estate plan should be drafted.',
        }),
        spouseName: fieldHelper({
            label: "Spouse's Full Name",
            inputId: 'spouse-name',
            example: 'Jane Elizabeth Doe',
            whyItMatters: 'Your spouse or partner may have important rights under Ontario law, so the legal name should match official records.',
        }),
        childName: fieldHelper({
            label: 'Full Legal Name',
            inputId: 'family-child-name',
            example: 'Michael James Doe',
            whyItMatters: 'Must match official records to reduce identity confusion and inheritance disputes.',
        }),
        childDob: fieldHelper({
            label: 'Date of Birth',
            inputId: 'family-child-dob',
            example: '2010-05-15',
            whyItMatters: 'Determines whether a child is still a minor and whether trust or guardianship provisions are needed.',
        }),
        childPob: fieldHelper({
            label: 'Place of Birth',
            inputId: 'family-child-pob',
            example: 'Toronto, Ontario',
            whyItMatters: 'Can affect citizenship and cross-border estate-planning considerations.',
        }),
        residesInCanada: fieldHelper({
            label: 'Resides in Canada?',
            inputId: 'family-child-residence',
            example: 'Yes / No',
            whyItMatters: 'Non-resident beneficiaries can create extra tax, reporting, and administration complexity.',
        }),
        isMarried: fieldHelper({
            label: 'Is Married?',
            inputId: 'family-child-married',
            whyItMatters: 'Helps your lawyer consider whether protective trust language may be appropriate.',
        }),
        hasChildren: fieldHelper({
            label: 'Has Children?',
            inputId: 'family-child-has-children',
            whyItMatters: 'Helps determine whether grandchildren or descendants should be included in contingency planning.',
        }),
        isDisabled: fieldHelper({
            label: 'Has a Disability',
            inputId: 'family-child-disabled',
            whyItMatters: 'A direct inheritance can affect benefit eligibility, so special trust planning may be needed.',
        }),
        hasSpendthrift: fieldHelper({
            label: 'Spendthrift / Creditor Issues',
            inputId: 'family-child-spendthrift',
            whyItMatters: 'May justify additional trust protections against impulsive spending or creditor claims.',
        }),
    }),

    guardians: withAiStep('guardians', {
        primaryFullName: fieldHelper({
            label: 'Full Name',
            inputId: 'primary-guardian-name',
            required: true,
            example: 'Mary Elizabeth Poppins',
            whyItMatters: 'This person would have custody of your minor children if both parents pass away.',
        }),
        primaryRelationship: fieldHelper({
            label: 'Relationship',
            inputId: 'guardian-primary-rel',
            example: 'Sibling, Friend, Aunt',
            whyItMatters: 'Provides context for the appointment and helps your lawyer understand the family dynamic.',
        }),
        alternateName: fieldHelper({
            label: 'Full Name',
            inputId: 'guardian-alt-name',
            example: 'Robert Doe',
            whyItMatters: 'Naming an alternate helps avoid court involvement if your first choice cannot act.',
        }),
        alternateRelationship: fieldHelper({
            label: 'Relationship',
            inputId: 'guardian-alt-rel',
            example: 'Brother, Friend',
            whyItMatters: 'Provides context for the alternate appointment.',
        }),
        trusteeSameAsGuardian: groupHelper({
            label: 'Same as Primary Guardian?',
            inputId: 'guardian-trustee-same',
            whyItMatters: 'You can choose the same person or separate caregiving from financial oversight for checks and balances.',
        }),
        trusteeName: fieldHelper({
            label: 'Trustee Name',
            inputId: 'guardian-trustee-name',
            example: 'David Smith',
            whyItMatters: 'This person would manage money left to minor children.',
        }),
        trusteeRelationship: fieldHelper({
            label: 'Relationship',
            inputId: 'guardian-trustee-rel',
            example: 'Sibling, Professional',
            whyItMatters: 'Identifies the trustee relationship for drafting purposes.',
        }),
    }),

    executors: withAiStep('executors', {
        primaryFullName: fieldHelper({
            label: 'Full Name',
            inputId: 'primary-executor-name',
            required: true,
            example: 'Jane Elizabeth Doe',
            whyItMatters: 'Your executor carries out the will, pays debts, and distributes the estate, so this should be someone you trust completely.',
        }),
        primaryRelationship: fieldHelper({
            label: 'Relationship',
            inputId: 'executor-primary-rel',
            example: 'Spouse, Child, Sibling',
            whyItMatters: 'Provides context for the appointment and court paperwork.',
        }),
        alternateName: fieldHelper({
            label: 'Alternate Name',
            inputId: 'executor-alt-name',
            example: 'Sarah Connor',
            whyItMatters: 'An alternate prevents delay if your first executor dies, becomes incapable, or declines to act.',
        }),
        alternateRelationship: fieldHelper({
            label: 'Relationship',
            inputId: 'executor-alt-rel',
            example: 'Sibling, Trust Company',
            whyItMatters: 'Identifies the alternate appointment.',
        }),
        compensation: fieldHelper({
            label: 'Executor Compensation',
            inputId: 'executor-compensation',
            example: 'Guidelines (~5%), Gratis',
            whyItMatters: 'Compensation instructions help set expectations and can reduce disputes later.',
        }),
        compensationDetails: fieldHelper({
            label: 'Specific Compensation Terms',
            inputId: 'executor-compensation-details',
            example: 'I direct that my executor receive $10,000 as a flat fee.',
            whyItMatters: 'A specific fee can override default compensation expectations and should be drafted carefully.',
            ...legalTemplate('executor_compensation_details'),
        }),
    }),

    beneficiaries: withAiStep('beneficiaries', {
        personalEffectsSpouseAll: groupHelper({
            label: 'Leave all personal effects to Spouse/Children?',
            inputId: 'ben-effects-spouse-all',
            whyItMatters: 'This decides whether personal effects are divided generally or allocated item by item.',
        }),
        specificItem: fieldHelper({
            label: 'Item Description',
            inputId: 'ben-effects-item',
            example: '1969 Fender Stratocaster Guitar',
            whyItMatters: 'Must be specific enough to avoid arguments over which item you meant.',
        }),
        specificItemBen: fieldHelper({
            label: 'Beneficiary',
            inputId: 'ben-effects-item-ben',
            example: 'John Smith',
            whyItMatters: 'Identifies who should receive the item.',
        }),
        legacyName: fieldHelper({
            label: 'Name / Charity',
            inputId: 'ben-legacy-name',
            example: 'Red Cross Canada (Charity #12345)',
            whyItMatters: 'Specific cash gifts are paid before the residue is divided, so the recipient must be clearly identified.',
        }),
        legacyRelationship: fieldHelper({
            label: 'Relationship',
            inputId: 'ben-legacy-rel',
            example: 'Friend, Niece, Charity',
            whyItMatters: 'Provides context for the legacy and can help identify the intended recipient.',
        }),
        legacyAmount: fieldHelper({
            label: '$ Amount',
            inputId: 'ben-legacy-amt',
            example: '10000',
            whyItMatters: 'Legacy gifts are fixed amounts and can affect what remains for residue beneficiaries.',
        }),
        benName: fieldHelper({
            label: 'Full Name',
            inputId: 'ben-residue-name',
            example: 'Jane Doe',
            whyItMatters: 'Residue beneficiaries receive what is left after debts, taxes, and specific gifts are paid.',
        }),
        benRelationship: fieldHelper({
            label: 'Relationship',
            inputId: 'ben-residue-rel',
            example: 'Child, Friend, Charity',
            whyItMatters: 'Provides context for the drafting and helps identify the intended beneficiary.',
        }),
        benShare: fieldHelper({
            label: 'Share (%)',
            inputId: 'ben-residue-share',
            example: '50',
            whyItMatters: 'Residue shares should add up to 100% so the estate is fully allocated.',
        }),
        contingency: groupHelper({
            label: 'Contingency Plan',
            inputId: 'ben-contingency',
            example: 'Per Stirpes vs. Pro Rata',
            whyItMatters: 'Sets the default outcome if a beneficiary dies before you.',
        }),
        trustType: fieldHelper({
            label: 'Trust Type',
            inputId: 'ben-trust-type',
            example: 'Fully Discretionary, Henson',
            whyItMatters: 'Different trust types change how much control the trustee has and whether benefits can be protected.',
        }),
        trustAge: fieldHelper({
            label: 'Age of Majority',
            inputId: 'ben-trust-age',
            example: '21, 25, 30',
            whyItMatters: 'Sets the age or age stages when a beneficiary gains direct control of funds.',
        }),
        separateTrustee: groupHelper({
            label: 'Separate Trustee',
            inputId: 'ben-trust-separate',
            whyItMatters: 'Lets you separate estate administration from long-term trust management.',
        }),
        separateTrusteeName: fieldHelper({
            label: 'Trustee Name',
            inputId: 'ben-trust-separate-name',
            example: 'John Smith',
            whyItMatters: 'Identifies the person or trust company that would manage this trust.',
        }),
        spendthrift: groupHelper({
            label: 'Spendthrift Clause',
            inputId: 'ben-trust-spendthrift',
            whyItMatters: "Can protect trust property from a beneficiary's creditors or poor financial decisions.",
        }),
        stagedDist: groupHelper({
            label: 'Staged Distribution',
            inputId: 'ben-trust-staged',
            whyItMatters: 'Lets you release funds gradually instead of all at once.',
        }),
        disaster: fieldHelper({
            label: 'Common Disaster Clause',
            inputId: 'ben-disaster',
            example: "50% to my siblings, 50% to my spouse's siblings.",
            whyItMatters: 'Covers the remote case where your immediate family all die together or in quick succession.',
            ...legalTemplate('ben_disaster'),
        }),
    }),

    assets: withAiStep('assets', {
        ownership: fieldHelper({
            label: 'Ownership',
            inputId: 'asset-ownership',
            example: 'Sole Owner, Joint with Spouse, Joint with Other, Tenants in Common',
            whyItMatters: 'Ownership affects whether an asset may pass outside the estate or fall under the will and Estate Administration Tax rules.',
        }),
        shareholderAgm: groupHelper({
            label: "Shareholder's Agreement",
            inputId: 'asset-shareholder-agm',
            whyItMatters: "A shareholder's agreement may restrict transfers on death or require a buyout that overrides your assumptions about the will.",
        }),
        liabilityDesc: fieldHelper({
            label: 'Creditor / Description',
            inputId: 'liability-desc',
            example: 'RBC mortgage, auto loan',
            whyItMatters: 'Debts must be settled before the estate can be distributed.',
        }),
        liabilityAmt: fieldHelper({
            label: 'Amount',
            inputId: 'liability-amt',
            example: '250000',
            whyItMatters: 'Helps estimate the net estate after liabilities are paid.',
        }),
    }),

    poa: withAiStep('poa', {
        primaryNameProp: fieldHelper({
            label: 'Full Name',
            inputId: 'poa-prop-primary',
            example: 'Jane Elizabeth Doe',
            whyItMatters: 'This person would manage your finances and property if you become incapable.',
        }),
        primaryRelProp: fieldHelper({
            label: 'Relationship (Property)',
            inputId: 'poa-prop-primary-rel',
            example: 'Spouse, Child',
            whyItMatters: 'Provides context for the property-attorney appointment.',
        }),
        alternateNameProp: fieldHelper({
            label: 'Alternate Name (Property)',
            inputId: 'poa-prop-alt-name',
            example: 'John Smith',
            whyItMatters: 'An alternate avoids delay if the primary attorney cannot act.',
        }),
        alternateRelProp: fieldHelper({
            label: 'Relationship (Property)',
            inputId: 'poa-prop-alt-rel',
            example: 'Sibling',
            whyItMatters: 'Identifies the alternate property-attorney relationship.',
        }),
        primaryNameCare: fieldHelper({
            label: 'Full Name (Care)',
            inputId: 'poa-care-primary',
            example: 'Jane Elizabeth Doe',
            whyItMatters: 'This person would make health and personal-care decisions for you.',
        }),
        primaryRelCare: fieldHelper({
            label: 'Relationship (Care)',
            inputId: 'poa-care-primary-rel',
            example: 'Spouse, Child',
            whyItMatters: 'Provides context for the personal-care appointment.',
        }),
        healthInstructions: fieldHelper({
            label: 'Health Instructions / Living Will',
            inputId: 'poa-care-health-inst',
            example: 'Do not keep me on life support if there is no chance of meaningful recovery.',
            whyItMatters: 'These instructions guide personal-care decisions if you cannot speak for yourself.',
            ...legalTemplate('poa_care_health_inst'),
        }),
        hasLivingWill: groupHelper({
            label: 'Include Living Will Clause',
            inputId: 'poa-care-living-will',
            whyItMatters: 'Confirms whether these health instructions should be incorporated formally into the document.',
        }),
        alternateNameCare: fieldHelper({
            label: 'Alternate Name (Care)',
            inputId: 'poa-care-alt-name',
            example: 'John Smith',
            whyItMatters: 'An alternate can step in if your primary personal-care attorney cannot act.',
        }),
        alternateRelCare: fieldHelper({
            label: 'Relationship (Care)',
            inputId: 'poa-care-alt-rel',
            example: 'Sibling',
            whyItMatters: 'Identifies the alternate personal-care relationship.',
        }),
    }),

    funeral: withAiStep('funeral', {
        type: groupHelper({
            label: 'How would you like your remains to be handled?',
            inputId: 'funeral-type',
            example: 'Cremation, Burial, Scientific Use',
            whyItMatters: 'Gives your executor and family clear guidance about how you want your remains handled.',
        }),
        ashesDetails: fieldHelper({
            label: 'Instructions for Ashes',
            inputId: 'funeral-ashes-details',
            example: 'Scatter over Lake Muskoka',
            whyItMatters: 'Clarifies what should happen to your ashes after cremation.',
            ...legalTemplate('funeral_ashes_details'),
        }),
        burialDetails: fieldHelper({
            label: 'Cemetery / Plot Details',
            inputId: 'funeral-burial-details',
            example: 'Pre-purchased plot at Mount Pleasant Cemetery, section 4',
            whyItMatters: 'Helps your executor find the right cemetery or plot and avoid duplicate purchases.',
            ...legalTemplate('funeral_burial_details'),
        }),
        serviceType: groupHelper({
            label: 'Service / Ceremony',
            inputId: 'funeral-service-type',
            example: 'Formal, Informal, None',
            whyItMatters: 'Lets your family know whether you wanted a formal service, a celebration of life, or no ceremony.',
        }),
        serviceDetails: fieldHelper({
            label: 'Specific Service Requests',
            inputId: 'funeral-service-details',
            example: 'Play my favourite Frank Sinatra song. Donations to the Cancer Society instead of flowers.',
            whyItMatters: 'Captures the personal details that make the service reflect your wishes.',
            ...legalTemplate('funeral_service_details'),
        }),
    }),

    priorWills: withAiStep('priorWills', {
        hasPriorWill: groupHelper({
            label: 'Do you have an existing Will?',
            inputId: 'prior-will-has',
            whyItMatters: 'Your lawyer needs to know whether there is an earlier will that should be reviewed and revoked properly.',
        }),
        priorWillDate: fieldHelper({
            label: 'Approximate Date',
            inputId: 'prior-will-date',
            example: '2010-04-15',
            whyItMatters: 'Helps identify which document you are referring to.',
        }),
        priorWillLocation: fieldHelper({
            label: 'Location of Original',
            inputId: 'prior-will-loc',
            example: "Lawyer Bob Smith's vault in Toronto.",
            whyItMatters: 'Knowing where the signed original is stored helps avoid duelling-will disputes later.',
        }),
        hasForeignWill: groupHelper({
            label: 'Do you have assets in another country covered by a foreign will?',
            inputId: 'prior-will-foreign',
            whyItMatters: 'This helps your lawyer avoid accidentally revoking a separate foreign will when drafting the Ontario will.',
        }),
        foreignWillDetails: fieldHelper({
            label: 'Foreign Will Details',
            inputId: 'prior-will-foreign-details',
            example: 'Will drafted in Florida in 2018 for my Miami condo.',
            whyItMatters: 'The country, date, and purpose of the foreign will matter if carve-out language is needed.',
            ...legalTemplate('prior_will_foreign_details'),
        }),
    }),
} as const satisfies WillsHelperRegistry;

export const willsAssetCategoryHelpers = {
    realEstate: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Property Address',
            example: '123 Maple Drive, Toronto, ON',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Property Value',
            example: '850000',
            whyItMatters: "Helps estimate the value of your estate, including the portion above Ontario's first $50,000 Estate Administration Tax exemption.",
        },
    },
    bankAccounts: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Account / Institution',
            example: 'RBC chequing account ending in 4321',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Account Balance',
            example: '25000',
        },
    },
    investments: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Account / Holding',
            example: 'TFSA at Questrade holding XEQT',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Investment Value',
            example: '180000',
        },
    },
    business: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Company / Interest',
            example: '50 common shares of Maple Consulting Inc.',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Business Value',
            example: '300000',
        },
    },
    foreignAssets: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Foreign Asset',
            example: 'Condo in Naples, Florida',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Foreign Asset Value',
            example: '400000',
        },
    },
    vehicles: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Vehicle Description',
            example: '2021 Honda CR-V',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Vehicle Value',
            example: '28000',
        },
    },
    digital: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Wallet / Account',
            example: 'Ledger wallet with Bitcoin and Ethereum',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Digital Asset Value',
            example: '15000',
        },
    },
    other: {
        description: {
            ...assetDescriptionBase,
            aiStep: 'assets',
            label: 'Description',
            example: 'Rolex Submariner or loan to Michael Doe',
        },
        value: {
            ...assetValueBase,
            aiStep: 'assets',
            label: 'Estimated Value',
            example: '20000',
        },
    },
} as const satisfies AssetCategoryHelpers;
