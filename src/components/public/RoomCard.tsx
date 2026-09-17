import React from 'react';
import Link from '@/lib/router';
import { Users, Maximize2, Sparkles } from 'lucide-react';

interface RoomCardProps {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  maxAdults?: number;
  maxChildren?: number;
  sizeSqFt?: number;
  bedType?: string;
  viewType?: string;
  coverImageUrl?: string;
  amenities?: string[];
  featured?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  name,
  code,
  slug,
  description,
  basePrice,
  maxOccupancy,
  maxAdults,
  maxChildren,
  sizeSqFt,
  bedType,
  viewType,
  coverImageUrl = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  amenities = [],
  featured
}) => {
  return (
    <div
      className="hne-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative'
      }}
    >
      {/* Cover Image */}
      <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
        <img
          src={coverImageUrl}
          alt={name}
          className="hne-room-img"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        {featured && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              backgroundColor: 'var(--primary-orange)',
              color: '#FFFFFF',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: 11.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <Sparkles size={12} /> Popular Choice
          </div>
        )}
        {viewType && <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(0,0,0,0.75)',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: 600,
            backdropFilter: 'blur(4px)'
          }}
        >
          {viewType}
        </div>}
      </div>

      {/* Body */}
      <div style={{ padding: '22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{name}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Code: {code}</span>
          </div>
        </div>

        {/* Specs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            marginBottom: 10,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} color="var(--primary-orange)" /> Up to {maxOccupancy} guests
          </span>
          {sizeSqFt && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Maximize2 size={14} color="var(--primary-orange)" /> {sizeSqFt} sq.ft
          </span>}
          {bedType && <span>{bedType}</span>}
        </div>

        {(maxAdults !== undefined || maxChildren !== undefined) && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Maximum {maxAdults ?? 0} adult{maxAdults === 1 ? '' : 's'} and {maxChildren ?? 0} child{maxChildren === 1 ? '' : 'ren'}
          </div>
        )}

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16, flex: 1 }}>
          {description}
        </p>

        {/* Amenity Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {amenities.slice(0, 4).map((am, i) => (
            <span
              key={i}
              style={{
                fontSize: 11.5,
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-secondary)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}
            >
              ✓ {am}
            </span>
          ))}
        </div>

        {/* Price & CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid var(--border)'
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Starting from</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-orange)', fontFamily: 'var(--font-family-display)' }}>
                Rs. {basePrice.toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/ night</span>
            </div>
          </div>

          <Link
            href={`/book?type=${code}`}
            className="hne-btn hne-btn-primary"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            Select Room
          </Link>
        </div>
      </div>
    </div>
  );
};
