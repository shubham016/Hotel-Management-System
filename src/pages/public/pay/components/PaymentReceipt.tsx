import { CheckCircle2, Printer } from 'lucide-react';
import type { PaymentRequest } from '@/components/payments/api';
import { formatDualDate } from '@/lib/nepali-calendar';

const money = (amount: number) => `NPR ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PaymentReceipt({ request }: { request: PaymentRequest }) {
  const checkIn = formatDualDate(request.checkInDate);
  const checkOut = formatDualDate(request.checkOutDate);
  const paidDate = request.paidAt ? new Date(request.paidAt) : null;
  const paidDay = paidDate ? formatDualDate(paidDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })) : null;
  const paymentMethod = request.paymentMethod === 'ESEWA' ? 'eSewa' : request.paymentMethod === 'KHALTI' ? 'Khalti' : request.paymentMethod?.replaceAll('_', ' ');
  const inactiveBooking = ['CANCELLED', 'ARCHIVED'].includes(request.reservationStatus);
  return <div className="hne-receipt">
    <div className="hne-receipt-success" role="status"><span className="hne-receipt-check"><CheckCircle2 size={32} aria-hidden="true" /></span><h1 id="payment-title">Payment successful</h1><p>{request.kind === 'ADVANCE' ? 'Your advance payment has been received.' : 'Your checkout payment has been received.'}</p></div>
    <div className="hne-receipt-total"><span>{request.kind === 'ADVANCE' ? 'Advance paid' : 'Amount paid'}</span><strong>{money(request.amount)}</strong><span className="hne-payment-badge is-complete">Payment verified</span></div>
    <section className="hne-receipt-section" aria-labelledby="receipt-booking"><h2 id="receipt-booking">Booking details</h2><dl className="hne-receipt-details"><div><dt>Guest</dt><dd>{request.guestName}</dd></div><div><dt>Booking reference</dt><dd className="hne-receipt-reference">{request.confirmationNumber}</dd></div><div><dt>Room</dt><dd>{request.roomDescription}</dd></div><div><dt>Stay</dt><dd>{request.nights} {request.nights === 1 ? 'night' : 'nights'} · {request.adultsCount} {request.adultsCount === 1 ? 'adult' : 'adults'}{request.childrenCount > 0 && ` · ${request.childrenCount} ${request.childrenCount === 1 ? 'child' : 'children'}`}</dd></div></dl><div className="hne-receipt-dates"><div><span>Check-in</span><strong>{checkIn.adFormatted}</strong><small>{checkIn.bsNepaliText} BS</small></div><div><span>Check-out</span><strong>{checkOut.adFormatted}</strong><small>{checkOut.bsNepaliText} BS</small></div></div></section>
    <section className="hne-receipt-section" aria-labelledby="receipt-payment"><h2 id="receipt-payment">Payment details</h2><dl className="hne-receipt-details">{paymentMethod && <div><dt>Paid with</dt><dd>{paymentMethod}</dd></div>}{paidDate && paidDay && <div><dt>Payment date</dt><dd>{paidDay.adFormatted}<small>{paidDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu' })} (Nepal time) · {paidDay.bsNepaliText} BS</small></dd></div>}{request.receiptNumber && <div><dt>Receipt number</dt><dd className="hne-receipt-reference">{request.receiptNumber}</dd></div>}{!inactiveBooking && <><div><dt>Booking total</dt><dd>{money(request.bookingTotal)}</dd></div><div className="hne-receipt-balance"><dt>Remaining balance</dt><dd>{money(request.balanceDue)}</dd></div></>}</dl></section>
    <div className="hne-receipt-next"><p>{inactiveBooking ? 'This booking is no longer active. Contact the front desk about your payment or refund.' : request.balanceDue > 0 ? 'Your advance is applied to your booking. Please settle the remaining balance at the hotel.' : 'No balance remains on your booking.'}</p><p>Keep this confirmation for your records.</p></div>
    <div className="hne-receipt-actions"><button className="hne-payment-action" type="button" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> Print / save receipt</button><p>On mobile, you can also save a screenshot.</p></div>
    {request.kind === 'ADVANCE' && !inactiveBooking && <details className="hne-receipt-policy"><summary>Cancellation policy</summary><p>Cancellation before check-in: 10% of the advance paid is retained; 90% is refundable. Contact the front desk to arrange cancellation and your refund.</p></details>}
  </div>;
}
