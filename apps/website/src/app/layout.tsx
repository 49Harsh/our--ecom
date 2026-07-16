import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// All pages rely on client-side API calls — disable static pre-rendering globally
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'R·ECOM — Premium Clothing Store',
    template: '%s | R·ECOM',
  },
  description: 'Discover premium clothing collections for men, women, and kids. Shop new arrivals, trending styles, and exclusive deals.',
  keywords: ['clothing', 'fashion', 'online shopping', 'india', 'r-ecom'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'R·ECOM',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
