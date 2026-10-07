import React, { useState } from 'react';
import Link from '@/lib/router';
import { Phone, Calendar, Menu, X, Sparkles, MapPin } from 'lucide-react';
import { SocialLinks } from './SocialLinks';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Rooms & Suites', href: '/rooms' },
    { name: 'Dining & Bar', href: '/dining' },
    { name: 'Banquets & Events', href: '/banquet' },
    { name: 'Special Offers', href: '/offers' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border)',
        zIndex: 50,
        boxShadow: 'var(--shadow-card)'
      }}
    >
      {/* Top micro bar */}
      <div
        className="public-top-bar"
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '7px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12
        }}
      >
        <div className="public-top-contact" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} color="var(--golden)" />
            <span>Kalikapath, New Buspark, Butwal-8, Rupandehi, Nepal</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={13} color="var(--golden)" />
            <span>(+977) 71-543833</span>
          </span>
        </div>
        <div className="public-top-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'var(--golden)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} /> Best Rate Guarantee on Direct Bookings
          </span>
          <SocialLinks location="header" />
        </div>
      </div>

      {/* Main navigation */}
      <div
        className="public-nav-row"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none'
          }}
        >
          <img
            className="public-nav-logo"
            src="/logo.png"
            alt="Hotel New Era Logo"
            style={{
              height: 62,
              maxHeight: 68,
              width: 'auto',
              objectFit: 'contain'
            }}
          />
        </Link>

        {/* Desktop Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="desktop-nav">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14.5,
                fontFamily: 'var(--font-family-display)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-orange)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Book Now Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/book"
            className="hne-btn hne-btn-primary"
            style={{
              boxShadow: 'var(--shadow-glow)',
              padding: '10px 22px'
            }}
          >
            <Calendar size={16} />
            <span>Book A Room</span>
          </Link>
          <button className="public-mobile-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenuOpen} aria-controls="public-mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileMenuOpen && <nav id="public-mobile-menu" className="public-mobile-menu" aria-label="Main navigation">{navLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>{link.name}</Link>)}</nav>}
    </header>
  );
};
