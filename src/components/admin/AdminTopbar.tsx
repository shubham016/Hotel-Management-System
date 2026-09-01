'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, Building2, Calendar, User, ExternalLink } from 'lucide-react';
import { getCurrentNepaliDateString, formatNepaliDate, formatDualDate } from '@/lib/nepali-calendar';

interface TopbarProps {
  propertyName?: string;
  userFullName?: string;
  userRole?: string;
}

export const AdminTopbar: React.FC<TopbarProps> = ({
  propertyName = 'Hotel New Era - Butwal',
  userFullName = 'General Manager',
  userRole = 'GENERAL_MANAGER'
}) => {
  const dualDate = formatDualDate(new Date());

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 8px 4px 4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-main)'
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
            GM
          </div>
          <div style={{ paddingRight: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {userFullName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
