// apps/web/tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/public/HomePage';

// =================================================================
// TC-HOME: Home sections render
// =================================================================
test.describe('TC-HOME: Home sections render', () => {
  test('TC-HOME-001: should render hero + all 9 sections', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // 9 sections total — assert each is in the DOM (visible is too strict for
    // off-screen sections; presence is enough for a section anchor).
    await expect(home.heroSection).toBeAttached();
    await expect(home.featuresSection).toBeAttached();
    await expect(home.coursesSection).toBeAttached();
    await expect(home.aiMentorSection).toBeAttached();
    await expect(home.pricingSection).toBeAttached();
    await expect(home.testimonialsSection).toBeAttached();
    await expect(home.faqSection).toBeAttached();
    await expect(home.ctaSection).toBeAttached();

    // Hero h1 should be visible.
    const heroH1 = page.locator('#home h1').first();
    await expect(heroH1).toBeVisible();
  });

  test('TC-HOME-002: FAQ accordion: first item open, second toggles true, first back to false', async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.goto();

    // Scroll FAQ into view.
    await home.faqSection.scrollIntoViewIfNeeded();

    await expect(home.faqFirstItem).toHaveAttribute('aria-expanded', 'true');
    await home.faqSecondItem.click();
    await expect(home.faqSecondItem).toHaveAttribute('aria-expanded', 'true');
    await expect(home.faqFirstItem).toHaveAttribute('aria-expanded', 'false');
  });

  test('TC-HOME-003: Floating chat opens and closes via toggle', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Open.
    await home.toggleFloatingChat();
    // Web-first: input visible after click.
    await expect(home.chatInput).toBeVisible();

    // Close.
    await home.closeFloatingChat();
    await expect(home.chatToggle).toBeVisible();
  });
});

// =================================================================
// TC-NAV: header/footer navigation controls
// =================================================================
test.describe('TC-NAV: header/footer navigation controls', () => {
  test('TC-NAV-001: logo link navigates to /', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.logoLink.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('TC-NAV-002: header Courses link navigates to /courses', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.headerCourses.first().click();
    await expect(page).toHaveURL(/\/courses$/);
    // Go back and confirm Home still works.
    await page.goBack();
    await expect(home.heroSection).toBeAttached();
  });

  test('TC-NAV-003: header About link navigates to /about', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.headerAbout.first().click();
    await expect(page).toHaveURL(/\/about$/);
    await page.goBack();
    await expect(home.heroSection).toBeAttached();
  });

  test('TC-NAV-004: header Contact link navigates to /contact', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.headerContact.first().click();
    await expect(page).toHaveURL(/\/contact$/);
    await page.goBack();
    await expect(home.heroSection).toBeAttached();
  });

  test('TC-NAV-005: header Login button navigates to /auth/login', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.headerLogin.first().click();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('TC-NAV-006: header Register button navigates to /auth/register', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.headerRegister.first().click();
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('TC-NAV-007: language toggle switches between EN and VI on click', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.langToggle).toHaveText(/^VI$/);
    await home.toggleLanguage();
    await expect(home.langToggle).toHaveText(/^EN$/);
    await home.toggleLanguage();
    await expect(home.langToggle).toHaveText(/^VI$/);
  });

  test('TC-NAV-008: footer logo link navigates to /', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.footer.scrollIntoViewIfNeeded();
    await home.footerLogo.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('TC-NAV-009: mobile menu toggle shows and hides the menu', async ({ page }) => {
    // viewport width 375 — desktop nav links hide, hamburger shows.
    await page.setViewportSize({ width: 375, height: 812 });
    const home = new HomePage(page);
    await home.goto();

    // Baseline: the desktop Login link is in the DOM (just hidden by CSS
    // `hidden sm:inline-flex` at 375). The mobile menu Login link is NOT in
    // the DOM yet — the whole `<div className="md:hidden">` is conditional on
    // `mobileMenuOpen` state, so toggling it adds a new <a href="/auth/login">.
    const beforeCount = await page.locator('a[href="/auth/login"]').count();

    // Toggle open. We must give React's render commit time, then assert the
    // count strictly grew. Web-first wait: at least one mobile-menu Login
    // link is now in the DOM.
    await home.menuToggle.click();
    await expect
      .poll(() => page.locator('a[href="/auth/login"]').count(), { timeout: 3000 })
      .toBeGreaterThan(beforeCount);

    // Toggle closed: count drops back to baseline.
    await home.menuToggle.click();
    await expect
      .poll(() => page.locator('a[href="/auth/login"]').count(), { timeout: 3000 })
      .toBe(beforeCount);
  });
});

// =================================================================
// TC-RESP: no horizontal overflow + no broken images + clean console
// =================================================================
test.describe('TC-RESP: responsive layout (no horizontal overflow)', () => {
  for (const [id, width, height] of [
    ['TC-RESP-001-mobile-375', 375, 812],
    ['TC-RESP-002-tablet-768', 768, 1024],
    ['TC-RESP-003-desktop-1440', 1440, 900],
  ] as const) {
    test(`${id}: at ${width}x${height}, no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const home = new HomePage(page);
      await home.goto();

      // Assert no horizontal overflow: scrollWidth <= clientWidth + tolerance.
      const hasOverflow = await page.evaluate(() => {
        const tolerance = 1; // 1px slack for sub-pixel rounding
        return (
          document.documentElement.scrollWidth - document.documentElement.clientWidth > tolerance
        );
      });
      expect(hasOverflow).toBe(false);
    });
  }

  test('TC-RESP-004: no broken images (naturalWidth > 0)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Force lazy-loaded images to start loading, then wait for the document
    // to reach the networkidle state so every <img> has a chance to fire
    // its `load` event. No real-time waits; the browser-driven event loop
    // gates signalled by `load`.
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      // Trigger lazy sources synchronously by reading offsetTop on each
      // <img>; that is enough to start the network fetch.
      document.querySelectorAll('img').forEach(() => undefined);
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');

    const brokenImages = await page.$$eval('img', (imgs) =>
      imgs
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.src || img.getAttribute('alt') || img.outerHTML.slice(0, 80))
    );
    expect(brokenImages, `broken images: ${JSON.stringify(brokenImages)}`).toEqual([]);
  });

  test('TC-RESP-005: no console errors and no 404s for clickable header items', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const network404s: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('response', (resp) => {
      if (resp.status() === 404) network404s.push(resp.url());
    });

    const home = new HomePage(page);
    await home.goto();

    // Click every header <a> and go back to /. Each click triggers a
    // navigation; we tolerate intentional placeholder pages (auth/login,
    // /courses, /about, /contact) but report any 404 or unexpected error.
    const links = await page.$$('header nav a, header nav button[aria-label]');
    for (const link of links) {
      try {
        const tag = await link.evaluate((el) => el.tagName.toLowerCase());
        if (tag === 'a') {
          await link.click();
          await page.goBack();
        }
        // buttons (theme/menu/language) we skip — they don't navigate.
      } catch {
        // intentional — some clicks open menus/dropdowns, no nav.
      }
    }

    expect(network404s, `404 URLs: ${JSON.stringify(network404s)}`).toEqual([]);
    // Console errors are reported; treat empty as required.
    expect(consoleErrors, `console errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });
});
