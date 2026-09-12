import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Users,
  UtensilsCrossed,
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
  type LucideIcon
} from 'lucide-react';

export interface AdminNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavSection {
  group: string;
  items: AdminNavItem[];
}

export interface AdminApp {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

// Top-level work areas, mirroring the compact app-switcher pattern used in
// the Kamra reference project. Individual pages remain in ADMIN_NAV_SECTIONS.
export const ADMIN_APPS: AdminApp[] = [
  { id: 'front-desk', name: 'Front Desk', description: 'Dashboard, reservations, rooms and night audit.', href: '/admin/dashboard', icon: LayoutDashboard },
  { id: 'restaurant', name: 'Restaurant', description: 'POS tables, kitchen orders and billing.', href: '/admin/pos/tables', icon: UtensilsCrossed },
  { id: 'operations', name: 'Operations', description: 'Housekeeping, guest service and banquets.', href: '/admin/housekeeping', icon: Sparkles },
  { id: 'inventory', name: 'Inventory', description: 'Stores, stock and procurement workflows.', href: '/admin/inventory', icon: Boxes },
  { id: 'finance', name: 'Finance', description: 'Accounting, ledgers and business reports.', href: '/admin/accounting/journals', icon: ReceiptText },
  { id: 'website', name: 'Website', description: 'CMS pages, media and public-site content.', href: '/admin/cms/pages', icon: Globe }
];

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    group: 'Core Operations',
    items: [
      { name: 'Overview Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Front Desk & Folios', href: '/admin/pms/frontdesk', icon: Users },
      { name: 'Reservations Matrix', href: '/admin/pms/reservations', icon: CalendarCheck },
      { name: 'Room Inventory', href: '/admin/pms/rooms', icon: BedDouble },
      { name: 'Night Audit', href: '/admin/pms/night-audit', icon: Moon }
    ]
  },
  {
    group: 'Hospitality & Outlets',
    items: [
      { name: 'Restaurant POS', href: '/admin/pos/tables', icon: UtensilsCrossed },
      { name: 'Live Kitchen Orders (KOT)', href: '/admin/pos/kot', icon: Sparkles },
      { name: 'Banquets & Events', href: '/admin/banquet', icon: PartyPopper },
      { name: 'Housekeeping & Tasks', href: '/admin/housekeeping', icon: Sparkles },
      { name: 'Guest CRM', href: '/admin/crm', icon: Users }
    ]
  },
  {
    group: 'Supply & Finance',
    items: [
      { name: 'Inventory & Stores', href: '/admin/inventory', icon: Boxes },
      { name: 'Procurement & POs', href: '/admin/procurement', icon: ShoppingCart },
      { name: 'Accounting & Ledger', href: '/admin/accounting/journals', icon: ReceiptText },
      { name: 'Chart of Accounts', href: '/admin/accounting/chart-of-accounts', icon: ReceiptText },
      { name: 'Financial & BI Reports', href: '/admin/accounting/reports', icon: PieChart }
    ]
  },
  {
    group: 'CMS & Platform',
    items: [
      { name: 'Website CMS Builder', href: '/admin/cms/pages', icon: Globe },
      { name: 'Hotel Setup', href: '/admin/cms/hotel-setup', icon: Boxes },
      { name: 'Audit Trail', href: '/admin/audit-logs', icon: ShieldAlert },
      { name: 'System Settings', href: '/admin/settings', icon: Settings }
    ]
  }
];
