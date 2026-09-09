import Link from 'next/link';
import { ADMIN_APPS } from '@/lib/admin-nav';

export default function AppsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>Your apps</h1>
        <p style={{ marginTop: 3, fontSize: 13, color: 'var(--text-secondary)' }}>Choose where you want to work.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {ADMIN_APPS.map((app) => {
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
              <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{app.name}</span>
                <span style={{ display: 'block', marginTop: 3, fontSize: 13, lineHeight: 1.4, color: 'var(--text-secondary)' }}>{app.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
