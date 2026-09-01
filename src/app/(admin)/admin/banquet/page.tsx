'use client';

import React, { useState, useEffect } from 'react';
import { PartyPopper, Calendar, Users, Plus, CheckCircle2, Clock, MapPin, DollarSign, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DualCalendarPicker } from '@/components/ui/DualCalendarPicker';
import { formatDualDate } from '@/lib/nepali-calendar';

export default function BanquetManagementPage() {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [selectedHallCode, setSelectedHallCode] = useState('NILKANTHA-01');
  const [eventType, setEventType] = useState('CONFERENCE');
  const [eventDate, setEventDate] = useState('2026-08-25');
  const [paxCount, setPaxCount] = useState('150');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [hallRent, setHallRent] = useState('45000');
  const [cateringTotal, setCateringTotal] = useState('60000');
  const [advancePaid, setAdvancePaid] = useState('30000');

  const [bookings, setBookings] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBanquetData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/banquet/bookings');
      const json = await res.json();
      if (json.success) {
        setBookings(json.bookings || []);
        setHalls(json.halls || []);
      }
    } catch (err) {
      console.error('Failed to load banquet bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanquetData();
  }, []);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/banquet/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          eventType,
          hallCode: selectedHallCode,
          guestName: clientName,
          phone: clientPhone,
          startDate: eventDate,
          expectedPax: parseInt(paxCount),
          hallRent: parseFloat(hallRent),
          cateringTotal: parseFloat(cateringTotal),
          advancePaid: parseFloat(advancePaid)
        })
      });

      const json = await res.json();
      if (json.success) {
        alert('Banquet booking confirmed and double-entry advance journal voucher created!');
        setShowBookingModal(false);
        setEventName('');
        setClientName('');
        setClientPhone('');
        fetchBanquetData();
      } else {
        alert(json.error || 'Failed to create booking');
      }
    } catch (err: any) {
      alert(err.message || 'Error booking banquet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Banquet, Conference & Event Operations</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Schedule Nilkantha Ballroom, Tulki Devi & Devakala halls, layout seating, catering BEO, and advance deposits
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchBanquetData} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowBookingModal(true)}>
            <Plus size={16} />
            <span>Create Banquet Booking</span>
          </Button>
        </div>
      </div>

      {/* Hall Specs Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-crimson)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--brand-crimson)' }}>Nilkantha Grand Ballroom</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Theater: <strong>300 Pax</strong> • Cluster: 200 Pax • Daily Rate: Rs. 45,000
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Dual HD Projector, Stage & AC</div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-green)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--brand-green)' }}>Tulki Devi Function Hall</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Theater: <strong>150 Pax</strong> • Cluster: 100 Pax • Daily Rate: Rs. 28,000
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sound System, AC & Buffet Setup</div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-gold)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--brand-gold)' }}>Devakala Executive Suite</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Boardroom: <strong>60 Pax</strong> • U-Shape: 30 Pax • Daily Rate: Rs. 15,000
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Smart Video Conference & High-Speed WiFi</div>
        </div>
      </div>

      {/* Bookings Table */}
      <Card title={`Scheduled Banquet & Conference Events (${bookings.length})`} subtitle="Real-time bookings synchronized with General Ledger advances">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading banquet bookings from PostgreSQL...
          </div>
        ) : (
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Venue Hall</th>
                  <th>Dates (Dual AD / BS)</th>
                  <th>Pax</th>
                  <th>Client / Organizer</th>
                  <th>Financials</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{b.eventName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ref: {b.bookingNumber} • {b.eventType}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--brand-crimson)' }}>{b.hallName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Layout: {b.setupLayout}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatDualDate(b.startDate).adFormatted}</div>
                      <div style={{ fontSize: 11, color: 'var(--brand-gold)', fontWeight: 600 }}>
                        BS: {b.nepaliDate}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{b.expectedPax}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pax</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.guestName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800 }}>Rs. {b.grandTotal.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--brand-green)' }}>
                        Adv: Rs. {b.advancePaid.toLocaleString()} (Bal: Rs. {b.balanceDue.toLocaleString()})
                      </div>
                    </td>
                    <td>
                      <Badge variant="success">{b.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Booking Modal */}
      {showBookingModal && (
        <div className="hne-modal-backdrop" onClick={() => setShowBookingModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Create New Banquet / Conference Booking</h3>
              <button className="hne-modal-close" onClick={() => setShowBookingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBooking}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Event Title / Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nabil Bank Annual Strategic Summit"
                    className="hne-input"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="hne-form-group">
                    <label className="hne-label">Venue Hall</label>
                    <select
                      className="hne-select"
                      value={selectedHallCode}
                      onChange={(e) => {
                        setSelectedHallCode(e.target.value);
                        if (e.target.value === 'NILKANTHA-01') setHallRent('45000');
                        else if (e.target.value === 'TULKI-01') setHallRent('28000');
                        else setHallRent('15000');
                      }}
                    >
                      <option value="NILKANTHA-01">Nilkantha Grand Ballroom (300 Pax)</option>
                      <option value="TULKI-01">Tulki Devi Function Hall (150 Pax)</option>
                      <option value="DEVAKALA-01">Devakala Executive Suite (60 Pax)</option>
                    </select>
                  </div>

                  <div className="hne-form-group">
                    <label className="hne-label">Event Type</label>
                    <select
                      className="hne-select"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    >
                      <option value="CONFERENCE">Corporate Conference</option>
                      <option value="SEMINAR">Workshop / Seminar</option>
                      <option value="WEDDING">Wedding Reception</option>
                      <option value="CORPORATE_DINNER">Gala Dinner</option>
                      <option value="MEETING">Board Meeting</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="hne-form-group">
                    <DualCalendarPicker
                      label="Event Date"
                      value={eventDate}
                      onChange={(adDate) => setEventDate(adDate)}
                      minDate="2026-08-22"
                    />
                  </div>

                  <div className="hne-form-group">
                    <label className="hne-label">Expected Pax</label>
                    <input
                      type="number"
                      required
                      min="10"
                      className="hne-input"
                      value={paxCount}
                      onChange={(e) => setPaxCount(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="hne-form-group">
                    <label className="hne-label">Organizer / Client Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Pradhan"
                      className="hne-input"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div className="hne-form-group">
                    <label className="hne-label">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+977-9851012345"
                      className="hne-input"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="hne-form-group">
                    <label className="hne-label">Hall Rent (NPR)</label>
                    <input
                      type="number"
                      required
                      className="hne-input"
                      value={hallRent}
                      onChange={(e) => setHallRent(e.target.value)}
                    />
                  </div>

                  <div className="hne-form-group">
                    <label className="hne-label">Catering (NPR)</label>
                    <input
                      type="number"
                      required
                      className="hne-input"
                      value={cateringTotal}
                      onChange={(e) => setCateringTotal(e.target.value)}
                    />
                  </div>

                  <div className="hne-form-group">
                    <label className="hne-label">Advance Deposit</label>
                    <input
                      type="number"
                      required
                      className="hne-input"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowBookingModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>Confirm & Save Event</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
