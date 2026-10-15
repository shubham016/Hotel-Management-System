import React, { useState, useEffect } from 'react';
import {
  Globe, Edit3, Save, CheckCircle2, Eye, Plus, Sparkles, Image,
  Tag, Phone, MapPin, Mail, Trash2, Calendar, ShieldCheck, MessageSquare, Upload, X, Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GuestFeedbackManager } from './GuestFeedbackManager';

function CmsImageField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openUploader = () => {
    setIsOpen(true);
    setError(null);
  };

  const closePicker = () => {
    setIsOpen(false);
    setFile(null);
    setTitle('');
    setAltText('');
    setError(null);
  };

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/') || nextFile.size > 10 * 1024 * 1024) {
      setError('Choose a JPG, PNG, WebP, or GIF image that is 10 MB or smaller.');
      return;
    }
    setFile(nextFile);
    const suggestedName = nextFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
    setTitle((current) => current || suggestedName);
    setAltText((current) => current || suggestedName);
    setError(null);
  };

  const uploadAndUse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !title.trim() || !altText.trim()) {
      setError('Choose an image, then add its title and alt text.');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('altText', altText.trim());
      formData.append('category', 'SITE_PAGE');
      const response = await fetch('/api/cms/media', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Image upload failed.');
      onChange(data.media.url);
      closePicker();
    } catch (uploadError: any) {
      setError(uploadError.message || 'Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="hne-form-group">
      <label className="hne-label">{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: value ? '120px minmax(0, 1fr)' : '1fr', gap: 12, alignItems: 'start' }}>
        {value && <img src={value} alt="Selected CMS image" style={{ width: 120, height: 76, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="url" className="hne-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Upload an image or enter its URL" />
          <button type="button" onClick={openUploader} className="hne-btn hne-btn-secondary hne-btn-sm" style={{ alignSelf: 'flex-start' }}><Image size={14} /><span>Upload page image</span></button>
        </div>
      </div>

      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label={`Upload ${label}`} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.56)' }}>
          <div className="hne-card" style={{ width: 'min(100%, 920px)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <div><h2 style={{ fontSize: 19, fontWeight: 800 }}>Upload page image</h2><p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>Save the page to publish this image.</p></div>
              <button type="button" onClick={closePicker} aria-label="Close image picker" style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {error && <div role="alert" style={{ padding: 10, marginBottom: 16, background: '#FEF2F2', color: '#991B1B', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{error}</div>}

            <form onSubmit={uploadAndUse} style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', marginBottom: 20 }}>
              <strong style={{ fontSize: 13 }}>Upload a new public website image</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => selectFile(event.target.files?.[0] || null)} />
                <input className="hne-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Image title" />
                <input className="hne-input" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Alt text" />
              </div>
              <Button type="submit" variant="primary" size="sm" disabled={isUploading} style={{ marginTop: 10 }}>{isUploading ? <Loader2 className="hne-spin" size={14} /> : <Upload size={14} />}<span>{isUploading ? 'Uploading…' : 'Upload and use image'}</span></Button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

export default function CMSPagesManager() {
  const [selectedSlug, setSelectedSlug] = useState('home');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoadingPages, setIsLoadingPages] = useState(true);

  // CMS Pages State
  const [cmsPages, setCmsPages] = useState<Record<string, any>>({
    home: {
      title: 'Home - Luxury Hospitality in Butwal',
      slug: 'home',
      heroHeading: 'Security, Cleanliness & Hospitality in Butwal',
      heroSubheading: 'WELCOME TO HOTEL NEW ERA • BUTWAL, NEPAL (EST. 1982)',
      heroDescription: 'Centrally located 5 minutes from New Bus Park near Tilottama (Tinau) River. 45 listed rooms, 3 grand conference halls, 2 restaurants, and 1 main central kitchen.',
      heroImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Hotel New Era | Butwal, Lumbini Province, Nepal (Est. 1982)',
      seoDescription: '45 listed rooms, Dhiki Restaurant & Bhojangriha, New Era Terrace Lounge, Nilkantha Grand Ballroom, and high-speed Wi-Fi in Butwal, Nepal.'
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
      title: 'Rooms & Suites - 45 Listed Rooms',
      slug: 'rooms',
      heroHeading: 'Rooms & Suites',
      heroSubheading: 'COMFORT, TRANQUILITY & MODERN LUXURY IN BUTWAL',
      heroDescription: 'Discover 45 listed rooms across 5 levels: dormitory, standard, deluxe, suite, and family apartment accommodation.',
      heroImageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1800&q=80',
      seoTitle: 'Rooms & Suites in Butwal | Hotel New Era',
      seoDescription: 'Book from 45 listed rooms in Butwal. Enjoy high-speed Wi-Fi, air conditioning, mountain views, and 24/7 room service.'
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
          if (data.pages.contact?.contactInfo) setContactInfo(prev => ({ ...prev, ...data.pages.contact.contactInfo }));
        }
        else setLoadError(data.error || 'Unable to load saved CMS pages.');
      })
      .catch(() => setLoadError('Unable to load saved CMS pages. Refresh before editing.'))
      .finally(() => setIsLoadingPages(false));

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

  const pagePayload = () => selectedSlug === 'contact' ? { ...currentPage, contactInfo } : currentPage;

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagePayload())
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.page) setCmsPages(prev => ({ ...prev, [data.page.slug]: data.page }));
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

        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a href={selectedSlug === 'guest-feedback' ? '/#guest-feedback' : `/${selectedSlug === 'home' ? '' : selectedSlug}`} target="_blank" className="hne-btn hne-btn-secondary hne-btn-sm">
            <Eye size={16} />
            <span>{selectedSlug === 'guest-feedback' ? 'Preview Guest Feedback' : `Preview /${selectedSlug === 'home' ? '' : selectedSlug}`}</span>
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
        {/* Left: Managed pages and sections */}
        <Card title="Managed Pages (8)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { slug: 'home', name: '🏠 Homepage', path: '/' },
              { slug: 'about', name: '🏛️ About Us', path: '/about' },
              { slug: 'rooms', name: '🛏️ Rooms & Suites', path: '/rooms' },
              { slug: 'dining', name: '🍽️ Dining & Bars', path: '/dining' },
              { slug: 'banquet', name: '👥 Banquets & Events', path: '/banquet' },
              { slug: 'offers', name: '🎁 Special Offers', path: '/offers' },
              { slug: 'guest-feedback', name: '💬 Guest Feedback', path: '/#guest-feedback' },
              { slug: 'contact', name: '📞 Contact Us', path: '/contact' }
            ].map((p) => (
              <button
                key={p.slug}
                aria-current={selectedSlug === p.slug ? 'page' : undefined}
                onClick={() => { setSelectedSlug(p.slug); setFeedback(null); setShowOfferModal(false); }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: selectedSlug === p.slug ? '1px solid var(--primary-orange)' : '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family-body)',
                  fontSize: 13.5,
                  lineHeight: 1.4,
                  minHeight: 44,
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ flex: 1, minWidth: 0, font: 'inherit' }}>{p.name}</span>
                <Badge variant="neutral" style={{ fontSize: 10, flexShrink: 0 }}>Live</Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Right: CMS Editor Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {selectedSlug === 'guest-feedback' && <GuestFeedbackManager />}
          {/* Main Hero & SEO Editor */}
          {loadError && <p role="alert" style={{ color: 'var(--danger-red)' }}>{loadError}</p>}
          {isLoadingPages && <p role="status">Loading saved page settings...</p>}
          {selectedSlug !== 'guest-feedback' && <details key={selectedSlug} open={!['offers', 'contact'].includes(selectedSlug)}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>Banner & SEO settings for {currentPage.title}</summary>
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

                <CmsImageField
                  label="Hero cover image"
                  value={currentPage.heroImageUrl}
                  onChange={(heroImageUrl) => setCmsPages({ ...cmsPages, [selectedSlug]: { ...currentPage, heroImageUrl } })}
                />
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
                <Button type="submit" variant="primary" disabled={isSaving || isLoadingPages || Boolean(loadError)}>
                  <Save size={16} />
                  <span>{isSaving ? 'Publishing...' : 'Publish CMS Updates'}</span>
                </Button>
              </div>
            </form>
          </Card></details>}

          {/* Conditional Sub-Managers */}

          {/* 1. SPECIAL OFFERS & PACKAGES MANAGER (Active when 'offers' is selected) */}
          {selectedSlug === 'offers' && (
            <Card title="Live Promotional Packages & Promo Codes Engine">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

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
              <form onSubmit={handleSavePage}>
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

              <Button type="submit" variant="primary" disabled={isSaving || isLoadingPages || Boolean(loadError)} style={{ marginTop: 16 }}><Save size={16} /><span>{isSaving ? 'Publishing...' : 'Publish Contact Details'}</span></Button>
              </form>


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

              <CmsImageField
                label="Offer banner image"
                value={editingOffer.bannerUrl}
                onChange={(bannerUrl) => setEditingOffer({ ...editingOffer, bannerUrl })}
              />

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
