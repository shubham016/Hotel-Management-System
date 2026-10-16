import React, { useEffect, useState } from 'react';
import { Settings, Building2, Shield, DollarSign, Calendar, Save, CheckCircle2, Globe, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ClientDataEditor, type ClientRecord } from './ClientDataEditor';
import Link from '@/lib/router';
import './SettingsTabs.css';
import { setDisplayPreferences } from '@/lib/display-preferences';
import { authClient } from '@/lib/auth-client';

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<'PROPERTY' | 'TAX' | 'CALENDAR' | 'EMAIL' | 'ROLES' | 'STAFF' | 'LAUNDRY' | 'EXTRAS'>('PROPERTY');
  const [staff, setStaff] = useState<ClientRecord[]>([]);
  const [laundry, setLaundry] = useState<ClientRecord[]>([]);
  const [extras, setExtras] = useState<ClientRecord[]>([]);
  const [clientDataError, setClientDataError] = useState('');

  const loadClientData = async () => {
    const response = await fetch('/api/client_reference');
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load client data.');
    setClientDataError('');
    setStaff(result.data.staff);
    setLaundry(result.data.laundry);
    setExtras(result.data.extras);
  };

  useEffect(() => { loadClientData().catch((reason) => setClientDataError(reason instanceof Error ? reason.message : 'Unable to load client data.')); }, []);

  // Property State
  const [propertyName, setPropertyName] = useState('Hotel New Era - Butwal');
  const [propertyCode, setPropertyCode] = useState('HNE-BTW');
  const [phone, setPhone] = useState('+977-71-543833');
  const [email, setEmail] = useState('info@hotelnewera.com.np');
  const [address, setAddress] = useState('Kalikapath, New Buspark, Butwal-8, Rupandehi, Nepal');
  const [checkinTime, setCheckinTime] = useState('14:00');
  const [checkoutTime, setCheckoutTime] = useState('12:00');
  const [laundryCollection, setLaundryCollection] = useState('');
  const [laundryReturn, setLaundryReturn] = useState('');

  // Tax State
  const [isVatInclusive, setIsVatInclusive] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [emailDelivery, setEmailDelivery] = useState<{ configured: boolean; sender: string } | null>(null);

  // Localization State
  const [currencyDisplay, setCurrencyDisplay] = useState<'SYMBOL' | 'CODE'>('SYMBOL');
  const [currencyCode, setCurrencyCode] = useState('NPR');
  const [nepaliCalendarEnabled, setNepaliCalendarEnabled] = useState(true);

  useEffect(() => {
    fetch('/api/hotel_settings').then((response) => response.json()).then((result) => {
      if (!result.success) throw new Error(result.error || 'Unable to load hotel settings.');
      const property = result.data.property;
      setPropertyName(property.name); setPropertyCode(property.code); setPhone(property.phone || '');
      setEmail(property.email || ''); setAddress(property.address || '');
      setCheckinTime(property.check_in_time); setCheckoutTime(property.check_out_time);
      setLaundryCollection(property.laundry_collection_instructions || '');
      setLaundryReturn(property.laundry_return_instructions || '');
      setIsVatInclusive(result.data.vat.inclusive);
      setCurrencyCode(result.data.display_preferences.currency_code);
      setCurrencyDisplay(result.data.display_preferences.currency_display);
      setNepaliCalendarEnabled(result.data.display_preferences.nepali_calendar_enabled);
      setEmailDelivery(result.data.email_delivery);
      setSettingsLoaded(true);
    }).catch((reason) => setSaveError(reason instanceof Error ? reason.message : 'Unable to load settings.'));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true); setSaveMessage(''); setSaveError('');
    try {
      const body = activeTab === 'PROPERTY' ? { property: {
        name: propertyName, phone, email, address, check_in_time: checkinTime, check_out_time: checkoutTime
      } } : activeTab === 'CALENDAR' ? { display_preferences: { currency_display: currencyDisplay, nepali_calendar_enabled: nepaliCalendarEnabled } } : { vat: { inclusive: isVatInclusive } };
      const response = await fetch('/api/hotel_settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save settings.');
      setDisplayPreferences(result.data.display_preferences);
      const profile = authClient.profile();
      if (profile) authClient.updateProfile({ ...profile, displayPreferences: result.data.display_preferences });
      setSaveMessage('Settings saved.');
    } catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Unable to save settings.'); }
    finally { setSaving(false); }
  };

  const saveLaundryInstructions = async () => {
    setSaving(true); setSaveMessage(''); setSaveError('');
    try {
      const response = await fetch('/api/hotel_settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: { laundry_collection_instructions: laundryCollection, laundry_return_instructions: laundryReturn } })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save laundry instructions.');
      setSaveMessage('Laundry instructions saved.');
    } catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Unable to save laundry instructions.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Settings</h1>

        </div>
      </div>

      {/* Tabs */}
      <div className="hne-settings-tabs" role="group" aria-label="Settings sections">
        {[
          { id: 'PROPERTY', label: 'Property Profile' },
          { id: 'TAX', label: 'Tax & VAT' },
          { id: 'CALENDAR', label: 'Nepali Calendar & Currency' },
          { id: 'EMAIL', label: 'Email' },
          { id: 'ROLES', label: 'Roles & Access' },
          { id: 'STAFF', label: 'Staff Directory' },
          { id: 'LAUNDRY', label: 'Laundry Tariffs' },
          { id: 'EXTRAS', label: 'Extra Services' }
        ].map((t) => (
          <button
            type="button"
            key={t.id}
            className="hne-settings-tab"
            aria-pressed={activeTab === t.id}
            onClick={() => setActiveTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!settingsLoaded && !saveError && <p role="status">Loading settings…</p>}
      <fieldset disabled={saving || (!settingsLoaded && ['PROPERTY', 'TAX', 'LAUNDRY', 'CALENDAR'].includes(activeTab))} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
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
                  <input type="text" className="hne-input" value={propertyCode} readOnly title="Property code is a permanent system identifier" />
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
                  <input type="time" className="hne-input" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} />
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Standard Check-Out Time</label>
                  <input type="time" className="hne-input" value={checkoutTime} onChange={(e) => setCheckoutTime(e.target.value)} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'TAX' && (
          <Card title="Government VAT Settings">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>


              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 280px)', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Government VAT Rate</label>
                  <div className="hne-input" style={{ display: 'flex', alignItems: 'center' }}>13%</div>
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
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Listed prices already include VAT</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>When enabled, VAT is not added on top of room and extra prices.</div>
                </div>
              </label>
            </div>
          </Card>
        )}

        {activeTab === 'CALENDAR' && (
          <Card title="Calendar & Currency Display">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Operating Currency Code</label>
                  <input type="text" className="hne-input" value={currencyCode} readOnly />
                  <small>Existing transactions use {currencyCode}. Changing the label does not convert amounts.</small>
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Currency label</label>
                  <select aria-label="Currency label" className="hne-select" value={currencyDisplay} onChange={event => setCurrencyDisplay(event.target.value as 'SYMBOL' | 'CODE')}><option value="SYMBOL">Rs.</option><option value="CODE">{currencyCode}</option></select>
                  <small>{currencyDisplay === 'CODE' ? currencyCode : 'Rs.'} 12,345.67</small>
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
                  <div style={{ fontSize: 12, color: '#92400E' }}>Show BS dates alongside AD dates. Payroll continues to use BS months.</div>
                </div>
              </label>
            </div>
          </Card>
        )}

        {activeTab === 'EMAIL' && <Card title="Password-reset Emails"><dl><dt>Delivery</dt><dd style={{ margin: '4px 0 16px' }}>{emailDelivery ? emailDelivery.configured ? 'Configured' : 'Not configured' : 'Loading…'}</dd><dt>Sender</dt><dd style={{ margin: '4px 0 16px' }}>{emailDelivery?.sender || 'Not set'}</dd></dl>{emailDelivery && !emailDelivery.configured && <p role="status">Configure the hotel's outgoing email service to deliver reset requests. Owner/Admin can reset passwords in <Link href="/admin/staff-access">Staff Portal Access</Link>.</p>}</Card>}

        {activeTab === 'ROLES' && (
          <Card title="Staff roles and portal access"><p style={{ marginBottom: 16 }}>Assign individual accounts from <Link href="/admin/staff-access">Staff Portal Access</Link>.</p>
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
                    { role: 'Owner', pms: 'Full Control', pos: 'Full Control', acc: 'Full Control', cms: 'Full Control' },
                    { role: 'All-rounder / Admin', pms: 'Full Control', pos: 'Full Control', acc: 'Full Control', cms: 'Full Control' },
                    { role: 'Front Desk', pms: 'Reservations / Payments / Check-in / Checkout', pos: 'No Access', acc: 'Guest Folios Only', cms: 'No Access' },
                    { role: 'Restaurant', pms: 'Room Charge Only', pos: 'Orders / Service / Billing', acc: 'No Access', cms: 'No Access' },
                    { role: 'Kitchen Cook / Helper', pms: 'No Access', pos: 'Kitchen Tickets Only', acc: 'No Access', cms: 'No Access' },
                    { role: 'Housekeeping / Cleaning', pms: 'Cleaning / Inspection Only', pos: 'No Access', acc: 'No Access', cms: 'No Access' }
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

        {clientDataError && ['STAFF', 'LAUNDRY', 'EXTRAS'].includes(activeTab) && <p role="alert" style={{ color: 'var(--red)' }}>{clientDataError}</p>}
        {activeTab === 'STAFF' && <Card title="Client Staff Directory"><p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Portal accounts require individual email addresses. Use Staff Portal Access to assign each employee a sign-in and role.</p><ClientDataEditor kind="staff" records={staff} onSaved={loadClientData} /></Card>}
        {activeTab === 'LAUNDRY' && <Card title="Laundry Tariffs"><ClientDataEditor kind="laundry" records={laundry} onSaved={loadClientData} /><div style={{ display: 'grid', gap: 12, marginTop: 20 }}><label className="hne-form-group"><span className="hne-label">Collection instructions</span><textarea className="hne-input" value={laundryCollection} onChange={(event) => setLaundryCollection(event.target.value)} /></label><label className="hne-form-group"><span className="hne-label">Return instructions</span><textarea className="hne-input" value={laundryReturn} onChange={(event) => setLaundryReturn(event.target.value)} /></label><button type="button" disabled={saving} className="hne-btn hne-btn-primary hne-btn-sm" onClick={saveLaundryInstructions}>Save laundry instructions</button></div></Card>}
        {activeTab === 'EXTRAS' && <Card title="Extra Services"><ClientDataEditor kind="extras" records={extras} onSaved={loadClientData} /></Card>}

        {saveError && <p role="alert" style={{ color: 'var(--red)', marginTop: 12 }}>{saveError}</p>}
        {saveMessage && <p role="status" style={{ color: 'var(--green)', marginTop: 12 }}>{saveMessage}</p>}
        {['PROPERTY', 'TAX', 'CALENDAR'].includes(activeTab) && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button type="button" onClick={handleSaveSettings} disabled={saving || !settingsLoaded} variant="primary">
            <Save size={16} />
            <span>{saving ? 'Saving…' : 'Save Configuration'}</span>
          </Button>
        </div>}
      </fieldset>
    </div>
  );
}
