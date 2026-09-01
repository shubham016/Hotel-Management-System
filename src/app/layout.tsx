import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hotel New Era | Butwal, Lumbini Province, Nepal (Est. 1982)',
  description: 'Over 80 luxury & deluxe rooms, Dhiki Restaurant & Bhojangriha, Nilkantha Grand Ballroom, and 60 Mbps fiber internet located on Kalikapath, Butwal, Nepal.',
  keywords: ['Hotel New Era', 'Hotel New Era Butwal', 'Butwal Hotel', 'Lumbini Hotel', 'Dhiki Restaurant', 'Nilkantha Ballroom', 'Nepal Hotel Booking'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  },
  openGraph: {
    title: 'Hotel New Era | Butwal, Lumbini Province, Nepal',
    description: 'Security, Cleanliness and Hospitality in Butwal since 1982.',
    images: ['/logo.png'],
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
