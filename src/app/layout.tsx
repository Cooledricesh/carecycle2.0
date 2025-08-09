import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Analytics } from '@/components/analytics';
import ErrorBoundary from '@/components/error-boundary';
import Navigation from '@/components/navigation';
import { NotificationProvider } from '@/components/notifications/notification-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CareCycle - 환자 관리 시스템',
  description: '효율적인 환자 일정 및 치료 관리 솔루션',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <Providers>
            <AuthProvider>
              <NotificationProvider>
                <Navigation />
                <main>
                  {children}
                </main>
              </NotificationProvider>
            </AuthProvider>
          </Providers>
        </ErrorBoundary>
        <Analytics 
          {...(process.env.NEXT_PUBLIC_GA_ID && { gaId: process.env.NEXT_PUBLIC_GA_ID })}
          {...(process.env.NEXT_PUBLIC_CLARITY_ID && { clarityId: process.env.NEXT_PUBLIC_CLARITY_ID })}
        />
      </body>
    </html>
  );
}
