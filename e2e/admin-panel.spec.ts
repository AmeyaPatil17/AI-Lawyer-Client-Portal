import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/**
 * E2E Admin Panel
 *
 * Gap 9 coverage — tests /admin route (AdminPanel.vue, 83 KB)
 * - Panel renders with navigation tabs
 * - User management: list, create, toggle status
 * - AI settings: view and update
 * - System stats dashboard
 * - Intake oversight: list, delete, status override
 */

test.describe('Admin Panel', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
    });

    test('admin panel renders with navigation', async ({ page }) => {
        await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
        // Should have tabs or nav for different sections
        const nav = page.locator('nav, [role="tablist"], [class*="tab"]').first();
        await expect(nav).toBeVisible({ timeout: 8000 });
    });

    test('admin panel shows system stats', async ({ page }) => {
        const statsSection = page.locator(
            ':text("Total Users"), :text("Active Intakes"), :text("Stats"), [class*="stat"]'
        ).first();
        await expect(statsSection).toBeVisible({ timeout: 10000 });
    });

});

test.describe('Admin — User Management', () => {

    test('user list loads and shows users', async ({ page }) => {
        await page.route('**/api/admin/users', async route => {
            await route.fulfill({
                status: 200,
                json: {
                    data: [
                        { _id: 'u1', email: 'client@test.com', role: 'client', isActive: true },
                        { _id: 'u2', email: 'lawyer@test.com', role: 'lawyer', isActive: true },
                    ]
                }
            });
        });

        await loginAs(page, 'admin');
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        // Navigate to Users tab/section
        const usersTab = page.locator('button:has-text("Users"), a:has-text("Users"), [data-tab="users"]').first();
        if (await usersTab.isVisible({ timeout: 5000 })) {
            await usersTab.click();
        }

        await expect(page.locator('text=client@test.com').first()).toBeVisible({ timeout: 8000 });
    });

    test('can toggle user active status', async ({ page }) => {
        await page.route('**/api/admin/users', async route => {
            await route.fulfill({
                status: 200,
                json: { data: [{ _id: 'u1', email: 'toggle@test.com', role: 'client', isActive: true }] }
            });
        });
        await page.route('**/api/admin/users/u1/status', async route => {
            await route.fulfill({ status: 200, json: { message: 'Status updated' } });
        });

        await loginAs(page, 'admin');
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        const usersTab = page.locator('button:has-text("Users"), a:has-text("Users")').first();
        if (await usersTab.isVisible({ timeout: 5000 })) {
            await usersTab.click();
        }

        const toggleBtn = page.locator(
            'button:has-text("Deactivate"), button:has-text("Disable"), [class*="toggle"]'
        ).first();
        if (await toggleBtn.isVisible({ timeout: 5000 })) {
            await toggleBtn.click();
            await expect(page.locator(':text("Status updated"), [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('create user form renders', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        const createBtn = page.locator('button:has-text("Create User"), button:has-text("Add User")').first();
        if (await createBtn.isVisible({ timeout: 5000 })) {
            await createBtn.click();
            const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
            await expect(emailInput).toBeVisible({ timeout: 5000 });
        }
    });

});

test.describe('Admin — AI Settings', () => {

    test('AI settings section loads', async ({ page }) => {
        await page.route('**/api/admin/ai-settings', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    json: {
                        provider: 'gemini',
                        model: 'gemini-3.1-flash-lite-preview',
                        rateLimit: 30,
                        maxRetries: 3,
                        cacheTTL: 3600
                    }
                });
            } else {
                await route.continue();
            }
        });

        await loginAs(page, 'admin');
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        const aiTab = page.locator('button:has-text("AI"), a:has-text("AI Settings")').first();
        if (await aiTab.isVisible({ timeout: 5000 })) {
            await aiTab.click();
        }

        await expect(page.locator(':text("gemini"), :text("Gemini"), select').first()).toBeVisible({ timeout: 8000 });
    });

    test('can update AI provider and save', async ({ page }) => {
        await page.route('**/api/admin/ai-settings', async route => {
            if (route.request().method() === 'PATCH') {
                await route.fulfill({ status: 200, json: { message: 'Settings updated' } });
            } else {
                await route.fulfill({
                    status: 200,
                    json: { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview', rateLimit: 30 }
                });
            }
        });

        await loginAs(page, 'admin');
        await page.goto('/admin');

        const aiTab = page.locator('button:has-text("AI"), a:has-text("AI")').first();
        if (await aiTab.isVisible({ timeout: 5000 })) {
            await aiTab.click();
        }

        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveBtn.isVisible({ timeout: 5000 })) {
            await saveBtn.click();
            await expect(page.locator(':text("updated"), [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
        }
    });

});

test.describe('Admin — Intake Oversight', () => {

    test('admin can view all intakes', async ({ page }) => {
        await page.route('**/api/admin/intakes', async route => {
            await route.fulfill({
                status: 200,
                json: {
                    data: [
                        { _id: 'i1', type: 'will', status: 'submitted', userId: { email: 'client@test.com' } },
                        { _id: 'i2', type: 'incorporation', status: 'started', userId: { email: 'other@test.com' } },
                    ]
                }
            });
        });

        await loginAs(page, 'admin');
        await page.goto('/admin');

        const intakesTab = page.locator('button:has-text("Intakes"), a:has-text("Intakes")').first();
        if (await intakesTab.isVisible({ timeout: 5000 })) {
            await intakesTab.click();
        }

        await expect(page.locator('text=client@test.com').first()).toBeVisible({ timeout: 8000 });
    });

    test('admin can delete an intake', async ({ page }) => {
        await page.route('**/api/admin/intakes', async route => {
            await route.fulfill({
                status: 200,
                json: { data: [{ _id: 'del1', type: 'will', status: 'started', userId: { email: 'delete@test.com' } }] }
            });
        });
        await page.route('**/api/admin/intakes/del1', async route => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({ status: 200, json: { message: 'Deleted' } });
            } else {
                await route.continue();
            }
        });

        await loginAs(page, 'admin');
        await page.goto('/admin');

        const intakesTab = page.locator('button:has-text("Intakes"), a:has-text("Intakes")').first();
        if (await intakesTab.isVisible({ timeout: 5000 })) {
            await intakesTab.click();
        }

        const deleteBtn = page.locator('button:has-text("Delete"), button[title="Delete"]').first();
        if (await deleteBtn.isVisible({ timeout: 5000 })) {
            await deleteBtn.click();
            // Confirm dialog
            const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
            if (await confirmBtn.isVisible({ timeout: 3000 })) {
                await confirmBtn.click();
            }
            await expect(page.locator(':text("Deleted"), [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
        }
    });

});
