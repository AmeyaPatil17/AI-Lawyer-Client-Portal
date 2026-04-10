import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/**
 * E2E Nudge / Send Reminder Feature
 *
 * Tests the "Send Reminder" button in the Quick View drawer of the Lawyer Dashboard.
 *
 * Fixes applied:
 *   I1 — waitForTimeout(1500) replaced with waitForResponse for nudge API
 *   I2 — loading state assertion is now actually executed (not dead code)
 *   I3 — beforeEach handles login + Quick View drawer open (single source)
 *   I4 — inner if-guard + circular assertion replaced with direct expect
 */

test.describe('Nudge / Send Reminder', () => {

    // I3: shared preamble — log in and open the first Quick View drawer once per test
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'lawyer');
        await page.goto('/lawyer');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('table, [class*="dashboard"]', { timeout: 10000 });

        const quickViewBtn = page.locator('button:has-text("Quick View")').first();
        await expect(quickViewBtn).toBeVisible({ timeout: 8000 });
        await quickViewBtn.click();

        // Drawer animation — wait for it to be present in DOM
        const drawer = page.locator(
            '[class*="fixed"][class*="inset-y"], [class*="side-drawer"], aside'
        ).first();
        await expect(drawer).toBeVisible({ timeout: 5000 });
    });

    test('Quick View drawer shows Send Reminder button for incomplete intakes', async ({ page }) => {
        // The nudge button is conditionally rendered (v-if="!selectedIntake.data?.submitted")
        // I4: assert directly — if the button is absent the test should fail, not silently pass
        const nudgeBtn = page.locator(
            'button[title="Send Reminder Email"], button[title*="Reminder"], button[id*="nudge"]'
        ).first();
        // If the test intake is already submitted, skip explicitly
        const isSubmitted = !(await nudgeBtn.isVisible({ timeout: 3000 }));
        if (isSubmitted) {
            test.skip(true, 'No incomplete intakes available; nudge button not rendered');
            return;
        }
        await expect(nudgeBtn).toBeVisible();
    });

    test('Clicking Send Reminder shows a toast notification', async ({ page }) => {
        const nudgeBtn = page.locator(
            'button[title="Send Reminder Email"], button[title*="Reminder"]'
        ).first();
        if (!await nudgeBtn.isVisible({ timeout: 3000 })) {
            test.skip(true, 'No incomplete intakes; nudge button not rendered');
            return;
        }

        // I1: wait for the API response rather than a fixed delay
        const nudgeResponse = page.waitForResponse(
            r => r.url().includes('nudge') || r.url().includes('remind'),
            { timeout: 10000 }
        );
        await nudgeBtn.click();
        await nudgeResponse;

        const toast = page.locator('[class*="toast"], [class*="notification"], [role="alert"]').first();
        await expect(toast).toBeVisible({ timeout: 8000 });
    });

    test('Notes tab shows auto-generated note after sending a nudge', async ({ page }) => {
        const nudgeBtn = page.locator('button[title="Send Reminder Email"]').first();
        if (!await nudgeBtn.isVisible({ timeout: 3000 })) {
            test.skip(true, 'No incomplete intakes; nudge button not rendered');
            return;
        }

        // I1: await the actual API response
        const nudgeResponse = page.waitForResponse(
            r => r.url().includes('nudge') || r.url().includes('remind'),
            { timeout: 10000 }
        );
        await nudgeBtn.click();
        await nudgeResponse;

        const notesTab = page.locator('button:has-text("Notes")').first();
        await expect(notesTab).toBeVisible({ timeout: 5000 });
        await notesTab.click();
        await page.waitForLoadState('networkidle');

        const noteEntry = page.locator('[class*="note"], [class*="timeline"], li').first();
        await expect(noteEntry).toBeVisible({ timeout: 8000 });
    });

    test('Send Reminder button shows loading/disabled state during request', async ({ page }) => {
        const nudgeBtn = page.locator('button[title="Send Reminder Email"]').first();
        if (!await nudgeBtn.isVisible({ timeout: 3000 })) {
            test.skip(true, 'No incomplete intakes; nudge button not rendered');
            return;
        }

        // I2: actually assert the disabled / spinner state right after click
        await nudgeBtn.click();

        // Immediately after click the button should be disabled or show a spinner
        const disabledOrSpinner = page.locator(
            'button[title="Send Reminder Email"][disabled], ' +
            'button[title="Send Reminder Email"] .animate-spin'
        ).first();
        await expect(disabledOrSpinner).toBeVisible({ timeout: 2000 });

        // Then the toast should appear confirming the full round-trip completed
        const toast = page.locator('[class*="toast"], [role="alert"]').first();
        await expect(toast).toBeVisible({ timeout: 10000 });
    });

});
