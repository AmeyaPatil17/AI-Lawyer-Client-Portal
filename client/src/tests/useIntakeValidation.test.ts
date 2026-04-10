import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useIntakeValidation } from '../composables/useIntakeValidation';
import { setActivePinia, createPinia } from 'pinia';
import { useIntakeStore } from '../stores/intake';

describe('useIntakeValidation', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns warning string for incomplete profile', () => {
        const { validateStep } = useIntakeValidation();
        // Missing fullName
        expect(validateStep('personalProfile', { personalProfile: {} as any })).toContain('Full Name is required');
    });

    it('returns null for valid profile', () => {
        const { validateStep } = useIntakeValidation();
        expect(validateStep('personalProfile', { personalProfile: { fullName: 'Test', dateOfBirth: '1980-01-01', maritalStatus: 'single' } })).toBeNull();
    });

    it('returns warning for married missing spouse', () => {
        const { validateStep } = useIntakeValidation();
        expect(validateStep('family', { family: { maritalStatus: 'married', spouseName: '', children: [] } as any })).toContain('Spouse');
    });

    it('returns warning when triage says minors but no actual minor child is present', () => {
        const { validateStep, isStepComplete } = useIntakeValidation();
        const data = {
            triage: { hasMinors: true },
            family: {
                maritalStatus: 'single',
                children: [{ fullName: 'Adult Child', dateOfBirth: '1990-01-01' }],
            },
        } as any;

        expect(validateStep('family', data)).toContain('children under 18');
        expect(isStepComplete('family', data)).toBe(false);
    });

    it('validates executors (needs primary)', () => {
        const { validateStep, isStepComplete } = useIntakeValidation();
        expect(validateStep('executors', { executors: { primary: {} as any } as any })).toContain('Primary Executor is required');
        expect(validateStep('executors', { executors: { primary: { fullName: 'Ex1', relationship: '' } } as any })).toBeNull();
        expect(validateStep('executors', {
            personalProfile: { fullName: 'Alex Doe' },
            executors: { primary: { fullName: 'Alex Doe' } },
        } as any)).toContain('cannot appoint yourself');
        expect(validateStep('executors', {
            executors: {
                primary: { fullName: { name: 'Legacy Primary' } },
                alternates: [{ fullName: 'Legacy Alternate', relationship: 'Sibling' }],
            },
        } as any)).toBeNull();
        expect(isStepComplete('executors', {
            executors: {
                primary: { fullName: 'Ex1' },
                alternates: [{ fullName: 'Alt 1', relationship: '' }],
            },
        } as any)).toBe(false);
    });

    it('uses the same executor completion rule for duplicate names and missing specific compensation details', () => {
        const { validateStep, isStepComplete } = useIntakeValidation();
        const data = {
            personalProfile: { fullName: 'Alex Doe' },
            executors: {
                primary: { fullName: 'Jamie Doe' },
                alternates: [{ fullName: 'Jamie Doe', relationship: 'Sibling' }],
                compensation: 'specific',
                compensationDetails: '   ',
            },
        } as any;

        expect(validateStep('executors', data)).toContain('different person');
        expect(isStepComplete('executors', data)).toBe(false);
    });

    it('validates beneficiaries (must equal 100%)', () => {
        const { validateStep } = useIntakeValidation();
        expect(validateStep('beneficiaries', { beneficiaries: { beneficiaries: [{ share: 50, fullName: 'A', relationship: 'Friend' }] } })).toContain('Total shares must equal 100%');
        expect(validateStep('beneficiaries', { beneficiaries: { beneficiaries: [{ share: 100, fullName: 'A', relationship: 'Friend' }] } })).toBeNull();
    });

    it('requires either listed assets or an explicit empty-state acknowledgement', () => {
        const { validateStep } = useIntakeValidation();
        expect(validateStep('assets', { assets: {} as any })).toContain('confirm that you do not have significant assets');
        expect(validateStep('assets', { assets: { confirmedNoSignificantAssets: true, list: [] } as any })).toBeNull();
    });

    it('marks assets incomplete when a joint_other co-owner name is missing', () => {
        const { validateStep, isStepComplete } = useIntakeValidation();
        const data = {
            assets: {
                list: [
                    {
                        type: 'Bank',
                        category: 'bankAccounts',
                        description: 'Joint Savings',
                        ownership: 'joint_other',
                    },
                ],
            },
        } as any;

        expect(validateStep('assets', data)).toContain('co-owner name');
        expect(isStepComplete('assets', data)).toBe(false);
    });

    it('validates guardians (required if minor children exist)', () => {
        const { validateStep } = useIntakeValidation();
        expect(validateStep('guardians', { 
            family: { maritalStatus: '', children: [{ isMinor: true } as any] },
            guardians: { primary: {} as any, alternates: [] }
        })).toContain('Guardian is required');
        
        expect(validateStep('guardians', { 
            family: { maritalStatus: '', children: [] },
            guardians: {} as any
        })).toBeNull();
    });

    it('uses exact DOB comparison for guardians when only a DOB is present', () => {
        const { validateStep } = useIntakeValidation();
        expect(validateStep('guardians', {
            family: {
                maritalStatus: 'single',
                children: [{ fullName: 'Minor Child', dateOfBirth: '2008-12-31' }],
            },
            guardians: { primary: {} as any, alternates: [] }
        } as any)).toContain('Guardian is required');
    });

    it('validates POA using the hardened shared rules', () => {
        const { validateStep, isStepComplete } = useIntakeValidation();

        expect(validateStep('poa', {
            personalProfile: { fullName: 'Alex Client' },
            poa: {
                property: { primaryName: '', primaryRelationship: '', alternateName: '', alternateRelationship: '' },
                personalCare: { primaryName: '', primaryRelationship: '', alternateName: '', alternateRelationship: '', hasLivingWill: false, healthInstructions: '' },
            },
        } as any)).toContain('Primary Attorney for Property is required');

        expect(validateStep('poa', {
            poa: {
                property: { primaryName: { name: 'Legacy Property' }, primaryRelationship: 'Sibling', alternateName: '', alternateRelationship: '' },
                personalCare: { primaryName: { fullName: 'Legacy Care' }, primaryRelationship: 'Friend', alternateName: '', alternateRelationship: '', hasLivingWill: false, healthInstructions: '' },
            },
        } as any)).toBeNull();

        expect(validateStep('poa', {
            personalProfile: { fullName: 'Alex Client' },
            poa: {
                property: { primaryName: 'Alex Client', primaryRelationship: 'Sibling', alternateName: '', alternateRelationship: '' },
                personalCare: { primaryName: 'Morgan Care', primaryRelationship: 'Friend', alternateName: '', alternateRelationship: '', hasLivingWill: false, healthInstructions: '' },
            },
        } as any)).toContain('cannot appoint yourself');

        expect(validateStep('poa', {
            poa: {
                property: { primaryName: 'Pat Property', primaryRelationship: 'Sibling', alternateName: 'Pat Property', alternateRelationship: 'Sibling' },
                personalCare: { primaryName: 'Morgan Care', primaryRelationship: 'Friend', alternateName: '', alternateRelationship: '', hasLivingWill: false, healthInstructions: '' },
            },
        } as any)).toContain('must be different people');

        expect(validateStep('poa', {
            poa: {
                property: { primaryName: 'Pat Property', primaryRelationship: 'Sibling', alternateName: '', alternateRelationship: 'Sibling' },
                personalCare: { primaryName: 'Morgan Care', primaryRelationship: 'Friend', alternateName: '', alternateRelationship: '', hasLivingWill: false, healthInstructions: '' },
            },
        } as any)).toContain('name of your Property Alternate Attorney');

        expect(validateStep('poa', {
            poa: {
                property: { primaryName: 'Pat Property', primaryRelationship: 'Sibling', alternateName: '', alternateRelationship: '' },
                personalCare: { primaryName: 'Morgan Care', primaryRelationship: 'Friend', alternateName: '', alternateRelationship: '', hasLivingWill: true, healthInstructions: '   ' },
            },
        } as any)).toContain('health instructions');

        expect(isStepComplete('poa', {
            poa: {
                property: { primaryName: 'Pat Property', primaryRelationship: 'Sibling', alternateName: '', alternateRelationship: '' },
                personalCare: { primaryName: 'Morgan Care', primaryRelationship: 'Friend', alternateName: '', alternateRelationship: '', hasLivingWill: false, healthInstructions: '' },
            },
        } as any)).toBe(true);

        expect(isStepComplete('poa', {
            poa: {
                property: { primaryName: 'Pat Property', primaryRelationship: '', alternateName: '', alternateRelationship: '' },
                personalCare: { primaryName: 'Morgan Care', primaryRelationship: 'Friend', alternateName: '', alternateRelationship: '', hasLivingWill: false, healthInstructions: '' },
            },
        } as any)).toBe(false);
    });
    
    it('isStepComplete returns boolean based on completion criteria', () => {
        const { isStepComplete } = useIntakeValidation();
        expect(isStepComplete('personalProfile', { personalProfile: {} as any })).toBe(false);
        expect(isStepComplete('personalProfile', { personalProfile: { fullName: 'Test', dateOfBirth: '1980-01-01', maritalStatus: 'single' } })).toBe(true);
    });

    it('getStepStatus returns correct string state', () => {
        const store = useIntakeStore();
        const { getStepStatus } = useIntakeValidation();
        
        // pending -> actually warning because data object exists but fails validation
        expect(getStepStatus('personalProfile', { personalProfile: {} } as any)).toBe('warning');
        expect(getStepStatus('personalProfile', { personalProfile: { fullName: '' } } as any)).toBe('warning');

        // warning
        expect(getStepStatus('family', { family: { maritalStatus: 'married', spouseName: '' } } as any)).toBe('warning');

        // complete
        expect(getStepStatus('personalProfile', { personalProfile: { fullName: 'Test', dateOfBirth: '1980-01-01', maritalStatus: 'single' } } as any)).toBe('complete');
    });
});
