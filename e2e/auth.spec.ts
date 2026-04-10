import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/**
 * E2E Auth Journey: Login form → Invalid credentials → Successful login
 *
 * D1 — normalized indentation throughout
 * D2 — waitForResponse added after submit before error assertion
 * D3 — CRLF → LF
 * D4 — uses #login-email / #login-password IDs directly (confirmed in Login.vue)
 * D5 — success redirect asserts /dashboard specifically for client role
 */

test.describe('Auth Flow', () => {

    test('login page loads with expected elements', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('form[aria-label="Sign in form"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#login-email')).toBeVisible();
        await expect(page.locator('#login-password')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('login with invalid credentials shows error', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#login-email', { timeout: 10000 });

        // D4: use confirmed IDs from Login.vue
        await page.fill('#login-email', 'nonexistent@valiantlaw.ca');
        await page.fill('#login-password', 'WrongPassword123!');

        // D2: wait for the API response before asserting the error banner
        const loginResponse = page.waitForResponse(
            r => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
            { timeout: 15000 }
        );
        await page.click('button[type="submit"]');
        await loginResponse;

        // The error banner has role="alert" and aria-live="assertive" in Login.vue
        const errorBanner = page.locator('[role="alert"]').filter({ hasNotText: 'session' });
        await expect(errorBanner.first()).toBeVisible({ timeout: 8000 });
    });

    test('successful client login redirects to /dashboard', async ({ page }) => {
        await loginAs(page, 'client');
        // D5: client must land on /dashboard (not /intake, /triage, etc.)
        await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5000 });
    });

    test('successful lawyer login redirects to /lawyer', async ({ page }) => {
        await loginAs(page, 'lawyer');
        await expect(page).toHaveURL(/\/lawyer$/, { timeout: 5000 });
    });

});
