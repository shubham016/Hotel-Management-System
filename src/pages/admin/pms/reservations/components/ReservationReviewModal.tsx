import { CalendarDays, DoorOpen, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';
import type { Reservation, RoomAssignment } from '../types';
import { useEffect, useState } from 'react';
import { PaymentRequestModal } from '@/components/payments/PaymentRequestModal';
import { ManualAdvanceForm } from './ManualAdvanceForm';

type Props = {
  reservation: Reservation;
  saving: boolean;
  saveError?: string;
  onClose: () => void;
  onCheckIn: (assignments: RoomAssignment[]) => void;
  onPaymentComplete: () => void;
  onAdvanceRecorded: (updated: Reservation) => void;
};

export function ReservationReviewModal({ reservation, saving, saveError, onClose, onCheckIn, onPaymentComplete, onAdvanceRecorded }: Props) {
  const [showPayment, setShowPayment] = useState(false);
  const [showManualAdvance, setShowManualAdvance] = useState(false);
  const room = reservation.rooms[0];
  const pendingArrival = ['INQUIRY', 'CONFIRMED'].includes(reservation.status);
  const canCheckIn = pendingArrival;
  const balanceDue = reservation.status === 'CANCELLED' ? 0 : Math.max(0, reservation.grandTotal - reservation.totalPaid);
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>(() => Object.fromEntries(reservation.rooms.map(item => [item.id, item.roomId || ''])));
  const assignments = reservation.rooms.map(item => ({ reservationRoomId: item.id, roomId: selectedRooms[item.id] || '' }));
  const ready = assignments.every(item => item.roomId) && new Set(assignments.map(item => item.roomId)).size === reservation.rooms.length;
  const [availableRooms, setAvailableRooms] = useState<{ id: string; roomTypeId: string; roomNumber: string; roomType: string; status: string }[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomError, setRoomError] = useState('');
  useEffect(() => {
    if (!canCheckIn) return;
    const controller = new AbortController();
    setRoomsLoading(true);
    const query = new URLSearchParams({ availableOnly: 'true', readyOnly: 'true', checkInDate: reservation.checkInDate, checkOutDate: reservation.checkOutDate, excludeReservationId: reservation.id });
    fetch(`/api/pms/rooms?${query}`, { signal: controller.signal }).then(async response => {
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load available rooms.');
      if (!controller.signal.aborted) setAvailableRooms(payload.data);
    }).catch(reason => { if (!controller.signal.aborted) setRoomError(reason instanceof Error ? reason.message : 'Unable to load available rooms.'); })
      .finally(() => { if (!controller.signal.aborted) setRoomsLoading(false); });
    return () => controller.abort();
  }, [reservation.id, reservation.checkInDate, reservation.checkOutDate, canCheckIn, room?.roomId, room?.roomTypeId]);

  return <><div className="hne-modal-backdrop" onClick={onClose}>
    <div className="hne-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 620 }}>
      <div className="hne-modal-header">
        <div><h3 className="hne-modal-title">{canCheckIn ? 'Review Booking Before Check-In' : 'Booking Details'}</h3><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{reservation.confirmationNumber}</div></div>
        <button type="button" className="hne-modal-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {saveError && <div role="alert" style={{ color: 'var(--danger-red)' }}>{saveError}</div>}
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
        {canCheckIn && reservation.rooms.map((booked, index) => <label key={booked.id} className="hne-form-group">{reservation.rooms.length > 1 ? `Room ${index + 1} · ${booked.roomType}` : 'Room'}
          <select className="hne-input" aria-label={`Assign room ${index + 1}`} value={selectedRooms[booked.id] || ''} disabled={roomsLoading || saving} onChange={event => setSelectedRooms(current => ({ ...current, [booked.id]: event.target.value }))}>
            <option value="">{roomsLoading ? 'Loading rooms…' : 'Select a clean room'}</option>
            {booked.roomId && !availableRooms.some(candidate => candidate.id === booked.roomId) && <option value={booked.roomId}>Room {booked.roomNumber} (assigned)</option>}
            {availableRooms.filter(candidate => candidate.roomTypeId === booked.roomTypeId).map(candidate => <option key={candidate.id} value={candidate.id} disabled={assignments.some(item => item.reservationRoomId !== booked.id && item.roomId === candidate.id)}>Room {candidate.roomNumber} — {candidate.roomType}</option>)}
          </select>
          {roomError && <span role="alert" style={{ color: 'var(--danger-red)' }}>{roomError}</span>}
          {!roomsLoading && !roomError && availableRooms.length === 0 && <span>No clean rooms available for this stay.</span>}
        </label>)}
      </div>
      <div className="hne-modal-footer">
        <Button variant="secondary" type="button" onClick={onClose}>Close</Button>
        {pendingArrival && balanceDue > 0 && <Button variant="secondary" type="button" onClick={() => setShowManualAdvance(true)}>Record Cash / Bank Advance</Button>}
        {pendingArrival && reservation.folioId && balanceDue > 0 && <Button variant="secondary" type="button" onClick={() => setShowPayment(true)}>Pay Advance</Button>}
        {canCheckIn && <Button variant="primary" type="button" onClick={() => onCheckIn(assignments)} disabled={saving || roomsLoading || !ready}>{saving ? 'Checking In…' : 'Confirm & Check In'}</Button>}
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
