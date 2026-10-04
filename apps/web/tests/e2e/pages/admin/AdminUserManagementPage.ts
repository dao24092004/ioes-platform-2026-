/**
 * Wave 4A (admin) — E2E Page Object: UserManagementPage (`/admin/users`).
 *
 * Wraps every interaction used by `tests/e2e/userManagement.admin.spec.ts`.
 *
 * Safety: this page can write to real user accounts (status, role, delete,
 * password reset). The spec intercepts every mutating request with
 * `page.route()` matched on the URL *pathname*; this page object never issues
 * a request itself and never clicks the shared admin account's own row.
 *
 * The per-row action testids are suffixed with the user id
 * (`admin-users-lock-<id>`, …), so the page object takes the id as a parameter
 * rather than indexing into the row list.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class AdminUserManagementPage {
  readonly page: Page;

  // Stats
  readonly statsGrid: Locator;
  readonly statAll: Locator;
  readonly statStudents: Locator;
  readonly statInstructors: Locator;
  readonly statAdmins: Locator;
  readonly statSuspended: Locator;

  // Filters
  readonly search: Locator;
  readonly roleFilter: Locator;
  readonly statusFilter: Locator;
  readonly sortBy: Locator;

  // Table
  readonly table: Locator;
  readonly tbody: Locator;
  readonly rows: Locator;
  readonly loadingRow: Locator;
  readonly emptyRow: Locator;
  readonly errorRow: Locator;
  readonly selectAll: Locator;

  // Bulk bar
  readonly bulkBar: Locator;
  readonly bulkChangeRole: Locator;
  readonly bulkLock: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly pageInfo: Locator;
  readonly prev: Locator;
  readonly next: Locator;

  // Modals
  readonly detailModal: Locator;
  readonly detailName: Locator;
  readonly detailRole: Locator;
  readonly detailStatus: Locator;
  readonly detailClose: Locator;

  constructor(page: Page) {
    this.page = page;

    this.statsGrid = page.getByTestId('admin-users-stats');
    this.statAll = page.getByTestId('admin-users-stat-all');
    this.statStudents = page.getByTestId('admin-users-stat-student');
    this.statInstructors = page.getByTestId('admin-users-stat-instructor');
    this.statAdmins = page.getByTestId('admin-users-stat-admin');
    this.statSuspended = page.getByTestId('admin-users-stat-suspended');

    this.search = page.getByTestId('admin-users-search');
    this.roleFilter = page.getByTestId('admin-users-role-filter');
    this.statusFilter = page.getByTestId('admin-users-status-filter');
    this.sortBy = page.getByTestId('admin-users-sort');

    this.table = page.getByTestId('admin-users-table');
    this.tbody = page.getByTestId('admin-users-tbody');
    this.rows = page.getByTestId('admin-users-row');
    this.loadingRow = page.getByTestId('admin-users-loading');
    this.emptyRow = page.getByTestId('admin-users-empty');
    this.errorRow = page.getByTestId('admin-users-error');
    this.selectAll = page.getByTestId('admin-users-select-all');

    this.bulkBar = page.getByTestId('admin-users-bulk-bar');
    this.bulkChangeRole = page.getByTestId('admin-users-bulk-role');
    this.bulkLock = page.getByTestId('admin-users-bulk-lock');

    this.pagination = page.getByTestId('admin-users-pagination');
    this.pageInfo = page.getByTestId('admin-users-page-info');
    this.prev = page.getByTestId('admin-users-page-prev');
    this.next = page.getByTestId('admin-users-page-next');

    this.detailModal = page.getByTestId('admin-users-detail-modal');
    this.detailName = page.getByTestId('admin-users-detail-name');
    this.detailRole = page.getByTestId('admin-users-detail-role');
    this.detailStatus = page.getByTestId('admin-users-detail-status');
    this.detailClose = page.getByTestId('admin-users-detail-close');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/users');
  }

  /** Wait until the table has left its loading state. */
  async waitForTable(): Promise<void> {
    await expect(this.loadingRow).toBeHidden();
    await expect(this.table).toBeVisible();
  }

  async expectStatCards(): Promise<void> {
    await expect(this.statsGrid).toBeVisible();
    for (const card of [
      this.statAll,
      this.statStudents,
      this.statInstructors,
      this.statAdmins,
      this.statSuspended,
    ]) {
      await expect(card).toBeVisible();
    }
  }

  async expectRowCount(n: number): Promise<void> {
    await expect(this.rows).toHaveCount(n);
  }

  async expectPageInfo(pattern: RegExp): Promise<void> {
    await expect(this.pageInfo).toHaveText(pattern);
  }

  /** The joined-date cell of one row, keyed by the user id. */
  joinedCell(id: string): Locator {
    return this.page.getByTestId(`admin-users-joined-${id}`);
  }

  /** The avatar <img> of a row that has one. */
  avatar(id: string): Locator {
    return this.page.getByTestId(`admin-users-avatar-${id}`);
  }

  /** The initials fallback of a row with no avatar. */
  initials(id: string): Locator {
    return this.page.getByTestId(`admin-users-initials-${id}`);
  }

  rowCheckbox(id: string): Locator {
    return this.page.getByTestId(`admin-users-row-check-${id}`);
  }

  /**
   * One <tr>, located by the per-row checkbox that carries the user id. The
   * role and status badges have no testid of their own — they are plain spans —
   * so every badge assertion is scoped to the row it belongs to.
   */
  row(id: string): Locator {
    return this.rows.filter({ has: this.rowCheckbox(id) });
  }

  viewButton(id: string): Locator {
    return this.page.getByTestId(`admin-users-view-${id}`);
  }

  resetButton(id: string): Locator {
    return this.page.getByTestId(`admin-users-reset-${id}`);
  }

  deleteButton(id: string): Locator {
    return this.page.getByTestId(`admin-users-delete-${id}`);
  }

  /** Present only while the row's status is `active`. */
  lockButton(id: string): Locator {
    return this.page.getByTestId(`admin-users-lock-${id}`);
  }

  /** Present only while the row's status is `suspended`. */
  unlockButton(id: string): Locator {
    return this.page.getByTestId(`admin-users-unlock-${id}`);
  }

  /** Present only while the row's status is `pending`. */
  approveButton(id: string): Locator {
    return this.page.getByTestId(`admin-users-approve-${id}`);
  }

  pageButton(n: number): Locator {
    return this.page.getByTestId(`admin-users-page-${n}`);
  }

  async openDetail(id: string): Promise<void> {
    await this.viewButton(id).click();
    await expect(this.detailModal).toBeVisible();
  }

  async closeDetail(): Promise<void> {
    await this.detailClose.click();
    await expect(this.detailModal).toBeHidden();
  }
}
