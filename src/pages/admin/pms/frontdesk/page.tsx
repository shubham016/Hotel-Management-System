import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Printer,
  CreditCard,
  LogOut,
  RefreshCw,
  Clock,
  Sparkles,
  DollarSign,
  Receipt,
  UserCheck,
  Building,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';
import Link, { useRouter, useSearchParams } from '@/lib/router';
import { PaymentRequestModal } from '@/components/payments/PaymentRequestModal';

export default function FrontDeskPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedFolio = searchParams.get('folio');
  const isFocusedFolioView = Boolean(requestedFolio);
  const [folios, setFolios] = useState<any[]>([]);
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeModule, setChargeModule] = useState('RESTAURANT');
  const [laundryRates, setLaundryRates] = useState<{ name: string; price: number }[]>([]);
  const [laundryReturn, setLaundryReturn] = useState('');

  useEffect(() => {
    fetch('/api/client_reference').then((response) => response.json()).then((result) => {
      if (result.success) {
        setLaundryRates(result.data.laundry.filter((item: { active: boolean }) => item.active));
        setLaundryReturn(result.data.laundryReturn);
      }
    }).catch(() => {});
  }, []);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExtendStayModal, setShowExtendStayModal] = useState(false);
  const [additionalNights, setAdditionalNights] = useState('1');
  const [extensionReason, setExtensionReason] = useState('');
  const [showCheckoutPayment, setShowCheckoutPayment] = useState(false);

  const fetchFrontDeskData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/pms/frontdesk');
      const json = await res.json();
      if (json.success) {
        setFolios(json.folios || []);
        setArrivals(json.arrivals || []);
        const folioToKeep = selectedFolio?.id || (requestedFolio ? json.folios.find((f: any) => f.folioNumber === requestedFolio)?.id : null);
        if (folioToKeep) {
          const updatedSelected = json.folios.find((f: any) => f.id === folioToKeep);
          if (updatedSelected) setSelectedFolio(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Failed to load front desk data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFrontDeskData();
  }, [requestedFolio]);

  const handleCheckInArrival = async (arrival: any) => {
    if (!confirm(`Check in guest ${arrival.guestName} to Room #${arrival.roomNumber}?`)) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/pms/frontdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: arrival.id, roomId: arrival.roomId })
      });
      const json = await res.json();
      if (json.success) {
        alert(`Guest ${arrival.guestName} checked in successfully!`);
        fetchFrontDeskData();
      } else {
        alert(json.error || 'Check-in failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error checking in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio || !chargeAmount) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/pms/folio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'ADD_CHARGE',
          folioId: selectedFolio.id,
          description: chargeDesc || `${chargeModule} Service`,
          amount: parseFloat(chargeAmount),
          sourceModule: chargeModule
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Charge added and folio totals recalculated with the active taxes.');
        setShowAddChargeModal(false);
        setChargeDesc('');
        setChargeAmount('');
        fetchFrontDeskData();
      } else {
        alert(json.error || 'Failed to add charge');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding charge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio || !paymentAmount) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/pms/folio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'RECORD_PAYMENT',
          folioId: selectedFolio.id,
          amount: parseFloat(paymentAmount),
          paymentMethod,
          notes: paymentNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(`Payment recorded! Official Receipt generated: ${json.receiptNumber}`);
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchFrontDeskData();
      } else {
        alert(json.error || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleAndCheckout = async (folio: any) => {
    if (!confirm(`Settle Folio #${folio.folioNumber} (Balance Due: Rs. ${folio.balanceDue.toLocaleString()}), complete guest checkout, and post General Ledger Sales Voucher?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/pms/folio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'SETTLE_AND_CHECKOUT',
          folioId: folio.id,
          settlementMethod: 'CASH'
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Checkout completed and GL posted successfully!');
        setSelectedFolio(null);
        router.replace('/admin/pms/frontdesk');
      } else {
        alert(json.error || 'Failed to checkout');
      }
    } catch (err: any) {
      alert(err.message || 'Error checking out');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendStay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFolio) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/pms/reservations/${selectedFolio.reservationId}/extend-stay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalNights: Number(additionalNights), reason: extensionReason.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to extend this stay.');
      setShowExtendStayModal(false);
      setAdditionalNights('1');
      setExtensionReason('');
      await fetchFrontDeskData();
    } catch (error: any) {
      alert(error.message || 'Unable to extend this stay.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const extensionCheckoutDate = selectedFolio
    ? addDays(selectedFolio.checkOutDate, Math.max(0, Number(additionalNights) || 0))
    : '';

  const filteredFolios = folios.filter(
    (f) =>
      f.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.folioNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{isFocusedFolioView ? 'Guest Folio Inspector' : 'Front Desk & In-House Guest Folios'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {isFocusedFolioView ? `Reviewing folio ${requestedFolio}` : 'Active guest billing, charge posting (F&B/Spa/Laundry), FonePay/Cash payments, and GL checkout settlement'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={fetchFrontDeskData} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>

          {!isFocusedFolioView && <div style={{ position: 'relative', width: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Room, Guest, Folio..."
              className="hne-input"
              style={{ paddingLeft: 32, fontSize: 12.5, height: 36 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>}

          {isFocusedFolioView && <Link href="/admin/pms/frontdesk" className="hne-btn hne-btn-secondary hne-btn-sm">View All Active Folios</Link>}

          {!isFocusedFolioView && <Link href="/book?source=WALK_IN" className="hne-btn hne-btn-primary hne-btn-sm" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Plus size={16} />
            <span>Walk-In / New Booking</span>
          </Link>}
        </div>
      </div>

      {/* Arriving Guests Awaiting Check-In Alert Card */}
      {!isFocusedFolioView && arrivals.length > 0 && (
        <div style={{ backgroundColor: 'var(--brand-gold-light)', border: '1px solid var(--brand-gold)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--brand-gold-hover)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck size={18} /> Today's Pending Arrivals Awaiting Check-In ({arrivals.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {arrivals.map((arr) => (
              <div key={arr.id} style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{arr.guestName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    Room #{arr.roomNumber} ({arr.roomType}) • Ref: {arr.confirmationNumber}
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={() => handleCheckInArrival(arr)} disabled={isSubmitting}>
                  Check In
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Folio List + Folio Detail Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: isFocusedFolioView ? '1fr' : selectedFolio ? '1fr 1.2fr' : '1fr', gap: 24 }}>
        {/* Folios Table */}
        {!isFocusedFolioView && <Card title={`Active In-House Guest Folios (${filteredFolios.length})`} subtitle="Click any folio row to open inspector and ledger details">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading in-house guest folios from PostgreSQL...
            </div>
          ) : (
            <div className="hne-table-container">
              <table className="hne-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Guest Name</th>
                    <th>Dates (Dual AD / BS)</th>
                    <th>Total Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFolios.map((folio) => (
                    <tr
                      key={folio.id}
                      style={{
                        backgroundColor: selectedFolio?.id === folio.id ? 'var(--brand-crimson-light)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedFolio(folio)}
                    >
                      <td>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--brand-crimson)' }}>
                          #{folio.roomNumber}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{folio.roomType}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{folio.guestName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{folio.phone}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600 }}>In: {formatDualDate(folio.checkInDate).adFormatted}</div>
                        <div style={{ color: 'var(--brand-gold-hover)', fontSize: 11, fontWeight: 600 }}>
                          BS: {formatDualDate(folio.checkInDate).bsFormatted}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                          Out: {formatDualDate(folio.checkOutDate).adFormatted}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: folio.balanceDue > 0 ? 'var(--danger-red)' : 'var(--brand-green)' }}>
                          Rs. {folio.balanceDue.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total: Rs. {folio.grandTotal.toLocaleString()}</div>
                      </td>
                      <td>
                        <Badge variant={folio.status === 'SETTLED' ? 'success' : 'warning'}>
                          {folio.status}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFolio(folio);
                          }}
                        >
                          Inspect Folio
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>}

        {isFocusedFolioView && !isLoading && !selectedFolio && <Card title="Folio Not Available" subtitle="The requested folio is not an active in-house guest folio.">
          <Link href="/admin/pms/frontdesk" className="hne-btn hne-btn-secondary hne-btn-sm">Return to Active Folios</Link>
        </Card>}

        {/* Selected Folio Inspector Panel */}
        {selectedFolio && (
          <Card
            className="folio-print-area"
            title={`Guest Folio #${selectedFolio.folioNumber}`}
            subtitle={`Room #${selectedFolio.roomNumber} • ${selectedFolio.guestName}`}
            action={
              <button
                className="folio-no-print"
                onClick={() => isFocusedFolioView ? router.replace('/admin/pms/frontdesk') : setSelectedFolio(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)' }}
              >
                ✕ Close
              </button>
            }
          >
            {/* Printable Brand Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <img src="/logo.png" alt="Hotel New Era" style={{ height: 38, width: 'auto', objectFit: 'contain' }} />
              <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>HOTEL NEW ERA - BUTWAL</div>
                <div>Tel: (+977) 71-543833 • Folio: {selectedFolio.folioNumber}</div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="folio-no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm" onClick={() => setShowAddChargeModal(true)}>
                <Plus size={14} /> Add Charge (F&B / Spa / Laundry)
              </Button>
              <Button variant="success" size="sm" onClick={() => setShowPaymentModal(true)}>
                <CreditCard size={14} /> Record Payment
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer size={14} /> Print Invoice
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowExtendStayModal(true)}>
                <Calendar size={14} /> Extend Stay
              </Button>
              {selectedFolio.balanceDue > 0 && <Button variant="secondary" size="sm" onClick={() => setShowCheckoutPayment(true)}>
                <CreditCard size={14} /> Pay Balance by QR
              </Button>}
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleSettleAndCheckout(selectedFolio)}
                disabled={isSubmitting}
              >
                <LogOut size={14} /> Checkout & Post GL
              </Button>
            </div>

            {/* Folio Items Table */}
            <div className="hne-table-container" style={{ marginBottom: 20 }}>
              <table className="hne-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Module</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>SC + VAT</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFolio.items.map((it: any) => (
                    <tr key={it.id}>
                      <td style={{ fontSize: 11.5 }}>{it.date}</td>
                      <td>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: 'var(--bg-subtle)' }}>
                          {it.sourceModule}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{it.description}</td>
                      <td>Rs. {it.amount.toLocaleString()}</td>
                      <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        Rs. {(it.serviceCharge + it.vatAmount).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        Rs. {(it.amount + it.serviceCharge + it.vatAmount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: 18, border: '1px solid var(--border)', fontSize: 13 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Accommodations & Services Subtotal:</span>
                  <span>Rs. {selectedFolio.subTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Hotel Service Charge (10%):</span>
                  <span>Rs. {selectedFolio.serviceCharge.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Government VAT (13%):</span>
                  <span>Rs. {selectedFolio.vatAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <span>Grand Total Billed:</span>
                  <span>Rs. {selectedFolio.grandTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--brand-green)', fontWeight: 700 }}>
                  <span>Total Payments Received:</span>
                  <span>Rs. {selectedFolio.totalPaid.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, color: selectedFolio.balanceDue > 0 ? 'var(--danger-red)' : 'var(--brand-green)', borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <span>Outstanding Balance Due:</span>
                  <span>Rs. {selectedFolio.balanceDue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Add Charge Modal */}
      {showAddChargeModal && selectedFolio && (
        <div className="hne-modal-backdrop" onClick={() => setShowAddChargeModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Post Extra Charge to Room #{selectedFolio.roomNumber}</h3>
              <button className="hne-modal-close" onClick={() => setShowAddChargeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCharge}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Department / Module</label>
                  <select
                    className="hne-select"
                    value={chargeModule}
                    onChange={(e) => setChargeModule(e.target.value)}
                  >
                    <option value="RESTAURANT">Dhiki Restaurant & Bhojangriha</option>
                    <option value="TERRACE_BAR">Terrace Lounge & Bar</option>
                    <option value="SPA">Ayurvedic Spa & Wellness</option>
                    <option value="LAUNDRY">Guest Laundry & Dry Cleaning</option>
                    <option value="MINIBAR">In-Room Minibar</option>
                    <option value="TRANSPORT">Airport / Buspark Private Transfer</option>
                  </select>
                </div>

                {chargeModule === 'LAUNDRY' && <div className="hne-form-group">
                  <label className="hne-label">Laundry tariff</label>
                  <select className="hne-select" value="" onChange={(event) => {
                    const item = laundryRates.find((rate) => rate.name === event.target.value);
                    if (item) { setChargeDesc(`Laundry - ${item.name}`); setChargeAmount(String(item.price)); }
                  }}>
                    <option value="">Choose an item</option>
                    {laundryRates.map((item) => <option key={item.name} value={item.name}>{item.name} — Rs. {item.price}</option>)}
                  </select>
                  <small>{laundryReturn}</small>
                </div>}

                <div className="hne-form-group">
                  <label className="hne-label">Item / Service Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thakali Khana Dinner Set x2"
                    className="hne-input"
                    value={chargeDesc}
                    onChange={(e) => setChargeDesc(e.target.value)}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Amount (NPR before taxes)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1900"
                    className="hne-input"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
                  Automatic calculation: 13% VAT will be applied to the guest folio ledger.
                </div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowAddChargeModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>Post Charge</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedFolio && (
        <div className="hne-modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Record Payment for Room #{selectedFolio.roomNumber}</h3>
              <button className="hne-modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  <div>Total Outstanding: <strong>Rs. {selectedFolio.balanceDue.toLocaleString()}</strong></div>
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Payment Amount (NPR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedFolio.balanceDue}
                    placeholder={selectedFolio.balanceDue.toString()}
                    className="hne-input"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Payment Method</label>
                  <select
                    className="hne-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Cash at Front Desk Counter</option>
                    <option value="CARD">Credit / Debit Card POS Machine</option>
                    <option value="BANK_TRANSFER">Direct Bank Deposit (Nabil / Global IME)</option>
                  </select>
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Notes / Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. FonePay Ref #839210"
                    className="hne-input"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                <Button variant="success" type="submit" disabled={isSubmitting || selectedFolio.balanceDue <= 0}>Record & Issue Receipt</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExtendStayModal && selectedFolio && (
        <div className="hne-modal-backdrop" onClick={() => setShowExtendStayModal(false)}>
          <div className="hne-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="hne-modal-header">
              <div><h3 className="hne-modal-title">Extend Stay · Room #{selectedFolio.roomNumber}</h3><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{selectedFolio.guestName} · {selectedFolio.confirmationNumber}</div></div>
              <button type="button" className="hne-modal-close" onClick={() => setShowExtendStayModal(false)}>×</button>
            </div>
            <form onSubmit={handleExtendStay}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12, background: 'var(--bg-subtle)', borderRadius: 8 }}>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current check-out</div><strong>{formatDualDate(selectedFolio.checkOutDate).adFormatted}</strong></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>New check-out</div><strong>{extensionCheckoutDate ? formatDualDate(extensionCheckoutDate).adFormatted : '—'}</strong></div>
                </div>
                <div className="hne-form-group">
                  <label className="hne-label">Additional nights / days</label>
                  <input className="hne-input" type="number" min="1" max="365" step="1" required value={additionalNights} onChange={(event) => setAdditionalNights(event.target.value)} />
                </div>
                <div className="hne-form-group">
                  <label className="hne-label">Reason / remarks</label>
                  <textarea className="hne-input" required minLength={3} maxLength={500} rows={3} placeholder="e.g. Guest requested two additional nights" value={extensionReason} onChange={(event) => setExtensionReason(event.target.value)} style={{ resize: 'vertical', height: 'auto' }} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Required. This remark and the number of added nights are saved in the audit history.</div>
                </div>
                <div style={{ padding: 10, borderRadius: 8, background: 'var(--brand-gold-light)', color: 'var(--brand-gold-hover)', fontSize: 11.5 }}>The system will first verify that the assigned room is available, then recalculate the room charge and folio total.</div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowExtendStayModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isSubmitting || extensionReason.trim().length < 3}>{isSubmitting ? 'Checking Availability…' : 'Confirm Extension'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCheckoutPayment && selectedFolio && <PaymentRequestModal
        folioId={selectedFolio.id}
        kind="CHECKOUT"
        balanceDue={selectedFolio.balanceDue}
        onClose={() => setShowCheckoutPayment(false)}
        onCompleted={() => { setShowCheckoutPayment(false); fetchFrontDeskData(); }}
      />}
    </div>
  );
}

function addDays(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
