import type { SessionProfile } from './auth-client';

export function hasAccess(profile: SessionProfile | null, module: string, action = 'read') {
  if (!profile) return false;
  if (profile.fullAccess || ['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role || '')) return true;
  return profile.permissions?.[module]?.includes(action) || false;
}

const pageModules: Record<string, string> = {
  '/admin/dashboard': 'DASHBOARD', '/admin/pms/frontdesk': 'PMS_FRONTDESK',
  '/admin/pms/reservations': 'RESERVATIONS', '/admin/pms/rooms': 'ROOMS', '/admin/pms/night-audit': 'NIGHT_AUDIT',
  '/admin/housekeeping': 'TASKS', '/admin/pos/tables': 'TABLES', '/admin/pos/kot': 'KITCHEN_ORDERS',
  '/admin/banquet': 'BOOKINGS', '/admin/crm': 'GUESTS', '/admin/inventory': 'ITEMS', '/admin/procurement': 'ORDERS',
  '/admin/accounting/journals': 'JOURNALS', '/admin/accounting/chart-of-accounts': 'CHART_OF_ACCOUNTS',
  '/admin/accounting/reports': 'REPORTS', '/admin/cms/pages': 'CMS', '/admin/cms/hotel-setup': 'ROOM_SETUP',
  '/admin/settings': 'ROOM_SETUP', '/admin/audit-logs': 'AUDIT_LOGS', '/admin/staff-access': 'USERS'
};

export function canOpenPage(profile: SessionProfile | null, path: string) {
  if (path === '/admin/apps' || path === '/admin/profile') return Boolean(profile);
  return Boolean(pageModules[path] && hasAccess(profile, pageModules[path]));
}

export function portalHome(profile: SessionProfile | null) {
  const preferred: Record<string, string> = {
    HOUSEKEEPING: '/admin/housekeeping', RESTAURANT: '/admin/pos/tables', KITCHEN: '/admin/pos/kot',
    FRONT_DESK_STAFF: '/admin/pms/frontdesk'
  };
  const path = preferred[profile?.role || ''] || '/admin/dashboard';
  return canOpenPage(profile, path) ? path : Object.keys(pageModules).find(page => canOpenPage(profile, page)) || '/admin/profile';
}

export function portalLabel(profile: SessionProfile | null) {
  return profile?.roleLabel || ({ OWNER: 'Owner', ADMIN: 'All-rounder / Admin', FRONT_DESK_STAFF: 'Front Desk', HOUSEKEEPING: 'Housekeeping / Cleaning', RESTAURANT: 'Restaurant', KITCHEN: 'Kitchen Cook / Helper' }[profile?.role || ''] || 'Staff');
}
