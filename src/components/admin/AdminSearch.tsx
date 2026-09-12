import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/lib/router';
import { Search } from 'lucide-react';
import { ADMIN_NAV_SECTIONS } from '@/lib/admin-nav';

// Quick-nav search over the admin portal's own pages. Searching live records (guests,
// reservations, rooms) is a separate, larger backend feature — not built yet, so this
// intentionally only ever lists real navigable pages rather than fabricating results.
export const AdminSearch: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_NAV_SECTIONS;
    return ADMIN_NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.name.toLowerCase().includes(q))
    })).filter((section) => section.items.length > 0);
  }, [query]);

  const hasResults = filteredSections.some((section) => section.items.length > 0);

  const goTo = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: '1 1 280px', minWidth: 210 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <Search size={15} color="var(--text-muted)" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search reservations, guests, rooms…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: 'var(--text-primary)'
          }}
        />
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.15)',
            maxHeight: 380,
            overflowY: 'auto',
            zIndex: 40,
            padding: '8px 6px'
          }}
        >
          {!hasResults && (
            <div style={{ padding: '14px 10px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No pages match &ldquo;{query}&rdquo;.
            </div>
          )}

          {filteredSections.map((section) => (
            <div key={section.group}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '6px 10px 4px'
                }}
              >
                {section.group}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => goTo(item.href)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      border: 'none',
                      background: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-main)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Icon size={16} color="var(--primary-orange)" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
