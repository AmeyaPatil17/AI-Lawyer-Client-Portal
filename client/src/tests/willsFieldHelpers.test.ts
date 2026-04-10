import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_CATEGORIES } from '../utils/assetList';
import { willsAssetCategoryHelpers, willsHelpers } from '../utils/willsFieldHelpers';

const WIZARD_VIEW_FILES = [
  'src/views/wizard/PersonalProfile.vue',
  'src/views/wizard/Family.vue',
  'src/views/wizard/Guardians.vue',
  'src/views/wizard/Executors.vue',
  'src/views/wizard/Beneficiaries.vue',
  'src/views/wizard/Assets.vue',
  'src/views/wizard/PowerOfAttorney.vue',
  'src/views/wizard/Funeral.vue',
  'src/views/wizard/PriorWills.vue',
];

const getSource = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const getQuestionHelperTags = (source: string) => source.match(/<QuestionHelper\b[\s\S]*?>/g) ?? [];

describe('willsFieldHelpers registry parity', () => {
  it('backs all wills QuestionHelper usages through canonical v-bind registry entries', () => {
    for (const file of WIZARD_VIEW_FILES) {
      const source = getSource(file);
      const tags = getQuestionHelperTags(source);

      expect(tags.length).toBeGreaterThan(0);
      expect(source).not.toContain('fieldContext=');

      for (const tag of tags) {
        expect(tag).toContain('v-bind=');
      }
    }
  });

  it('keeps helper copy aligned with supported control values and formats', () => {
    expect(willsHelpers.personalProfile.maritalStatus.example).toContain('Married');
    expect(willsHelpers.personalProfile.maritalStatus.example).toContain('Common-law');
    expect(willsHelpers.assets.ownership.example).toContain('Joint with Other');
    expect(willsHelpers.funeral.type.example).toContain('Scientific Use');
    expect(willsHelpers.priorWills.priorWillDate.example).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(willsAssetCategoryHelpers.realEstate.value.whyItMatters).toContain('first $50,000 Estate Administration Tax exemption');
  });

  it('keeps typed asset-category coverage and removes stale generic asset helper exports', () => {
    expect(Object.keys(willsAssetCategoryHelpers).sort()).toEqual(Object.keys(ASSET_CATEGORIES).sort());
    expect('description' in willsHelpers.assets).toBe(false);
    expect('value' in willsHelpers.assets).toBe(false);

    for (const category of Object.keys(ASSET_CATEGORIES) as Array<keyof typeof ASSET_CATEGORIES>) {
      expect(willsAssetCategoryHelpers[category].description.aiStep).toBe('assets');
      expect(willsAssetCategoryHelpers[category].value.aiStep).toBe('assets');
      expect(willsAssetCategoryHelpers[category].description.label.length).toBeGreaterThan(0);
      expect(willsAssetCategoryHelpers[category].value.label.length).toBeGreaterThan(0);
    }
  });

  it('uses corrected helper keys and removes dead executor decisionMode metadata', () => {
    expect(willsHelpers.personalProfile).toHaveProperty('supportObligationDetails');
    expect(willsHelpers.personalProfile).not.toHaveProperty('supportObligations');
    expect(willsHelpers.beneficiaries).toHaveProperty('legacyRelationship');
    expect(willsHelpers.executors).toHaveProperty('primaryFullName');
    expect(willsHelpers.executors).not.toHaveProperty('decisionMode');
  });

  it('marks grouped controls explicitly and keeps grouped views free of duplicate helper labels', () => {
    expect(willsHelpers.funeral.type.helperKind).toBe('group');
    expect(willsHelpers.funeral.serviceType.helperKind).toBe('group');
    expect(willsHelpers.priorWills.hasPriorWill.helperKind).toBe('group');
    expect(willsHelpers.priorWills.hasForeignWill.helperKind).toBe('group');

    const funeralSource = getSource('src/views/wizard/Funeral.vue');
    expect(funeralSource).toContain(':id="h.type.inputId"');
    expect(funeralSource).toContain(':id="h.serviceType.inputId"');
    expect(funeralSource).not.toContain('<label class="block text-sm font-medium mb-2">Instructions for Ashes</label>');
    expect(funeralSource).not.toContain('<label class="block text-sm font-medium mb-2">Cemetery / Plot Details</label>');
    expect(funeralSource).not.toContain('<label class="block text-sm font-medium mb-2">Specific Service Requests</label>');

    const priorWillsSource = getSource('src/views/wizard/PriorWills.vue');
    expect(priorWillsSource).toContain(':id="h.hasPriorWill.inputId"');
    expect(priorWillsSource).toContain(':id="h.hasForeignWill.inputId"');
    expect(priorWillsSource).not.toContain('<label class="block text-sm font-medium mb-2">Approximate Date</label>');
    expect(priorWillsSource).not.toContain('<label class="block text-sm font-medium mb-2">Location of Original</label>');
    expect(priorWillsSource).not.toContain('<label class="block text-sm font-medium mb-2">Details</label>');
  });
});
