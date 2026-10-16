import { currencyLabel } from '@/lib/display-preferences';
import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Star, Award, Shield, Phone, Mail, MapPin, Eye, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePortalProfile } from '@/lib/portal-context';
import { hasAccess } from '@/lib/portal-access';

export default function GuestCRMPage() {
  const profile = usePortalProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [guests, setGuests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Guest Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [vipLevel, setVipLevel] = useState('REGULAR');
  const [preferences, setPreferences] = useState('');
  const [notes, setNotes] = useState('');

  const fetchGuests = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/crm/guests');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Unable to load guests.');
      setError('');
      if (json.success) {
        setGuests(json.guests || []);
        if (selectedGuest) {
          const updated = json.guests.find((g: any) => g.id === selectedGuest.id);
          if (updated) setSelectedGuest(updated);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load guests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError('');
      const res = await fetch('/api/crm/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          firstName,
          lastName,
          phone,
          email,
          city,
          vipLevel,
          preferences,
          notes
        })
      });

      const json = await res.json();
      if (json.success) {
        setSelectedGuest(json.data);
        setEditingId(null);
        setShowAddGuestModal(false);
        setFirstName('');
        setLastName('');
        setPhone('');
        setEmail('');
        setCity('');
        setPreferences('');
        setNotes('');
        fetchGuests();
      } else {
        setFormError(json.error || 'Unable to save guest.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Unable to save guest.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGuests = guests.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.phone.includes(searchTerm) ||
      g.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVipBadge = (level: string) => {
    switch (level) {
      case 'PLATINUM': return <Badge variant="primary">💎 Platinum VIP</Badge>;
      case 'GOLD': return <Badge variant="warning">⭐ Gold Member</Badge>;
      case 'SILVER': return <Badge variant="secondary">🥈 Silver Member</Badge>;
      default: return <Badge variant="outline">Regular Guest</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Guest CRM</h1>

        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchGuests} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          {hasAccess(profile, 'GUESTS', 'create') && <Button variant="primary" onClick={() => { setEditingId(null); setFirstName(''); setLastName(''); setPhone(''); setEmail(''); setCity(''); setVipLevel('REGULAR'); setPreferences(''); setNotes(''); setFormError(''); setShowAddGuestModal(true); }}>
            <Plus size={16} />
            <span>Create Guest Profile</span>
          </Button>}
        </div>
      </div>

      {error && <p role="alert" style={{ color: "var(--danger-red)" }}>{error}</p>}
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-crimson)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Registered Guests</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {guests.length} Profiles
          </div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-green)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>VIP & Loyalty Members</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-green)', marginTop: 4 }}>
            {guests.filter(g => g.vipLevel !== 'REGULAR').length} VIPs
          </div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-gold)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Completed Stay Charges</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-gold-hover)', marginTop: 4 }}>
            {currencyLabel()} {guests.reduce((acc, g) => acc + g.lifetimeSpend, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Grid: Directory + Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedGuest ? 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' : '1fr', gap: 24 }}>
        {/* Guests Directory */}
        <Card title={`Guest Directory (${filteredGuests.length})`} >
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Guest Name, Mobile Number, or Email..."
              className="hne-input"
              style={{ paddingLeft: 36 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading guest directory…
            </div>
          ) : (
            <div className="hne-table-container">
              <table className="hne-table">
                <thead>
                  <tr>
                    <th>Guest Name</th>
                    <th>Contact</th>
                    <th>VIP Tier</th>
                    <th>Stays</th>
                    <th>Completed Stay Charges</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr
                      key={guest.id}
                      style={{
                        backgroundColor: selectedGuest?.id === guest.id ? 'var(--brand-crimson-light)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedGuest(guest)}
                    >
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{guest.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{guest.city}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div>{guest.phone}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{guest.email}</div>
                      </td>
                      <td>{getVipBadge(guest.vipLevel)}</td>
                      <td style={{ fontWeight: 700 }}>{guest.stayCount} Stays</td>
                      <td style={{ fontWeight: 800, color: 'var(--brand-green)' }}>
                        {currencyLabel()} {guest.lifetimeSpend.toLocaleString()}
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGuest(guest);
                          }}
                        >
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Selected Guest Inspector */}
        {selectedGuest && (
          <Card
            title={selectedGuest.name}
            subtitle={`Customer ID: ${selectedGuest.id.slice(0, 8)} • ${selectedGuest.city}`}
            action={
              <button
                onClick={() => setSelectedGuest(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)' }}
              >
                ✕ Close
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hasAccess(profile, 'GUESTS', 'update') && <Button variant="secondary" onClick={() => { setEditingId(selectedGuest.id); setFirstName(selectedGuest.firstName); setLastName(selectedGuest.lastName); setPhone(selectedGuest.phone); setEmail(selectedGuest.email === 'N/A' ? '' : selectedGuest.email); setCity(selectedGuest.city); setVipLevel(selectedGuest.vipLevel); setPreferences(selectedGuest.preferences); setNotes(selectedGuest.notes || ''); setFormError(''); setShowAddGuestModal(true); }}>Edit Profile</Button>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loyalty Classification</div>
                  <div style={{ marginTop: 4 }}>{getVipBadge(selectedGuest.vipLevel)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Completed Stay Charges</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-green)' }}>
                    {currencyLabel()} {selectedGuest.lifetimeSpend.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mobile Phone:</span>
                  <div style={{ fontWeight: 600 }}>{selectedGuest.phone}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                  <div style={{ fontWeight: 600 }}>{selectedGuest.email}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Guest Preferences & Notes</div>
                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  {selectedGuest.preferences}
                  {selectedGuest.notes && <p style={{ marginTop: 8 }}>{selectedGuest.notes}</p>}
                </div>
              </div>

              {selectedGuest.recentReservations && selectedGuest.recentReservations.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Recent Stay History</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedGuest.recentReservations.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
                        <div>
                          <strong>{r.confirmationNumber}</strong> • Status: {r.status}
                        </div>
                        <div style={{ fontWeight: 700 }}>{currencyLabel()} {Number(r.grandTotal).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Guest Profile Modal */}
      {showAddGuestModal && (
        <div className="hne-modal-backdrop" onClick={() => setShowAddGuestModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">{editingId ? 'Edit Guest Profile' : 'Create Guest Profile'}</h3>
              <button className="hne-modal-close" onClick={() => setShowAddGuestModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveGuest}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {formError && <p role="alert" style={{ color: 'var(--danger-red)' }}>{formError}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="hne-form-group">
                    <label className="hne-label">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      className="hne-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="hne-form-group">
                    <label className="hne-label">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gautam"
                      className="hne-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="hne-form-group">
                    <label className="hne-label">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+977-9800000000"
                      className="hne-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="hne-form-group">
                    <label className="hne-label">Email</label>
                    <input
                      type="email"
                      placeholder="guest@example.com"
                      className="hne-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="hne-form-group">
                    <label className="hne-label">City / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Butwal / Kathmandu"
                      className="hne-input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="hne-form-group">
                    <label className="hne-label">VIP Loyalty Level</label>
                    <select
                      className="hne-select"
                      value={vipLevel}
                      onChange={(e) => setVipLevel(e.target.value)}
                    >
                      <option value="REGULAR">Regular Guest</option>
                      <option value="SILVER">Silver Member</option>
                      <option value="GOLD">Gold Member</option>
                      <option value="PLATINUM">Platinum VIP</option>
                    </select>
                  </div>
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Guest Preferences</label>
                  <input
                    type="text"
                    placeholder="e.g. Non-smoking room, high floor, Thakali set lover"
                    className="hne-input"
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                  />
                </div>
                <div className="hne-form-group"><label className="hne-label">Notes</label><textarea className="hne-input" value={notes} onChange={event => setNotes(event.target.value)} /></div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowAddGuestModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>Save Profile</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
