import React, { useState, useEffect } from 'react';
import { RoomCard } from '@/components/public/RoomCard';
import { BedDouble, ShieldCheck, Wifi } from 'lucide-react';
import { loadPublicRoomTypes, roomTypeToCard, type PublicRoomType } from '@/lib/room-catalog';

export default function RoomsPage() {
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState('');
  const [pageInfo, setPageInfo] = useState({
    heroImageUrl: '',
    heroHeading: 'Rooms & Suites Catalog',
    heroSubheading: '45 LISTED ROOMS • 5 LEVELS',
    heroDescription: 'Every room includes high-speed fiber internet, Cable TV, attached modern bathroom, and personalized room service.'
  });

  useEffect(() => {
    const controller = new AbortController();
    loadPublicRoomTypes(controller.signal)
      .then(setRoomTypes)
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setRoomsError(error.message);
      })
      .finally(() => setRoomsLoading(false));

    fetch('/api/cms/pages?slug=rooms')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroImageUrl: data.page.heroImageUrl || '',
            heroHeading: data.page.heroHeading || 'Rooms & Suites Catalog',
            heroSubheading: data.page.heroSubheading || '45 LISTED ROOMS • 5 LEVELS',
            heroDescription: data.page.heroDescription || 'Every room includes high-speed fiber internet, Cable TV, attached modern bathroom, and personalized room service.'
          });
        }
      })
      .catch(console.error);
    return () => controller.abort();
  }, []);

  const dynamicRooms = roomTypes.map(roomTypeToCard);

  return (
    <div style={{ backgroundColor: '#FFFFFF' }}>
      {/* Banner */}
      <section
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '64px 24px',
          textAlign: 'center',
          backgroundImage: pageInfo.heroImageUrl ? `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${JSON.stringify(pageInfo.heroImageUrl)})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: '3px solid var(--brand-crimson)'
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--brand-gold)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8
            }}
          >
            {pageInfo.heroSubheading}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>
            {pageInfo.heroHeading}
          </h1>
          <p style={{ fontSize: 16, color: '#CBD5E1', lineHeight: 1.6 }}>
            {pageInfo.heroDescription}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Filter / Highlights Bar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 40,
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BedDouble size={20} color="var(--brand-crimson)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{roomTypes.length} Active Room {roomTypes.length === 1 ? 'Category' : 'Categories'}</span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={15} color="var(--brand-green)" /> 60 Mbps Fiber Net
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} color="var(--brand-green)" /> 24/7 Security
            </span>
          </div>
        </div>

        {/* Room Cards Grid */}
        {roomsLoading && <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading room categories…</div>}
        {roomsError && <div style={{ padding: 24, color: 'var(--danger-red)' }}>{roomsError}</div>}
        {!roomsLoading && !roomsError && dynamicRooms.length === 0 && <div style={{ padding: 24, color: 'var(--text-muted)' }}>No active room categories are currently available.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
          {dynamicRooms.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      </div>
    </div>
  );
}
