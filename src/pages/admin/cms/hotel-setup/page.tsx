import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Building2, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { createRoomBatch, deleteRoomsOnFloor, deleteSetupRecord, loadHotelSetup, saveSetupRecord, updateRoomsOnFloor, uploadRoomImage } from './api';
import { BLANK_BULK_ROOM, BLANK_BULK_ROOM_UPDATE, BLANK_FLOOR, BLANK_ROOM, BLANK_ROOM_TYPE } from './constants';
import { BulkRoomEditForm } from './components/BulkRoomEditForm';
import { SetupForm } from './components/SetupForm';
import { SetupTable } from './components/SetupTable';
import type { BulkRoomForm, BulkRoomUpdateForm, Floor, FloorForm, Room, RoomForm, RoomType, RoomTypeForm, SetupTab } from './types';

function upsertById<T extends { id: string }>(items: T[], record: T) {
  return items.some((item) => item.id === record.id)
    ? items.map((item) => item.id === record.id ? record : item)
    : [...items, record];
}

const sortFloors = (items: Floor[]) => [...items].sort((left, right) => left.number - right.number);
const sortRoomTypes = (items: RoomType[]) => [...items].sort((left, right) => left.name.localeCompare(right.name));
const sortRooms = (items: Room[]) => [...items].sort((left, right) => left.floor - right.floor || left.roomNumber.localeCompare(right.roomNumber, undefined, { numeric: true }));

export default function HotelSetupPage() {
  const [tab, setTab] = useState<SetupTab>('floors');
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floorForm, setFloorForm] = useState<FloorForm>(BLANK_FLOOR);
  const [roomTypeForm, setRoomTypeForm] = useState<RoomTypeForm>(BLANK_ROOM_TYPE);
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [roomForm, setRoomForm] = useState<RoomForm>(BLANK_ROOM);
  const [bulkRoomForm, setBulkRoomForm] = useState<BulkRoomForm>(BLANK_BULK_ROOM);
  const [bulkRoomUpdateForm, setBulkRoomUpdateForm] = useState<BulkRoomUpdateForm>(BLANK_BULK_ROOM_UPDATE);
  const [bulkEditingFloor, setBulkEditingFloor] = useState<{ floor: number; name: string; count: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
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
    setRoomImageFile(null);
    setRoomForm({ ...BLANK_ROOM, floor: floors[0]?.number || 1, room_type_id: roomTypes[0]?.id || '' });
    setBulkRoomForm({ ...BLANK_BULK_ROOM, floor: floors[0]?.number || 1, room_type_id: roomTypes[0]?.id || '' });
    setBulkRoomUpdateForm(BLANK_BULK_ROOM_UPDATE);
    setBulkEditingFloor(null);
  };

  const switchTab = (nextTab: SetupTab) => {
    setTab(nextTab);
    clearForm();
    setFormOpen(false);
    setError('');
    setNotice('');
  };

  const closeForm = () => {
    clearForm();
    setFormOpen(false);
  };

  const openNewForm = () => {
    clearForm();
    setFormOpen(true);
  };

  const save = async (resource: string, key: string, data: unknown) => {
    setSaving(true);
    setError('');
    try {
      const payload = resource === 'room_types' && roomImageFile
        ? { ...(data as RoomTypeForm), image_url: await uploadRoomImage(roomImageFile, (data as RoomTypeForm).name) }
        : data;
      const saved = await saveSetupRecord<Floor | RoomType | Room>(resource, key, payload, editingId);
      if (resource === 'floors') setFloors((current) => sortFloors(upsertById(current, saved as Floor)));
      if (resource === 'room_types') {
        const roomType = saved as RoomType;
        setRoomTypes((current) => sortRoomTypes(upsertById(current, roomType)));
        setRooms((current) => current.map((room) => room.roomType.id === roomType.id
          ? { ...room, roomType: { id: roomType.id, name: roomType.name, code: roomType.code } }
          : room));
      }
      if (resource === 'rooms') setRooms((current) => sortRooms(upsertById(current, saved as Room)));
      setNotice(editingId ? 'Changes saved.' : 'New record created.');
      clearForm();
      setFormOpen(false);
      if (resource === 'rooms' || resource === 'room_types') await load();
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
      const createdRooms = await createRoomBatch(data);
      setRooms((current) => sortRooms([...current, ...createdRooms]));
      setNotice(`${createdRooms.length} room${createdRooms.length === 1 ? '' : 's'} created successfully.`);
      clearForm();
      setFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create rooms.');
    } finally {
      setSaving(false);
    }
  };

  const openBulkRoomEdit = (floor: number, name: string, count: number) => {
    clearForm();
    setBulkEditingFloor({ floor, name, count });
    setFormOpen(true);
  };

  const saveRoomFloorBatch = async () => {
    if (!bulkEditingFloor) return;
    if (!window.confirm(`Apply these changes to all ${bulkEditingFloor.count} rooms on ${bulkEditingFloor.name}?`)) return;
    setSaving(true);
    setError('');
    try {
      const updatedRooms = await updateRoomsOnFloor(bulkEditingFloor.floor, bulkRoomUpdateForm);
      const updatedById = new Map(updatedRooms.map((room) => [room.id, room]));
      setRooms((current) => sortRooms(current.map((room) => updatedById.get(room.id) || room)));
      setNotice(`${updatedRooms.length} rooms updated successfully.`);
      clearForm();
      setFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update rooms on this floor.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (resource: string, id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteSetupRecord(resource, id);
      if (resource === 'floors') setFloors((current) => current.filter((item) => item.id !== id));
      if (resource === 'room_types') setRoomTypes((current) => current.filter((item) => item.id !== id));
      if (resource === 'rooms') setRooms((current) => current.filter((item) => item.id !== id));
      setNotice('Record deleted.');
      clearForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this record.');
    }
  };

  const removeFloorRooms = async (floor: number, name: string, count: number) => {
    if (!window.confirm(`Delete all ${count} room${count === 1 ? '' : 's'} on ${name}? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteRoomsOnFloor(floor);
      setRooms((current) => current.filter((room) => room.floor !== floor));
      setNotice(`All rooms on ${name} were deleted.`);
      clearForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete rooms on this floor.');
    }
  };

  const editFloor = (floor: Floor) => {
    setEditingId(floor.id);
    setFloorForm({ number: floor.number, name: floor.name, active: floor.active });
    setFormOpen(true);
  };

  const editRoomType = (roomType: RoomType) => {
    setEditingId(roomType.id);
    setRoomTypeForm({ ...roomType, description: roomType.description || '', image_url: roomType.image_url || '', amenities: roomType.amenities || [] });
    setRoomImageFile(null);
    setFormOpen(true);
  };

  const editRoom = (room: Room) => {
    setEditingId(room.id);
    setRoomForm({ bed_category: room.bedCategory || '', bed_count: room.bedCount ?? '', bed_length_inches: room.bedLengthInches ?? '', bed_width_inches: room.bedWidthInches ?? '', room_number: room.roomNumber, floor: room.floor, room_type_id: room.roomType.id, status: room.status, active: room.active, smoking: room.smoking, accessible: room.accessible });
    setFormOpen(true);
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <header><h1 style={{ fontSize: 24, fontWeight: 800 }}>Hotel Setup</h1></header>
    <nav aria-label="Hotel setup sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => switchTab('floors')} className={`hne-btn ${tab === 'floors' ? 'hne-btn-primary' : 'hne-btn-secondary'}`}><Building2 size={16} />Floors</button><button onClick={() => switchTab('room_types')} className={`hne-btn ${tab === 'room_types' ? 'hne-btn-primary' : 'hne-btn-secondary'}`}><ClipboardList size={16} />Room Categories</button><button onClick={() => switchTab('rooms')} className={`hne-btn ${tab === 'rooms' ? 'hne-btn-primary' : 'hne-btn-secondary'}`}><BedDouble size={16} />Rooms</button></nav>
    {error && <div role="alert" style={{ padding: 12, borderRadius: 8, background: '#FEF2F2', color: '#991B1B' }}>{error}</div>}
    {notice && <div role="status" style={{ padding: 12, borderRadius: 8, background: '#ECFDF5', color: '#065F46', display: 'flex', gap: 8 }}><CheckCircle2 size={16} />{notice}</div>}
    {loading ? <div style={{ minHeight: 280, display: 'grid', placeItems: 'center' }}><Loader2 className="hne-spin" /></div> : <SetupTable tab={tab} floors={floors} roomTypes={roomTypes} rooms={rooms} onEditFloor={editFloor} onEditRoomType={editRoomType} onEditRoom={editRoom} onAdd={openNewForm} onRemove={remove} onRemoveFloorRooms={(floor, name, count) => void removeFloorRooms(floor, name, count)} onEditFloorRooms={openBulkRoomEdit} />}
    {formOpen && <div className="hne-modal-backdrop" onClick={() => !saving && closeForm()}>
      <div className="hne-modal hne-setup-modal" role="dialog" aria-modal="true" aria-labelledby="hotel-setup-form-title" onClick={(event) => event.stopPropagation()}>
        <div className="hne-modal-header"><div><h2 id="hotel-setup-form-title" className="hne-modal-title">{bulkEditingFloor ? `Edit All Rooms on ${bulkEditingFloor.name}` : `${editingId ? 'Edit' : 'Add'} ${tab === 'floors' ? 'Floor' : tab === 'room_types' ? 'Room Category' : 'Rooms'}`}</h2></div><button type="button" className="hne-modal-close" aria-label="Close form" onClick={closeForm} disabled={saving}>×</button></div>
        <div className="hne-modal-body">{bulkEditingFloor ? <BulkRoomEditForm form={bulkRoomUpdateForm} setForm={setBulkRoomUpdateForm} floors={floors} roomTypes={roomTypes} saving={saving} roomCount={bulkEditingFloor.count} onSave={() => void saveRoomFloorBatch()} onCancel={closeForm} /> : <SetupForm tab={tab} editing={editingId !== null} saving={saving} floors={floors} roomTypes={roomTypes} floorForm={floorForm} roomTypeForm={roomTypeForm} roomForm={roomForm} bulkRoomForm={bulkRoomForm} roomImageFile={roomImageFile} setRoomImageFile={setRoomImageFile} setFloorForm={setFloorForm} setRoomTypeForm={setRoomTypeForm} setRoomForm={setRoomForm} setBulkRoomForm={setBulkRoomForm} onSave={(resource, key, data) => void save(resource, key, data)} onBulkSave={(data) => void saveRoomBatch(data)} onClear={clearForm} />}</div>
      </div>
    </div>}
  </div>;
}
