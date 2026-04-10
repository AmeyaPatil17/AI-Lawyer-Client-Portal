/**
 * useWizardContext — Single source of truth for route → wizard context mapping.
 *
 * Previously this mapping was copy-pasted in 4 places:
 *   - AIGuide.vue (watch block)
 *   - AIGuide.vue (sendMessage)
 *   - useProactiveGuide.ts (checkLocalRules)
 *   - useStressTest.ts (CONTEXT_MAP)
 *
 * All callers now import from here.
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export type WizardContext =
    // Wills wizard contexts
    | 'profile'
    | 'family'
    | 'guardians'
    | 'executors'
    | 'beneficiaries'
    | 'assets'
    | 'poa'
    | 'funeral'
    | 'prior-wills'
    | 'review'
    // Incorporation wizard contexts
    | 'incorp-jurisdiction'
    | 'incorp-structure'
    | 'incorp-articles'
    | 'incorp-post-incorp'
    | 'incorp-shares'
    | 'incorp-records'
    | 'incorp-registrations'
    | 'incorp-banking'
    | 'incorp-review'
    | 'general';

/** Returns true when the path belongs to the incorporation wizard. */
export function isIncorporationPath(path: string): boolean {
    return path.startsWith('/incorporation') || path.includes('/incorp-');
}

/**
 * Pure function: resolves a WizardContext from any route path string.
 * Incorporation paths are checked first to prevent cross-wizard contamination.
 * Order matters — more specific keys (prior-wills) must come before shorter ones.
 */
export function resolveContext(path: string): WizardContext {
    // ── Incorporation wizard ─────────────────────────────────────────────
    if (path.includes('jurisdiction-name'))   return 'incorp-jurisdiction';
    if (path.includes('structure-ownership')) return 'incorp-structure';
    if (path.includes('/incorporation/articles')) return 'incorp-articles';
    if (path.includes('post-incorp'))         return 'incorp-post-incorp';
    if (path.includes('share-issuance'))      return 'incorp-shares';
    if (path.includes('corporate-records'))   return 'incorp-records';
    if (path.includes('registrations'))       return 'incorp-registrations';
    if (path.includes('banking-setup'))       return 'incorp-banking';
    if (path.includes('/incorporation/review')) return 'incorp-review';

    // ── Wills wizard ─────────────────────────────────────────────────────
    if (path.includes('prior-wills')) return 'prior-wills';
    if (path.includes('profile'))     return 'profile';
    if (path.includes('family'))      return 'family';
    if (path.includes('guardians'))   return 'guardians';
    if (path.includes('executors'))   return 'executors';
    if (path.includes('beneficiar'))  return 'beneficiaries';
    if (path.includes('assets'))      return 'assets';
    if (path.includes('poa'))         return 'poa';
    if (path.includes('funeral'))     return 'funeral';
    if (path.includes('review'))      return 'review';
    return 'general';
}

/**
 * Composable: returns a reactive `context` computed from the current route.
 */
export function useWizardContext() {
    const route = useRoute();
    const context = computed<WizardContext>(() => resolveContext(route.path));
    return { context };
}
