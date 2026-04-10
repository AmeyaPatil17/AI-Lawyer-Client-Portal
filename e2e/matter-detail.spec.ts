import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/**
 * E2E Matter Detail View
 *
 * Gap 10 coverage — tests /lawyer/matter/:id route (MatterDetail.vue)
 * - View renders with content sections
 * - Client data displayed
 * - Action buttons visible (status, notes, doc download)
 * - AI features accessible (suggestions, copilot)
 */

test.describe('Matter Detail View', () => {

    test.beforeEach(async ({ page }) => {
        // Mock the matter detail endpoint
        await page.route('**/api/lawyer/intake/mock-matter', async route => {
            await route.fulfill({
                status: 200,
                json: {
                    _id: 'mock-matter',
                    type: 'will',
                    status: 'submitted',
                    userId: { email: 'client@test.com', name: 'Test Client' },
                    data: {
                        profile: { fullName: 'Test Client', dateOfBirth: '1985-03-15' },
                        family: { maritalStatus: 'married', spouseFullName: 'Spouse Client' },
                        executors: [{ name: 'Executor Person' }],
                        beneficiaries: [{ name: 'Beneficiary Person', share: 100 }],
                    },
                    flags: [
                        { type: 'hard', code: 'RESIDENCY_FAIL', message: 'Client may not be Ontario resident' },
                        { type: 'soft', code: 'SPOUSAL_OMISSION', message: 'Spouse not named as beneficiary' },
                    ],
                    priorityScore: 85,
                    notes: [{ text: 'Initial review pending', createdAt: new Date().toISOString() }],
                }
            });
        });

        await loginAs(page, 'lawyer');
        await page.goto('/lawyer/matter/mock-matter');
        await page.waitForLoadState('networkidle');
    });

    test('matter detail page renders', async ({ page }) => {
        await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    });

    test('shows client profile data', async ({ page }) => {
        await expect(page.locator('text=Test Client').first()).toBeVisible({ timeout: 8000 });
    });

    test('displays risk flags', async ({ page }) => {
        const flagEl = page.locator(':text("RESIDENCY"), :text("Critical"), [class*="flag"]').first();
        await expect(flagEl).toBeVisible({ timeout: 8000 });
    });

    test('shows priority score', async ({ page }) => {
        const scoreEl = page.locator(':text("85"), [class*="priority"], [class*="score"]').first();
        await expect(scoreEl).toBeVisible({ timeout: 8000 });
    });

    test('has status update controls', async ({ page }) => {
        const statusControl = page.locator(
            'select[name*="status"], button:has-text("Status"), [class*="status-select"]'
        ).first();
        await expect(statusControl).toBeVisible({ timeout: 8000 });
    });

    test('has notes section', async ({ page }) => {
        const notesSection = page.locator(
            ':text("Notes"), :text("Initial review"), textarea[name*="note"]'
        ).first();
        await expect(notesSection).toBeVisible({ timeout: 8000 });
    });

    test('has document download control', async ({ page }) => {
        const docBtn = page.locator(
            'button:has-text("Generate"), button:has-text("Download"), a:has-text("Download")'
        ).first();
        await expect(docBtn).toBeVisible({ timeout: 8000 });
    });

    test('AI suggestions button is accessible', async ({ page }) => {
        const suggestBtn = page.locator(
            'button:has-text("Suggest"), button:has-text("AI"), button:has-text("Copilot")'
        ).first();
        // Gap 12: Lawyer copilot or suggestions button should exist
        await expect(suggestBtn).toBeVisible({ timeout: 8000 });
    });

    test('can navigate back to lawyer dashboard', async ({ page }) => {
        const backLink = page.locator(
            'a[href="/lawyer"], button:has-text("Back"), nav a:has-text("Dashboard")'
        ).first();
        await expect(backLink).toBeVisible({ timeout: 5000 });
        await backLink.click();
        await page.waitForURL('**/lawyer', { timeout: 10000 });
    });

});
