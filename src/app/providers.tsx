'use client';

import { Toaster } from '@/components/ui/sonner';
import { ReduxProvider } from '@/store/provider';
import { I18nProvider } from '@/components/I18nProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <I18nProvider>
        {children}
        <Toaster />
      </I18nProvider>
    </ReduxProvider>
  );
}
