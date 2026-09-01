'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ContactPage() {
  const [pageInfo, setPageInfo] = useState({
    heroHeading: 'Contact Hotel New Era',
    heroSubheading: 'WE ARE HERE TO WELCOME YOU',
    heroDescription: 'Located in Kalikapath, Butwal. We are here to assist with room reservations, banquet hall bookings, and dining inquiries.'
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Room Reservation (Luxury/Deluxe/Standard)');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/cms/pages?slug=contact')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.page) {
          setPageInfo({
            heroHeading: data.page.heroHeading || 'Contact Hotel New Era',
            heroSubheading: data.page.heroSubheading || 'WE ARE HERE TO WELCOME YOU',
            heroDescription: data.page.heroDescription || 'Located in Kalikapath, Butwal. We are here to assist with room reservations, banquet hall bookings, and dining inquiries.'
          });
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/contact/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          email,
          phone,
          subject,
          message
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || 'Failed to submit inquiry. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred. Please try calling us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--text-primary)',
          color: '#FFFFFF',
          padding: '80px 24px 60px',
          textAlign: 'center',
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--golden)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {pageInfo.heroSubheading}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, marginBottom: 14, fontFamily: 'var(--font-heading)' }}>
            {pageInfo.heroHeading}
          </h1>
          <p style={{ fontSize: 16, color: '#D1D5DB', lineHeight: 1.6 }}>
            {pageInfo.heroDescription}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1140, margin: '-30px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          {/* Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="hne-card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Resort Coordinates</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-orange-light)', color: 'var(--primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Location Address</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Kalikapath, New Buspark, Butwal-8, Rupandehi, Lumbini Province, Nepal
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      (5 minutes walk from New Buspark, near Tilottama / Tinau River)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--golden-light)', color: 'var(--golden)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Telephone & Reservations</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      (+977) - 71 - 543833 / +977-9857012345
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--green-light)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Official Email</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      info@hotelnewera.com.np
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      www.hotelnewera.com.np
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Operating Hours</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Front Desk: 24 Hours / 7 Days
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Dhiki Restaurant: 06:30 AM – 10:30 PM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="hne-card" style={{ padding: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Send Us a Message</h3>

            {errorMsg && (
              <div style={{ padding: '12px 14px', backgroundColor: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {submitted ? (
              <div style={{ padding: 28, backgroundColor: 'var(--green-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <CheckCircle2 size={40} color="var(--green)" style={{ margin: '0 auto 14px' }} />
                <h4 style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
                  Thank you, {name}!
                </h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Your message has been delivered to our 24/7 guest services desk. We will reach out to you shortly at <strong>{phone || email}</strong>.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setPhone('');
                    setEmail('');
                    setMessage('');
                  }}
                  className="hne-btn hne-btn-secondary hne-btn-sm"
                  style={{ marginTop: 18 }}
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Full Name *</label>
                  <input type="text" className="hne-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Thapa" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="hne-form-group" style={{ marginBottom: 0 }}>
                    <label className="hne-label">Phone Number *</label>
                    <input type="tel" className="hne-input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977-98XXXXXXXX" />
                  </div>
                  <div className="hne-form-group" style={{ marginBottom: 0 }}>
                    <label className="hne-label">Email Address</label>
                    <input type="email" className="hne-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                  </div>
                </div>

                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Inquiry Purpose</label>
                  <select className="hne-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option>Room Reservation (Luxury/Deluxe/Standard)</option>
                    <option>Nilkantha / Tulki Devi Hall Booking</option>
                    <option>Dhiki Restaurant Catering / Dining</option>
                    <option>Corporate Contract / Long Stay</option>
                    <option>Other Question</option>
                  </select>
                </div>

                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Message / Requirement Details</label>
                  <textarea className="hne-textarea" rows={4} required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe dates, guest count, or banquet requirements..." />
                </div>

                <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                  <Send size={16} />
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
