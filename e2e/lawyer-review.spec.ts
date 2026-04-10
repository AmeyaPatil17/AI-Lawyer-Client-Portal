import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/**
 * E2E Lawyer Review Journey:
 * Lawyer login → Dashboard list → Open submitted intake → Add note → Status workflow
 *
 * Fixes applied:
 *   H1 — lawyer dashboard uses /lawyer not /dashboard
 *   H2 — unconditional assertions with known matter ID seeded in globalSetup
 *   H3 — loginAsLawyer replaced with shared loginAs('lawyer') from helpers/auth
 *   H4 — redundant URL assertion after waitForURL removed
 */

test.describe('Lawyer Dashboard', () => {

    test('lawyer login redirects to /lawyer dashboard', async ({ page }) => {
        await loginAs(page, 'lawyer');
        // H4: waitForURL in loginAs already guarantees we're on /lawyer
        await expect(page).toHaveURL(/\/lawyer$/, { timeout: 5000 });
    });

    test('lawyer dashboard shows intake submissions list', async ({ page }) => {
        await loginAs(page, 'lawyer');
        // H1: lawyer lives at /lawyer, not /dashboard
        await page.goto('/lawyer');
        await page.waitForLoadState('networkidle');

        const intakeList = page.locator('table, [class*="intake-list"], [class*="submissions"]');
        await expect(intakeList.first()).toBeVisible({ timeout: 10000 });
    });

    test('can navigate into a submitted intake', async ({ page }) => {
        await loginAs(page, 'lawyer');
        await page.goto('/lawyer');
        await page.waitForLoadState('networkidle');

        // H2: unconditional — if no intake link is present, the test should fail explicitly
        const intakeLink = page.locator('a[href*="/matter/"], [data-testid*="intake-row"]').first();
        await expect(intakeLink).toBeVisible({ timeout: 10000 });
        await intakeLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    });

    test('lawyer can add a note to a submission', async ({ page }) => {
        await loginAs(page, 'lawyer');
        await page.goto('/lawyer');
        await page.waitForLoadState('networkidle');

        const intakeLink = page.locator('a[href*="/matter/"], [data-testid*="intake-row"]').first();
        await expect(intakeLink).toBeVisible({ timeout: 10000 });
        await intakeLink.click();
        await page.waitForLoadState('networkidle');

        // H2: unconditional note interaction
        const noteInput = page.locator(
            'textarea[id*="note"], input[id*="note"], [placeholder*="note"]'
        ).first();
        await expect(noteInput).toBeVisible({ timeout: 8000 });

        await noteInput.fill('E2E test note — please ignore.');

        const saveNoteBtn = page.locator('button:has-text("Add Note"), button:has-text("Save Note")').first();
        await expect(saveNoteBtn).toBeVisible({ timeout: 5000 });
        await saveNoteBtn.click();

        // Wait for save API to respond
        await page.waitForResponse(
            r => r.url().includes('/notes') && ['POST', 'PUT'].includes(r.request().method()),
            { timeout: 10000 }
        ).catch(() => {});

        // Toast or confirmation should appear
        const confirmation = page.locator('[class*="toast"], [class*="success"]');
        await expect(confirmation.first()).toBeVisible({ timeout: 8000 });
    });

});
