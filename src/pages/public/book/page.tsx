import React, { useEffect, useState } from 'react';
import { useSearchParams } from '@/lib/router';
import { Calendar, Users, BedDouble, CheckCircle2, CreditCard, ShieldCheck, ArrowRight, Sparkles, Building2, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DualCalendarPicker } from '@/components/ui/DualCalendarPicker';
import { formatDualDate } from '@/lib/nepali-calendar';
import { createBooking, loadAddOnCatalog, loadBookingAvailability } from './api';
import { DEFAULT_ROOM_IMAGE, PROPERTY_CODE, ROOM_IMAGES } from './constants';
import type { AddOnOffering, AvailabilityOption, BookingConfirmation, BookingSource } from './types';

const formatAmount = (amount: number) => amount.toLocaleString('en-IN', {
  minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  maximumFractionDigits: 2
});

const pricingUnitLabel: Record<AddOnOffering['pricingUnit'], string> = {
  PER_BOOKING: 'per booking',
  PER_NIGHT: 'per night',
  PER_GUEST: 'per person',
  PER_GUEST_PER_NIGHT: 'per guest / night'
};

const bookingSourceOptions: Array<{ value: BookingSource; label: string }> = [
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'TRAVEL_AGENCY', label: 'Travel Agency' },
  { value: 'PARTNER_HOTEL', label: 'Partner Hotel' }
];

export default function BookPage() {
  const searchParams = useSearchParams();
  const isEmbeddedBooking = searchParams.get('embedded') === 'true';
  const requestedSource = searchParams.get('source') as BookingSource | null;
  const initialBookingSource: BookingSource = bookingSourceOptions.some((option) => option.value === requestedSource)
    ? requestedSource as BookingSource
    : isEmbeddedBooking ? 'WALK_IN' : 'ONLINE';
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const now = new Date();
  const today = toLocalDateString(now);
  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 1);
  const tomorrow = toLocalDateString(nextDay);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checkInDate, setCheckInDate] = useState(searchParams.get('checkIn') || today);
  const [checkOutDate, setCheckOutDate] = useState(searchParams.get('checkOut') || tomorrow);
  const [adults, setAdults] = useState(searchParams.get('adults') || '2');
  const [children, setChildren] = useState(searchParams.get('children') || '0');
  const [selectedRoomCode, setSelectedRoomCode] = useState(searchParams.get('type') || '');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState('');
  
  // Add-on services are loaded from the backend catalog so future offerings
  // do not require changes to this booking page.
  const [addOnOfferings, setAddOnOfferings] = useState<AddOnOffering[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, boolean>>({});
  const [addOnsLoading, setAddOnsLoading] = useState(true);
  const [addOnsError, setAddOnsError] = useState('');

  // Guest Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('Citizenship');
  const [idNumber, setIdNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingSource, setBookingSource] = useState<BookingSource>(initialBookingSource);

  // Booking Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<BookingConfirmation | null>(null);

  const roomsCatalog = Object.fromEntries(availability.map((option) => [option.roomType.code, {
    name: option.roomType.name,
    price: option.quote.nightlyRate,
    desc: option.roomType.description || `${option.roomType.bed_category} bed category · ${option.availableRooms} room(s) available`,
    img: ROOM_IMAGES[option.roomType.code] || DEFAULT_ROOM_IMAGE
  }]));
  const selectedOption = availability.find((option) => option.roomType.code === selectedRoomCode);
  const selectedRoom = roomsCatalog[selectedRoomCode] || { name: 'Select a room category', price: 0, desc: '', img: DEFAULT_ROOM_IMAGE };
  const selectablePhysicalRooms = selectedOption?.rooms || [];
  const selectedAddOnCodes = Object.entries(selectedAddOns)
    .filter(([, selected]) => selected)
    .map(([code]) => code)
    .sort();
  const selectedAddOnKey = selectedAddOnCodes.join(',');

  useEffect(() => {
    const controller = new AbortController();
    setAddOnsLoading(true);
    loadAddOnCatalog(PROPERTY_CODE, controller.signal)
      .then(setAddOnOfferings)
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setAddOnsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAddOnsLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setAvailability([]);
      setSelectedRoomId(null);
      return;
    }

    const controller = new AbortController();
    setRoomsLoading(true);
    setRoomsError('');
    loadBookingAvailability({ propertyCode: PROPERTY_CODE, checkInDate, checkOutDate, adultsCount: Number(adults), childrenCount: Number(children), addOnCodes: selectedAddOnCodes, signal: controller.signal })
      .then((options) => {
        setAvailability(options);
        setSelectedRoomCode((current) => options.some((option) => option.roomType.code === current) ? current : options[0]?.roomType.code || '');
        setSelectedRoomId((current) => current && options.some((option) => option.rooms.some((room) => room.id === current)) ? current : null);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setRoomsError('Unable to load available rooms.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRoomsLoading(false);
      });

    return () => controller.abort();
  }, [checkInDate, checkOutDate, adults, children, selectedAddOnKey]);

  // Financial Calculations
  const quote = selectedOption?.quote;
  const nights = quote?.nights ?? Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
  const roomCost = quote?.roomTotal ?? 0;
  const addonCost = quote?.addOnTotal ?? 0;
  const subTotal = quote?.subTotal ?? 0;
  const serviceCharge = quote?.serviceCharge ?? 0;
  const vatAmount = quote?.vatAmount ?? 0;
  const grandTotal = quote?.grandTotal ?? 0;

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!selectedRoomId) throw new Error('Select an available room number before continuing.');
      const confirmation = await createBooking({
          propertyCode: PROPERTY_CODE,
          checkInDate,
          checkOutDate,
          roomTypeCode: selectedRoomCode,
          roomId: selectedRoomId,
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
          addOns: selectedAddOns,
          source: bookingSource
      });
      setConfirmationData(confirmation);
      setStep(3);
      if (isEmbeddedBooking && window.parent !== window) {
        window.parent.postMessage({ type: 'hne:booking-created', reservation: confirmation }, window.location.origin);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The reservation service is currently unavailable. No booking was created.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '40px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-orange)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Direct Online Booking
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)' }}>Reserve Your Sanctuary</h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>
          Best Rate Guarantee • Instant Confirmation • Zero Booking Fees
        </p>
      </div>

      {/* Progress Tracker */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 40 }}>
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
                  showBsIcon={false}
                  showBsBadge={false}
                />
                <DualCalendarPicker
                  label="Check-Out Date"
                  value={checkOutDate}
                  minDate={checkInDate}
                  onChange={(val) => setCheckOutDate(val)}
                  required
                  showBsIcon={false}
                  showBsBadge={false}
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
                {!roomsLoading && !roomsError && availability.length === 0 && <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-red)', fontSize: 13 }}>No room categories are available for these dates and guest counts.</div>}
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
                            Rs. {formatAmount(room.price)}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{room.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="3. Select Exact Room Number">
                {roomsLoading ? (
                  <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading available rooms…</div>
                ) : roomsError ? (
                  <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-red)', fontSize: 13 }}>{roomsError}</div>
                ) : selectablePhysicalRooms.length === 0 ? (
                  <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 13 }}>No {selectedRoom.name} rooms are available for these dates.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                    {selectablePhysicalRooms.map((room) => {
                      const isSelected = selectedRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          aria-pressed={isSelected}
                          aria-label={`Select room ${room.roomNumber}, available`}
                          className="hne-room-choice"
                        >
                          <div className="hne-room-choice-header">
                            <span>Room {room.roomNumber}</span>
                            <span className="hne-room-choice-icon" aria-hidden="true">
                              {isSelected ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <BedDouble size={15} />}
                            </span>
                          </div>
                          <div className="hne-room-choice-status">Available</div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>The selected room number will be assigned to this reservation and shown as Reserved on the dashboard room board.</p>
            </Card>

            <Card title="4. Optional Add-On Experiences">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {addOnsLoading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading optional experiences…</div>}
                {addOnsError && <div style={{ fontSize: 13, color: 'var(--danger-red)' }}>{addOnsError}</div>}
                {!addOnsLoading && !addOnsError && addOnOfferings.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No optional experiences are currently available.</div>
                )}
                {addOnOfferings.map((offering) => (
                  <label key={offering.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 13.5 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedAddOns[offering.code])}
                      onChange={(event) => setSelectedAddOns((current) => ({ ...current, [offering.code]: event.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: 'var(--primary-orange)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{offering.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Rs. {formatAmount(offering.unitPrice)} {pricingUnitLabel[offering.pricingUnit]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            <Card title="5. Booking Source">
              <div className="hne-form-group" style={{ marginBottom: 0 }}>
                <label className="hne-label" htmlFor="booking-source">Booking Source *</label>
                <select id="booking-source" className="hne-select" value={bookingSource} onChange={(event) => setBookingSource(event.target.value as BookingSource)}>
                  {bookingSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
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
                    {nights} Night(s) • {adults} Adult(s){Number(children) > 0 ? ` • ${children} Child(ren)` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Room Charge ({nights} Nights)</span>
                  <span>Rs. {formatAmount(roomCost)}</span>
                </div>
                {addonCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Selected Add-ons</span>
                    <span>Rs. {formatAmount(addonCost)}</span>
                  </div>
                )}
                {serviceCharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Hotel Service Charge</span>
                  <span>Rs. {formatAmount(serviceCharge)}</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>VAT (13%)</span>
                  <span>Rs. {formatAmount(vatAmount)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Grand Total</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-orange)', fontFamily: 'var(--font-family-display)' }}>
                  Rs. {formatAmount(grandTotal)}
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                disabled={roomsLoading || !selectedRoomId}
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
                Confirm Reservation (Estimated Rs. {formatAmount(grandTotal)})
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

            <Badge variant="orange" style={{ marginBottom: 12 }}>Booking Request Received & Reserved in PMS</Badge>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Thank You, {confirmationData.guestName}!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Your room has been held in our Hotel Management System. Our team will verify the booking details and confirm it under:
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
