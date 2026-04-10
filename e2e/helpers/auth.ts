import { Page } from '@playwright/test';

/**
 * Shared E2E authentication helpers.
 *
 * Using a single shared module means any change to the login form (new field,
 * redirect URL, role-tab behaviour) only needs to be updated here.
 *
 * Seed password is read from the environment so it can be rotated without
 * touching spec files. The E2E_SEED_PASSWORD variable is set in .env.test and
 * forwarded to the Playwright process via the dotenv call in global.setup.ts.
 */

export const SEED_PASSWORD = process.env.E2E_SEED_PASSWORD ?? 'KDBxTtXWbLWz3yb';

export const USERS = {
    client: 'ameya@synergyit.ca',
    lawyer: 'lawyer@synergyit.ca',
    admin:  'info@synergyit.ca',
} as const;

export type Role = keyof typeof USERS;

/**
 * Log in as a specific role.
 *
 * - Navigates to /login and waits for the page to be idle.
 * - Clicks the correct role tab (client or lawyer; admin uses lawyer tab).
 * - Fills credentials and submits.
 * - Waits for the post-login redirect to complete before returning.
 *
 * @param page     Playwright Page instance
 * @param role     'client' | 'lawyer' | 'admin'
 * @param password Optional override; defaults to SEED_PASSWORD
 */
export async function loginAs(page: Page, role: Role, password = SEED_PASSWORD): Promise<void> {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click the appropriate role tab — admin uses the lawyer tab since there is
    // no dedicated admin tab on the login page.
    if (role === 'lawyer' || role === 'admin') {
        const lawyerTab = page.locator('#tab-lawyer');
        if (await lawyerTab.isVisible({ timeout: 5000 })) {
            await lawyerTab.click();
        }
    }

    await page.waitForSelector('#login-email', { timeout: 10000 });
    await page.fill('#login-email', USERS[role]);
    await page.fill('#login-password', password);
    await page.click('button[type="submit"]');

    // Wait for the post-login redirect to settle before handing control back.
    await page.waitForURL(/\/(dashboard|lawyer|admin|intake|wizard|triage)/, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a path after authenticating, handling the case where the post-
 * login URL is already the target path (avoids a redundant navigation).
 */
export async function loginAndVisit(page: Page, role: Role, path: string): Promise<void> {
    await loginAs(page, role);
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== path) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
    }
}
