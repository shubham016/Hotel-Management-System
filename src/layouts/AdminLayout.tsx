import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ThemeProvider } from '@/components/admin/ThemeProvider';
import { authClient, SessionProfile } from '@/lib/auth-client';
import { PortalContext } from '@/lib/portal-context';
import { canOpenPage, portalHome } from '@/lib/portal-access';
import './staff-portals.css';
import { setDisplayPreferences } from '@/lib/display-preferences';

export default function AdminLayout() {
  const [profile, setProfile] = useState<SessionProfile | null>(() => authClient.profile());
  const token = authClient.token();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [navigationOpen, setNavigationOpen] = useState(false);
  useEffect(() => { setNavigationOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch('/api/auth/me').then(async response => ({ response, result: await response.json() })).then(({ response, result }) => {
      if (!active) return;
      if (response.status === 401) { authClient.clear(); setProfile(null); setChecked(true); }
      else if (!response.ok || !result.success) { setError(result.error || 'Unable to verify your staff access.'); }
      else { setDisplayPreferences(result.data.displayPreferences); authClient.updateProfile(result.data); setProfile(result.data); setChecked(true); }
    }).catch(() => { if (active) setError('Unable to verify your staff access. Please retry.'); });
    return () => { active = false; };
  }, [token]);
  if (!token) return <Navigate to="/login" replace />;
  if (error) return <div style={{ padding: 32 }} role="alert">{error} <button onClick={() => window.location.reload()}>Retry</button></div>;
  if (!checked || !profile) return <div style={{ padding: 32 }}>Loading your workspace…</div>;
  if (location.pathname === '/admin' || !canOpenPage(profile, location.pathname)) return <Navigate to={portalHome(profile)} replace />;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email || 'Staff Member';
  return <PortalContext.Provider value={profile}><ThemeProvider><div className="admin-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-subtle)' }}>
    {navigationOpen && <button className="portal-navigation-backdrop" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />}
    <div className={`portal-sidebar ${navigationOpen ? 'is-open' : ''}`}><AdminSidebar /></div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}><AdminTopbar propertyName={profile.properties?.[0]?.name} userFullName={fullName} userRole={profile.roleLabel || profile.role} userEmail={profile.email} onToggleNavigation={() => setNavigationOpen(open => !open)} navigationOpen={navigationOpen} /><main className="portal-main" style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}><Outlet /></main></div>
  </div></ThemeProvider></PortalContext.Provider>;
}
