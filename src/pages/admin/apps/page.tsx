import Link from '@/lib/router';
import { ADMIN_APPS } from '@/lib/admin-nav';
import { usePortalProfile } from '@/lib/portal-context';
import { canOpenPage } from '@/lib/portal-access';

export default function AppsPage() {
  const profile = usePortalProfile();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>Your apps</h1>

      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {ADMIN_APPS.filter(app => canOpenPage(profile, app.href)).map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.id}
              href={app.href}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', textDecoration: 'none' }}
            >
              <span style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-orange-light)', color: 'var(--primary-orange)' }}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{app.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
