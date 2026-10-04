
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Tiny .env reader (no extra dep) ----
// Reads KEY=VALUE lines from a file and merges into process.env ONLY if
// the key is not already set in the ambient env (so CI overrides win).
function loadDotenvOnce(file: string): void {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

// Try to load apps/web/.env (orchestrator .env file). Other paths are
// fallback (root .env, system env already wins).
loadDotenvOnce(path.resolve(__dirname, '..', '..', '.env'));
loadDotenvOnce(path.resolve(__dirname, '..', '..', '..', '.env'));

const AUTH_DIR = path.resolve(__dirname, '..', '..', 'playwright', '.auth');

interface RoleSpec {
  name: 'admin' | 'student' | 'instructor';
  emailEnv: string;
  passwordEnv: string;
  expectedHome: RegExp;
}

const ROLES: RoleSpec[] = [
  {
    name: 'admin',
    emailEnv: 'TEST_ADMIN_EMAIL',
    passwordEnv: 'TEST_ADMIN_PASSWORD',
    expectedHome: /\/(?:admin|student|instructor)/, // super_admin lands on /admin; admin on /admin
  },
  {
    name: 'student',
    emailEnv: 'TEST_STUDENT_EMAIL',
    passwordEnv: 'TEST_STUDENT_PASSWORD',
    expectedHome: /\/student/,
  },
  {
    name: 'instructor',
    emailEnv: 'TEST_INSTRUCTOR_EMAIL',
    passwordEnv: 'TEST_INSTRUCTOR_PASSWORD',
    expectedHome: /\/instructor/,
  },
];

async function loginAndCapture(
  page: Page,
  email: string,
  password: string,
  expectUrl: RegExp
): Promise<void> {
  await page.goto('/auth/login');
  // LoginPage testids (added in previous round) — keep them stable.
  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);
  await page.getByTestId('auth-submit').click();
  // Wait for the post-login redirect to the role's home.
  await page.waitForURL(expectUrl, { timeout: 20_000 });
  // localStorage 'ioes-auth' is now populated by authStore persist middleware.
  // Confirm before saving storageState so a broken login doesn't poison
  // downstream specs.
  const ok = await page.evaluate(() => {
    const raw = window.localStorage.getItem('ioes-auth');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as {
        state?: { isAuthenticated?: boolean; accessToken?: string };
      };
      return parsed.state?.isAuthenticated === true && !!parsed.state.accessToken;
    } catch {
      return false;
    }
  });
  expect(ok, 'auth storage after login').toBe(true);
}

for (const role of ROLES) {
  test(`setup ${role.name} storageState`, async ({ page }) => {
    const email = process.env[role.emailEnv];
    const password = process.env[role.passwordEnv];
    test.skip(!email || !password, `missing env: ${role.emailEnv} or ${role.passwordEnv}`);

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await loginAndCapture(page, email!, password!, role.expectedHome);

    const outPath = path.join(AUTH_DIR, `${role.name}.json`);
    await page.context().storageState({ path: outPath });
    // Storage state file written. No passwords or tokens printed.
  });
}
