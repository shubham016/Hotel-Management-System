'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe, Edit3, Save, CheckCircle2, Eye, Plus, Sparkles, Image,
  Tag, Phone, MapPin, Mail, Trash2, Calendar, ShieldCheck, MessageSquare
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function CMSPagesManager() {
  const [selectedSlug, setSelectedSlug] = useState('home');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // CMS Pages State
  const [cmsPages, setCmsPages] = useState<Record<string, any>>({
    home: {
      title: 'Home - Luxury Hospitality in Butwal',
      slug: 'home',
      heroHeading: 'Security, Cleanliness & Hospitality in Butwal',
      heroSubheading: 'WELCOME TO HOTEL NEW ERA • BUTWAL, NEPAL (EST. 1982)',
      heroDescription: 'Centrally located 5 minutes from New Bus Park near Tilottama (Tinau) River. 43 luxury & deluxe rooms, 3 grand conference halls, 2 restaurants, and 1 main central kitchen.',
      heroImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Hotel New Era | Butwal, Lumbini Province, Nepal (Est. 1982)',
      seoDescription: '43 luxury & deluxe rooms, Dhiki Restaurant & Bhojangriha, New Era Terrace Lounge, Nilkantha Grand Ballroom, and high-speed Wi-Fi in Butwal, Nepal.'
    },
    about: {
      title: 'About Us - Our Heritage Since 1982',
      slug: 'about',
      heroHeading: 'About Hotel New Era, Butwal',
      heroSubheading: 'OVER FOUR DECADES OF EXCELLENCE (EST. 1982)',
      heroDescription: 'Four decades of authentic Nepalese hospitality, security, and cleanliness in the heart of Rupandehi, Lumbini Province.',
      heroImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      seoTitle: 'About Us | Hotel New Era Butwal',
      seoDescription: 'Founded in 1982, Hotel New Era provides luxury accommodation, traditional dining, and conference facilities in Butwal, Nepal.'
    },
    rooms: {
      title: 'Rooms & Suites - 43 Saleable Units',
      slug: 'rooms',
      heroHeading: 'Luxury Rooms & Executive Suites',
      heroSubheading: 'COMFORT, TRANQUILITY & MODERN LUXURY IN BUTWAL',
      heroDescription: 'Discover our 43 thoughtfully designed rooms across 4 floors featuring Luxury Rooms, Deluxe Rooms, Family Suites, Honeymoon Suites, and Standard AC/Non-AC accommodations.',
      heroImageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Rooms & Suites in Butwal | Hotel New Era',
      seoDescription: 'Book from 43 well-appointed rooms in Butwal. Enjoy high-speed Wi-Fi, air conditioning, mountain views, and 24/7 room service.'
    },
    dining: {
      title: 'Dining & Gastronomy - 2 Restaurants & Central Kitchen',
      slug: 'dining',
      heroHeading: 'Culinary Heritage & Rooftop Lounge',
      heroSubheading: 'DHIKI RESTAURANT & NEW ERA TERRACE BAR',
      heroDescription: 'Indulge in authentic Thakali thali and traditional Nepali Bhojangriha on the Ground Floor, or enjoy open-air cocktails and continental sizzlers on our Terrace Lounge.',
      heroImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Restaurants & Dining in Butwal | Dhiki & Terrace Bar',
      seoDescription: 'Experience the finest dining in Butwal at Dhiki Restaurant & Bhojangriha and New Era Terrace Lounge & Bar.'
    },
    banquet: {
      title: 'Banquets & Conferences - 3 Seminar Halls',
      slug: 'banquet',
      heroHeading: 'Conferences, Weddings & Grand Events',
      heroSubheading: 'NILKANTHA BALLROOM, TULKI DEVI HALL & DEVAKALA SUITE',
      heroDescription: 'State-of-the-art event hosting with capacity up to 300 guests, modern audiovisual technology, customizable seating setups, and bespoke catering.',
      heroImageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Banquet Halls & Event Venues in Butwal | Hotel New Era',
      seoDescription: 'Host memorable conferences, corporate seminars, and wedding receptions in Butwal at Nilkantha Grand Ballroom.'
    },
    offers: {
      title: 'Special Offers & Seasonal Packages',
      slug: 'offers',
      heroHeading: 'Exclusive Deals & Vacation Packages',
      heroSubheading: 'SPECIAL EXPERIENCES & SEASONAL SAVINGS IN BUTWAL',
      heroDescription: 'Take advantage of our curated packages including Lumbini Pilgrimage tours, Butwal Weekend escapes, Corporate Retreats, and Honeymoon specials with direct booking discounts.',
      heroImageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Special Hotel Offers & Packages in Butwal | Hotel New Era',
      seoDescription: 'Save with special room packages, banquet bundles, and seasonal dining discounts at Hotel New Era, Butwal.'
    },
    contact: {
      title: 'Contact Us & Location',
      slug: 'contact',
      heroHeading: 'We Are Here to Welcome You',
      heroSubheading: 'GET IN TOUCH WITH OUR 24/7 GUEST SERVICES TEAM',
      heroDescription: 'Conveniently located on Kalikapath, Butwal-06, Rupandehi, Lumbini Province, Nepal. Just 5 minutes from New Bus Park with ample secure parking.',
      heroImageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Contact Hotel New Era | Kalikapath, Butwal, Nepal',
      seoDescription: 'Contact Hotel New Era in Butwal for reservations, banquet inquiries, dining reservations, or directions. Call +977-71-540000.'
    }
  });

  // Special Offers State
  const [offersList, setOffersList] = useState<any[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>({
    title: '',
    code: '',
    discountPct: 15,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    description: '',
    bannerUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    isActive: true
  });

  // Contact Info State
  const [contactInfo, setContactInfo] = useState({
    receptionPhone: '+977-71-540000',
    mobilePhone: '+977-9857012345',
    email: 'info@hotelnewera.com.np',
    address: 'Kalikapath, Butwal-06, Rupandehi, Lumbini Province, Nepal',
    emergencyHotline: '+977-9800000000',
    receptionHours: '24 Hours / 7 Days a Week'
  });

  // Load CMS Data on mount
  useEffect(() => {
    fetch('/api/cms/pages')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.pages) {
          setCmsPages(prev => ({ ...prev, ...data.pages }));
        }
      })
      .catch(console.error);

    fetch('/api/cms/offers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.offers) {
          setOffersList(data.offers);
        }
      })
      .catch(console.error);
  }, []);

  const currentPage = cmsPages[selectedSlug] || cmsPages.home;

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPage)
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(`Published updates for [${currentPage.title}] successfully!`);
        setTimeout(() => setFeedback(null), 4000);
      } else {
        alert(data.error || 'Failed to save CMS page.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cms/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingOffer)
      });
      const data = await res.json();
      if (data.success) {
        setShowOfferModal(false);
        // Refresh offers list
        const refRes = await fetch('/api/cms/offers');
        const refData = await refRes.json();
        if (refData.success) setOffersList(refData.offers);
        alert('Special promotional offer saved successfully!');
      } else {
        alert(data.error || 'Failed to save offer.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer package?')) return;
    try {
      const res = await fetch(`/api/cms/offers?id=${offerId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOffersList(prev => prev.filter(o => o.id !== offerId));
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting offer');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Headless CMS Page & Section Builder</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Empower marketing staff to control live public website banners, copy, special offers, contact info, and SEO without code changes
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a href={`/${selectedSlug === 'home' ? '' : selectedSlug}`} target="_blank" className="hne-btn hne-btn-secondary hne-btn-sm">
            <Eye size={16} />
            <span>Preview /{selectedSlug === 'home' ? '' : selectedSlug}</span>
          </a>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
        {/* Left: Pages List (All 7 Pages) */}
        <Card title="Managed Pages (7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { slug: 'home', name: '🏠 Homepage', path: '/' },
              { slug: 'about', name: '🏛️ About Us', path: '/about' },
              { slug: 'rooms', name: '🛏️ Rooms & Suites', path: '/rooms' },
              { slug: 'dining', name: '🍽️ Dining & Bars', path: '/dining' },
              { slug: 'banquet', name: '👥 Banquets & Events', path: '/banquet' },
              { slug: 'offers', name: '🎁 Special Offers', path: '/offers' },
              { slug: 'contact', name: '📞 Contact Us', path: '/contact' }
            ].map((p) => (
              <button
                key={p.slug}
                onClick={() => setSelectedSlug(p.slug)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: selectedSlug === p.slug ? 'var(--primary-orange-light)' : '#FFFFFF',
                  color: selectedSlug === p.slug ? 'var(--primary-orange)' : 'var(--text-primary)',
                  fontWeight: selectedSlug === p.slug ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{p.name}</span>
                <Badge variant={selectedSlug === p.slug ? 'orange' : 'neutral'} style={{ fontSize: 10 }}>Live</Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Right: CMS Editor Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Hero & SEO Editor */}
          <Card title={`Page CMS: ${currentPage.title} (/${currentPage.slug})`}>
            <form onSubmit={handleSavePage} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Hero Section */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-orange)', marginBottom: 14 }}>
                  1. Hero Banner Content
                </h3>

                <div className="hne-form-group">
                  <label className="hne-label">Hero Main Heading</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={currentPage.heroHeading}
                    onChange={(e) => setCmsPages({ ...cmsPages, [selectedSlug]: { ...currentPage, heroHeading: e.target.value } })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Hero Badge Subheading</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={currentPage.heroSubheading}
                    onChange={(e) => setCmsPages({ ...cmsPages, [selectedSlug]: { ...currentPage, heroSubheading: e.target.value } })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Hero Body Description</label>
                  <textarea
                    className="hne-textarea"
                    rows={3}
                    value={currentPage.heroDescription}
                    onChange={(e) => setCmsPages({ ...cmsPages, [selectedSlug]: { ...currentPage, heroDescription: e.target.value } })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Hero Cover Image URL</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={currentPage.heroImageUrl}
                    onChange={(e) => setCmsPages({ ...cmsPages, [selectedSlug]: { ...currentPage, heroImageUrl: e.target.value } })}
                  />
                </div>
              </div>

              {/* SEO Section */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-orange)', marginBottom: 14 }}>
                  2. SEO & OpenGraph Meta Tags
                </h3>

                <div className="hne-form-group">
                  <label className="hne-label">Page SEO Title</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={currentPage.seoTitle}
                    onChange={(e) => setCmsPages({ ...cmsPages, [selectedSlug]: { ...currentPage, seoTitle: e.target.value } })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Meta Description (160 Characters Max)</label>
                  <textarea
                    className="hne-textarea"
                    rows={2}
                    value={currentPage.seoDescription}
                    onChange={(e) => setCmsPages({ ...cmsPages, [selectedSlug]: { ...currentPage, seoDescription: e.target.value } })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button type="submit" variant="primary" size="lg" disabled={isSaving}>
                  <Save size={16} />
                  <span>{isSaving ? 'Publishing...' : 'Publish CMS Updates'}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Conditional Sub-Managers */}

          {/* 1. SPECIAL OFFERS & PACKAGES MANAGER (Active when 'offers' is selected) */}
          {selectedSlug === 'offers' && (
            <Card title="Live Promotional Packages & Promo Codes Engine">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Manage promotional packages shown on <code>/offers</code> and direct booking engine promo discounts
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingOffer({
                      title: '',
                      code: '',
                      discountPct: 15,
                      validFrom: '2026-01-01',
                      validUntil: '2026-12-31',
                      description: '',
                      bannerUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
                      isActive: true
                    });
                    setShowOfferModal(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Add New Special Package</span>
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {offersList.map((off) => (
                  <div
                    key={off.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ height: 110, position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={off.bannerUrl}
                        alt={off.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <Badge variant="orange" style={{ fontWeight: 800 }}>{off.discountPct}% OFF</Badge>
                      </div>
                    </div>

                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700 }}>{off.title}</h4>
                      </div>

                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {off.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                          PROMO: {off.code}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Until {off.validUntil}
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              setEditingOffer(off);
                              setShowOfferModal(true);
                            }}
                            className="hne-btn hne-btn-secondary hne-btn-xs"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(off.id)}
                            className="hne-btn hne-btn-danger hne-btn-xs"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 2. CONTACT US & RECEPTION COORDINATES (Active when 'contact' is selected) */}
          {selectedSlug === 'contact' && (
            <Card title="Hotel Contact & Reception Channel Manager">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Primary Reception Telephone</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={contactInfo.receptionPhone}
                    onChange={(e) => setContactInfo({ ...contactInfo, receptionPhone: e.target.value })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Mobile & WhatsApp Hotline</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={contactInfo.mobilePhone}
                    onChange={(e) => setContactInfo({ ...contactInfo, mobilePhone: e.target.value })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">General Inquiry Email</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Physical Address</label>
                  <input
                    type="text"
                    className="hne-input"
                    value={contactInfo.address}
                    onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-orange)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <MessageSquare size={16} />
                  <span>Public Contact Form Integration Status: Active</span>
                </h4>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Inquiries submitted on <code>/contact</code> are automatically dispatched to <code>/api/contact/inquiry</code>, creating real-time notifications for reception desk staff and maintaining an audit log.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Special Offer Modal */}
      {showOfferModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            width: '100%',
            maxWidth: 520,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
              {editingOffer.id ? 'Edit Special Package' : 'Create Special Package'}
            </h3>

            <form onSubmit={handleSaveOffer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="hne-form-group">
                <label className="hne-label">Package Title</label>
                <input
                  type="text"
                  className="hne-input"
                  required
                  value={editingOffer.title}
                  onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
                  placeholder="e.g. Lumbini Pilgrimage 2-Night Special"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Promo Code</label>
                  <input
                    type="text"
                    className="hne-input"
                    required
                    value={editingOffer.code}
                    onChange={(e) => setEditingOffer({ ...editingOffer, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. LUMBINI15"
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Discount Percentage (%)</label>
                  <input
                    type="number"
                    className="hne-input"
                    min="1"
                    max="90"
                    required
                    value={editingOffer.discountPct}
                    onChange={(e) => setEditingOffer({ ...editingOffer, discountPct: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Valid From</label>
                  <input
                    type="date"
                    className="hne-input"
                    value={editingOffer.validFrom}
                    onChange={(e) => setEditingOffer({ ...editingOffer, validFrom: e.target.value })}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Valid Until</label>
                  <input
                    type="date"
                    className="hne-input"
                    value={editingOffer.validUntil}
                    onChange={(e) => setEditingOffer({ ...editingOffer, validUntil: e.target.value })}
                  />
                </div>
              </div>

              <div className="hne-form-group">
                <label className="hne-label">Package Inclusions & Description</label>
                <textarea
                  className="hne-textarea"
                  rows={3}
                  value={editingOffer.description}
                  onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                  placeholder="Details of room type, complimentary breakfast, dining discounts, etc."
                />
              </div>

              <div className="hne-form-group">
                <label className="hne-label">Banner Image URL</label>
                <input
                  type="text"
                  className="hne-input"
                  value={editingOffer.bannerUrl}
                  onChange={(e) => setEditingOffer({ ...editingOffer, bannerUrl: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <Button type="button" variant="secondary" onClick={() => setShowOfferModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Promotional Package
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
