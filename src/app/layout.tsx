import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://gwdkerala.vercel.app'),
  title: 'GWD Dashboard | Ground Water Department, Kerala',
  description: 'The official GWD Dashboard for the Ground Water Department, Kerala (GWD Kerala). Manage deposit works, investigations, tenders, and more.',
  keywords: ['GWD Kerala', 'GWD Dashboard', 'Ground Water Department', 'GWD', 'Kerala', 'Water Management', 'Government Dashboard'],
  authors: [{ name: 'Ground Water Department, Govt. of Kerala' }],
  creator: 'Ground Water Department, Govt. of Kerala',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'GWD Dashboard | Ground Water Department, Kerala',
    description: 'Official portal for managing GWD Kerala activities.',
    url: 'https://gwdkerala.vercel.app',
    siteName: 'GWD Kerala Dashboard',
    images: [
      {
        url: 'https://i.postimg.cc/RVT0H2z7/gwd-og-image.png',
        width: 1200,
        height: 630,
        alt: 'GWD Kerala Dashboard',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  icons: {
    icon: 'https://placehold.co/64x64/2563EB/FFFFFF.png?text=G',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
