'use client';

import React, { useState, useEffect } from 'react';
import { BedDouble, CheckCircle2, AlertTriangle, Sparkles, Filter, RefreshCw, User, Phone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function RoomsManagementPage() {
  const [selectedFloor, setSelectedFloor] = useState<number | 'ALL'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [rooms, setRooms] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalRooms: 43,
    vacantClean: 0,
    occupied: 0,
    vacantDirty: 0,
    inspectionNeeded: 0,
    outOfOrder: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/pms/rooms');
      const json = await res.json();
      if (json.success) {
        setRooms(json.data);
        if (json.summary) setSummary(json.summary);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const updateRoomStatus = async (roomNumber: string, newStatus: string) => {
    try {
      setIsUpdating(roomNumber);
      const res = await fetch('/api/pms/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNumber, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        setRooms(prev => prev.map(r => r.roomNumber === roomNumber ? { ...r, status: newStatus } : r));
        // Refresh summary
        fetchRooms();
      } else {
        alert(json.error || 'Failed to update room status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredRooms = rooms.filter(r => {
    const floorMatch = selectedFloor === 'ALL' || r.floor === selectedFloor;
    const statusMatch = selectedStatusFilter === 'ALL' || r.status === selectedStatusFilter;
    return floorMatch && statusMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OCCUPIED': return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'Occupied' };
      case 'VACANT_CLEAN': return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', label: 'Vacant Clean' };
      case 'VACANT_DIRTY': return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: 'Vacant Dirty' };
      case 'INSPECTION_REQUIRED': return { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'Inspect' };
      case 'OUT_OF_ORDER': return { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280', label: 'Out of Order' };
      default: return { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151', label: status };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>43 Room Live Status Matrix</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Real-time PostgreSQL room occupancy, live housekeeping status updates, and floor-wise matrix
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={fetchRooms} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Grid
          </Button>

          {/* Floor Filter */}
          {['ALL', 1, 2, 3, 4].map((fl) => (
            <button
              key={fl.toString()}
              onClick={() => setSelectedFloor(fl as any)}
              className={`hne-btn ${selectedFloor === fl ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
            >
              {fl === 'ALL' ? 'All (43)' : `Floor ${fl}`}
            </button>
          ))}
        </div>
      </div>

      {/* Status Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'VACANT_CLEAN' ? 'ALL' : 'VACANT_CLEAN')}
          className="hne-card"
          style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #16A34A', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>
            {summary.vacantClean}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Vacant Clean</div>
        </div>

        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'OCCUPIED' ? 'ALL' : 'OCCUPIED')}
          className="hne-card"
          style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #DC2626', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#DC2626' }}>
            {summary.occupied}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Occupied</div>
        </div>

        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'VACANT_DIRTY' ? 'ALL' : 'VACANT_DIRTY')}
          className="hne-card"
          style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #D97706', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>
            {summary.vacantDirty}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Vacant Dirty</div>
        </div>

        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'INSPECTION_REQUIRED' ? 'ALL' : 'INSPECTION_REQUIRED')}
          className="hne-card"
          style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #2563EB', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>
            {summary.inspectionNeeded}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Inspection Needed</div>
        </div>

        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'OUT_OF_ORDER' ? 'ALL' : 'OUT_OF_ORDER')}
          className="hne-card"
          style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #6B7280', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#6B7280' }}>
            {summary.outOfOrder}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Out of Order</div>
        </div>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading live 43-room matrix from PostgreSQL...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {filteredRooms.map((room) => {
            const sc = getStatusColor(room.status);
            const updatingThis = isUpdating === room.roomNumber;

            return (
              <div
                key={room.id}
                className="hne-card"
                style={{
                  backgroundColor: sc.bg,
                  borderColor: sc.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: 16,
                  opacity: updatingThis ? 0.6 : 1,
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                        #{room.roomNumber}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginLeft: 8 }}>
                        Floor {room.floor}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#FFFFFF',
                        color: sc.text,
                        border: `1px solid ${sc.border}`
                      }}
                    >
                      {sc.label}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {room.roomType}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    Rs. {room.basePrice.toLocaleString()} / night • {room.viewType}
                  </div>

                  {room.activeGuest && (
                    <div style={{ marginTop: 10, padding: 8, backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 11.5 }}>
                      <div style={{ fontWeight: 700, color: 'var(--brand-crimson)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={13} /> {room.activeGuest.name}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                        Ref: {room.activeGuest.confirmationNumber}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Action Switcher */}
                <div style={{ borderTop: `1px solid ${sc.border}`, paddingTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => updateRoomStatus(room.roomNumber, 'VACANT_CLEAN')}
                    disabled={updatingThis}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #16A34A',
                      backgroundColor: '#FFFFFF',
                      color: '#16A34A',
                      cursor: 'pointer'
                    }}
                  >
                    Clean
                  </button>
                  <button
                    onClick={() => updateRoomStatus(room.roomNumber, 'VACANT_DIRTY')}
                    disabled={updatingThis}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #D97706',
                      backgroundColor: '#FFFFFF',
                      color: '#D97706',
                      cursor: 'pointer'
                    }}
                  >
                    Dirty
                  </button>
                  <button
                    onClick={() => updateRoomStatus(room.roomNumber, 'INSPECTION_REQUIRED')}
                    disabled={updatingThis}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #2563EB',
                      backgroundColor: '#FFFFFF',
                      color: '#2563EB',
                      cursor: 'pointer'
                    }}
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => updateRoomStatus(room.roomNumber, 'OUT_OF_ORDER')}
                    disabled={updatingThis}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #6B7280',
                      backgroundColor: '#FFFFFF',
                      color: '#6B7280',
                      cursor: 'pointer'
                    }}
                  >
                    OOO
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
