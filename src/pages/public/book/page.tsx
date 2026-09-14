import React, { useEffect, useState } from 'react';
import { useSearchParams } from '@/lib/router';
import { Calendar, Users, BedDouble, CheckCircle2, CreditCard, ShieldCheck, ArrowRight, Sparkles, Building2, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DualCalendarPicker } from '@/components/ui/DualCalendarPicker';
import { formatDualDate } from '@/lib/nepali-calendar';

export default function BookPage() {
  const searchParams = useSearchParams();
  const isEmbeddedBooking = searchParams.get('embedded') === 'true';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [selectedRoomCode, setSelectedRoomCode] = useState('LUX-01');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [physicalRooms, setPhysicalRooms] = useState<Array<{
    id: string;
    roomNumber: string;
    floor: number;
    status: string;
    roomType: string;
    roomTypeCode: string;
  }>>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState('');
  
  // Add-on services
  const [addons, setAddons] = useState<{ [key: string]: boolean }>({
    breakfast: true,
    airportTransfer: false,
    mountainSpa: false
  });

  // Guest Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('Citizenship');
  const [idNumber, setIdNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Booking Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

  const roomsCatalog: Record<string, { name: string; price: number; desc: string; img: string }> = {
    'LUX-01': {
      name: 'Luxury Room',
      price: 5500,
      desc: 'Climate-control AC, 60 Mbps NT Fiber Net WiFi, Cable TV, mineral water, and premium bath amenities.',
      img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'
    },
    'DLX-01': {
      name: 'Deluxe Room',
      price: 4200,
      desc: 'Spacious Deluxe room equipped with individual climate control AC, LED Cable TV, and work desk.',
      img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
    },
    'FAM-01': {
      name: 'Family Room',
      price: 6500,
      desc: 'Expansive room for families with 2 double beds, modern bath, and daily housekeeping.',
      img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80'
    },
    'HNY-01': {
      name: 'Honeymoon Room',
      price: 7000,
      desc: 'Specially decorated romantic suite with climate control AC, luxury furnishings, and bathtub.',
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80'
    },
    'STD-AC': {
      name: 'Standard (AC) Room',
      price: 3200,
      desc: 'Comfortable air-conditioned standard room with double bed, attached bath, and fiber WiFi.',
      img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80'
    },
    'STD-01': {
      name: 'Standard Room',
      price: 2200,
      desc: 'Clean, comfortable, and economical non-AC room with ceiling fan, attached bathroom, and free fiber WiFi.',
      img: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80'
    }
  };

  const selectedRoom = roomsCatalog[selectedRoomCode] || roomsCatalog['LUX-01'];
  const selectablePhysicalRooms = physicalRooms.filter((room) => room.roomTypeCode === selectedRoomCode);

  useEffect(() => {
    if (!isEmbeddedBooking || !checkInDate || !checkOutDate || checkOutDate <= checkInDate) return;

    const controller = new AbortController();
    setRoomsLoading(true);
    setRoomsError('');
    setSelectedRoomId(null);
    fetch(`/api/pms/rooms?availableOnly=true&checkInDate=${encodeURIComponent(checkInDate)}&checkOutDate=${encodeURIComponent(checkOutDate)}`, {
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((json) => {
        if (json.success) setPhysicalRooms(json.data);
        else setRoomsError(json.error || 'Unable to load available rooms.');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setRoomsError('Unable to load available rooms.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRoomsLoading(false);
      });

    return () => controller.abort();
  }, [isEmbeddedBooking, checkInDate, checkOutDate]);

  // Financial Calculations
  const nights = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
  const roomCost = selectedRoom.price * nights;
  
  let addonCost = 0;
  if (addons.breakfast) addonCost += 1200 * parseInt(adults) * nights;
  if (addons.airportTransfer) addonCost += 2500;
  if (addons.mountainSpa) addonCost += 4000;

  const subTotal = roomCost + addonCost;
  const serviceCharge = Math.round(subTotal * 0.10);
  const vatAmount = Math.round((subTotal + serviceCharge) * 0.13);
  const grandTotal = subTotal + serviceCharge + vatAmount;

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pms/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyCode: 'HNE-BTW',
          checkInDate,
          checkOutDate,
          roomTypeCode: selectedRoomCode,
          roomId: isEmbeddedBooking ? selectedRoomId : undefined,
          roomsCount: 1,
          adultsCount: parseInt(adults),
          childrenCount: parseInt(children),
          firstName,
          lastName,
          email,
          phone,
          idType,
          idNumber,
          specialRequests,
          addOns: {
            BREAKFAST: addons.breakfast,
            AIRPORT_TRANSFER: addons.airportTransfer,
            SPA: addons.mountainSpa
          },
          source: 'DIRECT_WEB'
        })
      });

      const data = await response.json();
      if (data.success) {
        setConfirmationData(data.data);
        setStep(3);
        if (isEmbeddedBooking && window.parent !== window) {
          window.parent.postMessage({ type: 'hne:booking-created', reservation: data.data }, window.location.origin);
        }
      } else {
        alert(data.error || 'Failed to create reservation.');
      }
    } catch (err) {
      console.error(err);
      alert('The reservation service is currently unavailable. No booking was created.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: isEmbeddedBooking ? '24px' : '40px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Title */}
      {!isEmbeddedBooking && <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-orange)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Direct Online Booking
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)' }}>Reserve Your Sanctuary</h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>
          Best Rate Guarantee • Instant Confirmation • Zero Booking Fees
        </p>
      </div>}

      {/* Progress Tracker */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: isEmbeddedBooking ? 24 : 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: step >= 1 ? 'var(--primary-orange)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: step >= 1 ? 'var(--primary-orange)' : '#E5E7EB', color: step >= 1 ? '#FFFFFF' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
          <span>Room Selection</span>
        </div>
        <span style={{ color: '#CBD5E1' }}>————</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: step >= 2 ? 'var(--primary-orange)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: step >= 2 ? 'var(--primary-orange)' : '#E5E7EB', color: step >= 2 ? '#FFFFFF' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
          <span>Guest Details & Payment</span>
        </div>
        <span style={{ color: '#CBD5E1' }}>————</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: step === 3 ? 'var(--green)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: step === 3 ? 'var(--green)' : '#E5E7EB', color: step === 3 ? '#FFFFFF' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
          <span>Confirmation</span>
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          {/* Left: Date & Room Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card title="1. Select Stay Dates & Guests (Dual Gregorian & Bikram Sambat Calendar)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <DualCalendarPicker
                  label="Check-In Date"
                  value={checkInDate}
                  minDate={today}
                  onChange={(val) => setCheckInDate(val)}
                  required
                  showBsIcon={!isEmbeddedBooking}
                  showBsBadge={!isEmbeddedBooking}
                />
                <DualCalendarPicker
                  label="Check-Out Date"
                  value={checkOutDate}
                  minDate={checkInDate}
                  onChange={(val) => setCheckOutDate(val)}
                  required
                  showBsIcon={!isEmbeddedBooking}
                  showBsBadge={!isEmbeddedBooking}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Adults</label>
                  <select className="hne-select" value={adults} onChange={(e) => setAdults(e.target.value)}>
                    <option value="1">1 Adult</option>
                    <option value="2">2 Adults</option>
                    <option value="3">3 Adults</option>
                    <option value="4">4 Adults</option>
                  </select>
                </div>
                <div className="hne-form-group" style={{ marginBottom: 0 }}>
                  <label className="hne-label">Children</label>
                  <select className="hne-select" value={children} onChange={(e) => setChildren(e.target.value)}>
                    <option value="0">0 Children</option>
                    <option value="1">1 Child</option>
                    <option value="2">2 Children</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card title="2. Select Room Category">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(roomsCatalog).map(([code, room]) => {
                  const isSelected = selectedRoomCode === code;
                  return (
                    <div
                      key={code}
                      onClick={() => {
                        setSelectedRoomCode(code);
                        setSelectedRoomId(null);
                      }}
                      style={{
                        padding: 16,
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid var(--primary-orange)' : '1px solid var(--border)',
                        backgroundColor: isSelected ? 'var(--primary-orange-light)' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 16,
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img src={room.img} alt={room.name} style={{ width: 90, height: 75, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: 15, fontWeight: 700 }}>{room.name}</h4>
                          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-orange)' }}>
                            Rs. {room.price.toLocaleString()}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{room.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {isEmbeddedBooking && (
              <Card title="3. Select Exact Room Number">
                {roomsLoading ? (
                  <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading available rooms…</div>
                ) : roomsError ? (
                  <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-red)', fontSize: 13 }}>{roomsError}</div>
                ) : selectablePhysicalRooms.length === 0 ? (
                  <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 13 }}>No {selectedRoom.name} rooms are available for these dates.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                    {selectablePhysicalRooms.map((room) => {
                      const isSelected = selectedRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          aria-pressed={isSelected}
                          style={{ padding: '12px 10px', borderRadius: 'var(--radius-md)', border: `2px solid ${isSelected ? 'var(--primary-orange)' : 'var(--border)'}`, backgroundColor: isSelected ? 'var(--primary-orange-light)' : 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <div style={{ fontSize: 16, fontWeight: 800 }}>Room {room.roomNumber}</div>
                          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-secondary)' }}>Floor {room.floor} · {room.status === 'RESERVED' ? 'Available for dates' : 'Ready'}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>The selected room number will be assigned to this reservation and shown as Reserved on the dashboard room board.</p>
              </Card>
            )}

            <Card title={`${isEmbeddedBooking ? '4' : '3'}. Optional Add-On Experiences`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={addons.breakfast}
                    onChange={(e) => setAddons({ ...addons, breakfast: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary-orange)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Daily Mountain Buffet Breakfast</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Rs. 1,200 per guest / day</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={addons.airportTransfer}
                    onChange={(e) => setAddons({ ...addons, airportTransfer: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary-orange)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Gautam Buddha Int'l Airport (Bhairahawa) / Butwal Transfer</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Rs. 2,500 one-way private AC vehicle</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={addons.mountainSpa}
                    onChange={(e) => setAddons({ ...addons, mountainSpa: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary-orange)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Himalayan Herbal Aroma Therapy (60 Min)</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Rs. 4,000 per person</div>
                  </div>
                </label>
              </div>
            </Card>
          </div>

          {/* Right: Real-time Price Summary & Proceed */}
          <div>
            <div className="hne-card" style={{ position: 'sticky', top: 90 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                Reservation Summary
              </h3>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <img src={selectedRoom.img} alt={selectedRoom.name} style={{ width: 70, height: 60, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedRoom.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {nights} Night(s) • {adults} Adult(s)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Room Charge ({nights} Nights)</span>
                  <span>Rs. {roomCost.toLocaleString()}</span>
                </div>
                {addonCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Selected Add-ons</span>
                    <span>Rs. {addonCost.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Hotel Service Charge (10%)</span>
                  <span>Rs. {serviceCharge.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>VAT (13%)</span>
                  <span>Rs. {vatAmount.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Grand Total</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-orange)', fontFamily: 'var(--font-family-display)' }}>
                  Rs. {grandTotal.toLocaleString()}
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                disabled={isEmbeddedBooking && !selectedRoomId}
                style={{ width: '100%', boxShadow: 'var(--shadow-glow)' }}
                onClick={() => setStep(2)}
              >
                <span>Continue to Guest Details</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleCreateBooking} style={{ maxWidth: 840, margin: '0 auto' }}>
          <Card title="Enter Primary Guest Details & Identification">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="hne-form-group">
                <label className="hne-label">First Name *</label>
                <input type="text" className="hne-input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Aarav" />
              </div>
              <div className="hne-form-group">
                <label className="hne-label">Last Name *</label>
                <input type="text" className="hne-input" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Pradhan" />
              </div>
              <div className="hne-form-group">
                <label className="hne-label">Mobile Number *</label>
                <input type="tel" className="hne-input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977-98XXXXXXXX" />
              </div>
              <div className="hne-form-group">
                <label className="hne-label">Email Address *</label>
                <input type="email" className="hne-input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aarav@example.com" />
              </div>
              <div className="hne-form-group">
                <label className="hne-label">ID Type</label>
                <select className="hne-select" value={idType} onChange={(e) => setIdType(e.target.value)}>
                  <option value="Citizenship">Citizenship (Nepal)</option>
                  <option value="Passport">Passport (International)</option>
                  <option value="Driving License">Driving License</option>
                  <option value="National ID">National ID</option>
                </select>
              </div>
              <div className="hne-form-group">
                <label className="hne-label">ID / Document Number</label>
                <input type="text" className="hne-input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Doc / ID number" />
              </div>
            </div>

            <div className="hne-form-group">
              <label className="hne-label">Special Requests (Optional)</label>
              <textarea
                className="hne-textarea"
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="High floor, quiet room, late check-in notice, dietary needs..."
              />
            </div>

            {/* Payment status */}
            <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <label className="hne-label" style={{ marginBottom: 12, display: 'block' }}>
                Payment
              </label>
              <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: 13.5 }}>
                <strong>Pay at hotel.</strong> Online payment gateways are not activated yet, so this form does not collect or mark any payment as completed.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Back to Room Selection
              </Button>
              <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
                Confirm Reservation (Estimated Rs. {grandTotal.toLocaleString()})
              </Button>
            </div>
          </Card>
        </form>
      )}

      {step === 3 && confirmationData && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="hne-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ marginBottom: 20 }}>
              <img src="/logo.png" alt="Hotel New Era" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
            </div>

            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--green-light)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} />
            </div>

            <Badge variant="success" style={{ marginBottom: 12 }}>Booking Confirmed & Synchronized in PMS</Badge>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Thank You, {confirmationData.guestName}!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Your reservation has been created directly in our Hotel Management System. A confirmation summary has been registered under:
            </p>

            <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', padding: 24, textAlign: 'left', marginBottom: 28, border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13.5 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Confirmation Ref:</span>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary-orange)' }}>
                    {confirmationData.confirmationNumber}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Folio Number:</span>
                  <div style={{ fontWeight: 700 }}>{confirmationData.folioNumber}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Room Selected:</span>
                  <div style={{ fontWeight: 700 }}>
                    {confirmationData.roomNumber ? `Room ${confirmationData.roomNumber} · ` : ''}{confirmationData.roomName}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                  <div style={{ fontWeight: 700 }}>{confirmationData.nights} Night(s)</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Check-In:</span>
                  <div style={{ fontWeight: 700 }}>{confirmationData.checkInDate} (From 2:00 PM)</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Check-Out:</span>
                  <div style={{ fontWeight: 700 }}>{confirmationData.checkOutDate} (Until 12:00 PM)</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <Button variant="secondary" onClick={() => window.print()}>
                Print Voucher
              </Button>
              <Button variant="primary" onClick={() => (window.location.href = '/')}>
                Return to Homepage
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
