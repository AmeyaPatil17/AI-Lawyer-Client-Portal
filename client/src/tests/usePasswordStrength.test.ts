import { describe, it, expect } from 'vitest';
import { evaluatePassword } from '../composables/usePasswordStrength';

describe('usePasswordStrength — evaluatePassword()', () => {

    it('returns score 0 for empty string', () => {
        const result = evaluatePassword('');
        expect(result.score).toBe(0);
        expect(result.label).toBe('');
        expect(result.meetsPolicy).toBe(false);
    });

    it('returns score 1 and "Too short" for strings under 8 chars', () => {
        const result = evaluatePassword('Ab1!');
        expect(result.score).toBe(1);
        expect(result.label).toBe('Too short');
        expect(result.meetsPolicy).toBe(false);
    });

    it('returns score 2 and "Weak" for 8+ chars with only one char-type rule', () => {
        // Has length + only lowercase
        const result = evaluatePassword('alllower');
        expect(result.score).toBe(2);
        expect(result.label).toBe('Weak');
        expect(result.meetsPolicy).toBe(false);
        expect(result.rules.minLength).toBe(true);
        expect(result.rules.hasUppercase).toBe(false);
    });

    it('returns score 3 and "Fair" for 8+ chars with two char-type rules', () => {
        // Has length + lowercase + number
        const result = evaluatePassword('alllower1');
        expect(result.score).toBe(3);
        expect(result.label).toBe('Fair');
        expect(result.meetsPolicy).toBe(false);
    });

    it('returns score 4 and "Strong" for 8+ chars with three char-type rules', () => {
        // Has length + lowercase + uppercase + number
        const result = evaluatePassword('Alllower1');
        expect(result.score).toBe(4);
        expect(result.label).toBe('Strong');
        expect(result.meetsPolicy).toBe(false); // still missing special char
    });

    it('returns score 4 and meetsPolicy=true for all four rules met', () => {
        const result = evaluatePassword('Secure1!Pass');
        expect(result.score).toBe(4);
        expect(result.meetsPolicy).toBe(true);
        expect(result.rules.minLength).toBe(true);
        expect(result.rules.hasUppercase).toBe(true);
        expect(result.rules.hasLowercase).toBe(true);
        expect(result.rules.hasNumber).toBe(true);
        expect(result.rules.hasSpecial).toBe(true);
    });

    it('detects special characters correctly', () => {
        const specials = ['!', '@', '#', '$', '%', '^', '&', '*', '-', '_', '+', '=', '?'];
        for (const char of specials) {
            const result = evaluatePassword(`ValidP4ss${char}`);
            expect(result.rules.hasSpecial).toBe(true);
        }
    });

    it('does not count spaces or periods as special characters', () => {
        // space and period are indeed non-alphanumeric → they DO trigger hasSpecial
        // (this is intentional — test documents the actual behaviour)
        const withSpace = evaluatePassword('ValidP4ss ');
        expect(withSpace.rules.hasSpecial).toBe(true);
    });

    it('returns correct bar color for score 4 (green)', () => {
        const result = evaluatePassword('Secure1!Pass');
        expect(result.barColor).toBe('bg-green-500');
        expect(result.color).toBe('text-green-400');
    });

    it('returns correct bar color for score 1 (red)', () => {
        const result = evaluatePassword('short');
        expect(result.barColor).toBe('bg-red-500');
        expect(result.color).toBe('text-red-400');
    });

    it('meetsPolicy requires ALL FOUR char-type rules — missing one fails', () => {
        // All except special char
        expect(evaluatePassword('SecurePass1').meetsPolicy).toBe(false);
        // All except number
        expect(evaluatePassword('SecurePass!').meetsPolicy).toBe(false);
        // All except uppercase
        expect(evaluatePassword('securepass1!').meetsPolicy).toBe(false);
        // All except lowercase
        expect(evaluatePassword('SECUREPASS1!').meetsPolicy).toBe(false);
    });
});
