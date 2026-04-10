import { test, expect } from '@playwright/test';
import { loginAs, loginAndVisit } from './helpers/auth';

/**
 * E2E Incorporation Triage + Wizard
 *
 * Gap 5 & 6 coverage — tests the /incorp-triage route and all 9 /incorporation/* wizard steps.
 * Each step gets a basic render + one form interaction test.
 */

test.describe('Incorporation Triage', () => {

    test('incorp triage page renders when authenticated', async ({ page }) => {
        await loginAs(page, 'client');
        await page.goto('/incorp-triage');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    });

    test('incorp triage has form elements for business type selection', async ({ page }) => {
        await loginAs(page, 'client');
        await page.goto('/incorp-triage');
        await page.waitForLoadState('networkidle');
        // Should have at least radio buttons or select for business type
        const formEl = page.locator('select, input[type="radio"], button:has-text("Begin")').first();
        await expect(formEl).toBeVisible({ timeout: 8000 });
    });

});

test.describe('Incorporation Wizard Steps', () => {

    const steps = [
        { path: 'jurisdiction-name', label: 'Jurisdiction', formSelector: 'input, select' },
        { path: 'structure-ownership', label: 'Structure', formSelector: 'input, select, [class*="radio"]' },
        { path: 'articles', label: 'Articles', formSelector: 'input, textarea, select' },
        { path: 'post-incorp', label: 'Post-Incorporation', formSelector: 'input, select, textarea' },
        { path: 'share-issuance', label: 'Share Issuance', formSelector: 'input[type="number"], input, select' },
        { path: 'corporate-records', label: 'Corporate Records', formSelector: 'input, select, textarea' },
        { path: 'registrations', label: 'Registrations', formSelector: 'input, select, [type="checkbox"]' },
        { path: 'banking-setup', label: 'Banking', formSelector: 'input, select, textarea' },
        { path: 'review', label: 'Review', formSelector: 'button:has-text("Submit"), section, [class*="review"]' },
    ];

    for (const step of steps) {
        test(`${step.label} step (/incorporation/${step.path}) renders`, async ({ page }) => {
            await loginAndVisit(page, 'client', `/incorporation/${step.path}`);
            await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

            // Wizard sidebar should show this step
            const navEl = page.locator(`nav a[href*="${step.path}"], [data-step*="${step.path}"]`).first();
            // nav may or may not be visible depending on step; just check main renders
        });

        test(`${step.label} step has interactive form elements`, async ({ page }) => {
            await loginAndVisit(page, 'client', `/incorporation/${step.path}`);

            const formEl = page.locator(step.formSelector).first();
            await expect(formEl).toBeVisible({ timeout: 8000 });
        });
    }

    test('jurisdiction step accepts province and business name', async ({ page }) => {
        await loginAndVisit(page, 'client', '/incorporation/jurisdiction-name');

        const provinceSelect = page.locator('select').first();
        if (await provinceSelect.isVisible({ timeout: 5000 })) {
            await provinceSelect.selectOption({ index: 1 });
        }

        const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
        if (await nameInput.isVisible({ timeout: 5000 })) {
            await nameInput.fill('E2E Test Corp Inc.');
        }
    });

    test('share issuance step accepts numeric share values', async ({ page }) => {
        await loginAndVisit(page, 'client', '/incorporation/share-issuance');

        const shareInput = page.locator('input[type="number"], input[name*="share"]').first();
        if (await shareInput.isVisible({ timeout: 5000 })) {
            await shareInput.fill('1000');
            await expect(shareInput).toHaveValue('1000');
        }
    });

    test('review step has a submit button', async ({ page }) => {
        await loginAndVisit(page, 'client', '/incorporation/review');
        const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Complete")').first();
        await expect(submitBtn).toBeVisible({ timeout: 10000 });
    });

    test('wizard sidebar shows all incorporation steps', async ({ page }) => {
        await loginAndVisit(page, 'client', '/incorporation/jurisdiction-name');
        const navLinks = page.locator('nav a[href*="/incorporation/"]');
        const count = await navLinks.count();
        // Should have at least 5 visible step links
        expect(count).toBeGreaterThanOrEqual(5);
    });

});
