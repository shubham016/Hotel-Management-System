import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from '@/lib/router';
import { formatDualDate } from '@/lib/nepali-calendar';
import { loadReservations } from './api';
import type { Reservation } from './types';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReservations().then(setReservations).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load reservations.')).finally(() => setLoading(false));
  }, []);

  const query = searchTerm.toLowerCase();
  const filtered = reservations.filter((reservation) => (
    (reservation.guest.name.toLowerCase().includes(query) || reservation.confirmationNumber.toLowerCase().includes(query) || reservation.guest.phone.includes(searchTerm)) &&
    (filterStatus === 'ALL' || reservation.status === filterStatus)
  ));

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <div><h1 style={{ fontSize: 24, fontWeight: 800 }}>Reservations Matrix & Bookings</h1><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Live website, front-desk, walk-in, and partner reservations from the PMS database</p></div>
      <div style={{ display: 'flex', gap: 12 }}><div style={{ position: 'relative' }}><Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} /><input type="text" placeholder="Search Confirmation / Guest..." className="hne-input" style={{ paddingLeft: 36, width: 280, height: 40 }} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div><Link href="/book?source=WALK_IN" className="hne-btn hne-btn-primary hne-btn-sm" style={{ display: 'inline-flex', alignItems: 'center' }}><Plus size={16} /><span>Create Reservation</span></Link></div>
    </div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map((status) => <button key={status} onClick={() => setFilterStatus(status)} className={`hne-btn ${filterStatus === status ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}>{status.replaceAll('_', ' ')}</button>)}</div>
    {error && <div role="alert" style={{ padding: 12, borderRadius: 8, background: 'var(--danger-light)', color: 'var(--danger-red)' }}>{error}</div>}
    <Card><div className="hne-table-container"><table className="hne-table">
      <thead><tr><th>Confirmation #</th><th>Guest</th><th>Room Type / Assigned</th><th>Check-In & Out</th><th>Source</th><th>Total / Advance</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        {loading && <tr><td colSpan={8}>Loading reservations…</td></tr>}
        {!loading && filtered.length === 0 && <tr><td colSpan={8}>No reservations found.</td></tr>}
        {filtered.map((reservation) => {
          const room = reservation.rooms[0];
          return <tr key={reservation.id}>
            <td><div style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{reservation.confirmationNumber}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{room?.nights || 0} Nights · {reservation.adultsCount} Adults</div></td>
            <td><div style={{ fontWeight: 700 }}>{reservation.guest.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{reservation.guest.phone}</div></td>
            <td><div style={{ fontWeight: 600, fontSize: 13 }}>{room?.roomType || 'Unassigned'}</div><Badge variant="orange" style={{ fontSize: 10 }}>Room {room?.roomNumber || 'Unassigned'}</Badge></td>
            <td style={{ fontSize: 12 }}><div style={{ fontWeight: 600 }}>{formatDualDate(reservation.checkInDate).adFormatted}</div><div style={{ color: '#B45309', fontSize: 11, fontWeight: 600 }}>BS: {formatDualDate(reservation.checkInDate).bsFormatted}</div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>to {formatDualDate(reservation.checkOutDate).adFormatted} (BS: {formatDualDate(reservation.checkOutDate).bsFormatted})</div></td>
            <td><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{reservation.source.replaceAll('_', ' ')}</span></td>
            <td><div style={{ fontWeight: 700 }}>Rs. {reservation.grandTotal.toLocaleString()}</div><div style={{ fontSize: 11, color: 'var(--green)' }}>Adv: Rs. {reservation.advancePaid.toLocaleString()}</div></td>
            <td><Badge variant={reservation.status === 'CHECKED_IN' ? 'success' : reservation.status === 'CONFIRMED' ? 'orange' : 'neutral'}>{reservation.status.replaceAll('_', ' ')}</Badge></td>
            <td><Link href="/admin/pms/frontdesk" className="hne-btn hne-btn-secondary hne-btn-sm" style={{ fontSize: 11.5 }}>Inspect Folio</Link></td>
          </tr>;
        })}
      </tbody>
    </table></div></Card>
  </div>;
}
