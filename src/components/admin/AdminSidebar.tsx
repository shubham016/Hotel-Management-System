'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Users,
  UtensilsCrossed,
  GlassWater,
  PartyPopper,
  Sparkles,
  Boxes,
  ShoppingCart,
  ReceiptText,
  PieChart,
  Globe,
  Settings,
  ShieldAlert,
  Moon,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const pathname = usePathname();

  const navSections = [
    {
      group: 'Core Operations',
      items: [
        { name: 'Overview Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Front Desk & Folios', href: '/admin/pms/frontdesk', icon: Users },
        { name: 'Reservations Matrix', href: '/admin/pms/reservations', icon: CalendarCheck },
        { name: 'Room Inventory', href: '/admin/pms/rooms', icon: BedDouble },
        { name: 'Night Audit', href: '/admin/pms/night-audit', icon: Moon },
      ]
    },
    {
      group: 'Hospitality & Outlets',
      items: [
        { name: 'Restaurant POS', href: '/admin/pos/tables', icon: UtensilsCrossed },
        { name: 'Live Kitchen Orders (KOT)', href: '/admin/pos/kot', icon: Sparkles },
        { name: 'Banquets & Events', href: '/admin/banquet', icon: PartyPopper },
        { name: 'Housekeeping & Tasks', href: '/admin/housekeeping', icon: Sparkles },
        { name: 'Guest CRM', href: '/admin/crm', icon: Users },
      ]
    },
    {
      group: 'Supply & Finance',
      items: [
        { name: 'Inventory & Stores', href: '/admin/inventory', icon: Boxes },
        { name: 'Procurement & POs', href: '/admin/procurement', icon: ShoppingCart },
        { name: 'Accounting & Ledger', href: '/admin/accounting/journals', icon: ReceiptText },
        { name: 'Chart of Accounts', href: '/admin/accounting/chart-of-accounts', icon: ReceiptText },
        { name: 'Financial & BI Reports', href: '/admin/accounting/reports', icon: PieChart },
      ]
    },
    {
      group: 'CMS & Platform',
      items: [
        { name: 'Website CMS Builder', href: '/admin/cms/pages', icon: Globe },
        { name: 'Media Library', href: '/admin/cms/media', icon: Boxes },
        { name: 'Audit Trail', href: '/admin/audit-logs', icon: ShieldAlert },
        { name: 'System Settings', href: '/admin/settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside
      style={{
        width: collapsed ? 76 : 260,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        transition: 'width var(--transition-normal)',
        zIndex: 40,
        overflowY: 'auto'
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)'
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

      {/* Navigation Links */}
      <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                      color: isActive ? 'var(--primary-orange)' : 'var(--text-secondary)',
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
            marginTop: 'auto',
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
