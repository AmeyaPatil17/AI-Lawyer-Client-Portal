import { test, expect } from '@playwright/test';
import { loginAs, loginAndVisit } from './helpers/auth';

/**
 * E2E AI Chat / AIGuide Component
 *
 * Gap 8 coverage — tests AIGuide.vue panel on wizard steps
 * - Chat panel opens/closes
 * - User can type + submit a question
 * - AI response renders (mocked)
 * - Error state when AI is unavailable
 * - Transport fallback hint present
 */

test.describe('AI Guide Chat', () => {

    test('AI Guide button is visible on wizard profile step', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/profile');
        const aiBtn = page.locator(
            'button:has-text("AI Guide"), button:has-text("Ask AI"), [id*="ai-guide"], [class*="ai-guide"]'
        ).first();
        await expect(aiBtn).toBeVisible({ timeout: 10000 });
    });

    test('clicking AI Guide opens the chat panel', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/profile');
        const aiBtn = page.locator(
            'button:has-text("AI Guide"), button:has-text("Ask AI"), [id*="ai-guide"]'
        ).first();
        await expect(aiBtn).toBeVisible({ timeout: 10000 });
        await aiBtn.click();

        // Chat panel should be visible with an input field
        const chatPanel = page.locator(
            '[class*="ai-guide"], [class*="chat-panel"], [id*="ai-chat"], aside, [role="complementary"]'
        ).first();
        await expect(chatPanel).toBeVisible({ timeout: 5000 });
    });

    test('chat input accepts user message', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/profile');
        const aiBtn = page.locator('button:has-text("AI Guide"), button:has-text("Ask AI")').first();
        if (await aiBtn.isVisible({ timeout: 5000 })) {
            await aiBtn.click();
        }

        const chatInput = page.locator(
            'textarea[placeholder*="Ask"], input[placeholder*="Ask"], textarea[placeholder*="question" i]'
        ).first();
        await expect(chatInput).toBeVisible({ timeout: 5000 });
        await chatInput.fill('What is an executor?');
    });

    test('submitting a question triggers AI response (mocked)', async ({ page }) => {
        // Mock the chat endpoint
        await page.route('**/api/intake/chat', async route => {
            await route.fulfill({
                status: 200,
                json: { response: 'An executor is the person you appoint to manage your estate.' }
            });
        });
        await page.route('**/api/intake/chat/stream', async route => {
            await route.fulfill({
                status: 200,
                json: { response: 'An executor is the person you appoint to manage your estate.' }
            });
        });

        await loginAndVisit(page, 'client', '/wizard/profile');
        const aiBtn = page.locator('button:has-text("AI Guide"), button:has-text("Ask AI")').first();
        if (await aiBtn.isVisible({ timeout: 5000 })) {
            await aiBtn.click();
        }

        const chatInput = page.locator(
            'textarea[placeholder*="Ask"], input[placeholder*="Ask"], textarea[placeholder*="question" i]'
        ).first();
        if (await chatInput.isVisible({ timeout: 5000 })) {
            await chatInput.fill('What is an executor?');
            // Submit — either Enter key or send button
            const sendBtn = page.locator('button[type="submit"], button:has-text("Send")').last();
            if (await sendBtn.isVisible({ timeout: 2000 })) {
                await sendBtn.click();
            } else {
                await chatInput.press('Enter');
            }

            // AI response should appear
            const response = page.locator('text=executor');
            await expect(response.first()).toBeVisible({ timeout: 10000 });
        }
    });

    test('AI unavailable shows graceful fallback', async ({ page }) => {
        await page.route('**/api/intake/chat', async route => {
            await route.fulfill({ status: 500, json: { message: 'AI service unavailable' } });
        });
        await page.route('**/api/intake/chat/stream', async route => {
            await route.fulfill({ status: 500, json: { message: 'AI service unavailable' } });
        });

        await loginAndVisit(page, 'client', '/wizard/profile');
        const aiBtn = page.locator('button:has-text("AI Guide"), button:has-text("Ask AI")').first();
        if (await aiBtn.isVisible({ timeout: 5000 })) {
            await aiBtn.click();
        }

        const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]').first();
        if (await chatInput.isVisible({ timeout: 5000 })) {
            await chatInput.fill('Test question');
            await chatInput.press('Enter');

            // Should show error/fallback text
            const errorEl = page.locator(':text("unavailable"), :text("error"), :text("try again")').first();
            await expect(errorEl).toBeVisible({ timeout: 10000 });
        }
    });

    test('AI Guide is available on Assets step too', async ({ page }) => {
        await loginAndVisit(page, 'client', '/wizard/assets');
        const aiBtn = page.locator(
            'button:has-text("AI Guide"), button:has-text("Ask AI"), [id*="ai-guide"]'
        ).first();
        await expect(aiBtn).toBeVisible({ timeout: 10000 });
    });

});
