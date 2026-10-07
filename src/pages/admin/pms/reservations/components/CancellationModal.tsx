import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Reservation } from '../types';
import { updateReservationStatus } from '../api';
import { usePortalProfile } from '@/lib/portal-context';
import { hasAccess } from '@/lib/portal-access';

export function CancellationModal({ reservation, onClose, onSaved }: { reservation: Reservation; onClose: () => void; onSaved: (reservation: Reservation) => void }) {
  const profile = usePortalProfile();
  const refund = reservation.cancellationRefund;
  const recordingRefund = reservation.status === 'CANCELLED' && refund?.status === 'PENDING';
  const paid = refund?.paidAmount ?? reservation.totalPaid;
  const deduction = refund?.deductionAmount ?? Math.round(Math.round(paid * 100) / 10) / 100;
  const refundable = refund?.refundAmount ?? Math.round((paid - deduction) * 100) / 100;
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const money = (amount: number) => `NPR ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const updated = await updateReservationStatus(reservation.id, recordingRefund ? 'refund' : 'cancel', recordingRefund ? { refundMethod: method, refundReference: reference } : { reason, expectedPaidAmount: paid });
      onSaved(updated);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save cancellation.'); }
    finally { setSaving(false); }
  };
  return <div className="hne-modal-backdrop" onClick={() => !saving && onClose()}>
    <form className="hne-modal" style={{ maxWidth: 500 }} onSubmit={submit} onClick={(event) => event.stopPropagation()}>
      <div className="hne-modal-header"><div><h3 className="hne-modal-title">{recordingRefund ? 'Record refund payout' : 'Cancel booking'}</h3><p>{reservation.confirmationNumber}</p></div><button type="button" className="hne-modal-close" disabled={saving} onClick={onClose} aria-label="Close">×</button></div>
      <div className="hne-modal-body" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}><div>Advance received: <strong>{money(paid)}</strong></div><div>Cancellation deduction (10%): <strong>{money(deduction)}</strong></div><div>Customer refund (90%): <strong>{money(refundable)}</strong></div></div>
        {recordingRefund ? <><p>Record this only after returning the money to the customer. This records the payout; it does not transfer money through the wallet.</p><label>Refund method<select className="hne-input" value={method} onChange={(event) => setMethod(event.target.value)} disabled={saving}>{['CASH', 'BANK_TRANSFER', 'ESEWA', 'KHALTI', 'CARD', 'FONEPAY'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label>Payout reference / cash receipt<input className="hne-input" required value={reference} onChange={(event) => setReference(event.target.value)} disabled={saving} /></label></> : <><p>{paid > 0 ? 'The room will be released and the refund marked due. Return the money, then use Record Refund to confirm the payout.' : 'The room will be released. No refund is due because no advance was paid.'}</p><label>Cancellation reason<input className="hne-input" value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving} /></label></>}
        {!hasAccess(profile, 'RESERVATIONS', 'refund') && paid > 0 && <p>Owner or Admin must record the refund payout after the customer receives it.</p>}
        {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}
      </div>
      <div className="hne-modal-footer"><Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Close</Button><Button type="submit" variant="primary" disabled={saving || (recordingRefund && !reference.trim())}>{saving ? 'Saving…' : recordingRefund ? 'Confirm refund was paid' : 'Confirm cancellation'}</Button></div>
    </form>
  </div>;
}
