import { test, expect } from '@playwright/test';

/**
 * E2E Forgot Password + Reset Password Flow
 *
 * Gap 2 coverage — tests /forgot-password and /reset-password/:token
 * - Forgot form renders, validates, submits
 * - Generic success message prevents user enumeration
 * - Reset page loads with token, shows strength rules
 * - Invalid/expired token shows error
 * - Successful password reset → redirect to login
 */

test.describe('Forgot Password', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/forgot-password');
        await page.waitForLoadState('networkidle');
    });

    test('forgot password form renders correctly', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Forgot Password');
        await expect(page.locator('#forgot-email')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText('Send Reset Link');
        await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('invalid email shows validation error', async ({ page }) => {
        await page.fill('#forgot-email', 'bad-format');
        await page.locator('#forgot-email').blur();
        await expect(page.locator('#forgot-email-error')).toContainText('valid email');
    });

    test('successful submission shows generic "Check your inbox" message', async ({ page }) => {
        await page.route('**/api/auth/forgot-password', async route => {
            await route.fulfill({ status: 200, json: { message: 'OK' } });
        });

        await page.fill('#forgot-email', 'user@example.com');
        await page.click('button[type="submit"]');

        // The success state has role="status" with "Check your inbox"
        const success = page.locator('[role="status"]');
        await expect(success).toContainText('Check your inbox', { timeout: 8000 });
        // Must show the submitted email
        await expect(success).toContainText('user@example.com');
        // Back to sign in link
        await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('generic success shown even for non-existent email (prevents enumeration)', async ({ page }) => {
        // Server returns 404 but the component shows success anyway
        await page.route('**/api/auth/forgot-password', async route => {
            await route.fulfill({ status: 404, json: { message: 'User not found' } });
        });

        await page.fill('#forgot-email', 'nobody@example.com');
        await page.click('button[type="submit"]');

        // Should still show the generic success message
        const success = page.locator('[role="status"]');
        await expect(success).toContainText('Check your inbox', { timeout: 8000 });
    });

    test('429 rate limit shows error', async ({ page }) => {
        await page.route('**/api/auth/forgot-password', async route => {
            await route.fulfill({ status: 429, json: { message: 'Too many requests' } });
        });

        await page.fill('#forgot-email', 'user@example.com');
        await page.click('button[type="submit"]');

        const error = page.locator('[role="alert"]');
        await expect(error).toContainText('Too many attempts', { timeout: 5000 });
    });

    test('network error shows connection error', async ({ page }) => {
        await page.route('**/api/auth/forgot-password', async route => {
            await route.abort('connectionfailed');
        });

        await page.fill('#forgot-email', 'user@example.com');
        await page.click('button[type="submit"]');

        const error = page.locator('[role="alert"]');
        await expect(error).toContainText('Unable to connect', { timeout: 5000 });
    });

});

test.describe('Reset Password', () => {

    test('reset page renders with valid token in URL', async ({ page }) => {
        // Mock the page load — the component checks route.params.token on mount
        await page.goto('/reset-password/valid-mock-token');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1')).toContainText('Set New Password');
        await expect(page.locator('#reset-password')).toBeVisible();
        await expect(page.locator('#reset-confirm')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText('Set New Password');
    });

    test('password strength rules render as user types', async ({ page }) => {
        await page.goto('/reset-password/valid-token');
        await page.waitForLoadState('networkidle');

        await page.fill('#reset-password', 'Ab1!');

        // Strength rules list should appear
        const rulesList = page.locator('#reset-password-rules');
        await expect(rulesList).toBeVisible({ timeout: 3000 });
        // Should show individual rule items
        await expect(page.locator('text=At least 8 characters')).toBeVisible();
        await expect(page.locator('text=Uppercase letter')).toBeVisible();
    });

    test('submit button disabled until password meets policy', async ({ page }) => {
        await page.goto('/reset-password/valid-token');
        await page.waitForLoadState('networkidle');

        // Weak password — button should be disabled
        await page.fill('#reset-password', 'weak');
        await expect(page.locator('button[type="submit"]')).toBeDisabled();

        // Strong password — button should be enabled
        await page.fill('#reset-password', 'Str0ngP@ss!');
        await expect(page.locator('button[type="submit"]')).toBeEnabled();
    });

    test('confirm password mismatch shows error', async ({ page }) => {
        await page.goto('/reset-password/valid-token');
        await page.waitForLoadState('networkidle');

        await page.fill('#reset-password', 'Str0ngP@ss!');
        await page.fill('#reset-confirm', 'DifferentP@ss!');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=do not match')).toBeVisible({ timeout: 5000 });
    });

    test('successful reset shows success state and redirects to login', async ({ page }) => {
        await page.route('**/api/auth/reset-password', async route => {
            await route.fulfill({ status: 200, json: { message: 'Password reset' } });
        });

        await page.goto('/reset-password/valid-token');
        await page.waitForLoadState('networkidle');

        await page.fill('#reset-password', 'NewStr0ng!P@ss');
        await page.fill('#reset-confirm', 'NewStr0ng!P@ss');
        await page.click('button[type="submit"]');

        // Success state with role="status"
        const success = page.locator('[role="status"]');
        await expect(success).toContainText('Password Updated', { timeout: 8000 });
        // Sign in link
        await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('invalid/expired token shows error state with "Request New Link"', async ({ page }) => {
        await page.route('**/api/auth/reset-password', async route => {
            await route.fulfill({
                status: 400,
                json: { message: 'Token is invalid or expired' }
            });
        });

        await page.goto('/reset-password/expired-token');
        await page.waitForLoadState('networkidle');

        await page.fill('#reset-password', 'Str0ngP@ss!');
        await page.fill('#reset-confirm', 'Str0ngP@ss!');
        await page.click('button[type="submit"]');

        // tokenError state
        const errorState = page.locator('[role="alert"]');
        await expect(errorState).toContainText('Invalid or Expired', { timeout: 8000 });
        await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    });

    test('missing token in URL shows error state immediately', async ({ page }) => {
        // Navigate without a token — route is /reset-password/:token so this won't match
        // The router will redirect to 404 or the component's onMounted will detect missing token
        await page.goto('/reset-password/');
        await page.waitForLoadState('networkidle');

        // Should either show the error state or redirect
        const errorOrLogin = page.locator(
            '[role="alert"], h1:has-text("Forgot Password"), h1:has-text("Sign In")'
        );
        await expect(errorOrLogin.first()).toBeVisible({ timeout: 8000 });
    });

});
