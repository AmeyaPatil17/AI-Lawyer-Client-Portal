import {
    scopeToStep,
    summariseForInsight,
    scopeToFlag,
    compactStringify,
    summariseIncorpForDashboardInsight,
    summariseIncorpForDashboardSummary,
} from '../services/aiContextSummariser';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fullIntakeData: any = {
    personalProfile: { fullName: 'Alice Smith', dob: '1980-01-01', sin: '123-456-789' },
    family: {
        maritalStatus: 'Married',
        spouseName: 'Bob Smith',
        children: [
            { fullName: 'Charlie Smith', age: 8, isMinor: true, parentage: 'biological' },
            { fullName: 'Dana Smith',    age: 22, isMinor: false, parentage: 'biological' },
        ],
    },
    executors: { primary: { fullName: 'Eve Jones' }, alternates: [] },
    beneficiaries: {
        beneficiaries: [
            { fullName: 'Bob Smith',     share: 60 },
            { fullName: 'Charlie Smith', share: 40 },
        ],
        contingency: 'per stirpes',
    },
    assets: { list: [{ type: 'RealEstate', description: '123 Maple St', value: 800000 }] },
    guardians: { primary: { fullName: 'Frank Miller' } },
    poa:       { property: { primaryName: 'Eve Jones' }, personalCare: { primaryName: 'Eve Jones' } },
    funeral:   { wishes: 'Cremation' },
    priorWills:{ hasPriorWill: 'yes', hasForeignWill: 'no' },
};

const fullIncorpData: any = {
    preIncorporation: {
        jurisdiction: 'obca',
        nameType: 'named',
        proposedName: 'Blue Heron Consulting',
    },
    structureOwnership: {
        shareClasses: [{ className: 'Common', votingRights: true }],
        directors: [{ fullName: 'Jane Director', address: '123 King St' }],
        registeredOfficeAddress: '100 King St W',
        registeredOfficeProvince: 'ON',
    },
    articles: {
        corporateName: 'Blue Heron Consulting Inc.',
        filingMethod: 'obr',
    },
    postIncorpOrg: {
        generalByLawDrafted: true,
    },
    shareIssuance: {
        subscriptionAgreements: [{ subscriberName: 'Jane Founder', numberOfShares: 100 }],
    },
    corporateRecords: {
        hasArticlesAndCertificate: true,
    },
    registrations: {
        craRegistered: true,
        craBusinessNumber: '123456789',
    },
    bankingSetup: {
        bankAccountOpened: true,
        bankName: 'RBC Royal Bank',
    },
};

// ── scopeToStep ───────────────────────────────────────────────────────────────

describe('scopeToStep', () => {
    it('returns only the executors section + family summary for "executors" step', () => {
        const result = scopeToStep(fullIntakeData, 'executors') as any;
        expect(result.executors).toBeDefined();
        expect(result._familySummary).toBeDefined();
        // Must NOT include raw PII from other sections
        expect(result.personalProfile).toBeUndefined();
        expect(result.assets).toBeUndefined();
        expect(result.beneficiaries).toBeUndefined();
    });

    it('returns only beneficiaries section + family summary for "beneficiaries" step', () => {
        const result = scopeToStep(fullIntakeData, 'beneficiaries') as any;
        expect(result.beneficiaries).toBeDefined();
        expect(result._familySummary).toBeDefined();
        expect(result.executors).toBeUndefined();
    });

    it('maps "profile" step alias to personalProfile section', () => {
        const result = scopeToStep(fullIntakeData, 'profile') as any;
        expect(result.personalProfile).toBeDefined();
    });

    it('maps "personalProfile" step alias to personalProfile section', () => {
        const result = scopeToStep(fullIntakeData, 'personalProfile') as any;
        expect(result.personalProfile).toBeDefined();
    });

    it('returns compact full data for unknown step (not in registry)', () => {
        const result = scopeToStep(fullIntakeData, 'some_unknown_step') as any;
        // Full data returned but pruned — all top-level keys present
        expect(result.personalProfile).toBeDefined();
        expect(result.family).toBeDefined();
    });

    it('family summary contains correct child/minor counts', () => {
        const result = scopeToStep(fullIntakeData, 'executors') as any;
        expect(result._familySummary.childCount).toBe(2);
        expect(result._familySummary.minorCount).toBe(1);
        expect(result._familySummary.hasSpouse).toBe(true);
    });

    it('scopes canonical incorporation steps to their matching incorporation sections', () => {
        const result = scopeToStep(fullIncorpData, 'structureOwnership') as any;
        expect(result.structureOwnership).toBeDefined();
        expect(result.preIncorporation).toBeUndefined();
        expect(result.articles).toBeUndefined();
    });

    it('scopes incorporation registration questions without falling back to full context', () => {
        const result = scopeToStep(fullIncorpData, 'registrations') as any;
        expect(result.registrations).toBeDefined();
        expect(result.bankingSetup).toBeUndefined();
        expect(result.structureOwnership).toBeUndefined();
    });
});

// ── summariseForInsight ───────────────────────────────────────────────────────

describe('summariseForInsight', () => {
    it('returns boolean completion flags for each section', () => {
        const result = summariseForInsight(fullIntakeData) as any;
        expect(result.profile).toBe(true);
        expect(result.family).toBe(true);
        expect(result.executors).toBe(true);
        expect(result.beneficiaries).toBe(true);
        expect(result.assets).toBe(true);
        expect(result.guardians).toBe(true);
        expect(result.poa).toBe(true);
    });

    it('returns false for incomplete sections', () => {
        const partial: any = { personalProfile: { fullName: 'Alice' } };
        const result = summariseForInsight(partial) as any;
        expect(result.profile).toBe(true);
        expect(result.family).toBe(false);
        expect(result.executors).toBe(false);
        expect(result.beneficiaries).toBe(false);
    });

    it('does NOT include raw PII fields (fullName, SIN, DOB)', () => {
        const result = summariseForInsight(fullIntakeData) as any;
        const json = JSON.stringify(result);
        expect(json).not.toContain('Alice Smith');
        expect(json).not.toContain('123-456-789');
        expect(json).not.toContain('1980-01-01');
    });

    it('includes correct counts and aggregate facts', () => {
        const result = summariseForInsight(fullIntakeData) as any;
        expect(result.childCount).toBe(2);
        expect(result.minorCount).toBe(1);
        expect(result.beneficiaryCount).toBe(2);
        expect(result.assetCount).toBe(1);
        expect(result.hasForeignAssets).toBe(false);
    });
});

// ── scopeToFlag ───────────────────────────────────────────────────────────────

describe('summariseIncorpForDashboardInsight', () => {
    it('returns compact incorporation dashboard context with counts and next step', () => {
        const result = summariseIncorpForDashboardInsight(fullIncorpData, 'structureOwnership') as any;
        expect(result.jurisdiction).toBe('obca');
        expect(result.companyMode).toBe('named');
        expect(result.nextMissingSection).toBe('structureOwnership');
        expect(result.counts).toEqual({
            shareClasses: 1,
            shareholders: 0,
            directors: 1,
        });
        expect(result.sectionCompletion.preIncorporation).toBe(false);
        expect(result.shareClasses[0]).toEqual(expect.objectContaining({
            name: 'Common',
        }));
    });
});

describe('summariseIncorpForDashboardSummary', () => {
    it('returns incorporation summary context with names, class overview, and status', () => {
        const populated = {
            ...fullIncorpData,
            preIncorporation: {
                ...fullIncorpData.preIncorporation,
                legalEnding: 'Inc.',
            },
            structureOwnership: {
                ...fullIncorpData.structureOwnership,
                initialShareholders: [
                    { fullName: 'Jane Founder', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 100 },
                ],
            },
        };
        const result = summariseIncorpForDashboardSummary(populated as any, 'reviewing', 'shareIssuance') as any;
        expect(result.companyName).toBe('Blue Heron Consulting Inc.');
        expect(result.status).toBe('reviewing');
        expect(result.nextMissingSection).toBe('shareIssuance');
        expect(result.directorNames).toEqual(['Jane Director']);
        expect(result.shareholderNames).toEqual(['Jane Founder']);
        expect(result.shareClassOverview[0]).toEqual(expect.objectContaining({
            name: 'Common',
        }));
    });
});

describe('scopeToFlag', () => {
    it('SPOUSAL_OMISSION returns family + beneficiaries sections', () => {
        const result = scopeToFlag(fullIntakeData, 'SPOUSAL_OMISSION') as any;
        expect(result.family).toBeDefined();
        expect(result.beneficiaries).toBeDefined();
        expect(result.assets).toBeUndefined();
        expect(result.executors).toBeUndefined();
    });

    it('MISSING_GUARDIAN returns family + guardians sections', () => {
        const result = scopeToFlag(fullIntakeData, 'MISSING_GUARDIAN') as any;
        expect(result.family).toBeDefined();
        expect(result.guardians).toBeDefined();
        expect(result.beneficiaries).toBeUndefined();
    });

    it('FOREIGN_ASSETS returns assets + priorWills sections', () => {
        const result = scopeToFlag(fullIntakeData, 'FOREIGN_ASSETS') as any;
        expect(result.assets).toBeDefined();
        expect(result.priorWills).toBeDefined();
    });

    it('unknown flag returns compact full data', () => {
        const result = scopeToFlag(fullIntakeData, 'COMPLETELY_UNKNOWN_FLAG') as any;
        expect(result.personalProfile).toBeDefined();
        expect(result.family).toBeDefined();
    });
});

// ── compactStringify ──────────────────────────────────────────────────────────

describe('compactStringify', () => {
    it('produces valid JSON', () => {
        const result = compactStringify(fullIntakeData);
        expect(() => JSON.parse(result)).not.toThrow();
    });

    it('does not include whitespace indentation', () => {
        const result = compactStringify(fullIntakeData);
        expect(result).not.toMatch(/\n {2}/); // no 2-space indented newlines
    });

    it('omits null and undefined values', () => {
        const data = { name: 'Alice', nickname: null, age: undefined, city: 'Toronto' };
        const result = compactStringify(data);
        const parsed = JSON.parse(result);
        expect(parsed.name).toBe('Alice');
        expect(parsed.city).toBe('Toronto');
        expect(parsed.nickname).toBeUndefined();
        expect(parsed.age).toBeUndefined();
    });

    it('omits empty arrays', () => {
        const data = { name: 'Alice', children: [], city: 'Ottawa' };
        const result = compactStringify(data);
        const parsed = JSON.parse(result);
        expect(parsed.children).toBeUndefined();
    });

    it('produces output shorter than JSON.stringify with null:2', () => {
        const pretty = JSON.stringify(fullIntakeData, null, 2);
        const compact = compactStringify(fullIntakeData);
        expect(compact.length).toBeLessThan(pretty.length);
    });
});
