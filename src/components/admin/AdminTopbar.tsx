'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Building2, Calendar, User, LogOut, ChevronDown, ExternalLink } from 'lucide-react';
import { getCurrentNepaliDateString, formatNepaliDate, formatDualDate } from '@/lib/nepali-calendar';

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
  const dualDate = formatDualDate(new Date());
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
        height: 64,
        backgroundColor: '#FFFFFF',
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
      {/* Left: Property Selector & Dual Calendar Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
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

        {/* Dual Calendar Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '5px 12px',
            backgroundColor: 'var(--golden-light)',
            border: '1px solid rgba(244, 180, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontWeight: 700,
            color: '#B45309'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} color="var(--primary-orange)" />
            <span>AD: {dualDate.adFormatted}</span>
          </div>
          <span style={{ color: '#D97706' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>BS: {dualDate.bsFormatted}</span>
            <span style={{ fontSize: 11, color: '#92400E' }}>({dualDate.bsNepaliText.split(',')[0]})</span>
          </div>
          <span style={{ color: '#D97706' }}>•</span>
          <span style={{ fontSize: 11, backgroundColor: '#FFFFFF', padding: '1px 6px', borderRadius: 4, border: '1px solid #FDE68A' }}>
            FY {dualDate.fiscalYearBS}
          </span>
        </div>
      </div>

      {/* Right: Quick Search, Live Public Link, Notifications, User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link
          href="/"
          target="_blank"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--primary-orange)',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-orange-light)'
          }}
        >
          <span>Live Website</span>
          <ExternalLink size={14} />
        </Link>

        {/* Notifications */}
        <button
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-orange)'
            }}
          />
        </button>

        {/* User Pill */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 10px 4px 4px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-main)',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
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
                backgroundColor: '#FFFFFF',
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
      </div>
    </header>
  );
};
