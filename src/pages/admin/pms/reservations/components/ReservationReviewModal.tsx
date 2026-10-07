import { CalendarDays, DoorOpen, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';
import type { Reservation } from '../types';
import { useState } from 'react';
import { PaymentRequestModal } from '@/components/payments/PaymentRequestModal';
import { ManualAdvanceForm } from './ManualAdvanceForm';

type Props = {
  reservation: Reservation;
  saving: boolean;
  onClose: () => void;
  onCheckIn: () => void;
  onPaymentComplete: () => void;
  onAdvanceRecorded: (updated: Reservation) => void;
};

export function ReservationReviewModal({ reservation, saving, onClose, onCheckIn, onPaymentComplete, onAdvanceRecorded }: Props) {
  const [showPayment, setShowPayment] = useState(false);
  const [showManualAdvance, setShowManualAdvance] = useState(false);
  const room = reservation.rooms[0];
  const canCheckIn = ['INQUIRY', 'CONFIRMED'].includes(reservation.status);
  const balanceDue = reservation.status === 'CANCELLED' ? 0 : Math.max(0, reservation.grandTotal - reservation.totalPaid);

  return <><div className="hne-modal-backdrop" onClick={onClose}>
    <div className="hne-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 620 }}>
      <div className="hne-modal-header">
        <div><h3 className="hne-modal-title">{canCheckIn ? 'Review Booking Before Check-In' : 'Booking Details'}</h3><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{reservation.confirmationNumber}</div></div>
        <button type="button" className="hne-modal-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {showManualAdvance && <ManualAdvanceForm reservation={reservation} onSaved={onAdvanceRecorded} onClose={() => setShowManualAdvance(false)} />}
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--brand-gold-light)', color: 'var(--brand-gold-hover)', fontSize: 12.5 }}>
          {canCheckIn ? 'Verify the guest identity, assigned room, and stay dates. Check In confirms arrival and marks the room occupied; it does not mean payment has been settled.' : `Booking status: ${reservation.status.replaceAll('_', ' ')}`}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Detail icon={<UserRound size={16} />} label="Guest" value={reservation.guest.name} secondary={`${reservation.guest.phone}${reservation.guest.idNumber ? ` · ${reservation.guest.idType || 'ID'}: ${reservation.guest.idNumber}` : ''}`} />
          <Detail icon={<DoorOpen size={16} />} label="Room" value={`${room?.roomType || 'Room type unavailable'} · Room ${room?.roomNumber || 'Unassigned'}`} secondary={`${room?.nights || 0} night(s) · ${reservation.adultsCount} adult(s) · ${reservation.childrenCount} child(ren)`} />
          <Detail icon={<CalendarDays size={16} />} label="Check-in" value={formatDualDate(reservation.checkInDate).adFormatted} secondary={`BS: ${formatDualDate(reservation.checkInDate).bsFormatted}`} />
          <Detail icon={<CalendarDays size={16} />} label="Check-out" value={formatDualDate(reservation.checkOutDate).adFormatted} secondary={`BS: ${formatDualDate(reservation.checkOutDate).bsFormatted}`} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}><span style={{ fontWeight: 700 }}>Booking total</span><strong>Rs. {reservation.grandTotal.toLocaleString()}</strong></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Advance paid: Rs. {reservation.advancePaid.toLocaleString()}</span><strong>Balance: Rs. {balanceDue.toLocaleString()}</strong></div>
        {reservation.cancellationRefund && <div style={{ fontSize: 13 }}>Cancellation deduction: Rs. {reservation.cancellationRefund.deductionAmount.toLocaleString()} (10%)<br />Refund {reservation.cancellationRefund.status === 'PAID' ? 'paid' : 'due'}: Rs. {reservation.cancellationRefund.refundAmount.toLocaleString()}{reservation.cancellationRefund.reference && <><br />Payout reference: {reservation.cancellationRefund.reference}</>}</div>}
        {reservation.cancellationRefund && <div style={{ fontSize: 13 }}>Cancellation deduction: Rs. {reservation.cancellationRefund.deductionAmount.toLocaleString()} (10%)<br />Refund {reservation.cancellationRefund.status === 'PAID' ? 'paid' : 'due'}: Rs. {reservation.cancellationRefund.refundAmount.toLocaleString()}{reservation.cancellationRefund.reference && <><br />Payout reference: {reservation.cancellationRefund.reference}</>}</div>}
        {canCheckIn && !room?.roomId && <div role="alert" style={{ color: 'var(--danger-red)', fontSize: 12.5 }}>Assign a room before checking this guest in.</div>}
      </div>
      <div className="hne-modal-footer">
        <Button variant="secondary" type="button" onClick={onClose}>Close</Button>
        {canCheckIn && balanceDue > 0 && <Button variant="secondary" type="button" onClick={() => setShowManualAdvance(true)}>Record Cash / Bank Advance</Button>}
        {canCheckIn && reservation.folioId && balanceDue > 0 && <Button variant="secondary" type="button" onClick={() => setShowPayment(true)}>Pay Advance</Button>}
        {canCheckIn && <Button variant="primary" type="button" onClick={onCheckIn} disabled={saving || !room?.roomId}>{saving ? 'Checking In…' : 'Confirm & Check In'}</Button>}
      </div>
    </div>
  </div>{showPayment && reservation.folioId && <PaymentRequestModal folioId={reservation.folioId} kind="ADVANCE" balanceDue={balanceDue} onClose={() => setShowPayment(false)} onCompleted={onPaymentComplete} />}</>;
}

function Detail({ icon, label, value, secondary }: { icon: React.ReactNode; label: string; value: string; secondary: string }) {
  return <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)', fontSize: 11.5, marginBottom: 5 }}>{icon}{label}</div>
    <div style={{ fontWeight: 700, fontSize: 13 }}>{value}</div><div style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 3 }}>{secondary}</div>
  </div>;
}
