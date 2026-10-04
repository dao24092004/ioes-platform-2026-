/** Wave 4 / subagent 2C — Integration: NotificationsPage (admin, */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import NotificationsPage from '@/pages/admin/NotificationsPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';
import { notificationApi, type NotificationRecord } from '@/services/api/notification.api';

const ADMIN_ID = '00000000-0000-0000-0000-000000000002';

const envelope = <T,>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-09-01T00:00:00.000Z',
});

/** Bilingual: the UI ships Vietnamese first, English after a language switch. */
const STATUS = {
  pending: /đang chờ|pending/i,
  sent: /đã gửi|sent/i,
  failed: /thất bại|failed/i,
  retrying: /đang thử lại|retrying/i,
  all: /tất cả|all/i,
} as const;
const INBOX_ERROR = /không tải được thông báo|couldn't load your notifications/i;
const SEND_FAILED = /gửi thất bại|send failed/i;
const SENT_FLASH = /đã gửi!|sent!/i;
const NO_DATA = /chưa có dữ liệu|no data yet/i;
/** Unanchored: the notification meta line is "<relative time> · <recipient>". */
const DAYS_AGO = /\d+ (ngày trước|d ago)/;

const record = (over: Partial<NotificationRecord>): NotificationRecord => ({
  id: 'n-1',
  userId: ADMIN_ID,
  type: 'email',
  recipient: 'hocvien@ioes.test',
  subject: 'Kết quả thi giữa kỳ',
  status: 'sent',
  // Fixed old timestamp: formatRelative always renders this in days.
  sentAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const statsPayload = {
  total: 12,
  pending: 1,
  sent: 9,
  failed: 1,
  retrying: 1,
  email: 8,
  push: 2,
  sms: 1,
  inApp: 1,
};

type GetReply = { data: ApiEnvelope<unknown> } | Promise<{ data: ApiEnvelope<unknown> }>;

/** Route the page's three reads to per-endpoint outcomes. */
const makeGetImpl = (opts: {
  stats?: () => GetReply;
  inbox?: () => GetReply;
  templates?: () => GetReply;
}) =>
  // `apiClient.get` is a generic axios method, so `mockImplementation` demands a
  // full `AxiosResponse`. These factories only ever need `.data` — the pages under
  // test read nothing else — so the cast is taken here, once, at the boundary.
  ((url: string) => {
    const u = String(url ?? '');
    if (u.includes('/api/notifications/stats')) {
      return opts.stats ? opts.stats() : Promise.resolve({ data: envelope(statsPayload) });
    }
    if (u.includes('/api/notifications/user/')) {
      return opts.inbox ? opts.inbox() : Promise.resolve({ data: envelope([]) });
    }
    if (u.includes('/api/notifications/templates')) {
      return opts.templates ? opts.templates() : Promise.resolve({ data: envelope([]) });
    }
    return Promise.resolve({ data: envelope(null) });
  }) as unknown as typeof apiClient.get;

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <NotificationsPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

/**
 * Fill a controlled input with ONE input event.
 *
 * The broadcast form has four free-text fields and `user.type()` re-reads the
 * controlled DOM value before every character, so under load React's re-render
 * lands after the read and the characters interleave. `paste()` is still a
 * real user gesture but fires a single input event — exact and cheap.
 */
const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  el: HTMLElement,
  text: string
): Promise<void> => {
  await user.clear(el);
  await user.paste(text);
};

const RECIPIENT = 'hocvien@ioes.test';
const SUBJECT = '  Thông báo kỳ thi giữa kỳ  ';
const CONTENT = '  Kỳ thi mở cửa lúc 8h ngày 10/10.  ';
/** Subject/message with the outer whitespace stripped — the page trims on send. */
const SUBJECT_TRIMMED = 'Thông báo kỳ thi giữa kỳ';
const CONTENT_TRIMMED = 'Kỳ thi mở cửa lúc 8h ngày 10/10.';

const fillBroadcastForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await fill(user, screen.getByTestId('admin-broadcast-recipient'), RECIPIENT);
  await fill(user, screen.getByTestId('admin-broadcast-title'), SUBJECT);
  await fill(user, screen.getByTestId('admin-broadcast-message'), CONTENT);
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: ADMIN_ID,
      email: 'admin.ops@ioes.test',
      full_name: 'IOES Ops Admin',
      role: 'admin' as const,
      avatar_url: null,
    },
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NotificationsPage — inbox items, filter pills and templates', () => {
  it('IT-ADMNOTIF-001: should render one item per notification with its subject, status and recipient meta, count each status on its pill, narrow the list from a pill and list the templates', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        inbox: () => ({
          data: envelope([
            record({ id: 'n-1', subject: 'Kết quả thi giữa kỳ', status: 'sent', type: 'email' }),
            record({
              id: 'n-2',
              subject: 'Nhắc nộp bài tập',
              status: 'pending',
              type: 'in_app',
              sentAt: null,
              recipient: 'device-token-abc',
            }),
            record({ id: 'n-3', subject: 'Thông báo hủy lớp', status: 'failed', type: 'email' }),
          ]),
        }),
        templates: () => ({ data: envelope([{ name: 'welcome' }, { name: 'exam-result' }]) }),
      })
    );

    renderPage();

    expect(
      screen.getByRole('heading', { name: /thông báo hệ thống|system notifications/i })
    ).toBeInTheDocument();

    // Three inbox items, each with a subject, a status badge and a meta line.
    const items = await screen.findAllByTestId('admin-notif-item');
    expect(items).toHaveLength(3);

    // Four stat cards off /notifications/stats, in page order.
    const cards = screen.getAllByTestId('analytics-kpi');
    expect(cards).toHaveLength(4);
    await waitFor(() => expect(within(cards[0]!).getByText('12')).toBeInTheDocument());
    expect(within(cards[1]!).getByText('1')).toBeInTheDocument();
    expect(within(cards[2]!).getByText('9')).toBeInTheDocument();
    expect(within(cards[3]!).getByText('1')).toBeInTheDocument();

    expect(within(items[0]!).getByTestId('admin-notif-item-subject')).toHaveTextContent(
      'Kết quả thi giữa kỳ'
    );
    expect(within(items[0]!).getByTestId('admin-notif-item-status')).toHaveTextContent(STATUS.sent);
    expect(within(items[0]!).getByTestId('admin-notif-item-meta')).toHaveTextContent(
      'hocvien@ioes.test'
    );
    expect(within(items[0]!).getByTestId('admin-notif-item-meta')).toHaveTextContent(DAYS_AGO);
    // A pending record has no sentAt, so the meta falls back to createdAt —
    // still a relative time, and the recipient is the device token.
    expect(within(items[1]!).getByTestId('admin-notif-item-subject')).toHaveTextContent(
      'Nhắc nộp bài tập'
    );
    expect(within(items[1]!).getByTestId('admin-notif-item-status')).toHaveTextContent(
      STATUS.pending
    );
    expect(within(items[1]!).getByTestId('admin-notif-item-meta')).toHaveTextContent(
      'device-token-abc'
    );
    expect(within(items[2]!).getByTestId('admin-notif-item-status')).toHaveTextContent(
      STATUS.failed
    );

    // Five pills: "all" plus the four NotificationStatus values, each with the
    // count of that status in the whole inbox.
    const pills = screen.getAllByTestId('admin-notif-filter');
    expect(pills).toHaveLength(5);
    expect(pills[0]).toHaveAttribute('aria-pressed', 'true');
    expect(within(pills[0]!).getByText('3')).toBeInTheDocument();
    expect(within(pills[1]!).getByText('1')).toBeInTheDocument();
    expect(within(pills[2]!).getByText('1')).toBeInTheDocument();
    expect(within(pills[3]!).getByText('1')).toBeInTheDocument();
    // Nothing in this inbox is retrying.
    expect(within(pills[4]!).getByText('0')).toBeInTheDocument();

    // Narrow to the "failed" pill.
    await user.click(screen.getAllByTestId('admin-notif-filter')[3]!);
    await waitFor(() => expect(screen.getAllByTestId('admin-notif-item')).toHaveLength(1));
    expect(screen.getByTestId('admin-notif-item-subject')).toHaveTextContent('Thông báo hủy lớp');
    const afterPill = screen.getAllByTestId('admin-notif-filter');
    expect(afterPill[0]).toHaveAttribute('aria-pressed', 'false');
    expect(afterPill[3]).toHaveAttribute('aria-pressed', 'true');

    // Templates: only the name exists, so the table is one column and the
    // card header shows the row count.
    expect(screen.getByTestId('admin-notif-templates-count')).toHaveTextContent('2');
    expect(screen.getAllByTestId('admin-notif-template-name').map((el) => el.textContent)).toEqual([
      'welcome',
      'exam-result',
    ]);

    // Back to "all" restores the three items.
    await user.click(screen.getAllByTestId('admin-notif-filter')[0]!);
    await waitFor(() => expect(screen.getAllByTestId('admin-notif-item')).toHaveLength(3));
  });
});

describe('NotificationsPage — a read fails', () => {
  it('IT-ADMNOTIF-002: should give the inbox an error branch of its own while a failed templates read falls through to the no-data row, and neither failure disturbs the sibling query', async () => {
    // --- A: only the inbox read fails. ---
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        inbox: () =>
          Promise.reject(new ApiError('Unable to find instance for notification-service', 503)),
        templates: () => ({ data: envelope([{ name: 'welcome' }, { name: 'exam-result' }]) }),
      })
    );

    const first = renderPage();

    expect(await screen.findByTestId('admin-notif-inbox-error')).toHaveTextContent(INBOX_ERROR);
    // The error state replaces the list; the empty state is a different branch.
    expect(screen.queryAllByTestId('admin-notif-item')).toHaveLength(0);
    expect(screen.queryByTestId('admin-notif-inbox-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-notif-inbox-loading')).not.toBeInTheDocument();

    // Counts collapse to zero because the inbox array is undefined.
    for (const pill of screen.getAllByTestId('admin-notif-filter')) {
      expect(within(pill).getByText('0')).toBeInTheDocument();
    }

    // The templates query is independent of the inbox query and still works.
    expect(screen.getByTestId('admin-notif-templates-count')).toHaveTextContent('2');
    expect(screen.getAllByTestId('admin-notif-template-name')).toHaveLength(2);

    // --- B: the templates read fails instead. The page has no template error
    // branch, so `templates` stays undefined and the table renders the SAME
    // no-data row an empty list produces: the admin is never told the fetch
    // failed, only that there is nothing to show. ---
    first.unmount();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        inbox: () => ({ data: envelope([record({ id: 'n-1', status: 'sent' })]) }),
        templates: () =>
          Promise.reject(new ApiError('Unable to find instance for notification-service', 503)),
      })
    );

    renderPage();

    const templateEmpty = await screen.findByTestId('admin-notif-template-empty');
    expect(templateEmpty).toHaveTextContent(NO_DATA);
    expect(screen.queryAllByTestId('admin-notif-template-name')).toHaveLength(0);
    expect(screen.getByTestId('admin-notif-templates-count')).toHaveTextContent('0');

    // The failing read must not disturb the sibling query.
    expect(await screen.findAllByTestId('admin-notif-item')).toHaveLength(1);
    expect(screen.queryByTestId('admin-notif-inbox-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-notif-inbox-empty')).not.toBeInTheDocument();
  });
});

describe('NotificationsPage — the empty branch has three sources: pending, empty list, failed read', () => {
  it('IT-ADMNOTIF-003: should withhold both empty rows while the reads are in flight, then show the em-dash inbox row and the no-data template row with zero counts once both resolve empty', async () => {
    // --- A: both reads still pending. The inbox shows its spinner and the
    // template table shows NEITHER the no-data row nor a name: the "no data"
    // row is gated on `!isTemplatesLoading`, so a slow read must not flash it. ---
    let releaseInbox: ((v: { data: ApiEnvelope<NotificationRecord[]> }) => void) | undefined;
    let releaseTemplates: ((v: { data: ApiEnvelope<{ name: string }[]> }) => void) | undefined;

    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: () => ({ data: envelope(statsPayload) }),
        inbox: () =>
          new Promise((resolve) => {
            releaseInbox = resolve;
          }),
        templates: () =>
          new Promise((resolve) => {
            releaseTemplates = resolve;
          }),
      })
    );

    const pending = renderPage();

    expect(await screen.findByTestId('admin-notif-inbox-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-notif-inbox-empty')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-notif-item')).toHaveLength(0);
    expect(screen.queryByTestId('admin-notif-template-empty')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-notif-template-name')).toHaveLength(0);
    // The count badge falls back to zero while the read is in flight, while
    // the independent stat query has already settled.
    expect(screen.getByTestId('admin-notif-templates-count')).toHaveTextContent('0');
    await waitFor(() =>
      expect(within(screen.getAllByTestId('analytics-kpi')[0]!).getByText('12')).toBeInTheDocument()
    );

    // --- B: both reads resolve with an empty list. The two loading flags clear
    // independently, so settle the inbox first and watch the template table
    // stay blank rather than jump straight to "no data". ---
    await act(async () => {
      releaseInbox?.({ data: envelope([]) });
    });

    expect(await screen.findByTestId('admin-notif-inbox-empty')).toHaveTextContent('—');
    expect(screen.queryByTestId('admin-notif-inbox-loading')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-notif-item')).toHaveLength(0);
    expect(screen.queryByTestId('admin-notif-template-empty')).not.toBeInTheDocument();

    await act(async () => {
      releaseTemplates?.({ data: envelope([]) });
    });

    const templateEmpty = await screen.findByTestId('admin-notif-template-empty');
    expect(templateEmpty).toHaveTextContent(NO_DATA);
    expect(screen.queryAllByTestId('admin-notif-template-name')).toHaveLength(0);
    expect(screen.getByTestId('admin-notif-templates-count')).toHaveTextContent('0');

    // The five pills are all zeroed and "all" is still the active filter.
    const pills = screen.getAllByTestId('admin-notif-filter');
    expect(pills).toHaveLength(5);
    expect(pills[0]).toHaveAttribute('aria-pressed', 'true');
    for (const pill of pills) expect(within(pill).getByText('0')).toBeInTheDocument();

    // The broadcast form is present and untouched by either empty read.
    expect(screen.getByTestId('admin-broadcast-recipient')).toHaveValue('');
    expect(screen.getByTestId('admin-broadcast-send')).toBeDisabled();

    pending.unmount();
  });
});

describe('NotificationsPage — broadcast form gating and a successful send', () => {
  it('IT-ADMNOTIF-004: should keep the send button disabled until recipient, title and message are all non-blank, lock the two unsupported channels, and clear title and message after a successful send', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(makeGetImpl({}));
    vi.mocked(apiClient.post).mockResolvedValue({
      data: envelope(record({ id: 'n-new', status: 'sent', subject: SUBJECT_TRIMMED })),
    });

    renderPage();

    const recipient = screen.getByTestId('admin-broadcast-recipient');
    const title = screen.getByTestId('admin-broadcast-title');
    const message = screen.getByTestId('admin-broadcast-message');
    const send = screen.getByTestId('admin-broadcast-send');

    // Channel radio group: three labels, but the backend can only deliver
    // over email, so the other two ship disabled and email starts selected.
    const channels = screen.getAllByTestId('admin-broadcast-channel');
    expect(channels).toHaveLength(3);
    expect(channels[0]).toBeDisabled();
    expect(channels[1]).toBeEnabled();
    expect(channels[1]).toHaveAttribute('aria-checked', 'true');
    expect(channels[2]).toBeDisabled();

    // The two unsupported channels ignore a click, and re-selecting the one
    // supported channel is idempotent — so the selected channel never moves
    // off `email` and the POST body stays `type: 'email'`.
    await user.click(channels[0]!);
    await user.click(channels[2]!);
    expect(channels[0]).toHaveAttribute('aria-checked', 'false');
    expect(channels[1]).toHaveAttribute('aria-checked', 'true');
    expect(channels[2]).toHaveAttribute('aria-checked', 'false');
    await user.click(channels[1]!);
    expect(channels[1]).toHaveAttribute('aria-checked', 'true');

    // The gate: every one of the three fields is required.
    expect(send).toBeDisabled();
    await fill(user, recipient, RECIPIENT);
    expect(send).toBeDisabled();
    await fill(user, title, SUBJECT);
    expect(send).toBeDisabled();
    await fill(user, message, CONTENT);
    expect(send).toBeEnabled();

    // Whitespace does not count as content — every field is trimmed.
    await fill(user, message, '   ');
    expect(send).toBeDisabled();
    await fill(user, message, CONTENT);
    expect(send).toBeEnabled();
    expect(apiClient.post).not.toHaveBeenCalled();

    await user.click(send);

    // The channel label is translated into the Java enum name, and every
    // free-text field is trimmed before it leaves the browser.
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/notifications/send');
    expect(body).toEqual({
      type: 'email',
      recipient: RECIPIENT,
      subject: SUBJECT_TRIMMED,
      content: CONTENT_TRIMMED,
    });

    // onSuccess clears title and message but deliberately keeps the
    // recipient, so a follow-up broadcast reuses the same address.
    await waitFor(() => expect(title).toHaveValue(''));
    expect(message).toHaveValue('');
    expect(recipient).toHaveValue(RECIPIENT);
    // Nothing failed, so the error paragraph is absent and the button shows
    // the success flash for a couple of seconds.
    expect(screen.queryByTestId('admin-notif-send-error')).not.toBeInTheDocument();
    expect(await within(send).findByText(SENT_FLASH)).toBeInTheDocument();
    // With title and message cleared the gate closes again.
    expect(send).toBeDisabled();
  });
});

describe('NotificationsPage — send failures', () => {
  it('IT-ADMNOTIF-005: should surface the fallback message for a 200 record in status "failed", the ApiError message when the request rejects, and the fallback again when the thrown value is not an ApiError', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(makeGetImpl({}));

    let mode: 'failedRecord' | 'apiError' = 'failedRecord';
    vi.mocked(apiClient.post).mockImplementation(() => {
      if (mode === 'failedRecord') {
        return Promise.resolve({
          data: envelope(record({ id: 'n-1', status: 'failed', sentAt: null })),
        });
      }
      return Promise.reject(new ApiError('Kỳ thi đã khoá, không gửi được thông báo.', 409));
    });

    renderPage();
    await fillBroadcastForm(user);

    const send = screen.getByTestId('admin-broadcast-send');
    const title = screen.getByTestId('admin-broadcast-title');
    const message = screen.getByTestId('admin-broadcast-message');

    // --- A: HTTP 200 whose record is `failed`. DeliveryService catches the
    // exception and still stores the row, so onSuccess must inspect status. ---
    await user.click(send);
    const firstError = await screen.findByTestId('admin-notif-send-error');
    expect(firstError).toHaveTextContent(SEND_FAILED);
    // A failed send must NOT wipe what the admin typed.
    expect(title).toHaveValue(SUBJECT);
    expect(message).toHaveValue(CONTENT);

    // --- B: a real ApiError. Its message is what the admin sees. ---
    mode = 'apiError';
    await user.click(send);
    await waitFor(() =>
      expect(screen.getByTestId('admin-notif-send-error')).toHaveTextContent(
        'Kỳ thi đã khoá, không gửi được thông báo.'
      )
    );
    expect(title).toHaveValue(SUBJECT);

    // --- C: the thrown value is not an ApiError. `notificationApi.send`
    // always funnels through `unwrap` -> `toApiError`, which is why the
    // page's `err instanceof ApiError` guard is a defensive branch; the spy
    // swaps the api call out to reach it without touching src. ---
    const realSend = notificationApi.send;
    notificationApi.send = vi.fn().mockRejectedValue(new Error('boom-not-an-api-error'));
    try {
      await user.click(send);
      await waitFor(() =>
        expect(screen.getByTestId('admin-notif-send-error')).toHaveTextContent(SEND_FAILED)
      );
      // The raw transport message must never be rendered.
      expect(screen.getByTestId('admin-notif-send-error')).not.toHaveTextContent(
        'boom-not-an-api-error'
      );
    } finally {
      notificationApi.send = realSend;
    }

    // The form is still intact and still sendable after three failures.
    expect(title).toHaveValue(SUBJECT);
    expect(message).toHaveValue(CONTENT);
    expect(screen.getByTestId('admin-broadcast-recipient')).toHaveValue(RECIPIENT);
    expect(send).toBeEnabled();
  });
});
