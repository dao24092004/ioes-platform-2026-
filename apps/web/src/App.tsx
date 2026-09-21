import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import I18nProvider from './app/providers/I18nProvider';
import ThemeProvider from './app/providers/ThemeProvider';
import AppRoutes from './app/router/routes';

/**
 * QueryClient duy nhất của ứng dụng.
 *
 * Trước đây `app/providers/QueryProvider.tsx` dựng thêm một client y hệt nhưng
 * không nằm trong cây render — sửa retry hay staleTime ở đó thì không có tác
 * dụng gì mà rất khó nhận ra. File đó đã bị xoá; mọi thay đổi mặc định phải
 * làm ở đây.
 *
 * `retry: 1` là mặc định hợp lý cho request thường, nhưng lời gọi chậm hoặc
 * tốn quota (gợi ý AI, lộ trình học) phải tự đặt `retry: false` tại chỗ dùng —
 * thử lại chỉ nhân đôi thời gian chờ trước khi người dùng thấy lỗi thật.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
