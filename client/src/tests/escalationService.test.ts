import { describe, it, expect } from 'vitest';
import { detectFlags } from '../services/escalationService';

describe('EscalationService (detectFlags)', () => {
    it('should return empty array for empty or missing data', () => {
        expect(detectFlags(null)).toEqual([]);
        expect(detectFlags({})).toEqual([]);
    });

    it('should detect BLENDED_FAMILY when married with children from previous parentage', () => {
        const data = {
            family: {
                maritalStatus: 'married',
                children: [
                    { parentage: 'current' },
                    { parentage: 'previous' }
                ]
            }
        };
        const flags = detectFlags(data);
        expect(flags).toHaveLength(1);
        expect(flags[0].code).toBe('BLENDED_FAMILY');
    });

    it('should not detect BLENDED_FAMILY if children are only current', () => {
        const data = {
            family: {
                maritalStatus: 'married',
                children: [{ parentage: 'current' }]
            }
        };
        expect(detectFlags(data)).toEqual([]);
    });

    it('should detect FOREIGN_WILL', () => {
        const data = { priorWills: { hasForeignWill: 'yes' } };
        const flags = detectFlags(data);
        expect(flags).toHaveLength(1);
        expect(flags[0].code).toBe('FOREIGN_WILL');
    });

    it('should detect BUSINESS_INTERESTS', () => {
        const data = { assets: { business_items: [{}] } };
        const flags = detectFlags(data);
        expect(flags).toHaveLength(1);
        expect(flags[0].code).toBe('BUSINESS_INTERESTS');
    });

    it('should detect BUSINESS_INTERESTS from canonical asset list data', () => {
        const data = {
            assets: {
                list: [{ type: 'Business', category: 'business', description: 'OpCo shares' }]
            }
        };
        const flags = detectFlags(data);
        expect(flags).toHaveLength(1);
        expect(flags[0].code).toBe('BUSINESS_INTERESTS');
    });

    it('should detect DISABLED_DEPENDANT (Henson Trust)', () => {
        const data = { family: { children: [{ isDisabled: true }] } };
        const flags = detectFlags(data);
        expect(flags).toHaveLength(1);
        expect(flags[0].code).toBe('DISABLED_DEPENDANT');
    });

    it('should detect PROFESSIONAL_EXECUTOR', () => {
        const data = { executors: { primary: { relationship: 'Professional' } } };
        const flags = detectFlags(data);
        expect(flags).toHaveLength(1);
        expect(flags[0].code).toBe('PROFESSIONAL_EXECUTOR');
    });

    it('should accumulate multiple flags concurrently', () => {
        const data = {
            priorWills: { hasForeignWill: 'yes' },
            executors: { primary: { relationship: 'Professional' } }
        };
        const flags = detectFlags(data);
        expect(flags).toHaveLength(2);
        const codes = flags.map(f => f.code);
        expect(codes).toContain('FOREIGN_WILL');
        expect(codes).toContain('PROFESSIONAL_EXECUTOR');
    });
});
