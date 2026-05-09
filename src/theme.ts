import { useEffect, useState } from 'react';
import type { Theme } from './types';

const KEY = 'hh.theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(KEY)) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      return next;
    });
  };

  return { theme, toggle };
}

export function chartPalette(theme: Theme) {
  const isDark = theme === 'dark';
  return {
    text: isDark ? '#fafafa' : '#09090b',
    muted: isDark ? '#a1a1aa' : '#52525b',
    grid: isDark ? '#27272a' : '#e4e4e7',
    bg: isDark ? '#131316' : '#ffffff',
    accent: isDark ? '#2dd4bf' : '#004449',
    accent2: isDark ? '#5eead4' : '#007a82',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    // Categorical series — brand teal first, then complementary tones
    series: ['#004449', '#007a82', '#10b981', '#f59e0b', '#475569', '#0ea5e9', '#ec4899', '#84cc16'],
  };
}
