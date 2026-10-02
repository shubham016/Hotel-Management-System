import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Tag } from 'lucide-react';
import Link from '@/lib/router';
import { CardCarousel } from './CardCarousel';
import './SpecialOffers.css';

type Offer = { id: string; title: string; description: string; code: string; bannerUrl?: string; discountPct: number; priceStartingAt?: number; validFrom?: string; validUntil?: string; isActive?: boolean };
const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

export function SpecialOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const propertyCode = import.meta.env.VITE_DEFAULT_PROPERTY_CODE || 'HNE-BTW';
    fetch(`/api/cms/offers?propertyCode=${encodeURIComponent(propertyCode)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.offers)) throw new Error('Unable to load offers');
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        setOffers(result.offers.filter((offer: Offer) => offer.isActive !== false && (!offer.validFrom || offer.validFrom <= today) && (!offer.validUntil || offer.validUntil >= today)));
      })
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <section className="hne-home-offers" aria-labelledby="home-offers-heading">
      <div className="hne-home-offers-inner">
        <div className="hne-home-offers-heading">
          <div>
            <div className="hne-home-offers-eyebrow">Curated stays & experiences</div>
            <h2 id="home-offers-heading">Special Offers</h2>
            <p>Discover thoughtful packages for your next stay in Butwal.</p>
          </div>
          <Link href="/offers" className="hne-btn hne-btn-secondary"><span>View All Offers</span><ArrowRight size={16} /></Link>
        </div>
        {loading ? (
          <div className="hne-home-offers-grid" aria-busy="true" aria-label="Loading special offers">
            {[0, 1, 2].map((index) => <div key={index} className="hne-home-offer-skeleton" />)}
          </div>
        ) : offers.length ? (
          <CardCarousel label="Special Offers" arrowTop={120} gap={32}>
            {offers.map((offer) => (
              <article className="hne-home-offer" key={offer.id}>
                <div className="hne-home-offer-image">
                  <img src={offer.bannerUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'} alt={offer.title} loading="lazy" width="800" height="520" />
                  {offer.discountPct > 0 && <span className="hne-home-offer-saving">Save {offer.discountPct}%</span>}
                </div>
                <div className="hne-home-offer-content">
                  <h3>{offer.title}</h3>
                  <p className="hne-home-offer-description">{offer.description}</p>
                  <div className="hne-home-offer-details">
                    {offer.code && <span><Tag size={14} aria-hidden="true" /> {offer.code}</span>}
                    {offer.validUntil && <span><CalendarDays size={14} aria-hidden="true" /> Until {formatDate(offer.validUntil)}</span>}
                  </div>
                  <div className="hne-home-offer-footer">
                    {offer.priceStartingAt && offer.priceStartingAt > 0 ? (
                      <div className="hne-home-offer-price"><span>Starting from</span><strong>Rs. {offer.priceStartingAt.toLocaleString('en-IN')}</strong></div>
                    ) : <span className="hne-home-offer-package">Stay packages</span>}
                    <Link href={`/offers/${encodeURIComponent(offer.id)}`} className="hne-home-offer-link">View Offer <ArrowRight size={16} /></Link>
                  </div>
                </div>
              </article>
            ))}
          </CardCarousel>
        ) : (
          <p className="hne-home-offers-empty" role="status">{error ? 'Our packages are temporarily unavailable. Please contact us for current offers.' : 'New packages are on their way. Contact us to plan your stay.'} <Link href="/contact">Contact our team <ArrowRight size={14} /></Link></p>
        )}
      </div>
    </section>
  );
}
