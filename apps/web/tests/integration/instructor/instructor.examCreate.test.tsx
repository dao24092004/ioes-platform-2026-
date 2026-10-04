/** Wave 3C — Integration: ExamCreatePage (instructor, /instructor/exams/create) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

import ExamCreatePage from '@/pages/instructor/ExamCreatePage';
import I18nProvider from '@/app/providers/I18nProvider';

const renderExamCreate = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/instructor/exams/create']}>
          <ExamCreatePage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'i-1',
      email: 'instructor@ioes.test',
      full_name: 'Giang Vien Mot',
      role: 'instructor' as const,
      avatar_url: null,
    },
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
});

describe('ExamCreatePage — ComingSoon copy', () => {
  it('IT-IEXAMCREATE-001: should render the ComingSoon badge, title, description and both missing-backend bullets when the create route is opened', () => {
    renderExamCreate();

    // ComingSoon's own <h1> is the feature name. InstructorLayout renders a
    // second <h1> ("Tạo bài thi mới"), so scope by testid, not by role.
    const title = screen.getByTestId('coming-soon-title');
    expect(title).toHaveTextContent('Tạo bài thi');

    // Badge and the no-fake-data disclaimer that explain why there is no form.
    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
    expect(
      screen.getByText('Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.')
    ).toBeInTheDocument();

    // Description.
    expect(
      screen.getByText('Soạn đề thi, chọn câu hỏi, đặt thời lượng và tuỳ chọn giám thị.')
    ).toBeInTheDocument();

    // The two bullets name exactly what the backend still has to provide, so
    // an instructor is not left guessing why the button is missing.
    const missing = screen.getByText('Còn thiếu');
    const missingBlock = missing.parentElement as HTMLElement;
    const items = within(missingBlock).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('exam-suite chưa có POST /exams để lưu đề thi');
    expect(items[1]).toHaveTextContent('Chưa có API gắn câu hỏi vào đề (exam_sections)');

    // A ComingSoon page must not offer a form control that cannot work. Scope
    // to the card — the InstructorLayout chrome legitimately has buttons.
    const comingSoonCard = title.parentElement as HTMLElement;
    expect(within(comingSoonCard).queryByRole('button')).not.toBeInTheDocument();
    expect(within(comingSoonCard).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(comingSoonCard).queryByRole('link')).not.toBeInTheDocument();
  });
});
