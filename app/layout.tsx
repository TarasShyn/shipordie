import { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getSEOTags, renderWebSiteSchema } from '@/lib/seo';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = getSEOTags();

export const viewport: Viewport = {
  themeColor: '#1a2530',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>{renderWebSiteSchema()}</head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
