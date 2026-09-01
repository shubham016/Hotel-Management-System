import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Globe, Shield, Award, Clock, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: 'var(--text-primary)', color: '#FFFFFF', paddingTop: 60, paddingBottom: 30 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40, marginBottom: 48 }}>
          {/* Col 1: Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '6px 14px', borderRadius: 'var(--radius-md)', display: 'inline-flex', boxShadow: 'var(--shadow-sm)' }}>
                <img src="/logo.png" alt="Hotel New Era" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />
              </div>
            </div>
            <p style={{ color: '#9CA3AF', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
              Centrally located in Butwal, Lumbini Province since 1982. A premier destination offering 43 saleable rooms, 2 restaurants (Dhiki & Terrace Lounge), 3 conference halls, and a dedicated central kitchen.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 4, color: 'var(--golden)' }}>
                ⭐ Security • Cleanliness • Hospitality
              </span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: '#FFFFFF' }}>Quick Navigation</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <li><Link href="/rooms" style={{ color: '#D1D5DB' }}>Rooms & Accommodations</Link></li>
              <li><Link href="/dining" style={{ color: '#D1D5DB' }}>Dhiki Restaurant & Bhojangriha</Link></li>
              <li><Link href="/banquet" style={{ color: '#D1D5DB' }}>Nilkantha & Tulki Devi Halls</Link></li>
              <li><Link href="/book" style={{ color: '#D1D5DB' }}>Direct Online Booking</Link></li>
              <li><Link href="/about" style={{ color: '#D1D5DB' }}>Our History & Heritage (1982)</Link></li>
              <li><Link href="/contact" style={{ color: '#D1D5DB' }}>Contact & Location</Link></li>
            </ul>
          </div>

          {/* Col 3: Room Types */}
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: '#FFFFFF' }}>Accommodations</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, color: '#9CA3AF' }}>
              <li>Luxury Rooms (AC & Fiber Net)</li>
              <li>Deluxe Rooms (Climate Control)</li>
              <li>Family Rooms (Multiple Beds)</li>
              <li>Honeymoon Romantic Suites</li>
              <li>Standard AC & Non-AC Rooms</li>
            </ul>
          </div>

          {/* Col 4: Contact & Coordinates */}
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: '#FFFFFF' }}>Get In Touch</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, color: '#D1D5DB' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <MapPin size={16} color="var(--primary-orange)" style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Kalikapath, New Buspark, Butwal, Rupandehi, Lumbini, Nepal (Near Tilottama River)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={16} color="var(--primary-orange)" style={{ flexShrink: 0 }} />
                <span>(+977) - 71 - 543833</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={16} color="var(--primary-orange)" style={{ flexShrink: 0 }} />
                <span>info@hotelnewera.com.np</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe size={16} color="var(--primary-orange)" style={{ flexShrink: 0 }} />
                <span>www.hotelnewera.com.np</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #374151', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12.5, color: '#9CA3AF' }}>
          <div>
            © {new Date().getFullYear()} Hotel New Era Pvt. Ltd. (Butwal, Nepal). All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/login" style={{ color: 'var(--primary-orange)', fontWeight: 600 }}>Staff & Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
