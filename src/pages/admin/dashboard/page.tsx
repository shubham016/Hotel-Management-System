import React, { useEffect, useRef, useState } from 'react';
import {
  UsersRound,
  BedDouble,
  CheckCircle2,
  LogIn,
  LogOut,
  ChartPie,
  WalletCards,
  Sparkles,
  AlertTriangle,
  Wrench,
  Plus,
  X
} from 'lucide-react';
import { StatTile } from '@/components/ui/StatTile';
import Link from '@/lib/router';
import { BookingModal } from '@/components/booking/BookingModal';
import { useRoomUpdates } from '@/lib/room-updates';

type DashboardData = {
  businessDate: string;
  occupancy: { totalRooms: number; occupiedRooms: number; vacantRooms: number; occupancyPct: number };
  guests: { todayArrivals: number; todayDepartures: number; inHouseGuests: number; overdueArrivals: number; overdueDepartures: number };
  revenue: { today: { room: number; fnb: number; banquet: number; total: number }; adr: number; revPar: number };
  receivables: { pendingReceivables: number };
  arrivals: { confirmationNumber: string; guestName: string; room: string; adults: number; balanceDue: number }[];
  recentTransactions: { voucherNumber: string; narration: string; sourceModule: string; amount: number; status: string; postedAt: string }[];
  housekeeping: { clean: number; dirty: number; inspectionRequired: number };
  pos: { activeTables: number; totalTables: number; ordersToday: number };
  trends: { arrivals: number[]; departures: number[]; inHouse: number[]; revenue: number[]; restaurantOrders: number[] };
};

type RoomBoardRoom = {
  id: string;
  roomNumber: string;
  floor: number;
  active: boolean;
  status: 'OCCUPIED' | 'RESERVED' | 'VACANT_CLEAN' | 'VACANT_DIRTY' | 'INSPECTION_REQUIRED' | 'OUT_OF_ORDER' | 'OUT_OF_SERVICE' | 'DUE_OUT';
};

const initialDashboardData: DashboardData = {
  businessDate: new Date().toISOString().slice(0, 10),
  occupancy: { totalRooms: 0, occupiedRooms: 0, vacantRooms: 0, occupancyPct: 0 },
  guests: { todayArrivals: 0, todayDepartures: 0, inHouseGuests: 0, overdueArrivals: 0, overdueDepartures: 0 },
  revenue: { today: { room: 0, fnb: 0, banquet: 0, total: 0 }, adr: 0, revPar: 0 },
  receivables: { pendingReceivables: 0 },
  arrivals: [],
  recentTransactions: [],
  housekeeping: { clean: 0, dirty: 0, inspectionRequired: 0 },
  pos: { activeTables: 0, totalTables: 0, ordersToday: 0 },
  trends: { arrivals: [], departures: [], inHouse: [], revenue: [], restaurantOrders: [] }
};

const roomStatusStyles = {
  OCCUPIED: { label: 'Occupied', background: '#075b46', border: '#075b46', text: '#FFFFFF', muted: '#D1FAE5' },
  RESERVED: { label: 'Reserved', background: '#FFF7ED', border: '#FB923C', text: '#C2410C', muted: '#C2410C' },
  VACANT_CLEAN: { label: 'Clean', background: '#ECFDF5', border: '#86EFAC', text: '#047857', muted: '#047857' },
  VACANT_DIRTY: { label: 'Dirty', background: '#FFFBEB', border: '#FBBF24', text: '#B45309', muted: '#B45309' },
  INSPECTION_REQUIRED: { label: 'Needs Inspection', background: '#EFF6FF', border: '#7DD3FC', text: '#0369A1', muted: '#0369A1' },
  OUT_OF_ORDER: { label: 'Out of Order', background: '#FFF1F2', border: '#FDA4AF', text: '#BE123C', muted: '#BE123C' },
  OUT_OF_SERVICE: { label: 'Out of Service', background: '#F3F4F6', border: '#9CA3AF', text: '#4B5563', muted: '#4B5563' },
  DUE_OUT: { label: 'Due Out', background: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C', muted: '#B91C1C' }
} as const;

const roomStatuses = Object.keys(roomStatusStyles) as RoomBoardRoom['status'][];
const manuallyManagedRoomStatuses: RoomBoardRoom['status'][] = ['VACANT_CLEAN', 'VACANT_DIRTY', 'INSPECTION_REQUIRED', 'OUT_OF_ORDER', 'OUT_OF_SERVICE'];

// Decorative tile artwork stays consistent while the values themselves come
// from the live dashboard API.
const statTileVisuals = {
  arrivals: [2, 6, 5.6, 5.4, 11, 10.4, 10.5],
  departures: [10, 10, 8, 5.2, 5.3, 2],
  inHouse: [4, 6.5, 6.2, 6, 10.5, 10, 10.2],
  revenue: [4, 5.5, 5.2, 8.5, 11, 10.2, 10.4]
} as const;

const floorLabel = (floor: number) => {
  if (floor === 1) return 'Ground Floor';
  const level = floor - 1;
  return `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} Floor`;
};

function RoomStatusIcon({ status, size = 14 }: { status: RoomBoardRoom['status']; size?: number }) {
  switch (status) {
    case 'OCCUPIED':
      return <BedDouble size={size} aria-label="Occupied" />;
    case 'RESERVED':
      return <CheckCircle2 size={size} aria-label="Reserved" />;
    case 'VACANT_CLEAN':
      return <Sparkles size={size} aria-label="Clean" />;
    case 'VACANT_DIRTY':
      return <AlertTriangle size={size} aria-label="Dirty" />;
    case 'INSPECTION_REQUIRED':
      return <CheckCircle2 size={size} aria-label="Needs Inspection" />;
    case 'OUT_OF_ORDER':
    case 'OUT_OF_SERVICE':
      return <Wrench size={size} aria-label="Out of Order" />;
    case 'DUE_OUT':
      return <LogOut size={size} aria-label="Due out" />;
    default:
      return null;
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData>(initialDashboardData);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomBoardRoom[]>([]);
  const [selectedRoomFloor, setSelectedRoomFloor] = useState<number | 'ALL'>('ALL');
  const [selectedRoomStatus, setSelectedRoomStatus] = useState<RoomBoardRoom['status'] | 'ALL'>('ALL');
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);
  const [roomStatusEditor, setRoomStatusEditor] = useState<RoomBoardRoom | null>(null);
  const [pendingRoomStatus, setPendingRoomStatus] = useState<RoomBoardRoom['status'] | null>(null);
  const [roomStatusError, setRoomStatusError] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const bookingFrame = useRef<HTMLIFrameElement>(null);

  const loadDashboard = () => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setError(null);
          setData((current) => ({ ...current, ...json }));
          if (Array.isArray(json.rooms)) setRooms(json.rooms);
        }
        else setError(json.error || 'Failed to load dashboard');
      })
      .catch(() => setError('Failed to load dashboard'));
  };

  useEffect(() => {
    loadDashboard();
  }, []);
  useRoomUpdates(loadDashboard);

  useEffect(() => {
    const handleBookingCreated = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== bookingFrame.current?.contentWindow) return;

      if (event.data?.type === 'hne:booking-return') {
        setIsBookingModalOpen(false);
        loadDashboard();
        return;
      }
      if (event.data?.type !== 'hne:booking-created') return;

      loadDashboard();
    };

    window.addEventListener('message', handleBookingCreated);
    return () => window.removeEventListener('message', handleBookingCreated);
  }, []);

  const openRoomStatusEditor = (room: RoomBoardRoom) => {
    if (updatingRoomId !== null) return;
    setRoomStatusEditor(room);
    setPendingRoomStatus(room.status);
    setRoomStatusError('');
  };

  const updateRoomStatus = async () => {
    if (!roomStatusEditor || !pendingRoomStatus || updatingRoomId !== null) return;

    setUpdatingRoomId(roomStatusEditor.id);
    setRoomStatusError('');
    try {
      const response = await fetch('/api/pms/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomStatusEditor.id, status: pendingRoomStatus })
      });
      const json = await response.json();
      if (json.success) {
        setRooms((currentRooms) => currentRooms.map((currentRoom) => (
          currentRoom.id === roomStatusEditor.id ? { ...currentRoom, status: pendingRoomStatus } : currentRoom
        )));
        setRoomStatusEditor(null);
        setPendingRoomStatus(null);
      } else {
        setRoomStatusError(json.error || 'Unable to update this room. Please try again.');
      }
    } catch {
      setRoomStatusError('Unable to update this room. Please try again.');
    } finally {
      setUpdatingRoomId(null);
    }
  };

  const { occupancy, guests, revenue } = data;
  const visibleRooms = rooms.filter((room) => (
    (selectedRoomFloor === 'ALL' || room.floor === selectedRoomFloor) &&
    (selectedRoomStatus === 'ALL' || room.status === selectedRoomStatus)
  ));
  const dashboardFloors = Array.from(new Set(rooms.map((room) => room.floor))).sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && (
        <div role="status" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-red)', fontSize: 13 }}>
          {error}
        </div>
      )}
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Front Desk Overview</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Good afternoon. Here's what's happening today.

            {/* &middot; Business Date {data.businessDate} */}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsBookingModalOpen(true)}
          className="hne-btn hne-btn-primary hne-btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', flexShrink: 0 }}
        >
          <Plus size={14} />
          <span>New Booking</span>
        </button>
      </div>

      {/* Stat Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <StatTile
          label="Arrivals"
          value={guests.todayArrivals}
          icon={<LogIn size={15} />}
          colorTheme="green"
          caption={guests.overdueArrivals > 0 ? `${guests.overdueArrivals} overdue pending` : 'Scheduled today'}
          sparkline={[...statTileVisuals.arrivals]}
        />

        <StatTile
          label="Departures"
          value={guests.todayDepartures}
          icon={<LogOut size={15} />}
          colorTheme="golden"
          caption={guests.overdueDepartures > 0 ? `${guests.overdueDepartures} overdue checkout` : 'Scheduled today'}
          sparkline={[...statTileVisuals.departures]}
        />

        <StatTile
          label="In-house"
          value={guests.inHouseGuests}
          icon={<UsersRound size={15} />}
          colorTheme="green"
          sparkline={[...statTileVisuals.inHouse]}
        />

        <StatTile
          label="Occupancy"
          value={`${occupancy.occupancyPct}%`}
          icon={<ChartPie size={15} />}
          colorTheme="green"
          progress={{ pct: occupancy.occupancyPct, caption: `${occupancy.occupiedRooms} of ${occupancy.totalRooms} rooms` }}
        />

        <StatTile
          label="Revenue"
          value={`Rs. ${revenue.today.total.toLocaleString()}`}
          icon={<WalletCards size={15} />}
          colorTheme="green"
          caption={<><span>RevPAR</span><br /><span>Rs. {revenue.revPar.toLocaleString()}</span></>}
          sparkline={[...statTileVisuals.revenue]}
        />

      </div>

      <div className="hne-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Room Board</h2>
            <p style={{ marginTop: 2, fontSize: 12, color: 'var(--text-secondary)' }}>Booking, check-in, and checkout update Reserved, Occupied, and Dirty automatically. Use a room tile only for housekeeping or maintenance updates.</p>
          </div>
          <Link href="/admin/pms/rooms" style={{ color: 'var(--primary-orange)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Manage rooms →
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          {(['ALL', ...dashboardFloors] as const).map((floor) => {
            const isSelected = selectedRoomFloor === floor;
            return (
              <button
                key={floor}
                type="button"
                onClick={() => setSelectedRoomFloor(floor)}
                style={{
                  flex: '0 0 auto',
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: `2px solid ${isSelected ? 'var(--primary-orange)' : 'transparent'}`,
                  background: 'transparent',
                  color: isSelected ? 'var(--primary-orange)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {floor === 'ALL' ? 'All Floors' : floorLabel(floor)}
              </button>
            );
          })}
        </div>

        {rooms.length === 0 ? (
          <div style={{ padding: '18px 0', color: 'var(--text-muted)', fontSize: 13 }}>No room status data is available.</div>
        ) : visibleRooms.length === 0 ? (
          <div style={{ padding: '18px 0', color: 'var(--text-muted)', fontSize: 13 }}>No rooms match this filter.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...dashboardFloors].reverse()
              .filter((floor) => selectedRoomFloor === 'ALL' || floor === selectedRoomFloor)
              .filter((floor) => visibleRooms.some((room) => room.floor === floor))
              .map((floor) => (
              <div key={floor} style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                <div style={{ paddingTop: 8, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>{floorLabel(floor)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
                  {visibleRooms.filter((room) => room.floor === floor).map((room) => {
                    const style = roomStatusStyles[room.status];
                    const isUpdating = updatingRoomId === room.id;
                    const isLifecycleManaged = !room.active || ['RESERVED', 'OCCUPIED', 'DUE_OUT'].includes(room.status);
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => !isLifecycleManaged && openRoomStatusEditor(room)}
                        disabled={isUpdating || isLifecycleManaged}
                        title={!room.active ? `Room ${room.roomNumber} is inactive pending a tariff` : isLifecycleManaged ? `Room ${room.roomNumber} is updated by the booking lifecycle` : `Update room ${room.roomNumber} housekeeping or maintenance status`}
                        style={{
                          minHeight: 66,
                          padding: '9px 8px',
                          borderRadius: 7,
                          border: `1px solid ${style.border}`,
                          background: style.background,
                          color: style.text,
                          textAlign: 'left',
                          cursor: isUpdating || isLifecycleManaged ? 'not-allowed' : 'pointer',
                          opacity: isUpdating || isLifecycleManaged ? 0.75 : 1,
                          boxShadow: room.status === 'OCCUPIED' ? '0 1px 0 rgba(7, 91, 70, 0.2)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, fontSize: 14, fontWeight: 800 }}>
                          {room.roomNumber}
                          <RoomStatusIcon status={room.status} size={15} />
                        </div>
                        <div style={{ marginTop: 5, fontSize: 9, fontWeight: 700, color: style.muted, lineHeight: 1.15, textTransform: 'uppercase' }}>{isUpdating ? 'Updating' : room.active ? style.label : 'Inactive'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setSelectedRoomStatus('ALL')}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: `1px solid ${selectedRoomStatus === 'ALL' ? 'var(--primary-orange)' : 'var(--border)'}`,
              background: selectedRoomStatus === 'ALL' ? 'var(--primary-orange-light)' : 'transparent',
              color: selectedRoomStatus === 'ALL' ? 'var(--primary-orange)' : 'var(--text-secondary)',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            All statuses
          </button>
          {roomStatuses.map((status) => {
            const style = roomStatusStyles[status];
            const isSelected = selectedRoomStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedRoomStatus(status)}
                aria-pressed={isSelected}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 7px',
                  borderRadius: 4,
                  border: `1px solid ${isSelected ? style.text : style.border}`,
                  background: isSelected ? style.border : style.background,
                  color: isSelected && status !== 'OCCUPIED' ? '#FFFFFF' : style.text,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RoomStatusIcon status={status} size={12} />
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {roomStatusEditor && pendingRoomStatus && (
        <div
          role="presentation"
          onMouseDown={() => setRoomStatusEditor(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(2px)' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-status-title"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, padding: 20, border: '1px solid var(--border)', borderRadius: 16, backgroundColor: 'var(--bg-card)', boxShadow: '0 24px 48px -18px rgba(15, 23, 42, 0.32)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: roomStatusStyles[roomStatusEditor.status].background, color: roomStatusStyles[roomStatusEditor.status].text }}>
                  <RoomStatusIcon status={roomStatusEditor.status} size={19} />
                </div>
                <div>
                  <h3 id="room-status-title" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Room {roomStatusEditor.roomNumber}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Update housekeeping status</p>
                </div>
              </div>
              <button type="button" aria-label="Close room status editor" onClick={() => setRoomStatusEditor(null)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 7, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={17} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
              {manuallyManagedRoomStatuses.map((status) => {
                const statusStyle = roomStatusStyles[status];
                const isSelected = pendingRoomStatus === status;
                const isOccupied = status === 'OCCUPIED';
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPendingRoomStatus(status)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', border: `1px solid ${isSelected ? statusStyle.text : statusStyle.border}`, borderRadius: 8, backgroundColor: isSelected ? statusStyle.background : (isOccupied ? '#ECFDF5' : 'transparent'), color: isSelected ? statusStyle.text : (isOccupied ? '#075B46' : statusStyle.text), fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <RoomStatusIcon status={status} size={15} />
                    <span>{statusStyle.label}</span>
                  </button>
                );
              })}
            </div>

            {roomStatusError && <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--danger-red)' }}>{roomStatusError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={() => setRoomStatusEditor(null)} className="hne-btn hne-btn-secondary hne-btn-sm">Cancel</button>
              <button type="button" onClick={updateRoomStatus} disabled={updatingRoomId === roomStatusEditor.id} className="hne-btn hne-btn-primary hne-btn-sm">
                {updatingRoomId === roomStatusEditor.id ? 'Updating…' : 'Update status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBookingModalOpen && (
        <BookingModal title="New Room Booking" subtitle="Create a reservation without leaving the dashboard." onClose={() => setIsBookingModalOpen(false)}>
          <iframe
            ref={bookingFrame}
            title="New room booking"
            src="/book?embedded=true"
            style={{ width: '100%', flex: 1, border: 'none', backgroundColor: 'var(--bg-main)' }}
          />
        </BookingModal>
      )}
    </div>
  );
}
