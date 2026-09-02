'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const NotificationsBell: React.FC = () => {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const load = () => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setItems(json.notifications);
          setUnreadCount(json.unreadCount);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!loaded) load();
  };

  const handleSelect = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await fetch(`/api/notifications/${item.id}`, { method: 'PATCH' });
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Non-fatal — the notification just stays marked unread until next load.
      }
    }
    setOpen(false);
    if (item.actionUrl) router.push(item.actionUrl);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)'
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
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
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            maxHeight: 380,
            overflowY: 'auto',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.15)',
            zIndex: 40
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              No notifications yet.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: '1px solid var(--border-light)',
                  background: item.read ? 'none' : 'var(--primary-orange-light)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span
                  style={{
                    marginTop: 5,
                    width: 6,
                    height: 6,
                    flexShrink: 0,
                    borderRadius: '50%',
                    backgroundColor: item.read ? 'transparent' : 'var(--primary-orange)'
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: item.read ? 600 : 700, color: 'var(--text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.message}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{timeAgo(item.createdAt)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
