import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Star, Award, Shield, Phone, Mail, MapPin, Eye, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function GuestCRMPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [guests, setGuests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (json.success) {
        setGuests(json.guests || []);
        if (selectedGuest) {
          const updated = json.guests.find((g: any) => g.id === selectedGuest.id);
          if (updated) setSelectedGuest(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load CRM guests:', err);
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
      const res = await fetch('/api/crm/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        alert('Guest CRM Profile saved successfully!');
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
        alert(json.error || 'Failed to save guest');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving guest');
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
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Guest CRM & Loyalty Intelligence</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Central guest database, stay histories, lifetime revenue tracking, and VIP tier management
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchGuests} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowAddGuestModal(true)}>
            <Plus size={16} />
            <span>Create Guest Profile</span>
          </Button>
        </div>
      </div>

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
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Cumulative Guest Spend</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-gold-hover)', marginTop: 4 }}>
            Rs. {guests.reduce((acc, g) => acc + g.lifetimeSpend, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Grid: Directory + Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedGuest ? '1fr 1.1fr' : '1fr', gap: 24 }}>
        {/* Guests Directory */}
        <Card title={`Guest Directory (${filteredGuests.length})`} subtitle="Select any profile to view stay history and preferences">
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
              Loading guest directory from PostgreSQL...
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
                    <th>Lifetime Spend</th>
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
                        Rs. {guest.lifetimeSpend.toLocaleString()}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loyalty Classification</div>
                  <div style={{ marginTop: 4 }}>{getVipBadge(selectedGuest.vipLevel)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Lifetime Revenue</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-green)' }}>
                    Rs. {selectedGuest.lifetimeSpend.toLocaleString()}
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
                        <div style={{ fontWeight: 700 }}>Rs. {Number(r.grandTotal).toLocaleString()}</div>
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
              <h3 className="hne-modal-title">Create New Guest CRM Profile</h3>
              <button className="hne-modal-close" onClick={() => setShowAddGuestModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveGuest}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
