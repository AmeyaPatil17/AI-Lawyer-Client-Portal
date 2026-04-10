import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests - Critical UI States', () => {
    test('Home Page - Base State', async ({ page }) => {
        await page.goto('/');
        // Wait for dynamic animation blocks if any (or just network idle)
        await page.waitForLoadState('networkidle');
        
        // Assert visual snapshot matches base expectation
        await expect(page).toHaveScreenshot('home-page-base.png', {
             fullPage: true,
             maxDiffPixelRatio: 0.05
        });
    });

    test('Login Page - Core Authentication State', async ({ page }) => {
        await page.goto('/login');
        await page.waitForSelector('form');

        await expect(page).toHaveScreenshot('login-page-state.png', {
             maxDiffPixelRatio: 0.02
        });
    });

    test('Registration Page - Form Rendering State', async ({ page }) => {
        await page.goto('/register');
        await page.waitForSelector('form');

        await expect(page).toHaveScreenshot('register-page-state.png', {
             maxDiffPixelRatio: 0.02
        });
    });

    test('Triage Landing - Selection Modules', async ({ page }) => {
        await page.goto('/triage');
        await page.waitForSelector('.glass-panel');

        await expect(page).toHaveScreenshot('triage-landing-state.png', {
            maxDiffPixelRatio: 0.05
        });
    });
});
