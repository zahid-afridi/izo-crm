'use client';

import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ReduxProvider } from '@/store/provider';
import { I18nProvider } from '@/components/I18nProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ReduxProvider>
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
