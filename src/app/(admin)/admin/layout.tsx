import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

async function getCurrentUser(token: string) {
  const railsApiUrl = process.env.RAILS_API_URL || 'http://127.0.0.1:3001';
  try {
    const response = await fetch(`${railsApiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.success ? payload.data : null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get('hne_session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const user = await getCurrentUser(token);
  if (!user) {
    redirect('/login');
  }

  const property = user.properties?.[0];
  const userFullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F7F8F9' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminTopbar
          propertyName={property?.name}
          userFullName={userFullName}
          userRole={user.role}
          userEmail={user.email}
        />
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
