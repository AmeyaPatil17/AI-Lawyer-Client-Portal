import { FullConfig, chromium } from '@playwright/test';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load root .env to get MONGODB_URI matching the backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Load .env.test for E2E-specific overrides (e.g. E2E_SEED_PASSWORD)
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: false });

const MONGODB_URI   = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/valiant_law_dev';
const SEED_PASSWORD = process.env.E2E_SEED_PASSWORD ?? 'KDBxTtXWbLWz3yb';
const BASE_URL      = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const AUTH_DIR      = path.join(__dirname, '.auth');

const USERS = [
    { email: 'ameya@synergyit.ca',  role: 'client', name: 'Ameya Client'  },
    { email: 'lawyer@synergyit.ca', role: 'lawyer', name: 'Valiant Lawyer' },
    { email: 'info@synergyit.ca',   role: 'admin',  name: 'Valiant Admin'  },
];

// ── Step 1 — Seed MongoDB ─────────────────────────────────────────────────────

async function seedDatabase() {
    console.log('[Setup] Seeding MongoDB with E2E credentials...');

    // B5: serverSelectionTimeoutMS so a missing DB fails fast with a clear error
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;

    const usersCollection = db?.collection('users');
    if (!usersCollection) throw new Error('Could not access users collection');

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

    for (const user of USERS) {
        await usersCollection.updateOne(
            { email: user.email },
            {
                $set: {
                    email:               user.email,
                    role:                user.role,
                    name:                user.name,
                    passwordHash:        passwordHash,
                    isActive:            true,
                    // B3: explicitly reset lockout so re-runs after a brute-force test
                    // don't leave accounts locked, causing cascading login failures.
                    failedLoginAttempts: 0,
                    lockedUntil:         null,
                    updatedAt:           new Date(),
                },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );
    }

    console.log('[Setup] 3 core test users seeded/upserted.');

    // ── Seed a draft incorporation intake for the E2E client user ─────────────
    // incorp-wizard.spec.ts navigates directly to /incorporation/* routes, which
    // require an existing intake; without one the wizard store creates a new one
    // on GET /current. To guarantee deterministic state we upsert a stub here.
    const incorpCollection  = db?.collection('incorpintakes');
    const clientUser        = await usersCollection.findOne({ email: 'ameya@synergyit.ca' });
    if (incorpCollection && clientUser) {
        await incorpCollection.updateOne(
            { userId: clientUser._id, status: 'started' },
            {
                $set: {
                    userId:    clientUser._id,
                    status:    'started',
                    type:      'incorporation',
                    data:      {},
                    updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date(), version: 1 }
            },
            { upsert: true }
        );
        console.log('[Setup] Draft incorporation intake seeded for E2E client.');
    }

    await mongoose.disconnect();
}

// ── Step 2 — Generate storageState auth files (A6) ───────────────────────────
//
// Logs in once per role using a real browser context and saves the resulting
// cookies + localStorage to e2e/.auth/{role}.json.
// These files are then referenced by playwright.config.ts `use.storageState`
// so individual tests skip the login round-trip entirely.

async function generateStorageState() {
    console.log('[Setup] Generating per-role storageState auth files...');

    // Ensure output directory exists
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const browser = await chromium.launch();

    for (const user of USERS) {
        const context = await browser.newContext();
        const page    = await context.newPage();

        try {
            await page.goto(`${BASE_URL}/login`);
            await page.waitForLoadState('networkidle');

            // Click the lawyer tab for lawyer/admin accounts
            if (user.role === 'lawyer' || user.role === 'admin') {
                const lawyerTab = page.locator('#tab-lawyer');
                if (await lawyerTab.isVisible({ timeout: 5000 })) {
                    await lawyerTab.click();
                }
            }

            await page.waitForSelector('#login-email', { timeout: 10000 });
            await page.fill('#login-email', user.email);
            await page.fill('#login-password', SEED_PASSWORD);
            await page.click('button[type="submit"]');

            // Wait for the post-login redirect to complete
            await page.waitForURL(/\/(dashboard|lawyer|admin|intake|wizard|triage)/, { timeout: 20000 });
            await page.waitForLoadState('networkidle');

            // Save the authenticated session to disk
            const stateFile = path.join(AUTH_DIR, `${user.role}.json`);
            await context.storageState({ path: stateFile });
            console.log(`[Setup] Saved storageState → ${stateFile}`);
        } catch (err) {
            console.warn(`[Setup] Warning: could not generate storageState for ${user.role}:`, err);
        } finally {
            await context.close();
        }
    }

    await browser.close();
    console.log('[Setup] All storageState files generated.');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function globalSetup(_config: FullConfig) {
    try {
        await seedDatabase();
    } catch (error) {
        console.error('[Setup] Failed to seed MongoDB:', error);
        throw error;
    }

    try {
        await generateStorageState();
    } catch (error) {
        // storageState generation failure is a warning, not a blocker — tests will
        // still work; they'll just do a full login on each test instead of reusing state.
        console.warn('[Setup] Warning: storageState generation failed (tests will log in per-test):', error);
    }
}

export default globalSetup;
