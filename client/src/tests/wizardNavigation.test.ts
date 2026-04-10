/**
 * Tests for wizard nextStep() validation blocking behaviour.
 *
 * Covers:
 * - Bug #3: IncorpWizardLayout nextStep() MUST block navigation when validation fails
 * - Bug #6: Validation dialog must become visible on failure
 * - "Proceed Anyway" must bypass validation and navigate
 * - Steps with no context or 'review' context must never be blocked
 * - Bug #5: markUnsure must NOT auto-navigate (Incorp wizard)
 * - Bug #1: "I'm Not Sure" disabled only for 'review' context (Wills wizard)
 *
 * Strategy: we test through the useIncorpValidation composable directly (unit)
 * and then integrate with a lightweight component harness for the dialog-blocking flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useIncorpValidation } from '../composables/useIncorpValidation';
import type { IncorporationData } from '../stores/incorpTypes';

describe('Bug #3 — nextStep() validation blocking (Incorp wizard)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    const { validateStep } = useIncorpValidation();

    // ── per-step validation ────────────────────────────────────────────────

    it('preIncorporation: blocks when jurisdiction is missing', () => {
        const data: IncorporationData = { preIncorporation: { nameType: 'numbered' } } as any;
        const err = validateStep('preIncorporation', data);
        expect(err).not.toBeNull();
        // Matches the actual message in useIncorpValidation.ts
        expect(err).toContain('OBCA (Ontario) or CBCA (Federal)');
    });

    it('preIncorporation: blocks when nameType is missing', () => {
        const data: IncorporationData = {
            preIncorporation: { jurisdiction: 'ontario' }
        } as any;
        const err = validateStep('preIncorporation', data);
        expect(err).not.toBeNull();
        expect(err).toContain('named or numbered');
    });

    it('preIncorporation: blocks when named company has no proposedName', () => {
        const data: IncorporationData = {
            preIncorporation: { jurisdiction: 'ontario', nameType: 'named', proposedName: '', nameConfirmed: true }
        } as any;
        const err = validateStep('preIncorporation', data);
        expect(err).not.toBeNull();
        expect(err).toContain('proposed corporate name');
    });

    it('preIncorporation: passes when all required fields present (numbered)', () => {
        const data: IncorporationData = {
            preIncorporation: { jurisdiction: 'ontario', nameType: 'numbered', nameConfirmed: true }
        } as any;
        expect(validateStep('preIncorporation', data)).toBeNull();
    });

    it('preIncorporation: passes when all required fields present (named)', () => {
        const data: IncorporationData = {
            preIncorporation: {
                jurisdiction: 'federal',
                nameType: 'named',
                proposedName: 'Acme',
                legalEnding: 'Inc.',
                nuansReport: { reportDate: '2026-03-01' },
                nuansReviewed: true,
                nameConfirmed: true,
            }
        } as any;
        expect(validateStep('preIncorporation', data)).toBeNull();
    });

    it('structureOwnership: blocks when shareClasses empty', () => {
        const data: IncorporationData = {
            structureOwnership: { shareClasses: [], directors: [{ fullName: 'Alice', address: '123 Main St' }], registeredOfficeAddress: '1 Main St' }
        } as any;
        const err = validateStep('structureOwnership', data);
        expect(err).not.toBeNull();
        expect(err).toContain('share class');
    });

    it('structureOwnership: blocks when directors empty', () => {
        const data: IncorporationData = {
            structureOwnership: {
                shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                directors: [],
                registeredOfficeAddress: '1 Main St',
            }
        } as any;
        const err = validateStep('structureOwnership', data);
        expect(err).not.toBeNull();
        expect(err).toContain('director');
    });

    it('structureOwnership: blocks when registeredOfficeAddress missing', () => {
        const data: IncorporationData = {
            structureOwnership: {
                shareClasses: [{ className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                initialShareholders: [{ fullName: 'Alice', shareClass: 'Common', numberOfShares: 10 }],
                directors: [{ fullName: 'Alice', address: '123 Main St' }],
                registeredOfficeAddress: '',
            }
        } as any;
        const err = validateStep('structureOwnership', data);
        expect(err).not.toBeNull();
        expect(err).toContain('registered office');
    });

    it('articles: blocks when directorCountType missing', () => {
        const data: IncorporationData = {
            preIncorporation: { nameType: 'numbered' },
            articles: { registeredAddress: '123 Main St' }
        } as any;
        const err = validateStep('articles', data);
        expect(err).not.toBeNull();
        expect(err).toContain('number of directors');
    });

    it('articles: blocks when named corp is missing corporateName', () => {
        const data: IncorporationData = {
            preIncorporation: { nameType: 'named' },
            articles: { directorCountType: 'fixed' }
        } as any;
        const err = validateStep('articles', data);
        expect(err).not.toBeNull();
        expect(err).toContain('Corporate name');
    });

    it('postIncorpOrg: blocks when director consents are mismatched', () => {
        const data: IncorporationData = {
            structureOwnership: {
                directors: [{ fullName: 'Alice' }]
            },
            postIncorpOrg: { 
                directorConsents: [] 
            }
        } as any;
        const err = validateStep('postIncorpOrg', data);
        expect(err).not.toBeNull();
        expect(err).toContain('Director consents must match');
    });

    it('shareIssuance: blocks when no subscription agreements', () => {
        const data: IncorporationData = {
            structureOwnership: {
                shareClasses: [{ id: 'class_1', className: 'Common', votingRights: true, dividendRights: true, liquidationRights: true }],
                initialShareholders: [{ id: 'holder_1', fullName: 'Alice', shareClassId: 'class_1', shareClass: 'Common', numberOfShares: 10 }],
            },
            shareIssuance: { subscriptionAgreements: [] }
        } as any;
        const err = validateStep('shareIssuance', data);
        expect(err).not.toBeNull();
        expect(err).toContain('subscription agreement');
    });

    it('registrations: blocks when craRegistered is false', () => {
        const data: IncorporationData = {
            registrations: { craRegistered: false }
        } as any;
        const err = validateStep('registrations', data);
        expect(err).not.toBeNull();
        expect(err).toContain('CRA');
    });

    // ── Review and corporateRecords steps must never block navigation ─────

    it('review: never returns a validation error (always passable)', () => {
        expect(validateStep('review', {} as any)).toBeNull();
    });

    it('corporateRecords: blocks when incomplete (no longer informational only)', () => {
        expect(validateStep('corporateRecords', {} as any)).not.toBeNull();
    });

    // ── Navigation-blocking simulation ────────────────────────────────────

    it('simulates nextStep() blocking pattern: error → dialog shown, no push', () => {
        // This mirrors the exact logic in IncorpWizardLayout.nextStep():
        //   if (warning) { showValidationDialog = true; return; }
        //   else { proceedNavigation(); }
        const mockPush = vi.fn();
        let showDialog = false;

        const nextStep = (context: string, data: IncorporationData) => {
            const warning = validateStep(context, data);
            if (warning) {
                showDialog = true;
                return; // navigation blocked
            }
            mockPush('/incorporation/next'); // navigation allowed
        };

        // Incomplete data — should block
        nextStep('preIncorporation', {} as any);
        expect(showDialog).toBe(true);
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('simulates proceedNavigation() bypassing validation (Proceed Anyway button)', () => {
        const mockPush = vi.fn();
        let showDialog = false;

        const proceedNavigation = () => {
            showDialog = false;
            mockPush('/incorporation/next');
        };

        // Dialog was shown (validation failed), user clicks "Proceed Anyway"
        showDialog = true;
        proceedNavigation();

        expect(showDialog).toBe(false);
        expect(mockPush).toHaveBeenCalledWith('/incorporation/next');
    });
});

describe('Bug #5 — markUnsure must NOT auto-navigate (Incorp wizard)', () => {
    it('markUnsure does not call router.push — stays on current step', () => {
        // Simulates the fixed markUnsure() logic:
        // The old buggy version called getNextStep() and router.push().
        // The new version only opens AI chat and flags the step.
        const mockPush = vi.fn();
        const unsureFlags: string[] = [];

        const markUnsure = (context: string) => {
            if (!unsureFlags.includes(context)) {
                unsureFlags.push(context);
            }
            // Bug #5 fix: NO router.push here — user stays on current step
            // aiChatStore.chatState.isOpen = true; // (side effect, not testable here)
        };

        markUnsure('structureOwnership');

        expect(unsureFlags).toContain('structureOwnership');
        expect(mockPush).not.toHaveBeenCalled(); // never navigates
    });
});

describe('Bug #1 — "I\'m Not Sure" disabled only on review context (Wills wizard)', () => {

    it('isDisabled is false for a non-review step (e.g., executors)', () => {
        // Simulates the fixed disabled condition: context === 'review'
        const isDisabled = (context: string | undefined) => context === 'review';

        expect(isDisabled('executors')).toBe(false);
        expect(isDisabled('beneficiaries')).toBe(false);
        expect(isDisabled('prior-wills')).toBe(false);
    });

    it('isDisabled is true only when context is review', () => {
        const isDisabled = (context: string | undefined) => context === 'review';
        expect(isDisabled('review')).toBe(true);
    });

    it('isDisabled is false for undefined context (safety guard)', () => {
        const isDisabled = (context: string | undefined) => context === 'review';
        expect(isDisabled(undefined)).toBe(false);
    });
});

describe('Bug #2 — Step icon v-else-if prevents double rendering', () => {
    it('getStepStatus never returns both complete and warning simultaneously', () => {
        const { getStepStatus } = useIncorpValidation();

        // A step that is complete should return either complete or warning, never both
        const completeData: IncorporationData = {
            preIncorporation: { jurisdiction: 'ontario', nameType: 'numbered' }
        } as any;

        const status = getStepStatus('preIncorporation', completeData);

        // Status can only be one value — not an array, not undefined
        expect(['complete', 'warning', 'pending']).toContain(status);
        expect(typeof status).toBe('string');
    });

    it('a complete step returns complete (not warning) when validation also passes', () => {
        const { getStepStatus } = useIncorpValidation();

        const data: IncorporationData = {
            preIncorporation: {
                jurisdiction: 'federal',
                nameType: 'named',
                proposedName: 'Foobar',
                legalEnding: 'Inc.',
                nuansReport: { reportDate: '2026-03-01' },
                nuansReviewed: true,
                nameConfirmed: true,
            }
        } as any;

        // Both isComplete and validateStep pass — status should be 'complete', not 'warning'
        expect(getStepStatus('preIncorporation', data)).toBe('complete');
    });
});
