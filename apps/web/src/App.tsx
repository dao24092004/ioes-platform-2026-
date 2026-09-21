import React, { useState, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import I18nProvider from './app/providers/I18nProvider';
import ThemeProvider from './app/providers/ThemeProvider';
import AppRoutes from './app/router/routes';
import FloatingChat from './components/public/FloatingChat';
import { ChatProvider } from './context/ChatContext';
import { LoadingScreen } from './components/common/LoadingScreen';

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
      staleTime: 1000 * 60 * 5, 
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const SESSION_KEY = 'ioes_first_visit_2026';
const LOADING_TIME_FIRST = 7000;      
const LOADING_TIME_RETURNING = 2000;  

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 10);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    const firstVisit = !sessionStorage.getItem(SESSION_KEY);
    const loadingTime = firstVisit ? LOADING_TIME_FIRST : LOADING_TIME_RETURNING;
    
    setIsFirstVisit(firstVisit);
    
    if (firstVisit) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
    
    const timer = setTimeout(() => {
      setIsLoading(false);
      window.scrollTo(0, 0);
    }, loadingTime);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <ChatProvider>
            <BrowserRouter>
              <ScrollToTop />
              <LoadingScreen isLoading={isLoading} isFirstVisit={isFirstVisit} />
              <AppRoutes />
              <FloatingChat />
            </BrowserRouter>
          </ChatProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
