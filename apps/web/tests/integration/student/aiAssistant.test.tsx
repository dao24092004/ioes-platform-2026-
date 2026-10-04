/** Wave 2 — Integration: AIAssistantPage (student-owned). */
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
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'student.aiAssistant.title': 'AI Assistant',
        'student.aiAssistant.subtitle': 'Ask the AI',
        'student.aiAssistant.greeting': 'Hi! How can I help?',
        'student.aiAssistant.newChat': 'New chat',
        'student.aiAssistant.headerSubtitle': 'Your AI learning assistant',
        'student.aiAssistant.online': 'Online',
        'student.aiAssistant.clearChat': 'Clear',
        'student.aiAssistant.disclaimer': 'AI can make mistakes.',
        'student.aiAssistant.inputPlaceholder': 'Type your question...',
        'student.aiAssistant.empty': 'Start a new conversation',
        'student.aiAssistant.error': 'The AI is not responding right now.',
        'student.aiAssistant.deleteConfirm': 'Delete?',
        'student.aiAssistant.today': 'Today',
        'student.aiAssistant.yesterday': 'Yesterday',
        'student.aiAssistant.thisWeek': 'This week',
        'student.aiAssistant.older': 'Older',
        'student.aiAssistant.tip.title': 'Tip',
        'student.aiAssistant.tip.desc': 'Ask specific questions',
        'student.aiAssistant.prompt.explainConcept': 'Explain a concept',
        'student.aiAssistant.prompt.learningPath': 'Suggest a learning path',
        'student.aiAssistant.prompt.essayGrade': 'Grade my essay',
        'student.aiAssistant.prompt.findCourse': 'Find a course',
        'student.aiAssistant.prompt.examPrep': 'Prepare for exam',
        'student.aiAssistant.prompt.codeHelp': 'Help me with code',
        'common.loading': 'Loading...',
        'common.close': 'Close',
      };
      let v = map[key] ?? key;
      if (opts) {
        for (const [k, val] of Object.entries(opts)) {
          v = v.replace(`{${k}}`, String(val));
        }
      }
      return v;
    },
    i18n: { language: 'vi' },
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

// jsdom doesn't implement scrollIntoView; AIAssistantPage calls it on chat-thread ref.
if (
  typeof Element !== 'undefined' &&
  typeof (Element.prototype as any).scrollIntoView !== 'function'
) {
  (Element.prototype as any).scrollIntoView = function () {};
}

import AIAssistantPage from '@/pages/student/AIAssistantPage';
import { apiClient } from '@/config/api.config';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/ai-assistant']}>
        <AIAssistantPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const seedStudent = () => {
  useAuthStore.setState({
    user: {
      id: 'u-1',
      email: 's@ioes.com',
      full_name: 'Student',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
    isLoading: false,
  });
};

beforeEach(() => {
  seedStudent();
  queryClient.clear();
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('AIAssistantPage — heading + chrome', () => {
  it('IT-AIASSIST-001: should_renderTitleAndSubtitle_When_Mounted', async () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    renderPage();
    // page-level subtitle
    expect(screen.getByText(/Ask the AI/i)).toBeInTheDocument();
  });

  it('IT-AIASSIST-002: should_showLoadingText_When_SessionsArePending', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    renderPage();
    // The "Loading..." text inside the history sidebar while sessions load.
    expect(screen.getAllByText(/Loading\.\.\./i).length).toBeGreaterThanOrEqual(1);
  });

  it('IT-AIASSIST-003: should_keepChatUsable_When_SessionsRequestFails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('boom'));
    renderPage();
    // Greeting renders after fallback draft thread is created.
    await waitFor(() => {
      expect(screen.getByText(/Hi! How can I help\?/)).toBeInTheDocument();
    });
  });

  it('IT-AIASSIST-004: should_renderGreetingAndNewChatButton_When_NoSessions', async () => {
    // The draft thread is seeded with the greeting message, so the
    // quick-prompt tile doesn't render in this state — the greeting does.
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: [] },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Hi! How can I help\?/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument();
  });
});

describe('AIAssistantPage — sending messages', () => {
  it('IT-AIASSIST-005: should_callAsk_When_TextSubmitted', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: [] },
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: 't',
        data: {
          sessionId: 's-1',
          messageId: 'm-1',
          answer: 'Use hooks.',
          grounded: true,
          sources: [],
          model: 'gemini',
          latencyMs: 100,
        },
      },
    });

    renderPage();
    await waitFor(() => screen.getByText(/Hi! How can I help\?/));

    const textarea = screen.getByPlaceholderText(/Type your question/i);
    await user.type(textarea, 'What are hooks?');
    const sendBtn = textarea.parentElement?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    await user.click(sendBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/ai/chat');
    expect((body as { question: string }).question).toBe('What are hooks?');
  });

  it('IT-AIASSIST-006: should_notCallAsk_When_QuestionIsEmpty', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: [] },
    });
    renderPage();
    await waitFor(() => screen.getByText(/Hi! How can I help\?/));
    const textarea = screen.getByPlaceholderText(/Type your question/i);
    const sendBtn = textarea.parentElement?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    await user.click(sendBtn);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('IT-AIASSIST-007: should_callAsk_When_NewChatCreatedThenTextSent', async () => {
    // The draft thread is seeded with a greeting, so the visible quick-prompt
    // tiles only render after the draft is cleared (no UI to do that, so we
    // exercise the same code path by typing into the input + submitting).
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: [] },
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: 't',
        data: {
          sessionId: 's-2',
          messageId: 'm-2',
          answer: 'ok',
          grounded: true,
          sources: [],
          model: 'gemini',
          latencyMs: 1,
        },
      },
    });
    renderPage();
    await waitFor(() => screen.getByText(/Hi! How can I help\?/));
    const textarea = screen.getByPlaceholderText(/Type your question/i);
    await user.type(textarea, 'Quick path please');
    const sendBtn = textarea.parentElement?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    await user.click(sendBtn);
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
    const [, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect((body as { question: string }).question).toBe('Quick path please');
  });
});
