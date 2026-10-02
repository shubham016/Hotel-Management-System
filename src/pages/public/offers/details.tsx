import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Tag } from 'lucide-react';
import Link from '@/lib/router';
import './details.css';

type Offer = {
  id: string; title: string; description: string; code: string; bannerUrl?: string;
  discountPct: number; priceStartingAt?: number; validFrom?: string; validUntil?: string; isActive?: boolean;
};
const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

export default function OfferDetailsPage() {
  const { offerId } = useParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setOffer(null); setError('');
    window.scrollTo(0, 0);
    const propertyCode = import.meta.env.VITE_DEFAULT_PROPERTY_CODE || 'HNE-BTW';
    fetch(`/api/cms/offers?propertyCode=${encodeURIComponent(propertyCode)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.offers)) throw new Error('Unable to load this offer. Please try again.');
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const selected = result.offers.find((item: Offer) => item.id === offerId && item.isActive !== false && (!item.validFrom || item.validFrom <= today) && (!item.validUntil || item.validUntil >= today));
        setOffer(selected || null);
        document.title = selected ? `${selected.title} | Hotel New Era` : 'Offer unavailable | Hotel New Era';
        for (const [attribute, key, value] of [
          ['name', 'description', selected?.description || 'Browse current special offers at Hotel New Era.'],
          ['property', 'og:title', document.title],
          ['property', 'og:description', selected?.description || ''],
          ['property', 'og:image', selected?.bannerUrl || ''],
        ]) {
          let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
          if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.appendChild(meta); }
          meta.content = value;
        }
      })
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [offerId]);

  return (
    <section className="hne-offer-details">
      <Link href="/offers" className="hne-offer-back"><ArrowLeft size={16} /> All Special Offers</Link>
      {loading ? <p role="status">Loading offer details...</p> : !offer ? (
        <div className="hne-offer-unavailable">
          <h1>{error ? 'Unable to load offer' : 'This offer is no longer available'}</h1>
          <p>{error || 'Explore our current packages to find another experience for your stay.'}</p>
          <Link href="/offers" className="hne-btn hne-btn-primary">View Current Offers <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <article className="hne-offer-detail-grid">
          <div className="hne-offer-detail-photo">
            <img src={offer.bannerUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'} alt={offer.title} width="1200" height="800" />
            {offer.discountPct > 0 && <span>Save {offer.discountPct}%</span>}
          </div>
          <div className="hne-offer-detail-content">
            <div className="hne-offer-detail-eyebrow">Hotel New Era · Special Offer</div>
            <h1>{offer.title}</h1>
            <p className="hne-offer-detail-description">{offer.description}</p>
            <dl className="hne-offer-detail-facts">
              {offer.priceStartingAt && offer.priceStartingAt > 0 ? <div><dt>Starting from</dt><dd className="hne-offer-detail-price">Rs. {offer.priceStartingAt.toLocaleString('en-IN')}</dd></div> : null}
              {offer.code && <div><dt><Tag size={14} /> Offer code</dt><dd>{offer.code}</dd></div>}
              {offer.validUntil && <div><dt><CalendarDays size={14} /> Valid until</dt><dd>{formatDate(offer.validUntil)}</dd></div>}
            </dl>
            <div className="hne-offer-detail-actions">
              <Link href={`/book?promo=${encodeURIComponent(offer.code || '')}`} className="hne-btn hne-btn-primary">Book Your Stay <ArrowRight size={16} /></Link>
              <Link href="/contact" className="hne-btn hne-btn-secondary">Ask About This Package</Link>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
