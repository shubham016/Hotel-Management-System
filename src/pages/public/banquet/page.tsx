import React, { useState, useEffect } from 'react';
import Link from '@/lib/router';
import { PartyPopper, Sparkles, Users, Presentation, Wifi, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function BanquetPublicPage() {
  const [pageInfo, setPageInfo] = useState({
    heroImageUrl: '',
    heroHeading: 'Conference & Function Halls',
    heroSubheading: 'BANQUETS & MEETINGS IN BUTWAL',
    heroDescription: 'Host impactful conferences, executive board meetings, and memorable wedding celebrations at Nilkantha, Tulki Devi, and Devakala halls.'
  });

  useEffect(() => {
    fetch('/api/cms/pages?slug=banquet')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroImageUrl: data.page.heroImageUrl || '',
            heroHeading: data.page.heroHeading || 'Conference & Function Halls',
            heroSubheading: data.page.heroSubheading || 'BANQUETS & MEETINGS IN BUTWAL',
            heroDescription: data.page.heroDescription || 'Host impactful conferences, executive board meetings, and memorable wedding celebrations at Nilkantha, Tulki Devi, and Devakala halls.'
          });
        }
      })
      .catch(console.error);
  }, []);

  const halls = [
    {
      name: 'Nilkantha Grand Ballroom',
      code: 'NILKANTHA-01',
      capacity: 'Up to 300 Guests',
      theater: 300,
      cluster: 200,
      ushape: 100,
      dailyRate: 45000,
      desc: 'Our premier grand ballroom ideal for large corporate conferences, regional conventions, fairy-tale weddings, and grand celebratory receptions.',
      amenities: ['Central Air Conditioning', 'Dual HD 4K Projector & Screens', 'JBL Audio & Wireless Mics', 'Stage & Podium', 'High-Speed Fiber Net WiFi'],
      image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Tulki Devi Function Hall',
      code: 'TULKI-01',
      capacity: 'Up to 150 Guests',
      theater: 150,
      cluster: 100,
      ushape: 60,
      dailyRate: 28000,
      desc: 'Versatile mid-sized conference hall perfect for corporate workshops, training programs, birthday gatherings, and family celebrations.',
      amenities: ['Air Conditioning', 'Ceiling Mounted HD Projector', 'Surround Sound System', 'Buffet Dining Setup', 'High-Speed Fiber WiFi'],
      image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Devakala Executive Meeting Suite',
      code: 'DEVAKALA-01',
      capacity: 'Up to 60 Guests',
      theater: 60,
      cluster: 40,
      ushape: 30,
      dailyRate: 15000,
      desc: 'Dedicated executive boardroom designed for confidential board meetings, high-level business presentations, and strategic retreats.',
      amenities: ['Executive Boardroom Setup', 'Video Conferencing Smart TV', 'High-Speed Fiber Net', 'Tea & Coffee Service Station'],
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--text-primary)',
          color: '#FFFFFF',
          padding: '80px 24px 60px',
          textAlign: 'center',
          backgroundImage: pageInfo.heroImageUrl ? `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${JSON.stringify(pageInfo.heroImageUrl)})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--golden-light)',
              fontSize: 12.5,
              fontWeight: 700,
              marginBottom: 16,
              textTransform: 'uppercase'
            }}
          >
            <Sparkles size={14} /> {pageInfo.heroSubheading}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, marginBottom: 14, fontFamily: 'var(--font-family-editorial)' }}>
            {pageInfo.heroHeading}
          </h1>
          <p style={{ fontSize: 16, color: '#D1D5DB', lineHeight: 1.6 }}>
            {pageInfo.heroDescription}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1140, margin: '-30px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {halls.map((hall, idx) => (
            <div key={idx} className="hne-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 0 }}>
                <div style={{ height: 320, overflow: 'hidden' }}>
                  <img
                    src={hall.image}
                    alt={hall.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-orange)', textTransform: 'uppercase' }}>
                        {hall.capacity}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                        Rs. {hall.dailyRate.toLocaleString()} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ day</span>
                      </span>
                    </div>

                    <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>{hall.name}</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
                      {hall.desc}
                    </p>

                    {/* Layouts */}
                    <div style={{ display: 'flex', gap: 14, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18 }}>
                      <span style={{ backgroundColor: 'var(--bg-main)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                        🎭 Theater: {hall.theater}
                      </span>
                      <span style={{ backgroundColor: 'var(--bg-main)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                        🍽️ Cluster: {hall.cluster}
                      </span>
                      <span style={{ backgroundColor: 'var(--bg-main)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                        👥 U-Shape: {hall.ushape}
                      </span>
                    </div>

                    {/* Amenities */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {hall.amenities.map((amenity, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11.5,
                            backgroundColor: 'var(--golden-light)',
                            color: '#92400E',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600
                          }}
                        >
                          ✓ {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Link href="/contact" className="hne-btn hne-btn-primary" style={{ width: 'fit-content' }}>
                      <span>Inquire / Book Venue</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
