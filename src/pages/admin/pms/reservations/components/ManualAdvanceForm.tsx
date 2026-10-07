import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { recordAdvance } from '../api';
import type { Reservation } from '../types';

function paymentKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ManualAdvanceForm({ reservation, onSaved, onClose }: { reservation: Reservation; onSaved: (updated: Reservation) => void; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [key] = useState(paymentKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const balance = Math.max(0, reservation.grandTotal - reservation.totalPaid);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const updated = await recordAdvance(reservation.id, { amount: Number(amount), paymentMethod: method, transactionRef: reference.trim(), idempotencyKey: key }); onSaved(updated); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to record advance.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} style={{ display: 'grid', gap: 12, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
    <strong>Record advance received</strong><p style={{ fontSize: 12 }}>Record only money already received. Remaining balance: NPR {balance.toLocaleString()}.</p>
    <label>Amount (NPR)<input className="hne-input" type="number" min="0.01" max={balance} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} /></label>
    <label>Payment method<select className="hne-select" value={method} onChange={(event) => setMethod(event.target.value)} disabled={busy}><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option></select></label>
    <label>{method === 'BANK_TRANSFER' ? 'Bank transfer reference' : 'Cash receipt note (optional)'}<input className="hne-input" required={method === 'BANK_TRANSFER'} value={reference} onChange={(event) => setReference(event.target.value)} disabled={busy} /></label>
    {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}
    <div style={{ display: 'flex', gap: 8 }}><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Record advance'}</Button><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Close</Button></div>
  </form>;
}
