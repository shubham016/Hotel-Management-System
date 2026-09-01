'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

interface HeroBannerProps {
  slug?: string;
  heading?: string;
  subheading?: string;
  bodyText?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  slug = 'home',
  heading: initialHeading,
  subheading: initialSubheading,
  bodyText: initialBodyText,
  imageUrl: initialImageUrl,
  buttonText = 'Book Your Stay',
  buttonUrl = '/book'
}) => {
  const [content, setContent] = useState({
    heading: initialHeading || 'Security, Cleanliness & Hospitality in Butwal',
    subheading: initialSubheading || 'WELCOME TO HOTEL NEW ERA • BUTWAL, NEPAL (EST. 1982)',
    bodyText: initialBodyText || 'Centrally located 5 minutes from New Bus Park near Tilottama (Tinau) River. 43 luxury & deluxe rooms, 3 grand conference halls, 2 restaurants, and 1 main central kitchen.',
    imageUrl: initialImageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=85'
  });

  useEffect(() => {
    if (slug) {
      fetch(`/api/cms/pages?slug=${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.page) {
            setContent({
              heading: data.page.heroHeading || initialHeading || 'Security, Cleanliness & Hospitality in Butwal',
              subheading: data.page.heroSubheading || initialSubheading || 'WELCOME TO HOTEL NEW ERA • BUTWAL, NEPAL (EST. 1982)',
              bodyText: data.page.heroDescription || initialBodyText || 'Centrally located 5 minutes from New Bus Park near Tilottama (Tinau) River.',
              imageUrl: data.page.heroImageUrl || initialImageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=85'
            });
          }
        })
        .catch(console.error);
    }
  }, [slug]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.75)), url(${content.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#FFFFFF',
        padding: '80px 24px 120px',
        textAlign: 'center'
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Subtle pill badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--golden-light)',
            textTransform: 'uppercase'
          }}
        >
          <Sparkles size={14} color="var(--golden)" />
          <span>{content.subheading}</span>
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.15,
            textShadow: '0 4px 16px rgba(0,0,0,0.5)',
            letterSpacing: '-0.02em'
          }}
        >
          {content.heading}
        </h1>

        {/* Hero Description */}
        <p
          style={{
            fontSize: 'clamp(15px, 1.8vw, 19px)',
            color: '#E2E8F0',
            lineHeight: 1.6,
            maxWidth: 680,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          {content.bodyText}
        </p>

        {/* Action Button Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
          <Link
            href={buttonUrl}
            className="hne-btn hne-btn-primary hne-btn-lg"
            style={{
              boxShadow: '0 6px 20px rgba(242, 140, 0, 0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <span>{buttonText}</span>
            <ArrowRight size={18} />
          </Link>

          <Link
            href="/rooms"
            className="hne-btn hne-btn-secondary hne-btn-lg"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              borderColor: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <span>Explore 43 Rooms</span>
          </Link>
        </div>

        {/* Trust Badges Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: 13,
            color: '#CBD5E1'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="var(--green)" />
            <span>24/7 Security & CCTV</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={16} color="var(--golden)" />
            <span>5 Mins from Butwal New Buspark</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color="var(--primary-orange)" />
            <span>Established 1982</span>
          </div>
        </div>
      </div>
    </div>
  );
};
