import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!cookies().has('hne_session_token')) {
    redirect('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F7F8F9' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminTopbar />
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
