'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, User, LogOut, ChevronDown, ExternalLink } from 'lucide-react';
import { AdminSearch } from './AdminSearch';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsBell } from './NotificationsBell';

interface TopbarProps {
  propertyName?: string;
  userFullName?: string;
  userRole?: string;
  userEmail?: string;
}

function formatRoleLabel(role?: string) {
  if (!role) return '';
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
  userEmail
}) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header
      style={{
        height: 78,
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      {/* Property Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 12px',
          backgroundColor: 'var(--bg-main)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}
      >
        <Building2 size={16} color="var(--primary-orange)" />
        <span>{propertyName}</span>
      </div>

      {/* Quick-Nav Search — a direct flex sibling (not wrapped) so justifyContent:space-between
          on the header spaces all five items (property, search, live-website, bell, user)
          equally, instead of mismatching an outer 2-group gap against an inner 16px gap. */}
      <AdminSearch />

      <Link
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
            <div style={{ textAlign: 'left' }}>
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
                href="/admin/settings"
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
    </header>
  );
};
