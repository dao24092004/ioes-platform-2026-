import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useUIStore((s) => s.theme);

  const applyTheme = (mode: 'light' | 'dark') => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mql.matches ? 'dark' : 'light');
      const onChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;
