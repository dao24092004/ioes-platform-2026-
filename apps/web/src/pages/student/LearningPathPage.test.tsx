import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getMine, getHistory, getById, generate } = vi.hoisted(() => ({
  getMine: vi.fn(),
  getHistory: vi.fn(),
  getById: vi.fn(),
  generate: vi.fn(),
}));

vi.mock('@/services/api/learning-path.api', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/api/learning-path.api')>(
      '@/services/api/learning-path.api',
    );
  return { ...actual, learningPathApi: { ...actual.learningPathApi, getMine, getHistory, getById, generate } };
});

vi.mock('@/components/layout/StudentLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts.defaultValue === 'string' ? opts.defaultValue : key,
    i18n: { language: 'vi' },
  }),
}));

import LearningPathPage from './LearningPathPage';

/** Dựng client đúng như `App.tsx` (`retry: 1`) để kiểm tra trang tự ghi đè. */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LearningPathPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getMine.mockReset();
  getHistory.mockReset();
  getById.mockReset();
  generate.mockReset();
  getHistory.mockResolvedValue([]);
});

describe('LearningPathPage', () => {
  it('không tự gọi lại lượt đọc lộ trình khi ai-gateway lỗi', async () => {
    getMine.mockRejectedValue(new Error('ai-gateway sập'));

    renderPage();

    await waitFor(() => expect(screen.getByText('error.loadTitle')).toBeInTheDocument());
    expect(getMine).toHaveBeenCalledTimes(1);
    expect(getHistory).toHaveBeenCalledTimes(1);
  });

  it('mở thẳng form khi backend trả về chưa có lộ trình nào', async () => {
    getMine.mockResolvedValue(null);

    renderPage();

    await waitFor(() => expect(screen.getByText('form.heading')).toBeInTheDocument());
    expect(getMine).toHaveBeenCalledTimes(1);
  });
});
