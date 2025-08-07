import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Analytics } from '@/components/analytics';
import ErrorBoundary from '@/components/error-boundary';

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

/**
 * Root layout component that sets up global providers, error boundaries, and analytics for the application.
 *
 * Wraps all page content with font styles, context providers, authentication, and error handling. Also injects analytics tracking using environment-specific IDs.
 *
 * @param children - The content to be rendered within the layout
 */
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
              {children}
            </AuthProvider>
          </Providers>
        </ErrorBoundary>
        <Analytics 
          gaId={process.env.NEXT_PUBLIC_GA_ID}
          clarityId={process.env.NEXT_PUBLIC_CLARITY_ID}
        />
      </body>
    </html>
  );
}
