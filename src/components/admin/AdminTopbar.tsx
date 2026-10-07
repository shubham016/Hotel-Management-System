import React, { useEffect, useRef, useState } from 'react';
import Link, { usePathname, useRouter } from '@/lib/router';
import { User, LogOut, ChevronDown, ExternalLink, LayoutGrid, Menu } from 'lucide-react';
import { AdminSearch } from './AdminSearch';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsBell } from './NotificationsBell';
import { ADMIN_APPS } from '@/lib/admin-nav';
import { authClient } from '@/lib/auth-client';
import { usePortalProfile } from '@/lib/portal-context';
import { canOpenPage, hasAccess } from '@/lib/portal-access';

interface TopbarProps {
  propertyName?: string;
  userFullName?: string;
  userRole?: string;
  userEmail?: string;
  onToggleNavigation?: () => void;
  navigationOpen?: boolean;
}

function formatRoleLabel(role?: string) {
  if (!role) return '';
  if (!role.includes('_')) return role;
  return role
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function getInitials(fullName?: string) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

export const AdminTopbar: React.FC<TopbarProps> = ({
  propertyName = 'Hotel New Era - Butwal',
  userFullName = 'Staff Member',
  userRole,
  userEmail,
  onToggleNavigation,
  navigationOpen
}) => {
  const router = useRouter();
  const profile = usePortalProfile();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(propertyName);
  const menuRef = useRef<HTMLDivElement>(null);
  const appSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (appSwitcherRef.current && !appSwitcherRef.current.contains(event.target as Node)) {
        setAppSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedHotel(propertyName);
  }, [propertyName]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: authClient.refreshToken() }) });
    } finally {
      authClient.clear();
      router.push('/login');
    }
  };

  return (
    <header
      className="portal-topbar"
      style={{
        height: 78,
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '0 32px 0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      <button className="portal-menu-toggle" aria-label="Toggle navigation" aria-expanded={navigationOpen} onClick={onToggleNavigation}><Menu size={20} /></button>
      <div className="portal-property-tools" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* App switcher, following Kamra's compact grid-button pattern. */}
        <div ref={appSwitcherRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Switch app"
            title="Switch app"
            onClick={() => setAppSwitcherOpen((open) => !open)}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: appSwitcherOpen ? 'var(--bg-main)' : 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <LayoutGrid size={16} strokeWidth={1.75} />
          </button>

          {appSwitcherOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                left: 0,
                width: 256,
                padding: 6,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                zIndex: 50
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2 }}>
                {ADMIN_APPS.filter(app => canOpenPage(profile, app.href)).map((app) => {
                  const Icon = app.icon;
                  const isActive = pathname === app.href || pathname?.startsWith(`${app.href}/`);
                  return (
                    <Link
                      key={app.id}
                      href={app.href}
                      onClick={() => setAppSwitcherOpen(false)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0, padding: '10px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: isActive ? 'var(--bg-main)' : 'transparent', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 500, lineHeight: 1.1, textAlign: 'center', textDecoration: 'none' }}
                    >
                      <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: `1px solid ${isActive ? 'var(--primary-orange)' : 'var(--border)'}`, backgroundColor: isActive ? 'var(--primary-orange-light)' : 'var(--bg-card)', color: isActive ? 'var(--primary-orange)' : 'var(--text-secondary)' }}>
                        <Icon size={16} strokeWidth={1.75} />
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{app.name}</span>
                    </Link>
                  );
                })}
              </div>
              <Link
                href="/admin/apps"
                onClick={() => setAppSwitcherOpen(false)}
                style={{ display: 'block', marginTop: 4, padding: '8px 12px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, textAlign: 'center', textDecoration: 'none' }}
              >
                View all apps
              </Link>
            </div>
          )}
        </div>

        {/* Multi-property selector, following Kamra's top-navbar select pattern. */}
        <div style={{ position: 'relative' }}>
          <select
            aria-label="Hotel property"
            value={selectedHotel}
            onChange={(event) => setSelectedHotel(event.target.value)}
            style={{
              appearance: 'none',
              padding: '7px 26px 7px 10px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value={propertyName}>{propertyName}</option>
          </select>
          <ChevronDown size={14} color="var(--text-muted)" aria-hidden style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Quick-Nav Search — a direct flex sibling (not wrapped) so justifyContent:space-between
          on the header spaces all five items (property, search, live-website, bell, user)
          equally, instead of mismatching an outer 2-group gap against an inner 16px gap. */}
      <div className="portal-topbar-tools" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 12, marginLeft: 12, minWidth: 0 }}>
        {hasAccess(profile, 'RESERVATIONS') && <div className="portal-global-search" style={{ flex: 1, minWidth: 0 }}><AdminSearch /></div>}

      <Link
        className="portal-website-link"
        href="/"
        target="_blank"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent-on-wash-text)',
          textDecoration: 'none',
          padding: '9px 12px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--primary-orange-light)'
        }}
      >
        <span>Live Website</span>
        <ExternalLink size={14} />
      </Link>

      <ThemeToggle />

      <NotificationsBell />

      {/* User Pill */}
      <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '3px 10px 3px 3px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-main)',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--primary-orange)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13
              }}
            >
              {getInitials(userFullName)}
            </div>
            <div className="portal-user-label" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {userFullName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRoleLabel(userRole)}</div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: 210,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
                zIndex: 40
              }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{userFullName}</div>
                {userEmail && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{userEmail}</div>
                )}
              </div>
              <Link
                href="/admin/profile"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textDecoration: 'none'
                }}
              >
                <User size={15} />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--danger-red)',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
