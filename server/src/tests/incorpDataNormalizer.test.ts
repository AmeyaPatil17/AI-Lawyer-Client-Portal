import { normalizeIncorpData } from '../services/incorpDataNormalizer';

describe('incorpDataNormalizer', () => {
    it('migrates legacy submittedAt and root clientNotes fields', () => {
        const normalized = normalizeIncorpData({
            submittedAt: '2026-03-01T12:00:00.000Z',
            clientNotes: 'Legacy notes',
        });

        expect(normalized.submissionDate).toBe('2026-03-01T12:00:00.000Z');
        expect(normalized.incorpNotes?.clientNotes).toBe('Legacy notes');
        expect((normalized as any).clientNotes).toBeUndefined();
    });

    it('assigns stable ids to nested incorporation collections when missing', () => {
        const normalized = normalizeIncorpData({
            structureOwnership: {
                shareClasses: [{ className: 'Common' }],
                initialShareholders: [{ fullName: 'Alice', shareClass: 'Common' }],
                directors: [{ fullName: 'Jane Director' }],
            },
            postIncorpOrg: {
                directorConsents: [{ directorName: 'Jane Director' }],
            },
            shareIssuance: {
                subscriptionAgreements: [{ subscriberName: 'Alice' }],
            },
            registrations: {
                municipalLicences: [{ municipality: 'Toronto', licenceType: 'Business' }],
            },
        });

        expect(normalized.structureOwnership?.shareClasses?.[0].id).toMatch(/^share_class_/);
        expect(normalized.structureOwnership?.initialShareholders?.[0].id).toMatch(/^shareholder_/);
        expect(normalized.structureOwnership?.directors?.[0].id).toMatch(/^director_/);
        expect(normalized.postIncorpOrg?.directorConsents?.[0].id).toMatch(/^director_consent_/);
        expect(normalized.shareIssuance?.subscriptionAgreements?.[0].id).toMatch(/^subscription_/);
        expect(normalized.registrations?.municipalLicences?.[0].id).toMatch(/^municipal_licence_/);
    });

    it('converts Date submissionDate values to ISO strings', () => {
        const normalized = normalizeIncorpData({
            submissionDate: new Date('2026-03-02T10:30:00.000Z'),
        });

        expect(normalized.submissionDate).toBe('2026-03-02T10:30:00.000Z');
    });
});
