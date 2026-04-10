import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INCORP_AI_STEPS,
  incorpHelpers,
  type IncorpFieldHelperConfig,
} from '../utils/incorpFieldHelpers';

const INCORP_VIEW_SECTIONS = {
  'src/views/incorporation/JurisdictionName.vue': 'jurisdiction',
  'src/views/incorporation/StructureOwnership.vue': 'structureOwnership',
  'src/views/incorporation/ArticlesOfIncorp.vue': 'articles',
  'src/views/incorporation/PostIncorpOrg.vue': 'postIncorpOrg',
  'src/views/incorporation/ShareIssuance.vue': 'shareIssuance',
  'src/views/incorporation/CorporateRecords.vue': 'corporateRecords',
  'src/views/incorporation/Registrations.vue': 'registrations',
  'src/views/incorporation/BankingSetup.vue': 'bankingSetup',
} as const;

const getSource = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const getFieldHelperKeys = (source: string) => [
  ...source.matchAll(/<FieldHelper\b[^>]*v-bind="h\.([A-Za-z0-9_]+)"/g),
].map((match) => match[1]);

const collectHelpers = (value: unknown): IncorpFieldHelperConfig[] => {
  if (!value || typeof value !== 'object') return [];

  return Object.values(value as Record<string, unknown>).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    if ('example' in (entry as Record<string, unknown>) || 'why' in (entry as Record<string, unknown>) || 'askAi' in (entry as Record<string, unknown>) || 'legal' in (entry as Record<string, unknown>)) {
      return [entry as IncorpFieldHelperConfig];
    }

    return collectHelpers(entry);
  });
};

describe('incorpFieldHelpers registry parity', () => {
  it('backs all live incorporation FieldHelper usages through canonical registry entries', () => {
    for (const [file, section] of Object.entries(INCORP_VIEW_SECTIONS)) {
      const source = getSource(file);
      const helperKeys = getFieldHelperKeys(source);

      expect(helperKeys.length).toBeGreaterThan(0);

      for (const key of helperKeys) {
        expect(key in incorpHelpers[section]).toBe(true);
      }
    }
  });

  it('keeps all incorporation Ask AI steps on the canonical incorporation step union', () => {
    const knownSteps = new Set(INCORP_AI_STEPS);
    const helperSteps = collectHelpers(incorpHelpers)
      .map((helper) => helper.askAi?.step)
      .filter((step): step is (typeof INCORP_AI_STEPS)[number] => Boolean(step));

    expect(helperSteps.length).toBeGreaterThan(0);

    for (const step of helperSteps) {
      expect(knownSteps.has(step)).toBe(true);
    }
  });

  it('keeps helper copy aligned with live control formats and option sets', () => {
    expect(incorpHelpers.registrations.craBusinessNumber.example).toBe('123456789');
    expect(incorpHelpers.structureOwnership.fiscalYearEnd.example).toContain('MM-DD');
    expect(incorpHelpers.shareIssuance.certificateType.example?.toLowerCase()).toContain('certificated');
    expect(incorpHelpers.shareIssuance.certificateType.example?.toLowerCase()).toContain('uncertificated');
    expect(incorpHelpers.shareIssuance.certificateType.example).not.toContain('PDF');
    expect(incorpHelpers.bankingSetup.bankNameOther.example).toBeTruthy();
  });

  it('covers the split and newly-added live incorporation helper fields', () => {
    expect(incorpHelpers.structureOwnership).toHaveProperty('directorFullName');
    expect(incorpHelpers.structureOwnership).toHaveProperty('directorAddress');
    expect(incorpHelpers.structureOwnership).toHaveProperty('registeredOfficeProvince');
    expect(incorpHelpers.structureOwnership).toHaveProperty('recordsOfficeAddress');
    expect(incorpHelpers.structureOwnership).not.toHaveProperty('directorNameAddress');

    expect(incorpHelpers.registrations).toHaveProperty('extraProvincialProvinces');
    expect(incorpHelpers.registrations).toHaveProperty('wsibAccountNumber');

    expect(incorpHelpers.bankingSetup).toHaveProperty('bankName');
    expect(incorpHelpers.bankingSetup).toHaveProperty('bankNameOther');
    expect(incorpHelpers.bankingSetup).toHaveProperty('insuranceTypes');
    expect(incorpHelpers.bankingSetup).toHaveProperty('agreementTypes');

    const structureSource = getSource('src/views/incorporation/StructureOwnership.vue');
    expect(structureSource).toContain('h.directorFullName');
    expect(structureSource).toContain('h.directorAddress');
    expect(structureSource).toContain('h.registeredOfficeProvince');
    expect(structureSource).toContain('h.recordsOfficeAddress');
    expect(structureSource).not.toContain('h.directorNameAddress');

    const registrationsSource = getSource('src/views/incorporation/Registrations.vue');
    expect(registrationsSource).toContain('h.extraProvincialProvinces');
    expect(registrationsSource).toContain('h.wsibAccountNumber');

    const bankingSource = getSource('src/views/incorporation/BankingSetup.vue');
    expect(bankingSource).toContain('h.bankName');
    expect(bankingSource).toContain('h.bankNameOther');
    expect(bankingSource).toContain('h.insuranceTypes');
    expect(bankingSource).toContain('h.agreementTypes');
  });
});
