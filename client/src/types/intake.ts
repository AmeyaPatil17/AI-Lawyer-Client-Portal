// PersonRef has been deprecated. All references to people are now stored as plain strings (their full names)
// to avoid dual-format handling complexity.

export interface Person {
    id?: string; // UUID for unique identification
    fullName: string; // The canonical name for THIS person record
    relationship?: string;
    email?: string;
    phone?: string;
    address?: string;
    isMinor?: boolean;
    isDisabled?: boolean;
}

export interface PersonalProfile {
    id?: string;
    fullName: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    email?: string;
    phone?: string;
    occupation?: string;
    employer?: string;
    citizenship?: string;
    maritalStatus?: string;
    marriageDate?: string;
    marriagePlace?: string;
    hasDomesticContract?: string;
    domesticContractDetails?: string;
    hasSupportObligations?: string;
    supportObligationDetails?: string;
    accountant?: string;
    advisor?: string;
}

export interface Child extends Person {
    parentage?: 'current' | 'previous';
    dateOfBirth?: string;
    placeOfBirth?: string;
    residesInCanada?: boolean;
    isMarried?: boolean;
    hasChildren?: boolean;
    hasSpendthriftIssues?: boolean;
}

export interface Family {
    maritalStatus: string;
    spouseName?: string;
    children: Child[];
    hasPets?: boolean;
}

export interface Executor {
    fullName: string;
    relationship?: string;
}

export interface Executors {
    primary?: Executor;
    alternates?: Executor[];
    decisionMode?: 'unanimous' | 'majority';
    compensation?: 'guidelines' | 'gratis' | 'specific';
    compensationDetails?: string;
}

export interface Guardian {
    id?: string;
    fullName: string;
    relationship: string;
}

export interface Guardians {
    primary: Guardian;
    alternates: Guardian[];
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
    hasBeneficiaryDesignation?: boolean;
}

export interface Assets {
    list: Asset[];
    liabilities?: Array<{ description: string; amount?: number }>;
    confirmedNoSignificantAssets?: boolean;
    hasShareholderAgreement?: boolean;
    totalEstimatedValue?: number;
}

export interface PowerOfAttorney {
    property?: {
        primaryName?: string;
        primaryRelationship?: string;
        alternateName?: string;
        alternateRelationship?: string;
        decisionMode?: string;
    };
    personalCare?: {
        primaryName?: string;
        primaryRelationship?: string;
        alternateName?: string;
        alternateRelationship?: string;
        hasLivingWill?: boolean;
        healthInstructions?: string;
    };
}

export interface Funeral {
    type?: 'burial' | 'cremation' | 'scientific' | 'other';
    burialDetails?: string;
    ashesDetails?: string;
    service?: 'formal' | 'informal' | 'none';
    serviceDetails?: string;
}

export interface PriorWills {
    hasPriorWill?: string;
    priorWillDate?: string;
    priorWillLocation?: string;
    hasForeignWill?: string;
    foreignWillDetails?: string;
}

export interface IntakeData {
    _id?: string;
    userId?: string;
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
    progress?: number;
    clientNotes?: string;
    unsureFlags?: string[];
}

export type StepStatus = 'complete' | 'warning' | 'pending';

export interface ValidationResult {
    isValid: boolean;
    message?: string;
    status: StepStatus;
}
