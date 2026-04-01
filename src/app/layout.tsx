
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/client-providers';
// import { getCurrentLocale } from '@/lib/i18n'; // Reverted

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ProfitPilot',
  description: 'Modern financial tracker for solopreneurs, coaches, e-commerce sellers, and freelancers.',
};

export default function RootLayout({ // Made non-async
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const locale = await getCurrentLocale(); // Reverted
  const hardcodedLocale = 'en'; // Hardcode for now

  return (
    <html lang={hardcodedLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ClientProviders> {/* Removed locale prop */}
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
