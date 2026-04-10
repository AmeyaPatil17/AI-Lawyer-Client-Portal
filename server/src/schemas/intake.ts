import { z } from 'zod';

// ============================================
// Base Schemas
// ============================================

export const PersonSchema = z.object({
    fullName: z.string().min(1, 'Name is required'),
    relationship: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    isMinor: z.boolean().optional(),
    isDisabled: z.boolean().optional(),
});

// ============================================
// Section Schemas
// ============================================

export const PersonalProfileSchema = z.object({
    fullName: z.string().min(1, 'Full name is required'),
    dateOfBirth: z.string().optional(),
    placeOfBirth: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    occupation: z.string().optional(),
    employer: z.string().optional(),
    citizenship: z.string().optional(),
    maritalStatus: z.string().optional(),
    marriageDate: z.string().optional(),
    marriagePlace: z.string().optional(),
    hasDomesticContract: z.enum(['yes', 'no']).optional().or(z.literal('')),
    domesticContractDetails: z.string().optional(),
    hasSupportObligations: z.enum(['yes', 'no']).optional().or(z.literal('')),
    supportObligationDetails: z.string().optional(),
    accountant: z.string().optional(),
    advisor: z.string().optional(),
});

export const ChildSchema = PersonSchema.extend({
    parentage: z.enum(['current', 'previous']).optional(),
    dateOfBirth: z.string().optional(),
    placeOfBirth: z.string().optional(),
    residesInCanada: z.boolean().optional(),
    isMarried: z.boolean().optional(),
    hasChildren: z.boolean().optional(),
    hasSpendthriftIssues: z.boolean().optional(),
});

export const FamilySchema = z.object({
    maritalStatus: z.string(),
    spouseName: z.string().optional(),
    children: z.array(ChildSchema).optional().default([]),
    hasPets: z.boolean().optional(),
});

export const ExecutorSchema = z.object({
    fullName: z.string().min(1),
    relationship: z.string().optional(),
});

export const ExecutorsSchema = z.object({
    primary: ExecutorSchema.optional(),
    alternates: z.array(ExecutorSchema).optional().default([]),
    decisionMode: z.enum(['unanimous', 'majority']).optional(),
    compensation: z.enum(['guidelines', 'gratis', 'specific']).optional(),
    compensationDetails: z.string().optional(),
});

export const GuardianSchema = z.object({
    fullName: z.string().min(1),
    relationship: z.string().optional(),
});

export const GuardiansSchema = z.object({
    primary: GuardianSchema.optional(),
    alternates: z.array(GuardianSchema).optional().default([]),
});

export const BeneficiarySchema = z.object({
    fullName: z.string().min(1),
    relationship: z.string().optional(),
    share: z.number().min(0).max(100).optional(),
    specificGifts: z.string().optional(),
    isCharity: z.boolean().optional(),
});

export const BeneficiariesSchema = z.object({
    beneficiaries: z.array(BeneficiarySchema).optional().default([]),
    residueDistribution: z.string().optional(),
    trustConditions: z.any().optional(),
    disasterClause: z.string().optional(),
});

export const AssetSchema = z.object({
    type: z.enum(['RealEstate', 'Bank', 'Investment', 'Business', 'Digital', 'Other']),
    category: z.enum(['realEstate', 'bankAccounts', 'investments', 'business', 'foreignAssets', 'vehicles', 'digital', 'other']).optional(),
    description: z.string(),
    value: z.number().optional(),
    ownership: z.enum(['sole', 'joint', 'joint_other', 'tic']).optional(),
    jointOwner: z.string().optional(),
    hasBeneficiaryDesignation: z.boolean().optional(),
});

export const AssetsSchema = z.object({
    list: z.array(AssetSchema).optional().default([]),
    liabilities: z.array(z.object({
        description: z.string(),
        amount: z.number().finite().nonnegative().optional(),
    })).optional(),
    confirmedNoSignificantAssets: z.boolean().optional(),
    hasShareholderAgreement: z.boolean().optional(),
    totalEstimatedValue: z.number().optional(),
});

export const PowerOfAttorneySchema = z.object({
    property: z.object({
        primaryName: z.string().optional(),
        primaryRelationship: z.string().optional(),
        alternateName: z.string().optional(),
        alternateRelationship: z.string().optional(),
        decisionMode: z.string().optional(),
    }).optional(),
    personalCare: z.object({
        primaryName: z.string().optional(),
        primaryRelationship: z.string().optional(),
        alternateName: z.string().optional(),
        alternateRelationship: z.string().optional(),
        hasLivingWill: z.boolean().optional(),
        healthInstructions: z.string().optional(),
    }).optional(),
});

export const FuneralSchema = z.object({
    type: z.enum(['burial', 'cremation', 'scientific', 'other']).optional(),
    burialDetails: z.string().optional(),
    ashesDetails: z.string().optional(),
    service: z.enum(['formal', 'informal', 'none']).optional(),
    serviceDetails: z.string().optional(),
});

export const PriorWillsSchema = z.object({
    hasPriorWill: z.enum(['yes', 'no']).optional().or(z.literal('')),
    priorWillDate: z.string().optional(),
    priorWillLocation: z.string().optional(),
    hasForeignWill: z.enum(['yes', 'no']).optional().or(z.literal('')),
    foreignWillDetails: z.string().optional(),
});

// ============================================
// Main Intake Schema
// ============================================

export const IntakeDataSchema = z.object({
    personalProfile: PersonalProfileSchema.optional(),
    family: FamilySchema.optional(),
    executors: ExecutorsSchema.optional(),
    beneficiaries: BeneficiariesSchema.optional(),
    assets: AssetsSchema.optional(),
    guardians: GuardiansSchema.optional(),
    trusts: z.any().optional(),
    poa: PowerOfAttorneySchema.optional(),
    funeral: FuneralSchema.optional(),
    priorWills: PriorWillsSchema.optional(),
    submitted: z.boolean().optional(),
    submissionDate: z.string().optional(),
    clientNotes: z.string().optional(),
    progress: z.number().optional(),
    unsureFlags: z.array(z.string()).optional(),
}).strip(); // Strip unknown fields to prevent data pollution

// ============================================
// Request Schemas
// ============================================

export const UpdateIntakeRequestSchema = z.object({
    data: z.record(z.string(), z.any()).optional(),
    status: z.enum(['started', 'submitted', 'reviewing', 'completed']).optional(),
    expectedVersion: z.number().int().nonnegative().optional(),
}).refine((value) => value.data !== undefined || value.status !== undefined, {
    message: 'Either data or status is required',
});

export const ChatRequestSchema = z.object({
    message: z.string().min(1, 'Message is required'),
    context: z.string().optional(),
});

export const NoteRequestSchema = z.object({
    text: z.string().min(1, 'Note text is required'),
});

// Type exports
export type IntakeData = z.infer<typeof IntakeDataSchema>;
export type UpdateIntakeRequest = z.infer<typeof UpdateIntakeRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
