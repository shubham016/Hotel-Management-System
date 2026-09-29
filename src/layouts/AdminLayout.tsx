import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ThemeProvider } from '@/components/admin/ThemeProvider';
import { authClient, SessionProfile } from '@/lib/auth-client';

export default function AdminLayout() {
  const [profile, setProfile] = useState<SessionProfile | null>(() => authClient.profile());
  const token = authClient.token();
  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me').then(response => response.json()).then(result => {
      if (!result.success) { authClient.clear(); setProfile(null); }
      else setProfile(result.data);
    }).catch(() => undefined);
  }, [token]);
  if (!token) return <Navigate to="/login" replace />;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email || 'Staff Member';
  return <ThemeProvider><div className="admin-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-subtle)' }}><AdminSidebar /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}><AdminTopbar propertyName={profile?.properties?.[0]?.name} userFullName={fullName} userRole={profile?.role} userEmail={profile?.email} /><main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}><Outlet /></main></div></div></ThemeProvider>;
}
