
"use client";

import type { ReactNode } from 'react';
// import { I18nProviderClient } from '@/lib/i18n/client'; // Reverted
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";

export function ClientProviders({ children }: { children: ReactNode; /* locale prop removed */ }) {
  return (
    // <I18nProviderClient locale={locale}> // Reverted. Ensure this line is commented out or removed.
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    // </I18nProviderClient> // Reverted. Ensure this line is commented out or removed.
  );
}
