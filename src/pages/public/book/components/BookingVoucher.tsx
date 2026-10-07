import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';
import type { BookingConfirmation } from '../types';

export function BookingVoucher({ confirmation, returnToDashboard, onReturn, onPay }: { confirmation: BookingConfirmation; returnToDashboard: boolean; onReturn: () => void; onPay: () => void }) {
  const checkIn = formatDualDate(confirmation.checkInDate);
  const checkOut = formatDualDate(confirmation.checkOutDate);
  return <div className="booking-voucher hne-card">
    <img src="/logo.png" alt="Hotel New Era" style={{ height: 48, marginBottom: 20 }} />
    <CheckCircle2 size={42} color="var(--green)" style={{ display: 'block', margin: '0 auto 16px' }} />
    <h2>Booking request received</h2><p style={{ margin: '12px 0 24px' }}>Thank you, {confirmation.guestName}. Your room is held. Keep this booking reference for check-in.</p>
    <dl className="booking-voucher-details"><div><dt>Booking reference</dt><dd>{confirmation.confirmationNumber}</dd></div><div><dt>Guest</dt><dd>{confirmation.guestName}</dd></div><div><dt>Room</dt><dd>{confirmation.roomNumber ? `Room ${confirmation.roomNumber} · ` : ''}{confirmation.roomName}</dd></div><div><dt>Stay</dt><dd>{confirmation.nights} {confirmation.nights === 1 ? 'night' : 'nights'}</dd></div><div><dt>Check-in</dt><dd>{checkIn.adFormatted}<small>{checkIn.bsNepaliText} BS · From {confirmation.checkInTime}</small></dd></div><div><dt>Check-out</dt><dd>{checkOut.adFormatted}<small>{checkOut.bsNepaliText} BS · Until {confirmation.checkOutTime}</small></dd></div><div><dt>Booking total</dt><dd>NPR {confirmation.grandTotal.toLocaleString('en-NP', { minimumFractionDigits: 2 })}</dd></div><div><dt>Payment</dt><dd>Awaiting payment</dd></div></dl>
    <div className="booking-voucher-actions">{confirmation.paymentToken && <Button onClick={onPay}>Continue to advance payment</Button>}<Button variant="secondary" onClick={() => window.print()}>Print / save voucher</Button><Button onClick={onReturn}>{returnToDashboard ? 'Return to Dashboard' : 'Return to Homepage'}</Button></div>
  </div>;
}
