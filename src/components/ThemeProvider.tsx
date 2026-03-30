'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useSettingsStore(s => s.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return <>{children}</>;
}
