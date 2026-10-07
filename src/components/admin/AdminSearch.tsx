import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/lib/router';
import { Search, UserRound } from 'lucide-react';
import { ADMIN_NAV_SECTIONS } from '@/lib/admin-nav';
import { searchReservations, type ReservationSearchResult } from './admin-search-api';
import { usePortalProfile } from '@/lib/portal-context';
import { canOpenPage } from '@/lib/portal-access';

export const AdminSearch: React.FC = () => {
  const router = useRouter();
  const profile = usePortalProfile();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [matches, setMatches] = useState<ReservationSearchResult[]>([]);
  const [matchedQuery, setMatchedQuery] = useState('');
  const [totalMatches, setTotalMatches] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    setMatches([]); setMatchedQuery(''); setTotalMatches(0); setSearchError('');
    const term = query.trim();
    if (!open || term.length < 2) { setSearching(false); return; }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchReservations(term, controller.signal).then((result) => {
        if (!controller.signal.aborted) { setMatches(result.matches); setMatchedQuery(term); setTotalMatches(result.total); }
      }).catch((reason) => { if (!controller.signal.aborted) setSearchError(reason instanceof Error ? reason.message : 'Unable to search reservations.'); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, open]);

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
    const allowed = ADMIN_NAV_SECTIONS.map(section => ({ ...section, items: section.items.filter(item => canOpenPage(profile, item.href)) })).filter(section => section.items.length);
    if (!q) return allowed;
    return allowed.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.name.toLowerCase().includes(q))
    })).filter((section) => section.items.length > 0);
  }, [query, profile]);

  const hasResults = filteredSections.some((section) => section.items.length > 0);
  const currentMatches = matchedQuery === query.trim() ? matches : [];

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
            if (e.key === 'ArrowDown') { e.preventDefault(); wrapperRef.current?.querySelector<HTMLButtonElement>('[data-reservation-result]')?.focus(); }
            if (e.key === 'Enter' && !searching && currentMatches.length === 1) { e.preventDefault(); goTo(`/admin/pms/reservations?reservation=${encodeURIComponent(currentMatches[0].id)}`); }
            if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search reservation by Name, Mobile, ID..."
          aria-label="Search reservations by name, mobile, ID, booking number or room"
          aria-expanded={open}
          style={{
            flex: 1,
            minWidth: 0,
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
          {query.trim().length >= 2 && <div>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reservations</div>
            {searching && <div role="status" style={{ padding: 10, fontSize: 12 }}>Searching reservations…</div>}
            {searchError && <div role="alert" style={{ padding: 10, fontSize: 12, color: 'var(--danger-red)' }}>{searchError}</div>}
            {!searching && !searchError && currentMatches.length === 0 && <div style={{ padding: 10, fontSize: 12, color: 'var(--text-muted)' }}>No matching reservations.</div>}
            {currentMatches.map((reservation) => <button key={reservation.id} type="button" data-reservation-result onClick={() => goTo(`/admin/pms/reservations?reservation=${encodeURIComponent(reservation.id)}`)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left' }} onMouseEnter={(event) => event.currentTarget.style.backgroundColor = 'var(--bg-main)'} onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'transparent'}>
              <UserRound size={17} style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ minWidth: 0, display: 'grid', gap: 4, overflowWrap: 'anywhere' }}><strong style={{ fontSize: 13 }}>{reservation.guest.name}</strong><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{reservation.guest.phone} · {reservation.confirmationNumber}</span>{reservation.guest.idNumber && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{reservation.guest.idType || 'ID'}: {reservation.guest.idNumber}</span>}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{reservation.rooms.map((room) => room.roomNumber ? `Room ${room.roomNumber}` : room.roomType).join(', ')} · {reservation.status.replaceAll('_', ' ')}</span></span>
            </button>)}
            {!searching && matchedQuery === query.trim() && totalMatches > currentMatches.length && <button type="button" onClick={() => goTo(`/admin/pms/reservations?query=${encodeURIComponent(query.trim())}`)} style={{ width: '100%', padding: 10, border: 0, background: 'transparent', color: 'var(--brand-crimson)', cursor: 'pointer', textAlign: 'left', fontSize: 12 }}>View all {totalMatches} matching reservations</button>}
          </div>}
          {!hasResults && query.trim().length < 2 && (
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
