/** Batch 1D — E2E: static public pages */
import { test, expect, type Page } from '@playwright/test';
import { StaticPagesPage } from '../pages/public/StaticPagesPage';

// ---------------------------------------------------------------------------
// Console-error monitoring helper
// ---------------------------------------------------------------------------
type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

function catchConsoleErrors(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  const listener: ConsoleErrorListener = (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  };
  page.on('console', listener);
  return fn()
    .finally(() => page.off('console', listener))
    .then(() => errors);
}

// ---------------------------------------------------------------------------
// Mock incidental API calls so pages load without real backend
// ---------------------------------------------------------------------------

async function mockIncidentalApis(page: Page) {
  await page.route(/\/api\/(?!auth|courses|content|user)/, (route) =>
    route.fulfill({ status: 200, body: '[]' })
  );
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

test.describe('TC-STATICPG-ABOUT: About page', () => {
  test.beforeEach(async ({ page }) => {
    await mockIncidentalApis(page);
  });

  test('TC-STATICPG-001: /about renders the hero heading and team section', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const pages = new StaticPagesPage(page);
      await pages.gotoAbout();

      // Hero visible — About page has an h1
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Team section visible — team member titles appear in the page
      const roleText = page.locator('text=CEO').first();
      await expect(roleText).toBeVisible();
    });
    expect(errors).toHaveLength(0);
  });

  test('TC-STATICPG-002: /about has no console errors', async ({ page }) => {
    await mockIncidentalApis(page);
    const errors = await catchConsoleErrors(page, async () => {
      await page.goto('/about');
      await page.waitForLoadState('networkidle');
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

test.describe('TC-STATICPG-CONTACT: Contact form', () => {
  test.beforeEach(async ({ page }) => {
    await mockIncidentalApis(page);
  });

  test('TC-STATICPG-003: /contact shows the form; fill and submit shows success message', async ({
    page,
  }) => {
    const pages = new StaticPagesPage(page);
    await pages.gotoContact();

    // Form fields visible (verified by gotoContact waiting for heading)
    await expect(pages.contactNameInput()).toBeVisible();
    await expect(pages.contactEmailInput()).toBeVisible();
    await expect(pages.contactMessageTextarea()).toBeVisible();

    // Fill form (name, email, topic, message — phone is optional)
    await pages.fillContactForm({
      name: 'Nguyen Van A',
      email: 'test@example.com',
      topic: 'support',
      message: 'This is a test message',
    });

    // Submit
    await pages.submitContact();

    // Success message visible
    await pages.expectContactSuccess();
  });

  test('TC-STATICPG-004: /contact form is visible at /contact with no console errors', async ({
    page,
  }) => {
    const errors = await catchConsoleErrors(page, async () => {
      await page.goto('/contact');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// HelpCenter
// ---------------------------------------------------------------------------

test.describe('TC-STATICPG-HELP: Help Center', () => {
  test.beforeEach(async ({ page }) => {
    await mockIncidentalApis(page);
  });

  test('TC-STATICPG-005: /help renders categories; search filters results', async ({ page }) => {
    const pages = new StaticPagesPage(page);
    await pages.gotoHelp();

    // Hero search input visible
    await expect(pages.helpSearchInput()).toBeVisible();

    // Categories rendered — look for the heading
    await expect(page.getByText(/Bài viết phổ biến/i)).toBeVisible();

    // Search for a known keyword
    await pages.searchHelp('exam');

    // After search, articles containing 'exam' should be visible
    await expect(page.getByText(/exam/i).first()).toBeVisible();
  });

  test('TC-STATICPG-006: /help has no console errors', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      await page.goto('/help');
      await page.waitForLoadState('networkidle');
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Legal
// ---------------------------------------------------------------------------

test.describe('TC-STATICPG-LEGAL: Legal page', () => {
  test.beforeEach(async ({ page }) => {
    await mockIncidentalApis(page);
  });

  test('TC-STATICPG-007: /legal/anything?tab=terms renders the Terms tab as active', async ({
    page,
  }) => {
    const pages = new StaticPagesPage(page);
    await pages.gotoLegal('terms');

    // Terms section visible — use article heading text from TOC
    await expect(page.locator('text=Điều khoản sử dụng').first()).toBeVisible();

    // Privacy TOC link is present (not the heading)
    // Privacy section content should NOT be visible (different tab)
    const privacySection = page.locator('#privacy-s1');
    await expect(privacySection).not.toBeVisible();
  });

  test('TC-STATICPG-008: /legal/privacy renders the Privacy tab as active', async ({ page }) => {
    const pages = new StaticPagesPage(page);
    await pages.gotoLegal('privacy');

    // Privacy section visible
    const privacySection = page.locator('#privacy-s1');
    await expect(privacySection).toBeVisible();
  });

  test('TC-STATICPG-009: /legal/xyz falls back to privacy tab (invalid slug)', async ({ page }) => {
    await page.goto('/legal/xyz');
    // Should show privacy content
    const privacySection = page.locator('#privacy-s1');
    await expect(privacySection).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// UserProfile
// ---------------------------------------------------------------------------

test.describe('TC-STATICPG-USER: User profile page', () => {
  test.beforeEach(async ({ page }) => {
    await mockIncidentalApis(page);
  });

  test('TC-STATICPG-010: /users/abc renders ComingSoon', async ({ page }) => {
    const pages = new StaticPagesPage(page);
    await pages.gotoUserProfile('abc');
    await pages.expectComingSoon();

    // No console errors on ComingSoon page
    const errors = await catchConsoleErrors(page, async () => {
      await page.waitForLoadState('networkidle');
    });
    expect(errors).toHaveLength(0);
  });
});
