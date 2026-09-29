import React, { useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { Calendar, Users, BedDouble, Search, Sparkles } from 'lucide-react';
import { formatDualDate } from '@/lib/nepali-calendar';
import { loadPublicRoomTypes, type PublicRoomType } from '@/lib/room-catalog';

export const BookingWidget: React.FC = () => {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [roomType, setRoomType] = useState('ALL');
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    loadPublicRoomTypes(controller.signal).then(setRoomTypes).catch(() => {});
    return () => controller.abort();
  }, []);

  const checkInDual = formatDualDate(checkIn);
  const checkOutDual = formatDualDate(checkOut);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/book?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&type=${roomType}`);
  };

  return (
    <div
      style={{
        maxWidth: 1160,
        margin: '-60px auto 40px',
        position: 'relative',
        zIndex: 20,
        padding: '0 20px'
      }}
    >
      <form
        onSubmit={handleSearch}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          boxShadow: '0 12px 35px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto',
          gap: 16,
          alignItems: 'flex-end'
        }}
      >
        {/* Check In */}
        <div className="hne-form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <Calendar size={15} color="var(--primary-orange)" />
              <span>Check-In Date</span>
            </label>
            <span style={{ fontSize: 10.5, color: '#B45309', fontWeight: 700, backgroundColor: 'var(--golden-light)', padding: '1px 6px', borderRadius: 4 }}>
              BS: {checkInDual.bsMonthName} {checkInDual.bsFormatted.split(' ')[0]}
            </span>
          </div>
          <input
            type="date"
            className="hne-input"
            value={checkIn}
            min={today}
            onChange={(e) => setCheckIn(e.target.value)}
            required
            style={{ fontWeight: 600 }}
          />
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{checkInDual.combined}</span>
        </div>

        {/* Check Out */}
        <div className="hne-form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <Calendar size={15} color="var(--primary-orange)" />
              <span>Check-Out Date</span>
            </label>
            <span style={{ fontSize: 10.5, color: '#B45309', fontWeight: 700, backgroundColor: 'var(--golden-light)', padding: '1px 6px', borderRadius: 4 }}>
              BS: {checkOutDual.bsMonthName} {checkOutDual.bsFormatted.split(' ')[0]}
            </span>
          </div>
          <input
            type="date"
            className="hne-input"
            value={checkOut}
            min={checkIn || today}
            onChange={(e) => setCheckOut(e.target.value)}
            required
            style={{ fontWeight: 600 }}
          />
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{checkOutDual.combined}</span>
        </div>

        {/* Guests */}
        <div className="hne-form-group" style={{ marginBottom: 0 }}>
          <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Users size={15} color="var(--primary-orange)" />
            <span>Guests</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select
              className="hne-select"
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
            >
              <option value="1">1 Adult</option>
              <option value="2">2 Adults</option>
              <option value="3">3 Adults</option>
              <option value="4">4 Adults</option>
            </select>
            <select
              className="hne-select"
              value={children}
              onChange={(e) => setChildren(e.target.value)}
            >
              <option value="0">0 Kids</option>
              <option value="1">1 Kid</option>
              <option value="2">2 Kids</option>
            </select>
          </div>
        </div>

        {/* Room Type */}
        <div className="hne-form-group" style={{ marginBottom: 0 }}>
          <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <BedDouble size={15} color="var(--primary-orange)" />
            <span>Category</span>
          </label>
          <select
            className="hne-select"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {roomTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}
          </select>
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            className="hne-btn hne-btn-primary"
            style={{
              height: 44,
              padding: '0 24px',
              width: '100%',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Search size={16} />
            <span>Check Availability</span>
          </button>
        </div>
      </form>
    </div>
  );
};
