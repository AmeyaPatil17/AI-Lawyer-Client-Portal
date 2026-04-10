export interface Person {
    fullName: string;
    relationship?: string;
    email?: string;
    phone?: string;
    address?: string;
    isMinor?: boolean;
    isDisabled?: boolean; // For trust considerations
}

export interface PersonalProfile {
    fullName: string;
    dateOfBirth?: string;
    address?: string;
    email?: string;
    phone?: string;
    occupation?: string;
    citizenship?: string;
    maritalStatus?: string;
}

export interface Family {
    maritalStatus: string; // Loosen for now to avoid enum mismatches with UI strings
    spouseName?: string;
    children?: any[]; // Loosen for now
    hasPets?: boolean;
}

export interface Executor extends Person {
    isPrimary?: boolean;
    isAlternate?: boolean;
}

export interface Executors {
    primary?: Executor;
    alternates?: Executor[];
    decisionMode?: 'unanimous' | 'majority';
    compensation?: 'guidelines' | 'gratis' | 'specific';
    compensationDetails?: string;
}

export interface Beneficiary {
    fullName: string;
    relationship: string;
    share?: number;
    specificGifts?: string;
    isCharity?: boolean;
}

export interface Beneficiaries {
    beneficiaries: Beneficiary[];
    residueDistribution?: string;
    trustConditions?: any;
    disasterClause?: string;
}

export interface Asset {
    type: 'RealEstate' | 'Bank' | 'Investment' | 'Business' | 'Digital' | 'Other';
    category?: 'realEstate' | 'bankAccounts' | 'investments' | 'business' | 'foreignAssets' | 'vehicles' | 'digital' | 'other';
    description: string;
    value?: number;
    ownership?: 'sole' | 'joint' | 'joint_other' | 'tic';
    jointOwner?: string;
    hasBeneficiaryDesignation?: boolean; // e.g., RRSP/TFSA usually does
}

export interface Assets {
    list: Asset[];
    liabilities?: Array<{ description: string; amount?: number }>;
    confirmedNoSignificantAssets?: boolean;
    hasShareholderAgreement?: boolean;
    totalEstimatedValue?: number;
}

// —— Newly typed sections (previously `any`) —————————————————————————————————————————

export interface GuardianPerson {
    fullName?: string;
    relationship?: string;
    address?: string;
}

export interface Guardians {
    primary?: GuardianPerson;
    alternate?: GuardianPerson;
    notes?: string;
}

export interface AttorneyDesignation {
    primaryName?: string;
    primaryRelationship?: string;
    alternateName?: string;
    alternateRelationship?: string;
    decisionMode?: string;
}

export interface PowerOfAttorney {
    property?: AttorneyDesignation;
    personalCare?: AttorneyDesignation & {
        hasLivingWill?: boolean;
        healthInstructions?: string;
    };
}

export interface Funeral {
    preference?: 'burial' | 'cremation' | 'other' | '';
    details?: string;
    location?: string;
    organDonation?: boolean;
}

export interface PriorWills {
    hasPriorWill?: 'yes' | 'no' | '';
    priorWillDate?: string;
    priorWillLocation?: string;
    hasForeignWill?: 'yes' | 'no' | '';
    foreignWillJurisdiction?: string;
    revokeAllPrior?: boolean;
}

// —— Flags and Warnings —————————————————————————————————————————————————

export interface IntakeFlag {
    type: 'hard' | 'soft';
    message: string;
    code: string;
}

export interface LogicWarning {
    code: string;
    message: string;
    severity: 'warning' | 'info';
}

export interface IntakeNote {
    text: string;
    author: string;
    createdAt: Date;
}

// Main Intake Data Interface
export interface IntakeData {
    personalProfile?: PersonalProfile;
    family?: Family;
    executors?: Executors;
    beneficiaries?: Beneficiaries;
    assets?: Assets;
    guardians?: Guardians;
    trusts?: any;
    poa?: PowerOfAttorney;
    funeral?: Funeral;
    priorWills?: PriorWills;
    submitted?: boolean;
    submissionDate?: Date | string;
    clientNotes?: string;
}

export type StepStatus = 'complete' | 'warning' | 'pending';

export interface ValidationResult {
    isValid: boolean;
    message?: string; // Consumer-facing error message
    status: StepStatus;
}
