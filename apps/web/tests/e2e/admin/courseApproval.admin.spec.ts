/** Wave 4B (admin) — E2E: /admin/courses/approval */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminCourseApprovalPage } from '../pages/admin/AdminCourseApprovalPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotenvOnce(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadDotenvOnce(path.resolve(__dirname, '..', '..', '..', '.env'));
loadDotenvOnce(path.resolve(__dirname, '..', '..', '..', '..', '..', '.env'));

// The web-admin project depends on the setup project, which needs these. Read
// them WITHOUT ever printing them; the session itself comes from storageState.
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

function catchConsoleErrors(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  const listener: ConsoleErrorListener = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', listener);
  return fn()
    .finally(() => page.off('console', listener))
    .then(() => errors);
}

const STAMP = '2026-06-15T12:00:00Z';

const CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Programming',
    slug: 'lap-trinh',
    description: null,
    parentId: null,
    icon: null,
    sortOrder: 1,
  },
  {
    id: 'cat-2',
    name: 'Design',
    slug: 'thiet-ke',
    description: null,
    parentId: null,
    icon: null,
    sortOrder: 2,
  },
];

const STATS = {
  total: 42,
  draft: 10,
  published: 25,
  archived: 7,
  pendingReview: 5,
  approved: 20,
  rejected: 2,
};

const course = (over: Record<string, unknown>) => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Testing Deep Dive',
  slug: 'react-testing',
  shortDescription: 'A short summary',
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: null,
  difficultyLevel: null,
  language: 'vi',
  status: 'draft',
  reviewStatus: 'pending',
  rejectionReason: null,
  publishedAt: null,
  stats: { enrollments: 12 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
});

const PENDING = course({ id: 'c-pending', title: 'React Testing Deep Dive' });
const APPROVED = course({
  id: 'c-approved',
  title: 'Alpha Published',
  reviewStatus: 'approved',
  categoryId: 'cat-2',
  stats: { enrollments: 41 },
});
const REJECTED = course({
  id: 'c-rejected',
  title: 'Mu Rejected',
  reviewStatus: 'rejected',
  rejectionReason: 'Thiếu mục 3',
  categoryId: null,
  stats: null,
});

const DETAIL = {
  course: PENDING,
  chapters: [
    {
      id: 'ch-1',
      courseId: 'c-pending',
      title: 'Chapter 1',
      description: null,
      sortOrder: 1,
      isFree: null,
      lessons: [0, 1, 2].map((i) => ({
        id: `ch-1-l${i}`,
        chapterId: 'ch-1',
        title: `Lesson ${i}`,
        description: null,
        lessonType: 'video',
        contentUrl: null,
        durationMinutes: null,
        sortOrder: i,
        isFree: null,
        isPreview: null,
      })),
    },
    {
      id: 'ch-2',
      courseId: 'c-pending',
      title: 'Chapter 2',
      description: null,
      sortOrder: 2,
      isFree: null,
      lessons: [0, 1].map((i) => ({
        id: `ch-2-l${i}`,
        chapterId: 'ch-2',
        title: `Lesson ${i}`,
        description: null,
        lessonType: 'video',
        contentUrl: null,
        durationMinutes: null,
        sortOrder: i,
        isFree: null,
        isPreview: null,
      })),
    },
  ],
};

/** content-service DTOs are bare — no envelope wrapper. */
const bare = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/**
 * Intercept every read AND write the page makes.
 *
 * `writes` records each intercepted mutation so the test can prove that no
 * real course was approved or rejected on the shared instance.
 */
async function stubContent(page: Page, writes: { approve: number; reject: number }): Promise<void> {
  // POSTs first: they are the irreversible ones.
  await page.route(
    (url) => url.pathname.startsWith('/api/v1/courses/') && url.pathname.endsWith('/approve'),
    (route) => {
      writes.approve += 1;
      return route.fulfill(bare(PENDING));
    }
  );
  await page.route(
    (url) => url.pathname.startsWith('/api/v1/courses/') && url.pathname.endsWith('/reject'),
    (route) => {
      writes.reject += 1;
      return route.fulfill(bare(PENDING));
    }
  );

  // Reads. `/api/v1/courses/stats` also startsWith `/api/v1/courses`, so the
  // exact-match route below is registered first and wins.
  await page.route(
    (url) => url.pathname === '/api/v1/courses/stats',
    (route) => route.fulfill(bare(STATS))
  );
  await page.route(
    (url) => url.pathname === '/api/v1/categories',
    (route) => route.fulfill(bare(CATEGORIES))
  );
  await page.route(
    (url) => /^\/api\/v1\/courses\/[^/]+\/detail$/.test(url.pathname),
    (route) => route.fulfill(bare(DETAIL))
  );
  await page.route(
    (url) => url.pathname === '/api/v1/courses',
    (route) => {
      const status = new URL(route.request().url()).searchParams.get('reviewStatus');
      const data =
        status === 'approved' ? [APPROVED] : status === 'rejected' ? [REJECTED] : [PENDING];
      return route.fulfill(
        bare({ data, meta: { total: data.length, page: 1, perPage: 50, totalPages: 1 } })
      );
    }
  );
}

test.describe('TC-ADMCOURSE-001: /admin/courses/approval lists the review queue, filters it by status and rejects with a reason, with every write intercepted', () => {
  test('should render one card per course in the pending queue, narrow the list through the stat-card filter, keep Reject disabled until a reason is typed, and reject through the intercepted POST', async ({
    page,
  }) => {
    test.skip(
      !adminEmail || !adminPassword,
      'missing env: TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD'
    );

    const writes = { approve: 0, reject: 0 };
    await stubContent(page, writes);

    const errors = await catchConsoleErrors(page, async () => {
      const approval = new AdminCourseApprovalPage(page);
      await approval.goto();
      await approval.expectLoaded();

      // The page opens on the PENDING queue, not on "all".
      await approval.expectCardCount(1);
      let card = await approval.cardText(0);
      expect(card).toContain('React Testing Deep Dive');
      expect(card).toContain('Programming'); // resolved category name
      expect(card).toMatch(/chờ duyệt|pending/i); // review status badge
      expect(card).toContain('15/06/2026'); // formatDate dd/MM/yyyy
      expect(card).toMatch(/\b12\b/); // courseStat('enrollments')

      // The four stat cards double as the review-status filter.
      await expect(approval.statAll).toContainText('42');
      await expect(approval.statPending).toContainText('5');
      await expect(approval.statApproved).toContainText('20');
      await expect(approval.statRejected).toContainText('2');

      await approval.selectStatus('approved');
      await approval.expectCardCount(1);
      card = await approval.cardText(0);
      expect(card).toContain('Alpha Published');
      expect(card).toContain('Design');
      // An approved course has no review actions, only "view detail".
      await expect(approval.cards.nth(0).getByTestId('admin-course-approval-approve')).toHaveCount(
        0
      );

      await approval.selectStatus('rejected');
      await approval.expectCardCount(1);
      card = await approval.cardText(0);
      expect(card).toContain('Mu Rejected');
      expect(card).toMatch(/chưa phân loại|uncategorized/i); // categoryId === null
      expect(card).toContain('Thiếu mục 3'); // the rejection-reason banner

      // Back to pending and open the preview: the detail query fills the two
      // counters (3 + 2 lessons over 2 chapters).
      await approval.selectStatus('pending');
      await approval.expectCardCount(1);
      await approval.openPreview(0);
      await expect(approval.modal).toBeVisible();
      await expect(approval.modalTitle).toHaveText('React Testing Deep Dive');
      await expect(approval.lessonCount).toHaveText('5');
      await expect(approval.chapterCount).toHaveText('2');

      // The reject action is guarded: a reason is mandatory.
      await expect(approval.modalReject).toBeDisabled();
      await approval.fillReason('   ');
      await expect(approval.modalReject).toBeDisabled();
      await approval.fillReason('Thiếu mục 3');
      await expect(approval.modalReject).toBeEnabled();

      await approval.modalReject.click();
      await approval.expectModalClosed();
    });

    expect(errors).toHaveLength(0);
    // SAFETY PROOF: the mutation was answered from the fixture, so the shared
    // instance was never mutated.
    expect(writes.reject).toBe(1);
    expect(writes.approve).toBe(0);
  });
});
