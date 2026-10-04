/** Wave 3D — Integration: AIAssistantPage (instructor, /instructor/ai-assistant). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const strings: Record<string, string> = {
        'instructor.aiAssistant.title': 'Trợ lý AI',
        'instructor.aiAssistant.subtitle': 'Hỏi đáp về học liệu của bạn',
        'instructor.aiAssistant.greeting': 'Chào giảng viên, tôi có thể giúp gì?',
        'instructor.aiAssistant.newChat': 'Cuộc trò chuyện mới',
        'instructor.aiAssistant.empty': 'Chưa có cuộc trò chuyện nào',
        'instructor.aiAssistant.today': 'Hôm nay',
        'instructor.aiAssistant.headerSubtitle': 'Trợ lý AI cho giảng viên',
        'instructor.aiAssistant.online': 'Đang hoạt động',
        'instructor.aiAssistant.clearChat': 'Xoá cuộc trò chuyện',
        'instructor.aiAssistant.deleteConfirm': 'Xoá phiên',
        'instructor.aiAssistant.inputPlaceholder': 'Nhập câu hỏi của bạn...',
        'instructor.aiAssistant.disclaimer':
          'Câu trả lời do AI sinh ra, hãy kiểm tra lại trước khi dùng.',
        'instructor.aiAssistant.error': 'Không gửi được câu hỏi',
        'instructor.aiAssistant.tip.title': 'Mẹo',
        'instructor.aiAssistant.tip.desc': 'Hỏi về một bài cụ thể để có căn cứ.',
        'instructor.aiAssistant.prompt.courseIdea': 'Gợi ý ý tưởng khóa học',
        'common.loading': 'Đang tải...',
        'common.close': 'Đóng',
        'sidebar.role.instructor': 'Giảng viên',
        'header.logout': 'Đăng xuất',
        'header.notifications': 'Thông báo',
        'header.toggleTheme': 'Đổi giao diện',
        'shared.menu': 'Menu',
      };
      return strings[key] ?? fallback ?? key;
    },
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

if (typeof globalThis.IntersectionObserver === 'undefined') {
  (
    globalThis as unknown as { IntersectionObserver: new () => IntersectionObserver }
  ).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    scrollMargin = '';
  };
}

// jsdom has no layout engine, so scrollIntoView is missing.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}

import AIAssistantPage from '@/pages/instructor/AIAssistantPage';
import { apiClient } from '@/config/api.config';

const TS = '2026-10-04T00:00:00.000Z';

const envelope = <T,>(data: T) => ({ data: { success: true, message: 'ok', timestamp: TS, data } });

const storedSession = {
  id: 's-1',
  userId: 'u-inst-1',
  title: 'Soạn giáo án mảng',
  status: 'active',
  messageCount: 2,
  lastMessageAt: '2026-10-04T01:00:00.000Z',
  metadata: {},
  createdAt: '2026-10-03T01:00:00.000Z',
  updatedAt: '2026-10-04T01:00:00.000Z',
};

const chatTurn = {
  sessionId: 's-new',
  messageId: 'm-9',
  answer: 'Dưới đây là gợi ý giáo án cho bài mảng.',
  grounded: true,
  sources: [{ docId: 'd1', chunkId: 'c1', title: 'Mảng', score: 0.9 }],
  model: 'gemini',
  latencyMs: 900,
};

/** Serve the session list; the history endpoint is not exercised here. */
const mockSessions = (sessions: unknown[]) => {
  vi.mocked(apiClient.get).mockImplementation((url: string) =>
    Promise.resolve(url === '/api/ai/chat/sessions' ? envelope(sessions) : envelope([]))
  );
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/instructor/ai-assistant']}>
        <AIAssistantPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'u-inst-1', email: 'gv@ioes.com', full_name: 'Nguyễn Vân An', role: 'instructor' },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
    isLoading: false,
  });
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('AIAssistantPage — session list on mount', () => {
  it('IT-IAIASSIST-001: should list the stored session in the sidebar and open a draft thread carrying the greeting', async () => {
    mockSessions([storedSession]);
    renderPage();

    // Draft thread: `listSessions()` resolves, then the page appends its own
    // draft so a first-time instructor can still chat.
    expect(await screen.findByText('Soạn giáo án mảng')).toBeInTheDocument();
    // The draft title shows twice: as the sidebar entry and as the chat-panel
    // heading of the active thread.
    expect((await screen.findAllByText('Cuộc trò chuyện mới')).length).toBeGreaterThanOrEqual(1);
    // Both live under the "Hôm nay" bucket, and neither under the empty copy.
    expect(screen.getByText('Hôm nay')).toBeInTheDocument();
    expect(screen.queryByText('Chưa có cuộc trò chuyện nào')).toBeNull();
    // The active thread is the draft, which greets the instructor.
    expect(await screen.findByTestId('instructor-aiassistant-message-assistant')).toHaveTextContent(
      'Chào giảng viên, tôi có thể giúp gì?'
    );
    expect(apiClient.get).toHaveBeenCalledWith('/api/ai/chat/sessions');
  });

  it('IT-IAIASSIST-002: should send a padded prompt trimmed, without a sessionId, and render both the question and the answer', async () => {
    mockSessions([storedSession]);
    vi.mocked(apiClient.post).mockResolvedValue(envelope(chatTurn));
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('instructor-aiassistant-input');

    await user.type(
      screen.getByTestId('instructor-aiassistant-input'),
      '   Soạn giáo án giúp tôi   '
    );
    await user.click(screen.getByTestId('instructor-aiassistant-send'));

    // `send()` trims before calling the API, so the wire payload is clean and
    // the first turn of a draft thread must not invent a sessionId.
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/ai/chat');
    expect(body).toEqual({ question: 'Soạn giáo án giúp tôi' });

    expect(await screen.findByTestId('instructor-aiassistant-message-user')).toHaveTextContent(
      'Soạn giáo án giúp tôi'
    );
    // Two assistant bubbles: the greeting plus the answer.
    expect(
      (await screen.findAllByTestId('instructor-aiassistant-message-assistant')).map(
        (n) => n.textContent
      )
    ).toContain('Dưới đây là gợi ý giáo án cho bài mảng.');
    // The input is emptied and the draft thread takes the question as its title.
    expect(screen.getByTestId('instructor-aiassistant-input')).toHaveValue('');
  });

  it('IT-IAIASSIST-003: should keep the send control disabled and post nothing while the prompt is empty or whitespace only', async () => {
    mockSessions([storedSession]);
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByTestId('instructor-aiassistant-input');
    const send = screen.getByTestId('instructor-aiassistant-send');

    // Empty prompt.
    expect(send).toBeDisabled();

    // Whitespace-only prompt: `disabled={!input.trim() ...}` so the control
    // unlocks only for a prompt with at least one non-space character.
    await user.type(input, '     ');
    expect(send).toBeDisabled();

    // Enter on the textarea is guarded by the same check in `send()`.
    await user.type(input, '{Enter}');

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.queryByTestId('instructor-aiassistant-message-user')).toBeNull();
  });

  it('IT-IAIASSIST-004: should show the backend message in the error banner and as an assistant bubble when a turn is rejected', async () => {
    mockSessions([storedSession]);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: false, message: 'Bạn đã vượt giới hạn 10 lượt mỗi phút', timestamp: TS },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('instructor-aiassistant-input');

    await user.type(screen.getByTestId('instructor-aiassistant-input'), 'Câu hỏi bị từ chối');
    await user.click(screen.getByTestId('instructor-aiassistant-send'));

    const banner = await screen.findByTestId('instructor-aiassistant-error');
    expect(banner).toHaveTextContent('Bạn đã vượt giới hạn 10 lượt mỗi phút');
    // The question stays in the transcript and the refusal is appended, so
    // the answer is never silently dropped.
    expect(screen.getByTestId('instructor-aiassistant-message-user')).toHaveTextContent(
      'Câu hỏi bị từ chối'
    );
    expect(
      (await screen.findAllByTestId('instructor-aiassistant-message-assistant')).map(
        (n) => n.textContent
      )
    ).toContain('Bạn đã vượt giới hạn 10 lượt mỗi phút');
    // Dismissing the banner only clears the banner.
    await user.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByTestId('instructor-aiassistant-error')).toBeNull();
  });

  it('IT-IAIASSIST-005: should load a stored session on click and reduce it to the greeting after the clear button', async () => {
    mockSessions([storedSession]);
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/api/ai/chat/sessions') return Promise.resolve(envelope([storedSession]));
      // Opening a stored session is the only caller of `getHistory`.
      if (url === '/api/ai/chat/s-1') {
        return Promise.resolve(
          envelope([
            {
              id: 'm-1',
              sessionId: 's-1',
              role: 'user' as const,
              content: 'Soạn giáo án mảng giúp tôi',
              sources: [],
              model: null,
              promptTokens: 12,
              completionTokens: null,
              createdAt: '2026-10-04T01:00:00.000Z',
            },
            {
              id: 'm-2',
              sessionId: 's-1',
              role: 'assistant' as const,
              content: 'Dưới đây là giáo án cho bài mảng.',
              sources: [],
              model: 'gemini',
              promptTokens: 12,
              completionTokens: 90,
              createdAt: '2026-10-04T01:00:02.000Z',
            },
          ])
        );
      }
      return Promise.resolve(envelope([]));
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('instructor-aiassistant-input');

    // The stored session carries no messages until it is opened.
    await user.click(await screen.findByText('Soạn giáo án mảng'));

    expect(apiClient.get).toHaveBeenCalledWith('/api/ai/chat/s-1');
    expect(await screen.findByTestId('instructor-aiassistant-message-user')).toHaveTextContent(
      'Soạn giáo án mảng giúp tôi'
    );
    expect(
      (await screen.findAllByTestId('instructor-aiassistant-message-assistant')).map(
        (n) => n.textContent
      )
    ).toEqual(['Dưới đây là giáo án cho bài mảng.']);

    // The clear button wipes what is on screen — client side only: the
    // transcript still lives in the backend session.
    await user.click(screen.getByTestId('instructor-aiassistant-clear'));
    expect(
      (await screen.findAllByTestId('instructor-aiassistant-message-assistant')).map(
        (n) => n.textContent
      )
    ).toEqual(['Chào giảng viên, tôi có thể giúp gì?']);
    expect(screen.queryByTestId('instructor-aiassistant-message-user')).toBeNull();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
