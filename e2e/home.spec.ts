import { test, expect } from '@playwright/test';

/**
 * E2E Home / Landing Page
 *
 * Gap 4 coverage — tests the public / route (Home.vue, 27 KB)
 * - Renders hero section
 * - Navigation links to /triage, /login, /register
 * - SEO meta elements
 */

test.describe('Home / Landing Page', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('home page renders with hero content', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('main, [class*="hero"]').first()).toBeVisible();
    });

    test('navigation contains links to triage and login', async ({ page }) => {
        // CTA to start estate planning (triage)
        const triageLink = page.locator('a[href="/triage"], a[href*="triage"], button:has-text("Estate")').first();
        await expect(triageLink).toBeVisible({ timeout: 8000 });

        // Login link
        const loginLink = page.locator('a[href="/login"]').first();
        await expect(loginLink).toBeVisible();
    });

    test('register link is accessible from home', async ({ page }) => {
        const registerLink = page.locator('a[href="/register"]').first();
        await expect(registerLink).toBeVisible({ timeout: 5000 });
    });

    test('page has correct document title', async ({ page }) => {
        // Gap 16: afterEach hook sets `breadcrumb — Valiant AI`
        const title = await page.title();
        expect(title).toContain('Valiant');
    });

    test('home page has SEO meta description', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description?.length).toBeGreaterThan(10);
    });

    test('home page is accessible without authentication', async ({ page }) => {
        // Should NOT redirect to /login
        const pathname = new URL(page.url()).pathname;
        expect(pathname).toBe('/');
    });

    test('incorporation CTA is visible on home page', async ({ page }) => {
        const incorpLink = page.locator(
            'a[href*="incorp"], button:has-text("Incorporat"), a:has-text("Business")'
        ).first();
        await expect(incorpLink).toBeVisible({ timeout: 8000 });
    });

});
