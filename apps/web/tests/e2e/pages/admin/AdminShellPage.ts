/**
 * Wave 4 (admin) — E2E Page Object: the AdminLayout shell.
 *
 * `AdminLayout` is the chrome every `/admin/*` page renders into. It carries
 * 16 sidebar links, an active-page highlight, a mobile drawer toggle, a role
 * label in the footer, three header controls and a logout control.
 *
 * Two details worth knowing before using this object:
 *
 *  - Each nav link's testid is `admin-shell-nav-<to>`, i.e. it embeds the route
 *    it points at, so `navItem(path)` and the href assertion read the same
 *    string. The path table below is the contract: an item re-pointed in
 *    src/components/layout/AdminLayout.tsx has to change here too.
 *  - The active item is marked with a class pair, not with `aria-current`,
 *    because AdminLayout renders `Link` rather than `NavLink`. So the
 *    highlight is asserted on the class of a testid-selected element; the
 *    selection itself is always by testid.
 *
 * The logout control is exposed so its presence and title can be checked. It
 * must NOT be clicked from a spec: that would end the shared admin session.
 */
import { type Page, type Locator, expect } from '@playwright/test';

/** The 16 sidebar routes, in the order AdminLayout groups them. */
export const ADMIN_NAV_PATHS = [
  '/admin',
  '/admin/analytics',
  '/admin/users',
  '/admin/courses/approval',
  '/admin/instructors/approval',
  '/admin/exams',
  '/admin/discussions',
  '/admin/blockchain',
  '/admin/tenants',
  '/admin/heatmaps',
  '/admin/funnels',
  '/admin/wallet',
  '/admin/security',
  '/admin/audit-log',
  '/admin/notifications',
  '/admin/settings',
] as const;

/** Class AdminLayout puts on the item whose page is open. */
const ACTIVE_CLASS = /bg-blue-50/;
/** Class only the inactive items carry. */
const INACTIVE_CLASS = /text-slate-600/;

/**
 * "Quản trị viên" (vi) / "Admin" (en) / "Super Admin" (both). The shared admin
 * account may be either role, so the label is matched, never pinned to one
 * exact string.
 */
export const ADMIN_ROLE_LABEL = /quản trị|admin/i;

export class AdminShellPage {
  readonly page: Page;

  readonly root: Locator;
  readonly brand: Locator;
  readonly sidebar: Locator;
  readonly sidebarToggle: Locator;
  readonly overlay: Locator;
  readonly nav: Locator;
  readonly header: Locator;
  readonly headerTitle: Locator;
  readonly headerActions: Locator;
  readonly langToggle: Locator;
  readonly themeToggle: Locator;
  readonly notificationsButton: Locator;
  readonly logout: Locator;
  readonly userName: Locator;
  readonly roleLabel: Locator;
  readonly main: Locator;

  constructor(page: Page) {
    this.page = page;

    this.root = page.getByTestId('admin-shell-root');
    this.brand = page.getByTestId('admin-shell-brand');
    this.sidebar = page.getByTestId('admin-shell-sidebar');
    this.sidebarToggle = page.getByTestId('admin-shell-sidebar-toggle');
    this.overlay = page.getByTestId('admin-shell-overlay');
    this.nav = page.getByTestId('admin-shell-nav');
    this.header = page.getByTestId('admin-shell-header');
    this.headerTitle = page.getByTestId('admin-shell-header-title');
    this.headerActions = page.getByTestId('admin-shell-header-actions');
    this.langToggle = page.getByTestId('admin-shell-lang-toggle');
    this.themeToggle = page.getByTestId('admin-shell-theme-toggle');
    this.notificationsButton = page.getByTestId('admin-shell-notifications-button');
    this.logout = page.getByTestId('admin-shell-logout');
    this.userName = page.getByTestId('admin-shell-user-name');
    this.roleLabel = page.getByTestId('admin-shell-role-label');
    this.main = page.getByTestId('admin-shell-main');
  }

  /** The sidebar link that points at `path`. */
  navItem(path: string): Locator {
    return this.page.getByTestId(`admin-shell-nav-${path}`);
  }

  async goto(path = '/admin'): Promise<void> {
    await this.page.goto(path);
    await expect(this.root).toBeVisible();
  }

  /**
   * Every nav item is a link, points where it says, and has a label.
   * Ten of the sixteen carry a count badge, so the label is a substring match.
   */
  async expectNavComplete(paths: readonly string[] = ADMIN_NAV_PATHS): Promise<void> {
    await expect(this.brand).toHaveAttribute('href', '/');
    await expect(this.nav).toBeVisible();
    for (const path of paths) {
      const item = this.navItem(path);
      await expect(item, `${path} should be a link`).toBeVisible();
      await expect(item, `${path} href`).toHaveAttribute('href', path);
      const label = ((await item.textContent()) ?? '').trim();
      expect(label.length, `${path} label`).toBeGreaterThan(0);
    }
  }

  /** The item for the open page is highlighted. */
  async expectActiveNav(path: string): Promise<void> {
    await expect(this.navItem(path)).toHaveClass(ACTIVE_CLASS);
  }

  /** Any other item is not highlighted. */
  async expectInactiveNav(path: string): Promise<void> {
    const item = this.navItem(path);
    await expect(item).toHaveClass(INACTIVE_CLASS);
    await expect(item).not.toHaveClass(ACTIVE_CLASS);
  }

  /** The footer names the signed-in admin and an admin-level role. */
  async expectAdminIdentity(): Promise<void> {
    await expect(this.userName).toBeVisible();
    await expect(this.roleLabel).toHaveText(ADMIN_ROLE_LABEL);
  }

  /** The three header controls plus the logout control are all present. */
  async expectHeaderControls(): Promise<void> {
    await expect(this.header).toBeVisible();
    await expect(this.headerTitle).toBeVisible();
    await expect(this.headerActions).toBeVisible();
    await expect(this.langToggle).toBeVisible();
    await expect(this.themeToggle).toBeVisible();
    await expect(this.notificationsButton).toBeVisible();
    await expect(this.logout).toBeVisible();
    // The logout control is only inspected, never clicked.
    await expect(this.logout).toHaveAttribute('title', /đăng xuất|logout|sign out/i);
  }

  /**
   * Open the mobile drawer and close it again with the toggle.
   * The toggle is `lg:hidden`, so the viewport has to be phone-sized first.
   */
  async expectDrawerToggles(): Promise<void> {
    await expect(this.overlay).toHaveCount(0);
    await expect(this.sidebar).toHaveClass(/-translate-x-full/);

    await this.sidebarToggle.click();
    await expect(this.overlay).toBeVisible();
    await expect(this.sidebar).toHaveClass(/translate-x-0/);

    await this.sidebarToggle.click();
    await expect(this.overlay).toHaveCount(0);
    await expect(this.sidebar).toHaveClass(/-translate-x-full/);
  }
}
