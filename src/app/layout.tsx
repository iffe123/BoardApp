import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'GovernanceOS - Board Management Platform',
  description: 'AI-native board governance platform for modern organizations',
  keywords: ['board management', 'corporate governance', 'meeting management', 'Nordic'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
