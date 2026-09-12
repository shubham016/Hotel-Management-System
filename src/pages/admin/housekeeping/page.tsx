import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, User, Wrench, Package, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchHousekeeping = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/housekeeping/tasks');
      const json = await res.json();
      if (json.success) {
        setRooms(json.rooms || []);
        setDirtyCount(json.dirtyCount || 0);
      }
    } catch (err) {
      console.error('Failed to load housekeeping tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeeping();
  }, []);

  const handleMarkClean = async (room: any) => {
    try {
      setIsUpdating(room.id);
      const res = await fetch('/api/housekeeping/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          action: 'MARK_CLEAN'
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchHousekeeping();
      } else {
        alert(json.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VACANT_CLEAN': return <Badge variant="success">VACANT CLEAN</Badge>;
      case 'OCCUPIED': return <Badge variant="danger">OCCUPIED</Badge>;
      case 'VACANT_DIRTY': return <Badge variant="warning">VACANT DIRTY</Badge>;
      case 'INSPECTION_REQUIRED': return <Badge variant="primary">INSPECTION REQ</Badge>;
      case 'OUT_OF_ORDER': return <Badge variant="outline">OUT OF ORDER</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Housekeeping & Room Turnaround</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Real-time room cleanliness tracking, task assignments, inspection verification, and 43-room turnaround
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchHousekeeping} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Queue
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid #16A34A', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Vacant Clean & Ready</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>
            {rooms.filter(r => r.status === 'VACANT_CLEAN').length} Rooms
          </div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid #D97706', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Needs Cleaning / Turnaround</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {dirtyCount} Rooms
          </div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid #DC2626', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Occupied In-House</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
            {rooms.filter(r => r.status === 'OCCUPIED').length} Rooms
          </div>
        </div>
      </div>

      {/* Housekeeping List */}
      <Card title="43 Room Housekeeping Status Queue" subtitle="Manage cleaning shifts, inspect rooms, and mark ready for arrivals">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading housekeeping queue from PostgreSQL...
          </div>
        ) : (
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>Room #</th>
                  <th>Floor</th>
                  <th>Room Type</th>
                  <th>Cleanliness Status</th>
                  <th>Staff Assignment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--brand-crimson)' }}>
                        #{room.roomNumber}
                      </span>
                    </td>
                    <td>Floor {room.floor}</td>
                    <td style={{ fontWeight: 600 }}>{room.roomType}</td>
                    <td>{getStatusBadge(room.status)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {room.status === 'VACANT_DIRTY' ? 'Assigned: Sita Thapa' : 'Housekeeping Team'}
                    </td>
                    <td>
                      {room.status !== 'VACANT_CLEAN' ? (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleMarkClean(room)}
                          disabled={isUpdating === room.id}
                        >
                          <CheckCircle2 size={14} /> Mark Clean
                        </Button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--brand-green)', fontWeight: 700 }}>
                          ✓ Ready for Guest
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
