'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_SECTIONS } from '@/lib/admin-nav';

interface SidebarProps {
  collapsed?: boolean;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const pathname = usePathname();

  const navSections = ADMIN_NAV_SECTIONS;

  return (
    <aside
      style={{
        width: collapsed ? 76 : 260,
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        transition: 'width var(--transition-normal)',
        zIndex: 40
      }}
    >
      {/* Brand Header — fixed height matching AdminTopbar's so the two rows align;
          flexShrink:0 keeps it from being squeezed when the nav list below overflows. */}
      <div
        style={{
          height: 78,
          flexShrink: 0,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        {!collapsed ? (
          <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src="/logo.png"
              alt="Hotel New Era"
              style={{
                height: 48,
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </Link>
        ) : (
          <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', textDecoration: 'none' }}>
            <img
              src="/logo.png"
              alt="Hotel New Era"
              style={{
                height: 38,
                width: 38,
                objectFit: 'cover',
                objectPosition: 'left center'
              }}
            />
          </Link>
        )}
      </div>

      {/* Navigation Links — the only section that scrolls; minHeight:0 lets it actually shrink
          inside the flex column instead of pushing the header/footer out of place. */}
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {navSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0 8px 6px 8px'
                }}
              >
                {section.group}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {section.items.map((item, itemIdx) => {
                const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: collapsed ? '10px 0' : '9px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 'var(--radius-md)',
                      color: isActive ? 'var(--accent-on-wash-text)' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'var(--primary-orange-light)' : 'transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 13.5,
                      textDecoration: 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div
          style={{
            flexShrink: 0,
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            fontSize: 11.5,
            color: 'var(--text-muted)'
          }}
        >
          <div>Hotel New Era • v1.0.0</div>
          <div style={{ color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>● PostgreSQL Online</div>
        </div>
      )}
    </aside>
  );
};
