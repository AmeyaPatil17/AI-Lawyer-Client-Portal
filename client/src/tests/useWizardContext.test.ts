import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { resolveContext } from '../composables/useWizardContext';

// useWizardContext uses useRoute internally — unit-test only the pure resolveContext fn.
// The reactive wrapper (useWizardContext composable) is implicitly tested via
// AIGuide.vue and useProactiveGuide integration paths.

describe('resolveContext (useWizardContext)', () => {
    const cases: [string, string][] = [
        // Exact wizard step paths
        ['/wizard/profile',     'profile'],
        ['/wizard/family',      'family'],
        ['/wizard/guardians',   'guardians'],
        ['/wizard/executors',   'executors'],
        ['/wizard/beneficiaries', 'beneficiaries'],
        ['/wizard/assets',      'assets'],
        ['/wizard/poa',         'poa'],
        ['/wizard/funeral',     'funeral'],
        ['/wizard/prior-wills', 'prior-wills'],
        ['/wizard/review',      'review'],

        // prior-wills must resolve before other checks (contains a hyphen)
        ['/wizard/prior-wills/extra', 'prior-wills'],

        // Sub-paths still resolve correctly
        ['/wizard/beneficiaries/edit', 'beneficiaries'],

        // Non-wizard paths fall through to 'general'
        ['/', 'general'],
        ['/dashboard', 'general'],
        ['/login', 'general'],
        ['/lawyer/dashboard', 'general'],
        ['/home', 'general'],
        ['', 'general'],

        // Incorporation paths — no matching wizard, so 'general'
        ['/incorp-wizard/jurisdiction', 'general'],
    ];

    it.each(cases)('resolveContext("%s") → "%s"', (path, expected) => {
        expect(resolveContext(path)).toBe(expected);
    });

    it('returns "general" for completely unknown paths', () => {
        expect(resolveContext('/unknown/random/path')).toBe('general');
    });

    it('is case-sensitive — uppercase segments do not match', () => {
        // The mapping uses path.includes() which is case-sensitive
        expect(resolveContext('/wizard/PROFILE')).toBe('general');
        expect(resolveContext('/wizard/Profile')).toBe('general');
    });

    it('resolves "prior-wills" before shorter keywords like "profile"', () => {
        // "profile" substring appears inside "prior-wills"? No — but confirm order guards
        expect(resolveContext('/wizard/prior-wills')).toBe('prior-wills');
        // "prior" on its own doesn't accidentally match anything
        expect(resolveContext('/wizard/prior')).toBe('general');
    });
});
