import { computed, ref, watch } from 'vue';

// ============================================
// Types
// ============================================

export interface PasswordStrengthResult {
    score: number;          // 0–4, where 4 = strongest
    label: string;          // human-readable label
    color: string;          // Tailwind text color class
    barColor: string;       // Tailwind background color class
    meetsPolicy: boolean;   // true only when score === 4 (all four rules met)
    rules: {
        minLength: boolean;
        hasUppercase: boolean;
        hasLowercase: boolean;
        hasNumber: boolean;
        hasSpecial: boolean;
    };
}

// ============================================
// Pure function (also exported for testing)
// ============================================

export function evaluatePassword(password: string): PasswordStrengthResult {
    const rules = {
        minLength:    password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber:    /[0-9]/.test(password),
        hasSpecial:   /[^A-Za-z0-9]/.test(password),
    };

    // Policy requires all four character type rules (length is a prerequisite)
    const policyRules = [rules.hasUppercase, rules.hasLowercase, rules.hasNumber, rules.hasSpecial];
    const passedPolicy = policyRules.filter(Boolean).length;

    // Score: 0 (empty) → 1 (too short) → 2–4 (meets length + 1/2/3/4 char-type rules)
    let score = 0;
    if (password.length === 0) {
        score = 0;
    } else if (!rules.minLength) {
        score = 1;
    } else {
        score = 1 + passedPolicy; // 1 base + up to 4 → max 5, cap at 4
        score = Math.min(score, 4);
    }

    const LABELS = ['', 'Too short', 'Weak', 'Fair', 'Strong', 'Very strong'];
    const COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400'];
    const BAR_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

    return {
        score,
        label: LABELS[score] ?? '',
        color: COLORS[score] ?? '',
        barColor: BAR_COLORS[score] ?? '',
        meetsPolicy: rules.minLength && passedPolicy === 4,
        rules,
    };
}

// ============================================
// Composable
// ============================================

export function usePasswordStrength(passwordRef: { value: string }) {
    const result = computed<PasswordStrengthResult>(() => evaluatePassword(passwordRef.value));
    return { strength: result };
}
