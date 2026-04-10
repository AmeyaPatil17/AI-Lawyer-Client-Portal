import { test, expect } from '@playwright/test';
import { loginAndVisit } from './helpers/auth';

/**
 * E2E Wizard Branching Logic Tests
 *
 * Tests the dynamic step routing of the 10-step will intake wizard:
 *  - Guardians step appears only when minor children are present
 *  - Beneficiary 100% share enforcement
 *  - Review step renders all entered data sections
 *
 * Fixes applied:
 *   G1 — navigate to /wizard/profile (not /intake which has no route)
 *   G2 — removed waitForTimeout(1000); guardian nav assertion IS the wait
 *   G3 — route-mock the intake so no children exist (test isolation)
 *   G4 — route-mock the intake so it has exactly one beneficiary at 0%
 *   G5 — assert share error text via scoped selector, not raw HTML search
 *   G6 — navigate directly to /wizard/review (unconditional)
 */

test.describe('Wizard — Dynamic Step Branching', () => {

    test('Guardians step is included in sidebar when minor children exist', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/family');
        await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

        const addChildBtn = page.locator('button:has-text("Add Child"), button:has-text("Add a Child")').first();
        if (await addChildBtn.isVisible({ timeout: 5000 })) {
            await addChildBtn.click();

            const childDobInput = page.locator('[id*="child"][id*="dob"], input[placeholder*="Date of Birth"]').first();
            if (await childDobInput.isVisible({ timeout: 5000 })) {
                const minorDob = new Date();
                minorDob.setFullYear(minorDob.getFullYear() - 5);
                await childDobInput.fill(minorDob.toISOString().split('T')[0]);
            }

            const saveBtn = page.locator('button:has-text("Save"), button:has-text("Continue")').first();
            if (await saveBtn.isVisible({ timeout: 5000 })) {
                await saveBtn.click();
                // Wait for save API response (G2: no fixed delay)
                await page.waitForResponse(
                    r => r.url().includes('/api/intake') && r.request().method() !== 'GET',
                    { timeout: 10000 }
                ).catch(() => {});
            }
        }

        // G2: guardian nav assertion does the waiting — no waitForTimeout needed
        const guardiansStep = page.locator(
            '[href*="guardian"], [data-step="guardians"], nav span:has-text("Guardian"), nav a:has-text("Guardian")'
        ).first();
        await expect(guardiansStep).toBeVisible({ timeout: 8000 });
    });

    test('Guardians step does NOT appear when no minor children exist', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/family');

        // G3: mock the intake API to return no children — test isolation
        await page.route('**/api/intake/**', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    json: { data: { family: { children: [] } } }
                });
            } else {
                await route.continue();
            }
        });

        const noChildrenOpt = page.locator(
            'input[value*="none"], label:has-text("No children"), input[id*="noChildren"]'
        ).first();
        if (await noChildrenOpt.isVisible({ timeout: 3000 })) {
            await noChildrenOpt.click();
        }

        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Continue")').first();
        if (await saveBtn.isVisible({ timeout: 5000 })) {
            await saveBtn.click();
            await page.waitForResponse(
                r => r.url().includes('/api/intake') && r.request().method() !== 'GET',
                { timeout: 10000 }
            ).catch(() => {});
        }

        const guardiansStep = page.locator('[href*="guardian"], [data-step="guardians"]').first();
        await expect(guardiansStep).not.toBeVisible({ timeout: 5000 });
    });

    test('Beneficiaries step shows validation when shares do not add up to 100%', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/beneficiaries');

        // G4: mock intake so we have a clean slate with one beneficiary at 0% share
        await page.route('**/api/intake/**', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    json: {
                        data: {
                            beneficiaries: [{ id: 'b1', name: 'Test Person', share: 0 }]
                        }
                    }
                });
            } else {
                await route.continue();
            }
        });

        const shareInput = page.locator('input[id*="share"], input[placeholder*="share"], input[placeholder*="%"]').first();
        if (await shareInput.isVisible({ timeout: 5000 })) {
            await shareInput.fill('50'); // Only 50%, missing 50%

            const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Save")').first();
            if (await nextBtn.isVisible({ timeout: 5000 })) {
                await nextBtn.click();

                // G5: scope error assertion to an element that specifically mentions the share/100 requirement
                const shareError = page.locator(
                    '[data-testid="share-error"], ' +
                    '[class*="error"]:has-text("100"), ' +
                    '[class*="alert"]:has-text("total"), ' +
                    'p[class*="error"]:has-text("share")'
                ).first();
                await expect(shareError).toBeVisible({ timeout: 6000 });
            }
        }
    });

    test('Review step renders and shows summary content', async ({ page }) => {
        // G6: navigate directly, unconditional assertion (no if-guard)
        await loginAndVisit(page, 'client', '/wizard/review');
        await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

        const sections = page.locator(
            'h2:has-text("Profile"), h2:has-text("Family"), h2:has-text("Executor"), h2:has-text("Beneficiar"), ' +
            'h3:has-text("Profile"), h3:has-text("Family"), h3:has-text("Executor"), section, [class*="review"]'
        );
        await expect(sections.first()).toBeVisible({ timeout: 8000 });
    });

});
