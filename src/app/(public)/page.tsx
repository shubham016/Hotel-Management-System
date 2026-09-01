import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  UtensilsCrossed,
  PartyPopper,
  Star,
  MapPin,
  CheckCircle2,
  Tv,
  Wifi,
  Coffee,
  BedDouble,
  Wine
} from 'lucide-react';
import { HeroBanner } from '@/components/public/HeroBanner';
import { BookingWidget } from '@/components/public/BookingWidget';
import { RoomCard } from '@/components/public/RoomCard';

export default function HomePage() {
  const sampleRooms = [
    {
      id: 'room-1',
      name: 'Luxury Room',
      code: 'LUX-01',
      slug: 'luxury-room',
      description: 'Sophisticated luxury accommodation featuring climate-control AC, 60 Mbps NT Fiber Net WiFi, Cable TV, mineral water, and premium amenities.',
      basePrice: 5500,
      maxOccupancy: 2,
      sizeSqFt: 380,
      bedType: '1 King Bed',
      viewType: 'City & Garden View',
      coverImageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      amenities: ['Climate Control AC', '60 Mbps NT Fiber Net WiFi', 'Cable TV', 'Mineral Water', 'Room Service'],
      featured: true
    },
    {
      id: 'room-2',
      name: 'Deluxe Room',
      code: 'DLX-01',
      slug: 'deluxe-room',
      description: 'Spacious Deluxe room equipped with individual climate control AC, LED Cable TV, high-speed fiber internet, and work desk.',
      basePrice: 4200,
      maxOccupancy: 2,
      sizeSqFt: 320,
      bedType: '1 Queen Bed',
      viewType: 'City View',
      coverImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      amenities: ['Climate Control AC', 'High-Speed Fiber Net', 'LED Cable TV', 'Hot & Cold Shower', 'Tea/Coffee Station'],
      featured: true
    },
    {
      id: 'room-3',
      name: 'Family Room',
      code: 'FAM-01',
      slug: 'family-room',
      description: 'Expansive family room designed for comfortable group stays with multiple double beds, modern attached bath, and daily housekeeping.',
      basePrice: 6500,
      maxOccupancy: 4,
      sizeSqFt: 520,
      bedType: '2 Double Beds',
      viewType: 'City View',
      coverImageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      amenities: ['2 Double Beds', 'Free Fiber WiFi', 'Cable TV', 'Attached Modern Bath', 'Daily Housekeeping'],
      featured: false
    }
  ];

  const testimonials = [
    {
      name: 'Pooja Bhattarai',
      origin: 'Kathmandu, Nepal',
      rating: 5,
      comment: 'Conveniently located 5 minutes from Butwal Bus Park on Kalikapath. Dhiki Restaurant served authentic and delicious Nepali Bhojangriha thali, and our room was spotless.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    },
    {
      name: 'Santosh Sharma',
      origin: 'Lumbini Transit Guest',
      rating: 5,
      comment: 'Hotel New Era is the ideal base in Butwal. 43 quiet, clean rooms, reliable 60 Mbps fiber net, and warm attentive staff.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
    },
    {
      name: 'Rajesh & Suman Shrestha',
      origin: 'Corporate Convention Organizer',
      rating: 5,
      comment: 'Hosted our regional summit in Nilkantha Ballroom. The central kitchen catered fresh hot meals for 200 pax seamlessly.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
    }
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF' }}>
      {/* 1. Dynamic Hero Banner */}
      <HeroBanner />

      {/* 2. Integrated Booking Engine Bar */}
      <BookingWidget />

      {/* 3. Welcome & Heritage Introduction */}
      <section style={{ padding: '60px 24px 80px', maxWidth: 1280, margin: '0 auto', backgroundColor: '#FFFFFF' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 48,
            alignItems: 'center'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 14px',
                backgroundColor: 'var(--brand-crimson-light)',
                color: 'var(--brand-crimson)',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <Sparkles size={14} /> Atithi Devo Bhava • Est. 1982
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', lineHeight: 1.2, marginBottom: 18 }}>
              Butwal’s Landmark of Hospitality & Trust
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>
              Established in 1982 by Mr. and Mrs. Nepal (originally starting as the 10-bedroom Sangam Hotel), <strong>Hotel New Era</strong> is Butwal’s trusted hospitality destination featuring <strong>43 saleable rooms</strong>, <strong>2 full-service restaurants</strong>, <strong>3 modern seminar & conference halls</strong>, and a dedicated <strong>Main Central Kitchen</strong>.
            </p>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Centrally located on Kalikapath, just a 5-minute walk from New Bus Park near the Tilottama (Tinau) River, our motto has always stood firm: <strong>Security, Cleanliness, and Hospitality</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="var(--brand-green)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>43 Modern Saleable Rooms</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="var(--brand-green)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>2 Restaurants & Outlets</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="var(--brand-green)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>3 Seminar & Conference Halls</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="var(--brand-green)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>1 Dedicated Central Kitchen</span>
              </div>
            </div>

            <Link href="/about" className="hne-btn hne-btn-secondary">
              <span>Read Our Heritage Story</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
                border: '4px solid #FFFFFF'
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
                alt="Hotel New Era Butwal Exterior"
                style={{ width: '100%', height: 420, objectFit: 'cover' }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -20,
                left: -20,
                backgroundColor: '#FFFFFF',
                padding: '16px 22px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-gold-light)',
                  color: 'var(--brand-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Award size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Hospitality Landmark</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Serving Butwal & Lumbini Since 1982</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Rooms & Suites Showcase */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '80px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-crimson)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Accommodations
              </div>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)' }}>Explore Our 43 Saleable Rooms</h2>
            </div>
            <Link href="/rooms" className="hne-btn hne-btn-secondary">
              <span>View All 6 Categories</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 30 }}>
            {sampleRooms.map((room) => (
              <RoomCard key={room.id} {...room} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. 2 Dining Outlets & 3 Conference Halls */}
      <section style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto', backgroundColor: '#FFFFFF' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-crimson)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Outlets & Banquets
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)' }}>2 Restaurants & 3 Conference Halls</h2>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', marginTop: 8 }}>
            Catered by our dedicated Main Central Kitchen with authentic flavors and executive setups.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
          {/* Restaurant 1: Dhiki */}
          <div
            className="hne-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ height: 240, overflow: 'hidden' }}>
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
                alt="Dhiki Restaurant & Bhojangriha"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-crimson)', marginBottom: 8 }}>
                <UtensilsCrossed size={18} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Restaurant 1 • Nepali & Thakali</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Dhiki Restaurant & Bhojangriha</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
                Authentic Thakali thali, Bhojangriha delicacies, Tandoori specialties, and family dining cabins.
              </p>
              <Link href="/dining" className="hne-btn hne-btn-secondary" style={{ width: 'fit-content' }}>
                <span>Explore Dhiki Restaurant</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Restaurant 2: Terrace Lounge & Bar */}
          <div
            className="hne-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ height: 240, overflow: 'hidden' }}>
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
                alt="New Era Terrace Lounge & Bar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-green)', marginBottom: 8 }}>
                <Wine size={18} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Restaurant 2 • Bar & Grill</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>New Era Terrace Lounge & Bar</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
                Open-air terrace ambience serving cocktails, mocktails, continental sizzlers, and light snacks.
              </p>
              <Link href="/dining" className="hne-btn hne-btn-secondary" style={{ width: 'fit-content' }}>
                <span>Explore Terrace Lounge</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* 3 Conference Halls Card */}
          <div
            className="hne-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ height: 240, overflow: 'hidden' }}>
              <img
                src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80"
                alt="Nilkantha Grand Ballroom"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-gold)', marginBottom: 8 }}>
                <PartyPopper size={18} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>3 Seminar & Banquet Halls</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Nilkantha, Tulki Devi & Devakala</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
                Equipped with HD projection and sound systems. Accommodating 60 to 300 guests for corporate seminars and social celebrations.
              </p>
              <Link href="/banquet" className="hne-btn hne-btn-secondary" style={{ width: 'fit-content' }}>
                <span>View 3 Conference Halls</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Guest Testimonials */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-crimson)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Guest Feedback
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', marginBottom: 12 }}>Guest Experiences in Butwal</h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>
              Read reviews from corporate travelers, tourists visiting Lumbini, and banquet organizers.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="hne-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} color="var(--brand-gold)" fill="var(--brand-gold)" />
                  ))}
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.6, flex: 1 }}>
                  "{t.comment}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <img
                    src={t.avatar}
                    alt={t.name}
                    style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.origin}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
