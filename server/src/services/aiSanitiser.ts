/**
 * aiSanitiser.ts
 *
 * Prompt injection defence — applies defence-in-depth to all user-supplied strings
 * before they enter any Gemini prompt template.
 *
 * Strategy: STRIP (not reject) injection patterns, preserving legitimate content.
 * Logs full original text for forensic audit trail.
 */

import { logger } from './logger';

// ── Known wizard step names ───────────────────────────────────────────────────
const ALLOWED_STEPS = new Set([
    'profile', 'personalProfile', 'family', 'executors', 'beneficiaries',
    'assets', 'guardians', 'poa', 'funeral', 'prior-wills', 'priorWills',
    'review', 'general', 'unknown', 'legal_phrasing', 'dashboard_insight',
    'estate_summary', 'incorporation', 'jurisdiction', 'directors',
    'shareholders', 'shares', 'company', 'preIncorporation',
    'structureOwnership', 'articles', 'postIncorpOrg', 'shareIssuance',
    'corporateRecords', 'registrations', 'bankingSetup',
]);

// ── Known flag codes from the rules engine ────────────────────────────────────
const ALLOWED_FLAG_CODES = new Set([
    'SPOUSAL_OMISSION', 'MISSING_GUARDIAN', 'MINOR_BENEFICIARY',
    'DISABLED_BENEFICIARY', 'FOREIGN_ASSETS', 'Foreign Assets',
    'EXECUTOR_CONFLICT', 'DISINHERIT', 'BUSINESS_EXEC',
    'UNDERAGE_EXECUTOR', 'SINGLE_BENEFICIARY', 'MISSING_ALTERNATE_EXECUTOR',
]);

// ── Injection patterns to strip ───────────────────────────────────────────────
// Ordered by specificity (more specific patterns first)
const INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /new\s+instructions?\s*:/gi,
    /system\s*:\s*/gi,
    /\bASSISTANT\s*:/g,
    /\bUSER\s*:/g,
    /\bHUMAN\s*:/g,
    /\bAI\s*:/g,
    /\[SYSTEM\]/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /<\|system\|>/gi,
    /---+\s*(END|STOP|RESET|NEW)\s*---+/gi,
    /```\s*(system|prompt|instructions?)\s*```/gi,
    /\bforget\s+(everything|all)\s+(above|previous|prior)/gi,
    /\bdisregard\s+(all\s+)?(previous|prior|above)/gi,
    /\byou\s+are\s+now\s+(a|an)\s+/gi,
    /\bact\s+as\s+(if\s+you\s+are|a|an)\s+/gi,
    /\bpretend\s+(you\s+are|to\s+be)\s+/gi,
    /\breveal\s+(the\s+)?(full|entire|complete|raw)\s+(context|data|prompt|system)/gi,
    /\breturn\s+(the\s+)?(full|entire|complete|raw)\s+(context|data|prompt|json)/gi,
    /\bprint\s+(the\s+)?(full|entire|complete|raw)\s+(context|data|prompt|json)/gi,
    /\boutput\s+(the\s+)?(full|entire|complete|raw)\s+(context|data|prompt|json)/gi,
    /\bdump\s+(the\s+)?(full|entire|complete|raw)\s+(context|data|prompt|json)/gi,
];

// ── Special characters that could break structured prompt delimiters ───────────
// We escape XML-style tags used in the structured prompt format
const DELIMITER_ESCAPES: [RegExp, string][] = [
    [/<context>/gi,       '[context]'],
    [/<\/context>/gi,     '[/context]'],
    [/<current_step>/gi,  '[current_step]'],
    [/<\/current_step>/gi,'[/current_step]'],
    [/<system>/gi,        '[system]'],
    [/<\/system>/gi,      '[/system]'],
];

// ── Control characters (non-printable) ───────────────────────────────────────
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * sanitiseUserInput — Strips injection patterns from user-provided text.
 *
 * @param text        Raw user input string
 * @param maxLength   Maximum allowed character length (default 2000 for chat, increase for assets)
 * @param source      Label for audit log (e.g. 'chat.message', 'legal_phrasing.context')
 * @returns Sanitised string safe to embed in prompt templates
 */
export function sanitiseUserInput(
    text: string,
    maxLength = 2000,
    source = 'unknown'
): string {
    if (!text || typeof text !== 'string') return '';

    let sanitised = text;
    let didSanitise = false;

    // 1. Remove control characters
    const afterControl = sanitised.replace(CONTROL_CHAR_PATTERN, '');
    if (afterControl !== sanitised) didSanitise = true;
    sanitised = afterControl;

    // 2. Escape structured prompt XML delimiters
    for (const [pattern, replacement] of DELIMITER_ESCAPES) {
        const afterEscape = sanitised.replace(pattern, replacement);
        if (afterEscape !== sanitised) didSanitise = true;
        sanitised = afterEscape;
    }

    // 3. Strip injection patterns
    for (const pattern of INJECTION_PATTERNS) {
        const afterStrip = sanitised.replace(pattern, '[removed]');
        if (afterStrip !== sanitised) didSanitise = true;
        sanitised = afterStrip;
    }

    // 4. Length cap
    if (sanitised.length > maxLength) {
        sanitised = sanitised.slice(0, maxLength) + '…';
        didSanitise = true;
    }

    // 5. Audit log — full original text per user decision
    if (didSanitise) {
        logger.warn({
            source,
            original: text,
            sanitised,
            flags: detectFlags(text),
        }, '[AI_SANITISER] Prompt injection pattern detected and stripped');
    }

    return sanitised;
}

/**
 * sanitiseStepName — Allowlist validation for wizard step names.
 * Rejects anything not in the known step set, returns 'general' as safe fallback.
 */
export function sanitiseStepName(step: string, source = 'unknown'): string {
    if (!step || typeof step !== 'string') return 'general';

    const trimmed = step.trim();

    if (!ALLOWED_STEPS.has(trimmed)) {
        logger.warn({
            source,
            rejectedStep: trimmed,
        }, '[AI_SANITISER] Unknown step name rejected — falling back to general');
        return 'general';
    }

    return trimmed;
}

/**
 * sanitiseFlagCode — Allowlist validation for rules engine flag codes.
 * Returns the input if known, otherwise a safe fallback label.
 */
export function sanitiseFlagCode(code: string, source = 'unknown'): string {
    if (!code || typeof code !== 'string') return 'UNKNOWN_FLAG';

    const trimmed = code.trim();

    if (!ALLOWED_FLAG_CODES.has(trimmed)) {
        logger.warn({
            source,
            rejectedCode: trimmed,
        }, '[AI_SANITISER] Unknown flag code rejected');
        return 'UNKNOWN_FLAG';
    }

    return trimmed;
}

// ── Internal: detect which injection types triggered ─────────────────────────
function detectFlags(text: string): string[] {
    const flags: string[] = [];
    if (/ignore\s+(all\s+)?previous/gi.test(text))  flags.push('override_attempt');
    if (/new\s+instructions?\s*:/gi.test(text))      flags.push('new_instructions');
    if (/system\s*:\s*/gi.test(text))                flags.push('system_role_injection');
    if (/reveal|dump|output|return.*full.*context/gi.test(text)) flags.push('data_extraction');
    if (/act\s+as|pretend\s+to\s+be|you\s+are\s+now/gi.test(text)) flags.push('persona_hijack');
    return flags;
}
