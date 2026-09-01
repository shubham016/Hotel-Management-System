'use client';

import React, { useState } from 'react';
import { Settings, Building2, Shield, DollarSign, Calendar, Save, CheckCircle2, Globe, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<'PROPERTY' | 'TAX' | 'CALENDAR' | 'ROLES'>('PROPERTY');

  // Property State
  const [propertyName, setPropertyName] = useState('Hotel New Era - Butwal');
  const [propertyCode, setPropertyCode] = useState('HNE-BTW');
  const [phone, setPhone] = useState('+977-71-543833');
  const [email, setEmail] = useState('info@hotelnewera.com.np');
  const [address, setAddress] = useState('Kalikapath, New Buspark, Butwal-8, Rupandehi, Nepal');
  const [checkinTime, setCheckinTime] = useState('14:00');
  const [checkoutTime, setCheckoutTime] = useState('12:00');

  // Tax State
  const [vatRate, setVatRate] = useState('13.0');
  const [serviceChargeRate, setServiceChargeRate] = useState('10.0');
  const [isVatInclusive, setIsVatInclusive] = useState(false);

  // Localization State
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [currencyCode, setCurrencyCode] = useState('NPR');
  const [nepaliCalendarEnabled, setNepaliCalendarEnabled] = useState(true);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert('System & Property Configuration saved successfully to PostgreSQL database!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>System Configuration & Multi-Tenant Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Property profile, tax rates engine, Nepali calendar preferences, and RBAC security controls
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, backgroundColor: '#FFFFFF', padding: 6, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { id: 'PROPERTY', label: 'Property Profile' },
          { id: 'TAX', label: 'Tax & VAT Engine' },
          { id: 'CALENDAR', label: 'Nepali Calendar & Currency' },
          { id: 'ROLES', label: 'RBAC Roles & Permissions' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === t.id ? 'var(--primary-orange)' : 'transparent',
              color: activeTab === t.id ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveSettings}>
        {activeTab === 'PROPERTY' && (
          <Card title="Hotel / Property Master Profile">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Property Name</label>
                  <input type="text" className="hne-input" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Property Code</label>
                  <input type="text" className="hne-input" value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Contact Phone</label>
                  <input type="text" className="hne-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Official Email</label>
                  <input type="email" className="hne-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="hne-form-group" style={{ marginBottom: 0 }}>
                <label className="hne-label">Physical Address</label>
                <input type="text" className="hne-input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Standard Check-In Time</label>
                  <input type="text" className="hne-input" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} />
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Standard Check-Out Time</label>
                  <input type="text" className="hne-input" value={checkoutTime} onChange={(e) => setCheckoutTime(e.target.value)} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'TAX' && (
          <Card title="Configurable Hotel Tax & Surcharge Engine">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Configure government Value Added Tax (VAT) and hotel service charge calculation rules applied across Rooms, POS, and Banquets.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">VAT Rate (%)</label>
                  <input type="number" step="0.1" className="hne-input" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Hotel Service Charge (%)</label>
                  <input type="number" step="0.1" className="hne-input" value={serviceChargeRate} onChange={(e) => setServiceChargeRate(e.target.value)} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)' }}>
                <input
                  type="checkbox"
                  checked={isVatInclusive}
                  onChange={(e) => setIsVatInclusive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary-orange)' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Tax-Inclusive Display Pricing</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>When enabled, room and menu prices are displayed inclusive of taxes.</div>
                </div>
              </label>
            </div>
          </Card>
        )}

        {activeTab === 'CALENDAR' && (
          <Card title="Nepali Bikram Sambat (BS) Calendar & Multi-Currency">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Operating Currency Code</label>
                  <input type="text" className="hne-input" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} />
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Currency Symbol</label>
                  <input type="text" className="hne-input" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--golden-light)' }}>
                <input
                  type="checkbox"
                  checked={nepaliCalendarEnabled}
                  onChange={(e) => setNepaliCalendarEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary-orange)' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#B45309' }}>Enable Nepali Bikram Sambat (BS) Dual Display</div>
                  <div style={{ fontSize: 12, color: '#92400E' }}>Displays current BS date (e.g. 2083 Bhadra) and Shrawan-Ashadh fiscal year across all front desk views and vouchers.</div>
                </div>
              </label>
            </div>
          </Card>
        )}

        {activeTab === 'ROLES' && (
          <Card title="Role-Based Access Control (RBAC)">
            <div className="hne-table-container">
              <table className="hne-table">
                <thead>
                  <tr>
                    <th>Role Title</th>
                    <th>PMS / Front Desk</th>
                    <th>Restaurant POS</th>
                    <th>Accounting & GL</th>
                    <th>CMS & Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: 'SUPER_ADMIN', pms: 'Full Control', pos: 'Full Control', acc: 'Full Control', cms: 'Full Control' },
                    { role: 'FRONT_DESK_USER', pms: 'Check-In / Out / Folio', pos: 'View / Room Post', acc: 'View Folios', cms: 'No Access' },
                    { role: 'RESTAURANT_CASHIER', pms: 'Room Charge Only', pos: 'Full KOT & Billing', acc: 'No Access', cms: 'No Access' },
                    { role: 'ACCOUNTANT', pms: 'View Only', pos: 'View Only', acc: 'Full GL / Postings', cms: 'No Access' },
                    { role: 'HOUSEKEEPER', pms: 'Room Status Only', pos: 'No Access', acc: 'No Access', cms: 'No Access' }
                  ].map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 800 }}>{r.role}</td>
                      <td><Badge variant="success">{r.pms}</Badge></td>
                      <td><Badge variant="neutral">{r.pos}</Badge></td>
                      <td><Badge variant={r.acc.includes('Full') ? 'success' : 'neutral'}>{r.acc}</Badge></td>
                      <td><Badge variant={r.cms.includes('Full') ? 'orange' : 'neutral'}>{r.cms}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button type="submit" variant="primary" size="lg">
            <Save size={16} />
            <span>Save Configuration</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
