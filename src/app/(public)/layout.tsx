'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isEmbeddedBooking = pathname === '/book' && searchParams.get('embedded') === 'true';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isEmbeddedBooking && <Navbar />}
      <main style={{ flex: 1 }}>{children}</main>
      {!isEmbeddedBooking && <Footer />}
    </div>
  );
}
