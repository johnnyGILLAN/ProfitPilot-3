'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem={false}
      disableTransitionOnChange
      forcedTheme={mounted ? undefined : 'dark'}
    >
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
