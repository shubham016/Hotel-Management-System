import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from '@/lib/router';
import { formatDualDate } from '@/lib/nepali-calendar';
import { deleteReservation, loadReservations, loadReservation, updateReservationStatus } from './api';
import type { Reservation } from './types';
import { ReservationReviewModal } from './components/ReservationReviewModal';
import { CancellationModal } from './components/CancellationModal';
import { usePortalProfile } from '@/lib/portal-context';
import { hasAccess } from '@/lib/portal-access';

const PAGE_SIZE = 10;

export default function ReservationsPage() {
  const profile = usePortalProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedReservationId = searchParams.get('reservation') || '';
  const linkedQuery = searchParams.get('query') || '';
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState(linkedQuery);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewingReservation, setReviewingReservation] = useState<Reservation | null>(null);
  const [cancellingReservation, setCancellingReservation] = useState<Reservation | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState(linkedQuery);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { setSearchTerm(linkedQuery); setCurrentPage(1); setFilterStatus('ALL'); }, [linkedQuery, selectedReservationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(searchTerm); setCurrentPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    loadReservations({ page: selectedReservationId ? 1 : currentPage, query: selectedReservationId ? '' : debouncedQuery, status: selectedReservationId ? 'ALL' : filterStatus, reservationId: selectedReservationId || undefined, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setReservations(result.reservations); setTotalRows(result.total);
      setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(result.total / PAGE_SIZE))));
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load reservations.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currentPage, debouncedQuery, filterStatus, refreshKey, selectedReservationId]);

  useEffect(() => {
    let active = true;
    setReviewingReservation(null);
    if (selectedReservationId) loadReservation(selectedReservationId).then((reservation) => { if (active) setReviewingReservation(reservation); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load booking.'); });
    return () => { active = false; };
  }, [selectedReservationId]);

  const filtered = selectedReservationId ? reservations.filter((reservation) => reservation.id === selectedReservationId) : reservations;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visibleReservations = filtered;

  const replaceReservation = (updated: Reservation) => { setReservations((current) => current.map((reservation) => reservation.id === updated.id ? updated : reservation)); setRefreshKey((key) => key + 1); };

  const checkInReservation = async (reservation: Reservation) => {
    setUpdatingId(reservation.id); setError('');
    try {
      replaceReservation(await updateReservationStatus(reservation.id, 'check-in', { roomId: reservation.rooms[0]?.roomId }));
      setReviewingReservation(null);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to check in reservation.'); }
    finally { setUpdatingId(null); }
  };

  const cancelReservation = async (reservation: Reservation) => {
    setCancellingReservation(reservation);
  };

  const removeReservation = async (reservation: Reservation) => {
    const operationalEffect = reservation.status === 'CHECKED_IN'
      ? '\nThe occupied room will be released as Vacant Dirty. An active booking with payments cannot be deleted until it is refunded.'
      : reservation.status === 'CHECKED_OUT'
        ? '\nThe closed folio, payments, and General Ledger history will remain preserved.'
        : '';
    if (!window.confirm(`Delete booking ${reservation.confirmationNumber} for ${reservation.guest.name}?\n\nIt will disappear from this list, but its audit history will be preserved.${operationalEffect}`)) return;
    setUpdatingId(reservation.id); setError('');
    try {
      const deletedId = await deleteReservation(reservation.id);
      setReservations((current) => current.filter((item) => item.id !== deletedId));
      setRefreshKey((key) => key + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete booking.');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusLabel = (status: string) => status === 'INQUIRY' ? 'PENDING' : status === 'CHECKED_IN' ? 'CONFIRMED / CHECKED IN' : status.replaceAll('_', ' ');

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <div><h1 style={{ fontSize: 24, fontWeight: 800 }}>Reservations Matrix & Bookings</h1><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Live website, front-desk, walk-in, and partner reservations from the PMS database</p></div>
      <div style={{ display: 'flex', gap: 12 }}><div style={{ position: 'relative' }}><Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} /><input type="text" placeholder="Search Confirmation / Guest..." className="hne-input" style={{ paddingLeft: 36, width: 280, height: 40 }} value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); }} /></div><Link href="/book?source=WALK_IN" className="hne-btn hne-btn-primary hne-btn-sm" style={{ display: 'inline-flex', alignItems: 'center' }}><Plus size={16} /><span>Create Reservation</span></Link></div>
    </div>
    <div style={{ display: selectedReservationId ? 'none' : 'flex', gap: 8, flexWrap: 'wrap' }}>{['ALL', 'INQUIRY', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map((status) => <button key={status} onClick={() => { setFilterStatus(status); setCurrentPage(1); }} className={`hne-btn ${filterStatus === status ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}>{status === 'INQUIRY' ? 'PENDING' : status.replaceAll('_', ' ')}</button>)}</div>
    {error && <div role="alert" style={{ padding: 12, borderRadius: 8, background: 'var(--danger-light)', color: 'var(--danger-red)' }}>{error}</div>}
    {selectedReservationId && <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13 }}><span>Showing the selected customer booking.</span><button type="button" className="hne-btn hne-btn-secondary hne-btn-sm" onClick={() => setSearchParams({})}>Show all reservations</button></div>}
    <Card><div className="hne-table-container"><table className="hne-table">
      <thead><tr><th>Confirmation #</th><th>Guest</th><th>Room Type / Assigned</th><th>Check-In & Out</th><th>Source</th><th>Total / Advance</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        {loading && <tr><td colSpan={8}>Loading reservations…</td></tr>}
        {!loading && filtered.length === 0 && <tr><td colSpan={8}>No reservations found.</td></tr>}
        {visibleReservations.map((reservation) => {
          const room = reservation.rooms[0];
          return <tr key={reservation.id}>
            <td><div style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{reservation.confirmationNumber}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{room?.nights || 0} Nights · {reservation.adultsCount} Adults</div></td>
            <td><div style={{ fontWeight: 700 }}>{reservation.guest.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{reservation.guest.phone}{reservation.guest.idNumber ? ` · ${reservation.guest.idType || 'ID'}: ${reservation.guest.idNumber}` : ''}</div></td>
            <td><div style={{ fontWeight: 600, fontSize: 13 }}>{room?.roomType || 'Unassigned'}</div><Badge variant="orange" style={{ fontSize: 10 }}>Room {room?.roomNumber || 'Unassigned'}</Badge></td>
            <td style={{ fontSize: 12 }}><div style={{ fontWeight: 600 }}>{formatDualDate(reservation.checkInDate).adFormatted}</div><div style={{ color: '#B45309', fontSize: 11, fontWeight: 600 }}>BS: {formatDualDate(reservation.checkInDate).bsFormatted}</div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>to {formatDualDate(reservation.checkOutDate).adFormatted} (BS: {formatDualDate(reservation.checkOutDate).bsFormatted})</div></td>
            <td><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{reservation.source.replaceAll('_', ' ')}</span></td>
            <td><div style={{ fontWeight: 700 }}>Rs. {reservation.grandTotal.toLocaleString()}</div><div style={{ fontSize: 11, color: 'var(--green)' }}>Adv: Rs. {reservation.advancePaid.toLocaleString()}</div></td>
            <td><Badge variant={reservation.status === 'CHECKED_IN' ? 'success' : reservation.status === 'CONFIRMED' ? 'orange' : 'neutral'}>{statusLabel(reservation.status)}</Badge>{reservation.cancellationRefund && <div style={{ fontSize: 11, marginTop: 6 }}>Refund {reservation.cancellationRefund.status === 'PAID' ? 'paid' : 'due'}: Rs. {reservation.cancellationRefund.refundAmount.toLocaleString()}<br />10% retained: Rs. {reservation.cancellationRefund.deductionAmount.toLocaleString()}</div>}</td>
            <td><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {hasAccess(profile, 'RESERVATIONS', 'refund') && reservation.status === 'CANCELLED' && reservation.cancellationRefund?.status === 'PENDING' && <button type="button" onClick={() => setCancellingReservation(reservation)} className="hne-btn hne-btn-primary hne-btn-sm">Record Refund</button>}
              {['INQUIRY', 'CONFIRMED'].includes(reservation.status) && <button type="button" onClick={() => setReviewingReservation(reservation)} disabled={updatingId === reservation.id} className="hne-btn hne-btn-primary hne-btn-sm" style={{ fontSize: 11.5 }}>Review & Check In</button>}
              {['INQUIRY', 'CONFIRMED'].includes(reservation.status) && <button type="button" onClick={() => cancelReservation(reservation)} disabled={updatingId === reservation.id} className="hne-btn hne-btn-secondary hne-btn-sm" style={{ fontSize: 11.5 }}>{updatingId === reservation.id ? 'Saving…' : 'Cancel'}</button>}
              {hasAccess(profile, 'RESERVATIONS', 'delete') && <button type="button" onClick={() => removeReservation(reservation)} disabled={updatingId === reservation.id} className="hne-btn hne-btn-danger hne-btn-sm" style={{ fontSize: 11.5, paddingInline: 8 }} title="Delete booking"><Trash2 size={13} /> Delete</button>}
              {reservation.status === 'CHECKED_IN' && <Link href={`/admin/pms/frontdesk?folio=${encodeURIComponent(reservation.folioNumber || '')}`} className="hne-btn hne-btn-secondary hne-btn-sm" style={{ fontSize: 11.5 }}>Inspect Folio / Extend Stay</Link>}
              {['CHECKED_OUT', 'CANCELLED'].includes(reservation.status) && <button type="button" onClick={() => setReviewingReservation(reservation)} className="hne-btn hne-btn-secondary hne-btn-sm" style={{ fontSize: 11.5 }}>View Booking</button>}
            </div></td>
          </tr>;
        })}
      </tbody>
    </table></div>
      {!loading && filtered.length > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, totalRows)} of {totalRows} reservations</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="hne-btn hne-btn-secondary hne-btn-sm">Previous</button>
          <span style={{ fontSize: 12 }}>Page {safePage} of {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="hne-btn hne-btn-secondary hne-btn-sm">Next</button>
        </div>
      </div>}
    </Card>
    {cancellingReservation && <CancellationModal reservation={cancellingReservation} onClose={() => setCancellingReservation(null)} onSaved={(updated) => { replaceReservation(updated); setCancellingReservation(null); }} />}
    {reviewingReservation && <ReservationReviewModal reservation={reviewingReservation} saving={updatingId === reviewingReservation.id} onAdvanceRecorded={(updated) => { replaceReservation(updated); setReviewingReservation(updated); }} onClose={() => setReviewingReservation(null)} onCheckIn={() => checkInReservation(reviewingReservation)} onPaymentComplete={() => loadReservation(reviewingReservation.id).then((updated) => {
      replaceReservation(updated);
      setReviewingReservation(updated);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to refresh booking.'))} />}
  </div>;
}
