/**
 * Wave 4 (admin) — E2E Page Object: the placeholder admin pages.
 *
 * All ten pages under `src/pages/admin/` that are still `ComingSoon`
 * wrappers render the same block inside `AdminLayout`:
 *
 *     <div data-testid="admin-coming-<slug>">
 *       <ComingSoon title description missing />
 *     </div>
 *
 * `ComingSoon` puts a single stable hook on its heading
 * (`data-testid="coming-soon-title"`); the rest of the block is read
 * structurally from it, so the object survives a copy change. The three
 * strings that are NOT structurally addressable (the badge, the
 * "what is missing" heading and the "no sample data" footer) are matched with
 * bilingual regexes because the app ships Vietnamese by default and the admin
 * can flip it to English from the same header.
 */
import { type Page, type Locator, expect } from '@playwright/test';

/** One placeholder admin page: its wrapper slug and the route it is mounted at. */
export interface AdminComingSoonTarget {
  /** Matches the `data-testid` of the wrapper div the page renders. */
  slug: string;
  /** Route the page is registered under in src/app/router/routes.tsx. */
  path: string;
}

/** Every placeholder admin page, in nav order. */
export const ADMIN_COMING_SOON_PAGES: AdminComingSoonTarget[] = [
  { slug: 'discussions', path: '/admin/discussions' },
  { slug: 'tenant-detail', path: '/admin/tenants/t-42' },
  { slug: 'tenants', path: '/admin/tenants' },
  { slug: 'instructor-approval', path: '/admin/instructors/approval' },
  { slug: 'blockchain', path: '/admin/blockchain' },
  { slug: 'heatmaps', path: '/admin/heatmaps' },
  { slug: 'funnels', path: '/admin/funnels' },
  { slug: 'wallet', path: '/admin/wallet' },
  { slug: 'security', path: '/admin/security' },
  { slug: 'audit-log', path: '/admin/audit-log' },
];

/** Vietnamese + English wording of the ComingSoon chrome. */
export const COMING_SOON_BADGE = /sắp phát triển|coming soon/i;
export const COMING_SOON_MISSING_HEADING = /còn thiếu|what is missing/i;
export const COMING_SOON_NO_FAKE_DATA = /không hiển thị dữ liệu mẫu|no sample data/i;

export class AdminComingSoonPage {
  readonly page: Page;
  readonly slug: string;
  readonly path: string;

  /** The wrapper div this page renders inside AdminLayout. */
  readonly wrapper: Locator;
  /** ComingSoon's h1 — the feature name. */
  readonly title: Locator;
  /** The paragraph right after the h1: what the feature will do. */
  readonly description: Locator;
  /** "Sắp phát triển" / "Coming soon". */
  readonly badge: Locator;
  /** "Còn thiếu" / "What is missing". */
  readonly missingHeading: Locator;
  /** One <li> per `missing` entry. */
  readonly missingItems: Locator;
  /** The "this page shows no sample data" footer line. */
  readonly noFakeData: Locator;
  /** AdminLayout's header h1, which repeats the feature name. */
  readonly headerTitle: Locator;

  constructor(page: Page, target: AdminComingSoonTarget) {
    this.page = page;
    this.slug = target.slug;
    this.path = target.path;

    this.wrapper = page.getByTestId(`admin-coming-${target.slug}`);
    this.title = page.getByTestId('coming-soon-title');
    this.description = page.locator('[data-testid="coming-soon-title"] + p');
    this.badge = page.getByText(COMING_SOON_BADGE).first();
    this.missingHeading = page.getByText(COMING_SOON_MISSING_HEADING);
    this.missingItems = page.locator('[data-testid="coming-soon-title"] ~ div ul > li');
    this.noFakeData = page.getByText(COMING_SOON_NO_FAKE_DATA);
    this.headerTitle = page.getByTestId('admin-shell-header-title');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  /** The feature name exactly as rendered. */
  async readTitle(): Promise<string> {
    return ((await this.title.textContent()) ?? '').trim();
  }

  /** The description exactly as rendered. */
  async readDescription(): Promise<string> {
    return ((await this.description.textContent()) ?? '').trim();
  }

  /** The bullet list, one entry per `missing` item, bullet marker stripped. */
  async readMissingItems(): Promise<string[]> {
    return (await this.missingItems.allTextContents()).map((text) => text.replace('•', '').trim());
  }

  /** The whole placeholder block is on screen, inside AdminLayout. */
  async expectPlaceholder(): Promise<void> {
    await expect(this.wrapper).toBeVisible();
    await expect(this.title).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.badge).toBeVisible();
    // The page is mounted in the admin shell, not on a bare route.
    await expect(this.page.getByTestId('admin-shell-root')).toBeVisible();
    await expect(this.headerTitle).toHaveText(await this.readTitle());
  }

  /** The bullet list is present and explains more than nothing. */
  async expectMissingList(): Promise<void> {
    await expect(this.missingHeading).toBeVisible();
    await expect(this.missingItems.first()).toBeVisible();
    expect(await this.missingItems.count()).toBeGreaterThan(1);
  }

  /** The "no sample data" promise is what makes the empty page trustworthy. */
  async expectNoFakeDataNotice(): Promise<void> {
    await expect(this.noFakeData).toBeVisible();
  }
}
