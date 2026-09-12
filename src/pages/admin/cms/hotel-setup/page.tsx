import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Building2, CheckCircle2, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createRoomBatch, deleteRoomsOnFloor, deleteSetupRecord, loadHotelSetup, saveSetupRecord } from './api';
import { BLANK_BULK_ROOM, BLANK_FLOOR, BLANK_ROOM, BLANK_ROOM_TYPE } from './constants';
import { SetupForm } from './components/SetupForm';
import { SetupTable } from './components/SetupTable';
import type { BulkRoomForm, Floor, FloorForm, Room, RoomForm, RoomType, RoomTypeForm, SetupTab } from './types';

export default function HotelSetupPage() {
  const [tab, setTab] = useState<SetupTab>('floors');
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floorForm, setFloorForm] = useState<FloorForm>(BLANK_FLOOR);
  const [roomTypeForm, setRoomTypeForm] = useState<RoomTypeForm>(BLANK_ROOM_TYPE);
  const [roomForm, setRoomForm] = useState<RoomForm>(BLANK_ROOM);
  const [bulkRoomForm, setBulkRoomForm] = useState<BulkRoomForm>(BLANK_BULK_ROOM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadHotelSetup();
      setFloors(data.floors);
      setRoomTypes(data.roomTypes);
      setRooms(data.rooms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load setup data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (editingId || !floors.length || !roomTypes.length) return;
    const floor = floors[0].number;
    const roomTypeId = roomTypes[0].id;
    setRoomForm((current) => ({ ...current, floor: floors.some((item) => item.number === current.floor) ? current.floor : floor, room_type_id: roomTypes.some((item) => item.id === current.room_type_id) ? current.room_type_id : roomTypeId }));
    setBulkRoomForm((current) => ({ ...current, floor: floors.some((item) => item.number === current.floor) ? current.floor : floor, room_type_id: roomTypes.some((item) => item.id === current.room_type_id) ? current.room_type_id : roomTypeId }));
  }, [editingId, floors, roomTypes]);

  const clearForm = () => {
    setEditingId(null);
    setFloorForm(BLANK_FLOOR);
    setRoomTypeForm(BLANK_ROOM_TYPE);
    setRoomForm({ ...BLANK_ROOM, floor: floors[0]?.number || 1, room_type_id: roomTypes[0]?.id || '' });
    setBulkRoomForm({ ...BLANK_BULK_ROOM, floor: floors[0]?.number || 1, room_type_id: roomTypes[0]?.id || '' });
  };

  const switchTab = (nextTab: SetupTab) => {
    setTab(nextTab);
    clearForm();
    setError('');
    setNotice('');
  };

  const save = async (resource: string, key: string, data: unknown) => {
    setSaving(true);
    setError('');
    try {
      await saveSetupRecord(resource, key, data, editingId);
      setNotice(editingId ? 'Changes saved.' : 'New record created.');
      clearForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this record.');
    } finally {
      setSaving(false);
    }
  };

  const saveRoomBatch = async (data: BulkRoomForm) => {
    setSaving(true);
    setError('');
    try {
      const result = await createRoomBatch(data) as { length?: number };
      setNotice(`${result.length || data.quantity} room${data.quantity === 1 ? '' : 's'} created successfully.`);
      clearForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create rooms.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (resource: string, id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteSetupRecord(resource, id);
      setNotice('Record deleted.');
      clearForm();
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this record.');
    }
  };

  const removeFloorRooms = async (floor: number, name: string, count: number) => {
    if (!window.confirm(`Delete all ${count} room${count === 1 ? '' : 's'} on ${name}? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteRoomsOnFloor(floor);
      setNotice(`All rooms on ${name} were deleted.`);
      clearForm();
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete rooms on this floor.');
    }
  };

  const editFloor = (floor: Floor) => {
    setEditingId(floor.id);
    setFloorForm({ number: floor.number, name: floor.name, active: floor.active });
  };

  const editRoomType = (roomType: RoomType) => {
    setEditingId(roomType.id);
    setRoomTypeForm({ ...roomType, description: roomType.description || '', amenities: roomType.amenities || [] });
  };

  const editRoom = (room: Room) => {
    setEditingId(room.id);
    setRoomForm({ room_number: room.roomNumber, floor: room.floor, room_type_id: room.roomType.id, status: room.status, active: room.active, smoking: room.smoking, accessible: room.accessible });
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}><div><h1 style={{ fontSize: 24, fontWeight: 800 }}>Hotel Setup</h1><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Master data used by reservations, rooms, housekeeping, and the dashboard.</p></div><Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'hne-spin' : ''} />Refresh</Button></header>
    <nav aria-label="Hotel setup sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => switchTab('floors')} className={`hne-btn ${tab === 'floors' ? 'hne-btn-primary' : 'hne-btn-secondary'}`}><Building2 size={16} />Floors</button><button onClick={() => switchTab('room_types')} className={`hne-btn ${tab === 'room_types' ? 'hne-btn-primary' : 'hne-btn-secondary'}`}><ClipboardList size={16} />Room Categories</button><button onClick={() => switchTab('rooms')} className={`hne-btn ${tab === 'rooms' ? 'hne-btn-primary' : 'hne-btn-secondary'}`}><BedDouble size={16} />Rooms</button></nav>
    {error && <div role="alert" style={{ padding: 12, borderRadius: 8, background: '#FEF2F2', color: '#991B1B' }}>{error}</div>}
    {notice && <div role="status" style={{ padding: 12, borderRadius: 8, background: '#ECFDF5', color: '#065F46', display: 'flex', gap: 8 }}><CheckCircle2 size={16} />{notice}</div>}
    {loading ? <div style={{ minHeight: 280, display: 'grid', placeItems: 'center' }}><Loader2 className="hne-spin" /></div> : <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 390px)', gap: 24, alignItems: 'start' }}>
      <SetupTable tab={tab} floors={floors} roomTypes={roomTypes} rooms={rooms} onEditFloor={editFloor} onEditRoomType={editRoomType} onEditRoom={editRoom} onRemove={remove} onRemoveFloorRooms={(floor, name, count) => void removeFloorRooms(floor, name, count)} />
      <SetupForm tab={tab} editing={editingId !== null} saving={saving} floors={floors} roomTypes={roomTypes} floorForm={floorForm} roomTypeForm={roomTypeForm} roomForm={roomForm} bulkRoomForm={bulkRoomForm} setFloorForm={setFloorForm} setRoomTypeForm={setRoomTypeForm} setRoomForm={setRoomForm} setBulkRoomForm={setBulkRoomForm} onSave={(resource, key, data) => void save(resource, key, data)} onBulkSave={(data) => void saveRoomBatch(data)} onClear={clearForm} />
    </div>}
  </div>;
}
