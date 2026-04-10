import { z } from 'zod';

// ============================================
// Section 1a: Pre-Incorporation — Jurisdiction & Name
// ============================================

export const NuansResultSchema = z.object({
    reportDate: z.string().optional(),
    hasConflicts: z.boolean().optional(),
    conflictDetails: z.string().optional(),
    fileReference: z.string().optional(),
}).partial();

export const PreIncorporationSchema = z.object({
    jurisdiction: z.enum(['obca', 'cbca']).optional(),
    nameType: z.enum(['named', 'numbered']).optional(),
    proposedName: z.string().optional(),
    legalEnding: z.enum(['Limited', 'Incorporated', 'Corporation', 'Ltd.', 'Inc.', 'Corp.']).optional(),
    bilingualName: z.string().optional(),       // CBCA only
    nuansReport: NuansResultSchema.optional(),
    nuansReviewed: z.boolean().optional(),
    nameConfirmed: z.boolean().optional(),
}).partial();

// ============================================
// Section 1b: Structure & Ownership Planning
// ============================================

export const ShareClassSchema = z.object({
    id: z.string().optional(),
    className: z.string(),
    votingRights: z.boolean().optional(),
    dividendRights: z.boolean().optional(),
    liquidationRights: z.boolean().optional(),
    redeemable: z.boolean().optional(),
    retractable: z.boolean().optional(),
    maxShares: z.number().optional(),           // 0 = unlimited
    parValue: z.number().optional(),
    description: z.string().optional(),
});

export const ShareholderSchema = z.object({
    id: z.string().optional(),
    fullName: z.string(),
    email: z.string().email().optional().or(z.literal('')),
    shareClass: z.string().optional(),
    shareClassId: z.string().optional(),
    numberOfShares: z.number().optional(),
    considerationType: z.enum(['cash', 'property', 'past_services']).optional(),
    considerationAmount: z.number().optional(),
});

export const DirectorSchema = z.object({
    id: z.string().optional(),
    fullName: z.string(),
    address: z.string().optional(),
    isCanadianResident: z.boolean().optional(),
    consentSigned: z.boolean().optional(),
    appointmentDate: z.string().optional(),
});

export const StructureOwnershipSchema = z.object({
    shareClasses: z.array(ShareClassSchema).optional().default([]),
    initialShareholders: z.array(ShareholderSchema).optional().default([]),
    directors: z.array(DirectorSchema).optional().default([]),
    registeredOfficeAddress: z.string().optional(),
    registeredOfficeProvince: z.string().optional(),
    recordsOfficeAddress: z.string().optional(),    // CBCA only
    fiscalYearEnd: z.string().optional(),            // e.g., "12-31"
    requiresUSA: z.boolean().optional(),
    requiresS85Rollover: z.boolean().optional(),
    isReportingIssuer: z.boolean().optional(),
}).partial();

// ============================================
// Section 2: Articles of Incorporation
// ============================================

export const ArticlesSchema = z.object({
    corporateName: z.string().optional(),
    corporateNameOverridden: z.boolean().optional(),
    registeredAddress: z.string().optional(),
    registeredAddressOverridden: z.boolean().optional(),
    directorCountType: z.enum(['fixed', 'range']).optional(),
    directorCountFixed: z.number().optional(),
    directorCountMin: z.number().optional(),
    directorCountMax: z.number().optional(),
    shareCapitalDescription: z.string().optional(),
    transferRestrictions: z.string().optional(),
    businessRestrictions: z.string().optional(),
    otherProvisions: z.string().optional(),
    filingMethod: z.enum(['obr', 'corporations_canada']).optional(),
    filingFeeAmount: z.number().optional(),
    filingFeePaid: z.boolean().optional(),
    certificateReceived: z.boolean().optional(),
    certificateDate: z.string().optional(),
    corporationNumber: z.string().optional(),
}).partial();

// ============================================
// Section 3a: Post-Incorporation Organization
// ============================================

export const PostIncorpOrgSchema = z.object({
    generalByLawDrafted: z.boolean().optional(),
    bankingByLawDrafted: z.boolean().optional(),
    bankingByLawSeparate: z.boolean().optional(),
    orgResolutionsPrepared: z.boolean().optional(),
    orgResolutionsDetails: z.string().optional(),
    shareholderResolutionPrepared: z.boolean().optional(),
    auditWaiverResolution: z.boolean().optional(),
    directorConsents: z.array(z.object({
        id: z.string().optional(),
        directorId: z.string().optional(),
        directorName: z.string(),
        consentSigned: z.boolean().optional(),
        consentDate: z.string().optional(),
    })).optional().default([]),
    officeResolutionPassed: z.boolean().optional(),
}).partial();

// ============================================
// Section 3b: Share Issuance
// ============================================

export const SubscriptionAgreementSchema = z.object({
    id: z.string().optional(),
    shareholderId: z.string().optional(),
    subscriberName: z.string().min(1),
    shareClass: z.string().optional(),
    shareClassId: z.string().optional(),
    numberOfShares: z.number().optional(),
    considerationType: z.enum(['cash', 'property', 'past_services']).optional(),
    considerationAmount: z.number().optional(),
    agreementExecuted: z.boolean().optional(),
    subscriberAddress: z.string().optional(),
});

export const ShareIssuanceSchema = z.object({
    subscriptionAgreements: z.array(SubscriptionAgreementSchema).optional().default([]),
    certificateType: z.enum(['certificated', 'uncertificated']).optional(),
    securitiesRegisterComplete: z.boolean().optional(),
    considerationCollected: z.boolean().optional(),
    s85DocumentsComplete: z.boolean().optional(),
}).partial();

// ============================================
// Section 4: Corporate Records & Registers
// ============================================

export const CorporateRecordsSchema = z.object({
    hasArticlesAndCertificate: z.boolean().optional(),
    hasByLaws: z.boolean().optional(),
    hasDirectorMinutes: z.boolean().optional(),
    hasShareholderMinutes: z.boolean().optional(),
    hasWrittenResolutions: z.boolean().optional(),
    hasSecuritiesRegister: z.boolean().optional(),
    hasDirectorRegister: z.boolean().optional(),
    hasOfficerRegister: z.boolean().optional(),
    hasISCRegister: z.boolean().optional(),             // Individuals with Significant Control
    hasUSACopy: z.boolean().optional(),
    recordsLocationConfirmed: z.boolean().optional(),
}).partial();

// ============================================
// Section 5: Post-Incorporation Registrations
// ============================================

export const RegistrationsSchema = z.object({
    craBusinessNumber: z.string().optional(),
    craRegistered: z.boolean().optional(),
    hstGstRegistered: z.boolean().optional(),
    hstGstNumber: z.string().optional(),
    payrollAccountRegistered: z.boolean().optional(),
    payrollAccountNumber: z.string().optional(),
    importExportRegistered: z.boolean().optional(),
    businessNameRegistered: z.boolean().optional(),      // OBCA — if operating under different name
    extraProvincialRegistered: z.boolean().optional(),   // CBCA — each province
    extraProvincialProvinces: z.array(z.string()).optional().default([]),
    wsibRegistered: z.boolean().optional(),
    wsibAccountNumber: z.string().optional(),
    ehtRegistered: z.boolean().optional(),
    municipalLicences: z.array(z.object({
        id: z.string().optional(),
        municipality: z.string(),
        licenceType: z.string().optional(),
        obtained: z.boolean().optional(),
    })).optional().default([]),
}).partial();

// ============================================
// Sections 6–8: Banking, Setup & Notes
// ============================================

export const BankingSetupSchema = z.object({
    bankAccountOpened: z.boolean().optional(),
    bankName: z.string().optional(),
    corporateSealObtained: z.boolean().optional(),
    shareCertificatesOrdered: z.boolean().optional(),
    minuteBookSetup: z.boolean().optional(),
    accountantEngaged: z.boolean().optional(),
    accountantName: z.string().optional(),
    insuranceObtained: z.boolean().optional(),
    insuranceTypes: z.array(z.string()).optional().default([]),
    trademarksRegistered: z.boolean().optional(),
    agreementsDrafted: z.boolean().optional(),
    agreementTypes: z.array(z.string()).optional().default([]),
}).partial();

export const AnnualComplianceSchema = z.object({
    obcaAnnualReturnDue: z.string().optional(),
    cbcaAnnualReturnDue: z.string().optional(),
    t2ReturnDue: z.string().optional(),
    agmScheduled: z.boolean().optional(),
    agmDate: z.string().optional(),
    registersUpdated: z.boolean().optional(),
    iscRegisterUpdated: z.boolean().optional(),
    recordsRetentionPolicy: z.boolean().optional(),
    fintracObligationsReviewed: z.boolean().optional(),
}).partial();

export const IncorpNotesSchema = z.object({
    clientNotes: z.string().optional(),
    lawyerNotes: z.string().optional(),
}).partial();

// ============================================
// Composite: Full Incorporation Data Schema
// ============================================

export const IncorporationDataSchema = z.object({
    preIncorporation: PreIncorporationSchema.optional(),
    structureOwnership: StructureOwnershipSchema.optional(),
    articles: ArticlesSchema.optional(),
    postIncorpOrg: PostIncorpOrgSchema.optional(),
    shareIssuance: ShareIssuanceSchema.optional(),
    corporateRecords: CorporateRecordsSchema.optional(),
    registrations: RegistrationsSchema.optional(),
    bankingSetup: BankingSetupSchema.optional(),
    annualCompliance: AnnualComplianceSchema.optional(),
    incorpNotes: IncorpNotesSchema.optional(),
    submitted: z.boolean().optional(),
    submissionDate: z.string().optional(),
    submittedAt: z.string().optional(),
    progress: z.number().optional(),
    unsureFlags: z.array(z.string()).optional(),
}).passthrough();

// ============================================
// Request Schema
// ============================================

export const UpdateIncorpRequestSchema = z.object({
    data: IncorporationDataSchema,
});

// Type exports
export type IncorporationData = z.infer<typeof IncorporationDataSchema>;
export type PreIncorporation = z.infer<typeof PreIncorporationSchema>;
export type StructureOwnership = z.infer<typeof StructureOwnershipSchema>;
export type Articles = z.infer<typeof ArticlesSchema>;
export type ShareIssuance = z.infer<typeof ShareIssuanceSchema>;
export type UpdateIncorpRequest = z.infer<typeof UpdateIncorpRequestSchema>;
