import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Tag, ArrowRight, Check } from 'lucide-react';
import Link from '@/lib/router';
import { useLocation, useNavigate } from 'react-router-dom';

export default function OffersPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [pageInfo, setPageInfo] = useState({
    heroImageUrl: '',
    heroHeading: 'Special Offers & Escapes',
    heroSubheading: 'CURATED PACKAGES & PROMOTIONS',
    heroDescription: 'Exclusive rates and value-added experiences when you book directly with Hotel New Era, Butwal.'
  });

  const [offers, setOffers] = useState<any[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState('');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (hash.startsWith('#offer-')) navigate(`/offers/${hash.slice(7)}`, { replace: true });
  }, [hash, navigate]);

  useEffect(() => {
    // Fetch CMS Page Data
    fetch('/api/cms/pages?slug=offers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroImageUrl: data.page.heroImageUrl || '',
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
        if (data.success && Array.isArray(data.offers)) {
          setOffers(data.offers);
        } else throw new Error(data.error || 'Unable to load current offers.');
      })
      .catch(() => setOffersError('Unable to load current offers. Please retry.'))
      .finally(() => setOffersLoading(false));
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
          backgroundImage: pageInfo.heroImageUrl ? `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${JSON.stringify(pageInfo.heroImageUrl)})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
        {offersLoading ? <p role="status">Loading current offers…</p> : offersError ? <p role="alert">{offersError}</p> : !offers.length && <p>No current offers available.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
          {offers.map((offer) => (
            <div key={offer.id} id={`offer-${offer.id}`} className="hne-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', scrollMarginTop: 110 }}>
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
                  <Link href={`/offers/${encodeURIComponent(offer.id)}`} className="hne-btn hne-btn-primary hne-btn-sm">
                    <span>View Offer</span>
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
