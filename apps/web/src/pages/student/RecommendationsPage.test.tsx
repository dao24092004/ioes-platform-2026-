import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// vi.mock được kéo lên đầu file nên biến dùng trong factory phải khai bằng
// vi.hoisted, giống các test api khác.
const { getCourseRecommendations, listCategories } = vi.hoisted(() => ({
  getCourseRecommendations: vi.fn(),
  listCategories: vi.fn(),
}));

vi.mock('@/services/api/recommendations.api', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/api/recommendations.api')>(
      '@/services/api/recommendations.api',
    );
  return { ...actual, recommendationsApi: { getCourseRecommendations } };
});

vi.mock('@/services/api/content.api', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/api/content.api')>('@/services/api/content.api');
  return { ...actual, contentApi: { listCategories } };
});

// Layout kéo theo sidebar, auth store và i18n đầy đủ; ở đây chỉ cần phần thân.
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

import RecommendationsPage from './RecommendationsPage';

/**
 * QueryClient dựng đúng như `App.tsx` (`retry: 1`), để test thật sự chứng minh
 * trang tự ghi đè chứ không ăn may vì client trong test đã tắt retry sẵn.
 */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getCourseRecommendations.mockReset();
  listCategories.mockReset();
  listCategories.mockResolvedValue([]);
});

describe('RecommendationsPage', () => {
  it('không tự gọi lại khi backend lỗi, lỗi hiện ngay sau một lượt', async () => {
    // Mỗi lượt thử lại nhân đôi thời gian người dùng phải chờ trước khi thấy
    // lỗi thật (timeout của request cộng dồn), mà kết quả vẫn đúng lỗi đó.
    getCourseRecommendations.mockRejectedValue(new Error('ai-gateway sập'));

    renderPage();

    await waitFor(() => expect(screen.getByText('error.title')).toBeInTheDocument());
    expect(getCourseRecommendations).toHaveBeenCalledTimes(1);
  });

  it('hiện danh sách rỗng của backend chứ không dựng dữ liệu thay', async () => {
    getCourseRecommendations.mockResolvedValue({
      items: [],
      strategy: 'embedding+rules',
      generatedAt: '2026-09-21T00:00:00.000Z',
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('empty.title')).toBeInTheDocument());
    expect(getCourseRecommendations).toHaveBeenCalledTimes(1);
  });
});
