'use client';

import React, { useState } from 'react';
import { CalendarCheck, Plus, Search, Filter, Eye, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { formatDualDate } from '@/lib/nepali-calendar';

export default function ReservationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const reservations = [
    {
      id: 'res-101',
      confirmationNo: 'RES-202608-0101',
      guestName: 'Aarav Pradhan',
      phone: '+977-9841234567',
      roomType: 'Deluxe King Himalayan View',
      roomNumber: '101',
      checkIn: '2026-08-22',
      checkOut: '2026-08-24',
      nights: 2,
      adults: 2,
      source: 'DIRECT_WEB',
      grandTotal: 21131,
      advancePaid: 5000,
      status: 'CHECKED_IN'
    },
    {
      id: 'res-102',
      confirmationNo: 'RES-202608-0102',
      guestName: 'Emily Watson',
      phone: '+44-7700900123',
      roomType: 'Executive Lake-View Suite',
      roomNumber: '201',
      checkIn: '2026-08-22',
      checkOut: '2026-08-25',
      nights: 3,
      adults: 2,
      source: 'DIRECT_WEB',
      grandTotal: 54070,
      advancePaid: 15000,
      status: 'CONFIRMED'
    },
    {
      id: 'res-103',
      confirmationNo: 'RES-202608-0103',
      guestName: 'Binod Karki & Family',
      phone: '+977-9851098765',
      roomType: 'Himalayan Family Villa',
      roomNumber: '301',
      checkIn: '2026-08-22',
      checkOut: '2026-08-24',
      nights: 2,
      adults: 4,
      source: 'WALK_IN',
      grandTotal: 52206,
      advancePaid: 10000,
      status: 'CONFIRMED'
    },
    {
      id: 'res-104',
      confirmationNo: 'RES-202608-0098',
      guestName: 'Rohan Shrestha',
      phone: '+977-9812345678',
      roomType: 'Deluxe King Himalayan View',
      roomNumber: '102',
      checkIn: '2026-08-20',
      checkOut: '2026-08-22',
      nights: 2,
      adults: 2,
      source: 'OTA (Booking.com)',
      grandTotal: 21131,
      advancePaid: 21131,
      status: 'CHECKED_OUT'
    }
  ];

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.confirmationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm);
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Reservations Matrix & Bookings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Overview of confirmed, in-house, walk-in, and OTA bookings across all room types
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              placeholder="Search Confirmation / Guest..."
              className="hne-input"
              style={{ paddingLeft: 36, width: 280, height: 40 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link href="/book" className="hne-btn hne-btn-primary hne-btn-sm" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Plus size={16} />
            <span>Create Reservation</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`hne-btn ${filterStatus === st ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <Card>
        <div className="hne-table-container">
          <table className="hne-table">
            <thead>
              <tr>
                <th>Confirmation #</th>
                <th>Guest</th>
                <th>Room Type / Assigned</th>
                <th>Check-In & Out</th>
                <th>Source</th>
                <th>Total / Advance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{r.confirmationNo}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.nights} Nights • {r.adults} Adults</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.guestName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.roomType}</div>
                    <Badge variant="orange" style={{ fontSize: 10 }}>Room {r.roomNumber}</Badge>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{formatDualDate(r.checkIn).adFormatted}</div>
                    <div style={{ color: '#B45309', fontSize: 11, fontWeight: 600 }}>
                      BS: {formatDualDate(r.checkIn).bsFormatted}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      to {formatDualDate(r.checkOut).adFormatted} (BS: {formatDualDate(r.checkOut).bsFormatted})
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{r.source}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>Rs. {r.grandTotal.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--green)' }}>Adv: Rs. {r.advancePaid.toLocaleString()}</div>
                  </td>
                  <td>
                    <Badge variant={r.status === 'CHECKED_IN' ? 'success' : r.status === 'CONFIRMED' ? 'orange' : 'neutral'}>
                      {r.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      href="/admin/pms/frontdesk"
                      className="hne-btn hne-btn-secondary hne-btn-sm"
                      style={{ fontSize: 11.5 }}
                    >
                      Inspect Folio
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
