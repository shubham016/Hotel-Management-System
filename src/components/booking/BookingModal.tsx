import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './RoomPhotoPreview.css';

type BookingModalProps = {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function BookingModal({ title, subtitle, onClose, children }: BookingModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="booking-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="booking-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1180px, 100%)', height: 'min(860px, calc(100vh - 32px))', overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 16, backgroundColor: 'var(--bg-card)', boxShadow: '0 24px 48px -18px rgba(15, 23, 42, 0.42)', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 id="booking-modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Close booking modal"
            onClick={onClose}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 7, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
