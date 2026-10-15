import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './FormDialog.css';

export function FormDialog({ title, description, saving, onClose, children }: { title: string; description?: string; saving: boolean; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('input:not([type="checkbox"]):not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);

  return createPortal(<dialog ref={dialogRef} className="hne-client-record-dialog" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <header className="hne-modal-header">
      <div><h2 id={titleId} className="hne-modal-title">{title}</h2>{description && <p id={descriptionId} className="hne-modal-subtitle">{description}</p>}</div>
      <button type="button" className="hne-modal-close" aria-label={`Close ${title.toLowerCase()} form`} title="Close" disabled={saving} onClick={onClose}><X size={18} aria-hidden="true" /></button>
    </header>
    <div className="hne-modal-body">{children}</div>
  </dialog>, document.body);
}
