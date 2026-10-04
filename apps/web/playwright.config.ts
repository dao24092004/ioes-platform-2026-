// apps/web/playwright.config.ts
// Playwright config for apps/web/tests/e2e.
//
// Projects:
//   - setup            : runs auth.setup.ts (logs in once per role, saves
//                        storageState to playwright/.auth/<role>.json).
//   - web-admin        : depends on setup, loads admin storageState.
//   - web-student        : depends on setup, loads student storageState.
//   - web-instructor   : depends on setup, loads instructor storageState.
//   - chromium         : anonymous browser, for public pages and pages
//                        that must NOT inherit a previous role.
//
// Routing convention (orchestrator-owned — Wave 1 fix #1):
//   - *.spec.ts            → chromium (anonymous, no storageState).
//   - *.admin.spec.ts      → web-admin  (requires TEST_ADMIN_* env).
//   - *.student.spec.ts    → web-student (requires TEST_STUDENT_* env).
//   - *.instructor.spec.ts → web-instructor (requires TEST_INSTRUCTOR_* env).
//
// This is the ONLY mechanism that decides which role project a spec runs
// under. Role projects do not pick up anonymous *.spec.ts; chromium does not
// pick up role-specific specs. No spec-level test.skip workarounds are
// needed: existing specs use `test.skip(browser.browserType().name() === ...)`
// patterns which work because chromium is the only project matching *.spec.ts.
//
// Wave 1 status: no *.admin.spec.ts / *.student.spec.ts / *.instructor.spec.ts
// files exist yet, so the three role projects are empty by design. They will
// pick up role-specific tests in Wave 2+.
//
// baseURL is taken from TEST_BASE_URL env var, defaulting to the local dev
// server. testIdAttribute is 'data-testid'. Reports go to the .gitignored
// playwright-report/, test-results/ and coverage/ folders.
//
// Shared-account safety: web-* projects reuse storageState for read-only
// checks but specs MUST NOT mutate real data (passwords/profile/settings).

import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.TEST_BASE_URL_PORT ?? '3000';
const HOSTNAME = process.env.TEST_BASE_URL_HOSTNAME ?? 'localhost';
const baseURL = process.env.TEST_BASE_URL ?? `http://${HOSTNAME}:${PORT}`;

const AUTH_DIR = path.resolve(__dirname, 'playwright', '.auth');

export default defineConfig({
  testDir: './tests/e2e',
  // Only `.spec.ts` (and helpers `.ts`). Reject `.spec.js`/`.test.js` so a
  // JavaScript test file dropped in this folder by mistake won't be picked
  // up by Playwright. This is the runtime equivalent of the lint
  // `--ext ts,tsx` and `vitest.config.ts` `include: '**/*.{ts,tsx}'` rules.
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.TEST_WORKERS
    ? Number(process.env.TEST_WORKERS)
    : process.env.CI
      ? 1
      : 4,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/junit/results.xml' }],
  ],
  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Anonymous browser — matches every *.spec.ts file. No storageState.
      // Role-specific specs are picked up by web-admin / web-student /
      // web-instructor; chromium must NOT see them or storageState would clash.
      // auth.setup.ts is also excluded here so only the setup project picks it up.
      name: 'chromium',
      testMatch: '**/*.spec.ts',
      testIgnore: ['**/*.admin.spec.ts', '**/*.student.spec.ts', '**/*.instructor.spec.ts', '**/auth.setup.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // admin-only — no *.admin.spec.ts in Wave 1, so this project is empty
      // by design. Will pick up Wave 2+ admin specs by filename.
      name: 'web-admin',
      dependencies: ['setup'],
      testMatch: '**/*.admin.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'admin.json'),
      },
    },
    {
      // student-only — empty in Wave 1; Wave 2 will add *.student.spec.ts.
      name: 'web-student',
      dependencies: ['setup'],
      testMatch: '**/*.student.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'student.json'),
      },
    },
    {
      // instructor-only — empty in Wave 1; Wave 2 will add *.instructor.spec.ts.
      name: 'web-instructor',
      dependencies: ['setup'],
      testMatch: '**/*.instructor.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'instructor.json'),
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: `http://${HOSTNAME}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});