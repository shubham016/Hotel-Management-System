'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'hne-admin-theme';

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'light',
  toggleTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // The initial value is set synchronously before hydration by the inline script in
  // admin/layout.tsx (reads the same localStorage key onto document.documentElement) so
  // there's no light-then-dark flash; this just keeps React's state in sync with it.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'dark' || current === 'light') setTheme(current);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.dataset.theme = next;
      return next;
    });
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
