import { test, expect } from '@playwright/test';

/**
 * E2E Registration Flow
 *
 * Gap 1 coverage — tests the /register page:
 * - Form renders with all fields
 * - Inline validation (email, password strength, confirm mismatch)
 * - Successful registration → auto-login → redirect
 * - Duplicate email error
 * - Rate-limiting lockout banner
 */

test.describe('Registration Flow', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
    });

    test('registration form renders with all required fields', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Create an Account');
        await expect(page.locator('#register-email')).toBeVisible();
        await expect(page.locator('#register-password')).toBeVisible();
        await expect(page.locator('#register-confirm-password')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        // "Already have an account? Sign in" link
        await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('empty email shows validation error on blur', async ({ page }) => {
        const emailInput = page.locator('#register-email');
        await emailInput.focus();
        await emailInput.blur();
        await expect(page.locator('#register-email-error')).toContainText('required');
    });

    test('invalid email format shows validation error', async ({ page }) => {
        await page.fill('#register-email', 'not-an-email');
        await page.locator('#register-email').blur();
        await expect(page.locator('#register-email-error')).toContainText('valid email');
    });

    test('password strength bar appears when typing', async ({ page }) => {
        await page.fill('#register-password', 'Ab');
        // Strength bar container should appear
        const strengthBar = page.locator('.flex.gap-1.h-1');
        await expect(strengthBar).toBeVisible({ timeout: 3000 });
    });

    test('weak password blocks submission with policy error', async ({ page }) => {
        await page.fill('#register-email', 'test-e2e-weak@example.com');
        await page.fill('#register-password', 'short');
        await page.fill('#register-confirm-password', 'short');
        await page.click('button[type="submit"]');

        // The component sets errorMessage for policy failure
        const policyError = page.locator('[role="alert"]');
        await expect(policyError.first()).toContainText('8 characters', { timeout: 5000 });
    });

    test('mismatched confirm password shows error', async ({ page }) => {
        await page.fill('#register-email', 'test-e2e-mismatch@example.com');
        await page.fill('#register-password', 'StrongP@ss1');
        await page.fill('#register-confirm-password', 'DifferentP@ss2');
        await page.click('button[type="submit"]');

        await expect(page.locator('#register-confirm-error')).toContainText('do not match', { timeout: 5000 });
    });

    test('successful registration auto-logs in and redirects', async ({ page }) => {
        // Mock the register + login API calls to avoid creating real users
        await page.route('**/api/auth/register', async route => {
            await route.fulfill({ status: 201, json: { message: 'User registered' } });
        });
        await page.route('**/api/auth/login', async route => {
            await route.fulfill({
                status: 200,
                json: {
                    token: 'mock-jwt',
                    user: { email: 'new-e2e@example.com', role: 'client', name: 'E2E User' }
                }
            });
        });

        await page.fill('#register-email', 'new-e2e@example.com');
        await page.fill('#register-password', 'StrongP@ss1!');
        await page.fill('#register-confirm-password', 'StrongP@ss1!');
        await page.click('button[type="submit"]');

        // After auto-login, should redirect to / (Home hub)
        await page.waitForURL('**/', { timeout: 10000 });
    });

    test('duplicate email shows error banner', async ({ page }) => {
        await page.route('**/api/auth/register', async route => {
            await route.fulfill({
                status: 400,
                json: { message: 'Email already registered' }
            });
        });

        await page.fill('#register-email', 'existing@example.com');
        await page.fill('#register-password', 'StrongP@ss1!');
        await page.fill('#register-confirm-password', 'StrongP@ss1!');
        await page.click('button[type="submit"]');

        const errorBanner = page.locator('[role="alert"][aria-live="assertive"]');
        await expect(errorBanner).toContainText('already registered', { timeout: 5000 });
    });

    test('rate limit 429 shows lockout countdown', async ({ page }) => {
        await page.route('**/api/auth/register', async route => {
            await route.fulfill({
                status: 429,
                headers: { 'retry-after': '30' },
                json: { message: 'Too many requests' }
            });
        });

        await page.fill('#register-email', 'ratelimit@example.com');
        await page.fill('#register-password', 'StrongP@ss1!');
        await page.fill('#register-confirm-password', 'StrongP@ss1!');
        await page.click('button[type="submit"]');

        // Lockout banner with countdown
        const lockout = page.locator('[role="alert"]').filter({ hasText: 'Too many attempts' });
        await expect(lockout).toBeVisible({ timeout: 5000 });

        // Submit button should be disabled during lockout
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('submit button shows loading spinner during API call', async ({ page }) => {
        await page.route('**/api/auth/register', async route => {
            await new Promise(r => setTimeout(r, 2000));
            await route.fulfill({ status: 201, json: { message: 'OK' } });
        });

        await page.fill('#register-email', 'loading@example.com');
        await page.fill('#register-password', 'StrongP@ss1!');
        await page.fill('#register-confirm-password', 'StrongP@ss1!');
        await page.click('button[type="submit"]');

        await expect(page.locator('button[type="submit"] .animate-spin')).toBeVisible({ timeout: 2000 });
        await expect(page.locator('button[type="submit"]')).toContainText('Creating Account');
    });

});
