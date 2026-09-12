import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Wine,
  Clock,
  MapPin,
  Sparkles,
  Coffee,
  CheckCircle2,
  ChefHat,
  Flame,
  Phone
} from 'lucide-react';
import Link from '@/lib/router';

export default function DiningPage() {
  const [pageInfo, setPageInfo] = useState({
    heroHeading: 'Dining & Culinary Experiences',
    heroSubheading: '2 DINING OUTLETS • 1 CENTRAL KITCHEN',
    heroDescription: 'Experience traditional Nepalese Bhojangriha flavors at Dhiki Restaurant and open-air hospitality at the New Era Terrace Lounge & Bar.'
  });

  useEffect(() => {
    fetch('/api/cms/pages?slug=dining')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroHeading: data.page.heroHeading || 'Dining & Culinary Experiences',
            heroSubheading: data.page.heroSubheading || '2 DINING OUTLETS • 1 CENTRAL KITCHEN',
            heroDescription: data.page.heroDescription || 'Experience traditional Nepalese Bhojangriha flavors at Dhiki Restaurant and open-air hospitality at the New Era Terrace Lounge & Bar.'
          });
        }
      })
      .catch(console.error);
  }, []);

  const dhikiHighlights = [
    {
      name: 'Royal Thakali Bhojan Set',
      price: 'Rs. 950',
      desc: 'Authentic local Thakali set served with Jimbu-tempered black lentils (Kalo Daal), Gundruk pickle, local Ghee, fresh spinach, and Basmati rice.',
      badge: 'Signature Dish'
    },
    {
      name: 'Bhojangriha Mutton Sekuwa',
      price: 'Rs. 750',
      desc: 'Charcoal-grilled tender local mutton marinated in organic Himalayan spices, served with puffed rice and spicy tomato chutney.',
      badge: 'Chef Favorite'
    },
    {
      name: 'Claypot Tandoori Chicken (Half / Full)',
      price: 'Rs. 850 / Rs. 1,550',
      desc: 'Fresh farm chicken roasted in clay tandoor with Kashmiri chili, yogurt marinade, and mint coriander dip.',
      badge: 'Popular'
    },
    {
      name: 'Palpali Chukauni & Batuk',
      price: 'Rs. 450',
      desc: 'Traditional regional boiled potato and spiced yogurt salad paired with crispy black-lentil batuk patties.',
      badge: 'Regional'
    }
  ];

  const terraceHighlights = [
    {
      name: 'New Era Sizzler (Chicken / Veg / Buff)',
      price: 'Rs. 950',
      desc: 'Sizzling hot plate with grilled meat or paneer patties, sautéed vegetables, French fries, and rich mushroom pepper sauce.',
      badge: 'House Special'
    },
    {
      name: 'Woodfired Pizza & Crispy Wings',
      price: 'Rs. 850',
      desc: 'Hand-stretched pizza topped with mozzarella and herbs, served alongside honey chili glazed wings.',
      badge: 'Bar Snack'
    },
    {
      name: 'Signature Lumbini Sunset Cocktail',
      price: 'Rs. 750',
      desc: 'Craft cocktail blending Nepalese spirits, fresh citrus juice, grenadine, and aromatic rosemary.',
      badge: 'Cocktail'
    },
    {
      name: 'Organic Palpa Espresso & Cold Brew',
      price: 'Rs. 250',
      desc: 'Single-estate organic coffee sourced from nearby Palpa hills, freshly brewed by our baristas.',
      badge: 'Coffee'
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

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Central Kitchen Badge */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 50,
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-crimson-light)',
                color: 'var(--brand-crimson)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChefHat size={28} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Main Central Production Kitchen</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Dedicated hygienic central kitchen powering Dhiki Restaurant, Terrace Lounge, Banquets, and 24/7 Room Service.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> 100% Hygienic Prep
            </span>
          </div>
        </div>

        {/* Restaurant 1: Dhiki Restaurant & Bhojangriha */}
        <section style={{ marginBottom: 70 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 40,
              alignItems: 'center',
              marginBottom: 36
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  backgroundColor: 'var(--brand-crimson-light)',
                  color: 'var(--brand-crimson)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 12
                }}
              >
                <UtensilsCrossed size={14} /> Restaurant 1 • Ground Level
              </div>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 14 }}>
                Dhiki Restaurant & Bhojangriha
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                Dhiki Restaurant & Bhojangriha celebrates the rich culinary traditions of Nepal. From royal Thakali khana sets to sizzling charcoal sekuwa and North Indian tandoor, every meal is prepared using fresh ingredients and locally grounded spices.
              </p>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="var(--brand-crimson)" /> 6:30 AM – 10:30 PM
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={15} color="var(--brand-crimson)" /> Kalikapath, Butwal
                </span>
              </div>
            </div>

            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
                alt="Dhiki Restaurant & Bhojangriha"
                style={{ width: '100%', height: 320, objectFit: 'cover' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {dhikiHighlights.map((item, idx) => (
              <div
                key={idx}
                className="hne-card"
                style={{
                  padding: 22,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{item.name}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--brand-crimson-light)', color: 'var(--brand-crimson)' }}>
                      {item.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {item.desc}
                  </p>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--brand-crimson)' }}>
                  {item.price}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Restaurant 2: New Era Terrace Lounge & Bar */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 60 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 40,
              alignItems: 'center',
              marginBottom: 36
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  backgroundColor: 'var(--brand-green-light)',
                  color: 'var(--brand-green)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 12
                }}
              >
                <Wine size={14} /> Restaurant 2 • Terrace Rooftop
              </div>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 14 }}>
                New Era Terrace Lounge & Bar
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                Enjoy cool evening breezes, signature cocktails, and sizzling continental platters at our open-air terrace lounge. The ideal gathering spot for casual business discussions, family dinners, and relaxed evening drinks.
              </p>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="var(--brand-green)" /> 11:00 AM – 11:00 PM
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Wine size={15} color="var(--brand-green)" /> Craft Beers & Spirits
                </span>
              </div>
            </div>

            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
                alt="New Era Terrace Lounge & Bar"
                style={{ width: '100%', height: 320, objectFit: 'cover' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {terraceHighlights.map((item, idx) => (
              <div
                key={idx}
                className="hne-card"
                style={{
                  padding: 22,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{item.name}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--brand-green-light)', color: 'var(--brand-green)' }}>
                      {item.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {item.desc}
                  </p>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--brand-green)' }}>
                  {item.price}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Table Reservation CTA */}
        <div
          style={{
            marginTop: 60,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '40px 32px',
            textAlign: 'center',
            border: '1px solid var(--border)'
          }}
        >
          <h3 style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', marginBottom: 10 }}>
            Reserve a Table or Order In-Room Dining
          </h3>
          <p style={{ fontSize: 15, color: '#CBD5E1', maxWidth: 600, margin: '0 auto 24px' }}>
            Call our direct F&B hotline or ask the front desk to reserve a table at Dhiki Restaurant or Terrace Lounge.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <a
              href="tel:+97771543833"
              className="hne-btn hne-btn-primary"
              style={{ padding: '12px 28px', textDecoration: 'none' }}
            >
              <Phone size={16} />
              <span>Call (+977) 71-543833</span>
            </a>
            <Link href="/book" className="hne-btn hne-btn-secondary" style={{ padding: '12px 28px' }}>
              <span>Book A Room</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
