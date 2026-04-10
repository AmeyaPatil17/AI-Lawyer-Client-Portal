// Client-side type definitions for incorporation data
// These mirror the server Zod schemas for TypeScript safety

export interface ShareClass {
    id?: string;
    className: string;
    votingRights?: boolean;
    dividendRights?: boolean;
    liquidationRights?: boolean;
    redeemable?: boolean;
    retractable?: boolean;
    maxShares?: number;
    parValue?: number;
    description?: string;
}

export interface Shareholder {
    id?: string;
    fullName: string;
    email?: string;
    shareClass?: string;
    shareClassId?: string;
    numberOfShares?: number;
    considerationType?: 'cash' | 'property' | 'past_services';
    considerationAmount?: number;
}

export interface Director {
    id?: string;
    fullName: string;
    address?: string;
    isCanadianResident?: boolean;
    consentSigned?: boolean;
    appointmentDate?: string;
}

export interface PreIncorporation {
    jurisdiction?: 'obca' | 'cbca';
    nameType?: 'named' | 'numbered';
    proposedName?: string;
    legalEnding?: string;
    bilingualName?: string;
    nuansReport?: {
        reportDate?: string;
        hasConflicts?: boolean;
        conflictDetails?: string;
        fileReference?: string;
    };
    nuansReviewed?: boolean;
    nameConfirmed?: boolean;
}

export interface StructureOwnership {
    shareClasses?: ShareClass[];
    initialShareholders?: Shareholder[];
    directors?: Director[];
    registeredOfficeAddress?: string;
    registeredOfficeProvince?: string;
    recordsOfficeAddress?: string;
    fiscalYearEnd?: string;
    requiresUSA?: boolean;
    requiresS85Rollover?: boolean;
    isReportingIssuer?: boolean;
}

export interface Articles {
    corporateName?: string;
    corporateNameOverridden?: boolean;
    registeredAddress?: string;
    registeredAddressOverridden?: boolean;
    directorCountType?: 'fixed' | 'range';
    directorCountFixed?: number;
    directorCountMin?: number;
    directorCountMax?: number;
    shareCapitalDescription?: string;
    transferRestrictions?: string;
    businessRestrictions?: string;
    otherProvisions?: string;
    filingMethod?: 'obr' | 'corporations_canada';
    filingFeeAmount?: number;
    filingFeePaid?: boolean;
    certificateReceived?: boolean;
    certificateDate?: string;
    corporationNumber?: string;
}

export interface PostIncorpOrg {
    generalByLawDrafted?: boolean;
    bankingByLawDrafted?: boolean;
    bankingByLawSeparate?: boolean;
    orgResolutionsPrepared?: boolean;
    orgResolutionsDetails?: string;
    shareholderResolutionPrepared?: boolean;
    auditWaiverResolution?: boolean;
    directorConsents?: Array<{
        id?: string;
        directorId?: string;
        directorName: string;
        consentSigned?: boolean;
        consentDate?: string;
    }>;
    officeResolutionPassed?: boolean;
}

export interface ShareIssuance {
    subscriptionAgreements?: Array<{
        id?: string;
        shareholderId?: string;
        subscriberName: string;
        shareClass?: string;
        shareClassId?: string;
        numberOfShares?: number;
        considerationType?: 'cash' | 'property' | 'past_services';
        considerationAmount?: number;
        agreementExecuted?: boolean;
        subscriberAddress?: string;
    }>;
    certificateType?: 'certificated' | 'uncertificated';
    securitiesRegisterComplete?: boolean;
    considerationCollected?: boolean;
    s85DocumentsComplete?: boolean;
}

export interface CorporateRecords {
    hasArticlesAndCertificate?: boolean;
    hasByLaws?: boolean;
    hasDirectorMinutes?: boolean;
    hasShareholderMinutes?: boolean;
    hasWrittenResolutions?: boolean;
    hasSecuritiesRegister?: boolean;
    hasDirectorRegister?: boolean;
    hasOfficerRegister?: boolean;
    hasISCRegister?: boolean;
    hasUSACopy?: boolean;
    recordsLocationConfirmed?: boolean;
}

export interface Registrations {
    craBusinessNumber?: string;
    craRegistered?: boolean;
    hstGstRegistered?: boolean;
    hstGstNumber?: string;
    payrollAccountRegistered?: boolean;
    payrollAccountNumber?: string;
    importExportRegistered?: boolean;
    businessNameRegistered?: boolean;
    extraProvincialRegistered?: boolean;
    extraProvincialProvinces?: string[];
    wsibRegistered?: boolean;
    wsibAccountNumber?: string;
    ehtRegistered?: boolean;
    municipalLicences?: Array<{
        id?: string;
        municipality: string;
        licenceType?: string;
        obtained?: boolean;
    }>;
}

export interface IncorpNotes {
    clientNotes?: string;
    lawyerNotes?: string;
}

export interface BankingSetup {
    bankAccountOpened?: boolean;
    bankName?: string;
    corporateSealObtained?: boolean;
    shareCertificatesOrdered?: boolean;
    minuteBookSetup?: boolean;
    accountantEngaged?: boolean;
    accountantName?: string;
    insuranceObtained?: boolean;
    insuranceTypes?: string[];
    trademarksRegistered?: boolean;
    agreementsDrafted?: boolean;
    agreementTypes?: string[];
}

export interface IncorporationData {
    preIncorporation?: PreIncorporation;
    structureOwnership?: StructureOwnership;
    articles?: Articles;
    postIncorpOrg?: PostIncorpOrg;
    shareIssuance?: ShareIssuance;
    corporateRecords?: CorporateRecords;
    registrations?: Registrations;
    bankingSetup?: BankingSetup;
    incorpNotes?: IncorpNotes;
    submitted?: boolean;
    submissionDate?: string;
    progress?: number;
    unsureFlags?: string[];
    [key: string]: any;
}
