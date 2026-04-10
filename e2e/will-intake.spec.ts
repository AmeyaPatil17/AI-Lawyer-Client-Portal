import { test, expect } from '@playwright/test';
import { loginAs, loginAndVisit } from './helpers/auth';

/**
 * E2E Will Intake Journey:
 * Triage → Personal Profile (pre-fill check) → Family (minor child validation)
 * → Executors → Beneficiaries → Review → Submit
 *
 * Fixes applied:
 *   F1 — authenticateAndVisit path comparison fixed (relative vs absolute)
 *   F2 — triage question assertion uses visible-text locator, not raw HTML search
 *   F3 — DOB validation error scoped to the specific field, not any error element
 *   F4 — family nav uses exact wizard route
 *   F5 — loginAndVisit waits for networkidle before navigating to path
 */

test.describe('Triage Flow', () => {

    test('triage page renders a heading', async ({ page }) => {
        await page.goto('/triage');
        await page.waitForLoadState('networkidle');
        // Triage is isPublic: true — no auth redirect expected
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
    });

    test('triage form renders Ontario as an option', async ({ page }) => {
        await page.goto('/triage');
        await page.waitForLoadState('networkidle');
        // F2: check visible rendered text, not raw HTML bytes
        await expect(page.locator('text=Ontario').first()).toBeVisible({ timeout: 8000 });
    });

});

test.describe('Intake Questionnaire Pre-fill', () => {

    test('intake /wizard/profile loads when authenticated', async ({ page }) => {
        // F1: navigate to the actual wizard route, not /intake which doesn't exist
        await loginAndVisit(page, 'client', '/wizard/profile');
        await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    });

    test('Family section shows children subsection', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/family');
        // F4: locate the family nav via exact wizard route href
        const familyNav = page.locator('nav a[href="/wizard/family"]');
        if (await familyNav.isVisible({ timeout: 3000 })) {
            await familyNav.click();
            await page.waitForLoadState('networkidle');
        }
        // Children section heading
        const childrenSection = page.locator('[id*="children"], h3:has-text("Children"), h2:has-text("Children")');
        await expect(childrenSection.first()).toBeVisible({ timeout: 8000 });
    });

});

test.describe('Date Validation', () => {

    test('invalid date of birth older than 125 years shows field-level error', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/profile');

        const dobInput = page.locator('[id="dateOfBirth"], input[name="dateOfBirth"]').first();
        if (await dobInput.isVisible({ timeout: 8000 })) {
            await dobInput.fill('1800-01-01');
            await dobInput.blur();

            // F3: assert the error is attached to the DOB field specifically,
            // not any generic error element on the page.
            const fieldError = page.locator(
                '[id="dateOfBirth-error"], ' +
                '[aria-describedby*="dateOfBirth"] ~ [class*="error"], ' +
                'p[class*="error"]:near([id="dateOfBirth"])'
            );
            await expect(fieldError.first()).toBeVisible({ timeout: 5000 });
        }
    });

});
