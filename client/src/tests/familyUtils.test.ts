import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    hasMinorChildrenInFamily,
    isMinorFromIsoDate,
    normalizeFamilyData,
    serializeFamilyForSave,
} from '../utils/family';

describe('family utils', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('matches the server minor-age boundary for a child whose 18th birthday has not yet occurred', () => {
        expect(isMinorFromIsoDate('2008-12-31')).toBe(true);
    });

    it('detects minor children from DOB even when isMinor is not persisted', () => {
        expect(hasMinorChildrenInFamily({
            children: [{ fullName: 'Minor Child', dateOfBirth: '2010-04-01' }],
        })).toBe(true);
    });

    it('keeps ui keys local to the client form and strips them on serialization', () => {
        const form = normalizeFamilyData({
            maritalStatus: 'married',
            spouseName: 'Jamie Doe',
            children: [{ fullName: 'Ava Doe', dateOfBirth: '2014-06-15', parentage: 'current' }],
        });

        expect(form.children[0].uiKey).toBeTruthy();

        const serialized = serializeFamilyForSave(form);
        expect((serialized.children[0] as any).uiKey).toBeUndefined();
        expect(serialized.children[0].fullName).toBe('Ava Doe');
    });
});
