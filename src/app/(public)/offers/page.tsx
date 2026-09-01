'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Tag, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

export default function OffersPage() {
  const [pageInfo, setPageInfo] = useState({
    heroHeading: 'Special Offers & Escapes',
    heroSubheading: 'CURATED PACKAGES & PROMOTIONS',
    heroDescription: 'Exclusive rates and value-added experiences when you book directly with Hotel New Era, Butwal.'
  });

  const [offers, setOffers] = useState<any[]>([
    {
      id: '1',
      title: 'Lumbini Pilgrimage & Spiritual Package',
      code: 'LUMBINI15',
      discountPct: 15,
      validUntil: '2026-12-31',
      description: '2 Nights stay in Deluxe Room, complimentary breakfast, guided Lumbini Sacred Garden itinerary, and evening Thakali dinner at Dhiki Restaurant.',
      bannerUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: '2',
      title: 'Butwal Weekend Leisure Getaway',
      code: 'WEEKEND20',
      discountPct: 20,
      validUntil: '2026-12-31',
      description: 'Special weekend rate on Luxury Rooms with welcome drinks on New Era Terrace Bar, late checkout at 2:00 PM, and 10% F&B discount.',
      bannerUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: '3',
      title: 'Corporate Executive Seminar & Stay Bundle',
      code: 'CORPEXEC',
      discountPct: 10,
      validUntil: '2026-12-31',
      description: 'Full-day seminar in Devakala Executive Suite + Deluxe room accommodation, high-speed fiber internet, LCD projector, and 2-course high-tea.',
      bannerUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: '4',
      title: 'Honeymoon Romance & Candlelight Dinner',
      code: 'ROMANCE25',
      discountPct: 25,
      validUntil: '2026-12-31',
      description: '2 Nights in Honeymoon Suite with fresh floral bed styling, celebratory wine bottle, private candlelight dinner on Terrace Lounge, and breakfast in bed.',
      bannerUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
    }
  ]);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // Fetch CMS Page Data
    fetch('/api/cms/pages?slug=offers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroHeading: data.page.heroHeading || 'Special Offers & Escapes',
            heroSubheading: data.page.heroSubheading || 'CURATED PACKAGES & PROMOTIONS',
            heroDescription: data.page.heroDescription || 'Exclusive rates and value-added experiences when you book directly with Hotel New Era.'
          });
        }
      })
      .catch(console.error);

    // Fetch Dynamic CMS Offers
    fetch('/api/cms/offers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.offers && data.offers.length > 0) {
          setOffers(data.offers);
        }
      })
      .catch(console.error);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Banner */}
      <div
        style={{
          backgroundColor: '#1E293B',
          color: '#FFFFFF',
          padding: '60px 24px',
          textAlign: 'center',
          borderBottom: '3px solid var(--primary-orange)'
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--golden)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {pageInfo.heroSubheading}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#FFFFFF', marginBottom: 14 }}>
            {pageInfo.heroHeading}
          </h1>
          <p style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.6 }}>
            {pageInfo.heroDescription}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '50px auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
          {offers.map((offer) => (
            <div key={offer.id} className="hne-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 220, position: 'relative', overflow: 'hidden' }}>
                <img
                  src={offer.bannerUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                  alt={offer.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span style={{
                    backgroundColor: 'var(--primary-orange)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 13,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {offer.discountPct}% OFF
                  </span>
                </div>
              </div>

              <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <button
                    onClick={() => handleCopyCode(offer.code)}
                    style={{
                      backgroundColor: copiedCode === offer.code ? '#ECFDF5' : 'var(--primary-orange-light)',
                      color: copiedCode === offer.code ? '#065F46' : 'var(--primary-orange)',
                      fontWeight: 800,
                      fontSize: 12,
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    title="Click to copy promo code"
                  >
                    {copiedCode === offer.code ? <Check size={13} /> : <Tag size={13} />}
                    <span>{copiedCode === offer.code ? 'COPIED TO CLIPBOARD' : `PROMO: ${offer.code}`}</span>
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Direct Booking</span>
                </div>

                <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>{offer.title}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
                  {offer.description}
                </p>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Valid until {offer.validUntil}
                  </span>
                  <Link href={`/book?promo=${offer.code}`} className="hne-btn hne-btn-primary hne-btn-sm">
                    <span>Book With Offer</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
