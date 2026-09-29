import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Award,
  HeartHandshake,
  MapPin,
  Clock,
  Wifi,
  UtensilsCrossed,
  Building,
  ChefHat
} from 'lucide-react';
import Link from '@/lib/router';

export default function AboutPage() {
  const [pageInfo, setPageInfo] = useState({
    heroHeading: 'Our Heritage & Story',
    heroSubheading: 'SINCE 1982 • BUTWAL, NEPAL',
    heroDescription: 'Over four decades of authentic Nepalese hospitality, security, and cleanliness in the heart of Rupandehi, Lumbini Province.'
  });

  useEffect(() => {
    fetch('/api/cms/pages?slug=about')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroHeading: data.page.heroHeading || 'Our Heritage & Story',
            heroSubheading: data.page.heroSubheading || 'SINCE 1982 • BUTWAL, NEPAL',
            heroDescription: data.page.heroDescription || 'Over four decades of authentic Nepalese hospitality, security, and cleanliness in the heart of Rupandehi, Lumbini Province.'
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ backgroundColor: '#FFFFFF' }}>
      {/* 1. Header Banner */}
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

      {/* 2. Founders & Heritage Story */}
      <section style={{ padding: '70px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 48,
            alignItems: 'center'
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
              <Award size={14} /> Founded by Mr. & Mrs. Nepal
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 16 }}>
              From Sangam Hotel to Hotel New Era
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
              The journey began in <strong>1982</strong>, when <strong>Mr. and Mrs. Nepal</strong> opened a modest 10-bedroom hotel named <em>Sangam Hotel</em> in Butwal. Through their steadfast dedication to warm guest care, cleanliness, and security, the hotel earned the deep trust of domestic travelers, business executives, and visitors en route to Lumbini.
            </p>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24 }}>
              As Butwal grew into the premier economic and transit hub of western Nepal, Sangam Hotel expanded into the modern, full-service <strong>Hotel New Era</strong> on Kalikapath, featuring <strong>45 listed rooms</strong>, <strong>2 full restaurants</strong>, <strong>3 banquet halls</strong>, and a dedicated <strong>Main Central Kitchen</strong>.
            </p>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--brand-crimson)',
                borderTop: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                fontSize: 15,
                fontWeight: 600
              }}
            >
              "Security, Cleanliness and Hospitality has always been the motto of the hotel."
            </div>
          </div>

          <div>
            <img
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
              alt="Hotel New Era Heritage"
              style={{
                width: '100%',
                height: 400,
                objectFit: 'cover',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)'
              }}
            />
          </div>
        </div>
      </section>

      {/* 3. Key Core Pillars */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '70px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 8 }}>Our Three Guiding Pillars</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              The core principles that have shaped our hospitality since 1982
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <div className="hne-card" style={{ padding: 32, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-crimson-light)',
                  color: 'var(--brand-crimson)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: 20, marginBottom: 10 }}>1. Security</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                24/7 front desk vigilance, electronic key access, secure parking, and round-the-clock safety for all guests and families.
              </p>
            </div>

            <div className="hne-card" style={{ padding: 32, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-green-light)',
                  color: 'var(--brand-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Sparkles size={28} />
              </div>
              <h3 style={{ fontSize: 20, marginBottom: 10 }}>2. Cleanliness</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Rigorous daily room sanitization, pristine linens, hygienic kitchen practices, and spotless banquet environments.
              </p>
            </div>

            <div className="hne-card" style={{ padding: 32, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-gold-light)',
                  color: 'var(--brand-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <HeartHandshake size={28} />
              </div>
              <h3 style={{ fontSize: 20, marginBottom: 10 }}>3. Hospitality</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Authentic Nepalese warmth ("Atithi Devo Bhava"), attentive guest service, and personalized care from arrival to checkout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Complete Property Setup Breakdown */}
      <section style={{ padding: '70px 24px', maxWidth: 1200, margin: '0 auto', backgroundColor: '#FFFFFF' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 8 }}>Property Infrastructure Summary</h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            Comprehensive facilities designed for modern travelers and events
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          <div className="hne-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF' }}>
            <Building size={32} color="var(--brand-crimson)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>45 Rooms</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Saleable Rooms Across 5 Levels</div>
            </div>
          </div>

          <div className="hne-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF' }}>
            <UtensilsCrossed size={32} color="var(--brand-green)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>2 Outlets</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Dhiki Restaurant & Terrace Bar</div>
            </div>
          </div>

          <div className="hne-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF' }}>
            <Sparkles size={32} color="var(--brand-gold)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>3 Halls</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nilkantha, Tulki Devi & Devakala</div>
            </div>
          </div>

          <div className="hne-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF' }}>
            <ChefHat size={32} color="var(--brand-crimson)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>1 Kitchen</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Main Central Production Kitchen</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="/book" className="hne-btn hne-btn-primary hne-btn-lg">
            <span>Book Your Stay at Hotel New Era</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
