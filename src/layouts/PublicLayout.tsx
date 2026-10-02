import React from 'react';
import { usePathname, useSearchParams } from '@/lib/router';
import { useRouter } from '@/lib/router';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';
import { ScrollToTop } from '@/components/public/ScrollToTop';
import { BookingModal } from '@/components/booking/BookingModal';
import { useCmsPageMeta } from '@/lib/cms-page-meta';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useCmsPageMeta(pathname);
  const isEmbeddedBooking = pathname === '/book' && searchParams.get('embedded') === 'true';
  const isPublicBooking = pathname === '/book' && !isEmbeddedBooking;

  if (isPublicBooking) {
    return (
      <div className="public-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1, backgroundColor: 'var(--bg-main)' }} />
        <Footer />
        <ScrollToTop />
        <BookingModal title="Book a Room" subtitle="Check live availability and create a secure direct reservation." onClose={() => router.push('/')}>
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-main)' }}>{children}</div>
        </BookingModal>
      </div>
    );
  }

  return (
    <div className="public-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isEmbeddedBooking && <Navbar />}
      <main style={{ flex: 1 }}>{children}</main>
      {!isEmbeddedBooking && <Footer />}
      {!isEmbeddedBooking && <ScrollToTop />}
    </div>
  );
}
