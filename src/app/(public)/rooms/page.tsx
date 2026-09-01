'use client';

import React, { useState, useEffect } from 'react';
import { RoomCard } from '@/components/public/RoomCard';
import { Sparkles, BedDouble, ShieldCheck, Wifi, Coffee, Tv } from 'lucide-react';
import Link from 'next/link';

export default function RoomsPage() {
  const [pageInfo, setPageInfo] = useState({
    heroHeading: 'Rooms & Suites Catalog',
    heroSubheading: '43 SALEABLE ROOMS • 4 FLOORS',
    heroDescription: 'Every room includes high-speed fiber internet, Cable TV, attached modern bathroom, and personalized room service.'
  });

  useEffect(() => {
    fetch('/api/cms/pages?slug=rooms')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroHeading: data.page.heroHeading || 'Rooms & Suites Catalog',
            heroSubheading: data.page.heroSubheading || '43 SALEABLE ROOMS • 4 FLOORS',
            heroDescription: data.page.heroDescription || 'Every room includes high-speed fiber internet, Cable TV, attached modern bathroom, and personalized room service.'
          });
        }
      })
      .catch(console.error);
  }, []);

  const allRooms = [
    {
      id: 'room-1',
      name: 'Luxury Room',
      code: 'LUX-01',
      slug: 'luxury-room',
      description: 'Sophisticated luxury accommodation featuring climate-control AC, 60 Mbps NT Fiber Net WiFi, Cable TV, mineral water, and premium amenities. Total: 8 rooms.',
      basePrice: 5500,
      maxOccupancy: 2,
      sizeSqFt: 380,
      bedType: '1 King Bed',
      viewType: 'City & Garden View',
      coverImageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      amenities: ['Climate Control AC', '60 Mbps NT Fiber Net WiFi', 'Cable TV', 'Drinking Water', 'Room Service'],
      featured: true
    },
    {
      id: 'room-2',
      name: 'Deluxe Room',
      code: 'DLX-01',
      slug: 'deluxe-room',
      description: 'Spacious Deluxe room equipped with individual climate control AC, LED Cable TV, high-speed fiber internet, and work desk. Total: 12 rooms.',
      basePrice: 4200,
      maxOccupancy: 2,
      sizeSqFt: 320,
      bedType: '1 Queen Bed',
      viewType: 'City View',
      coverImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      amenities: ['Climate Control AC', 'High-Speed Fiber Net', 'LED Cable TV', 'Hot & Cold Shower', 'Tea/Coffee Station'],
      featured: true
    },
    {
      id: 'room-3',
      name: 'Family Room',
      code: 'FAM-01',
      slug: 'family-room',
      description: 'Expansive family room designed for comfortable group stays with multiple double beds, modern attached bath, and daily housekeeping. Total: 6 rooms.',
      basePrice: 6500,
      maxOccupancy: 4,
      sizeSqFt: 520,
      bedType: '2 Double Beds',
      viewType: 'City View',
      coverImageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      amenities: ['2 Double Beds', 'Free Fiber WiFi', 'Cable TV', 'Attached Modern Bath', 'Daily Housekeeping'],
      featured: false
    },
    {
      id: 'room-4',
      name: 'Honeymoon Room',
      code: 'HNY-01',
      slug: 'honeymoon-room',
      description: 'Specially decorated romantic suite with climate control AC, luxury furnishings, attached bathtub, and complimentary welcome beverage. Total: 3 rooms.',
      basePrice: 7000,
      maxOccupancy: 2,
      sizeSqFt: 420,
      bedType: '1 King Bed',
      viewType: 'Mountain & City View',
      coverImageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
      amenities: ['Climate Control AC', 'Bathtub & Shower', 'Romantic Décor', 'Wine & Treats', 'Free Fiber WiFi'],
      featured: true
    },
    {
      id: 'room-5',
      name: 'Standard AC Room',
      code: 'STD-AC',
      slug: 'standard-ac',
      description: 'Comfortable air-conditioned standard room offering great value with essential modern amenities and clean attached bath. Total: 8 rooms.',
      basePrice: 3200,
      maxOccupancy: 2,
      sizeSqFt: 280,
      bedType: '1 Double Bed',
      viewType: 'City View',
      coverImageUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
      amenities: ['Climate Control AC', 'Free Fiber WiFi', 'Cable TV', 'Attached Bath', 'Room Service'],
      featured: false
    },
    {
      id: 'room-6',
      name: 'Standard Non-AC Room',
      code: 'STD-NAC',
      slug: 'standard-non-ac',
      description: 'Budget-friendly standard room featuring ceiling fan, attached bathroom, high-speed fiber internet, and Cable TV. Total: 6 rooms.',
      basePrice: 2200,
      maxOccupancy: 2,
      sizeSqFt: 250,
      bedType: '1 Double Bed',
      viewType: 'Courtyard View',
      coverImageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      amenities: ['Ceiling Fan', 'Free Fiber WiFi', 'Cable TV', 'Drinking Water', 'Attached Bath'],
      featured: false
    }
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF' }}>
      {/* Banner */}
      <section
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '64px 24px',
          textAlign: 'center',
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
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total 43 Saleable Keys (6 Categories)</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
          {allRooms.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      </div>
    </div>
  );
}
