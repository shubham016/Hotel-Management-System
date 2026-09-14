import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { ROOM_STATUSES, readableStatus } from '../constants';
import type { BulkRoomForm, Floor, FloorForm, RoomForm, RoomType, RoomTypeForm, SetupTab } from '../types';
import { ActiveField, Field, FormActions } from './FormControls';

type Props = {
  tab: SetupTab; editing: boolean; saving: boolean; floors: Floor[]; roomTypes: RoomType[];
  floorForm: FloorForm; roomTypeForm: RoomTypeForm; roomForm: RoomForm; bulkRoomForm: BulkRoomForm;
  setFloorForm: Dispatch<SetStateAction<FloorForm>>;
  setRoomTypeForm: Dispatch<SetStateAction<RoomTypeForm>>;
  setRoomForm: Dispatch<SetStateAction<RoomForm>>;
  setBulkRoomForm: Dispatch<SetStateAction<BulkRoomForm>>;
  onSave: (resource: string, key: string, data: unknown) => void;
  onBulkSave: (data: BulkRoomForm) => void;
  onClear: () => void;
};

export function SetupForm(props: Props) {
  const { tab, editing, saving, floors, roomTypes, floorForm, roomTypeForm, roomForm, bulkRoomForm, setFloorForm, setRoomTypeForm, setRoomForm, setBulkRoomForm, onSave, onBulkSave, onClear } = props;
  const title = tab === 'floors' ? 'Floor' : tab === 'room_types' ? 'Room Category' : 'Room';
  const submit = (event: FormEvent, resource: string, key: string, data: unknown) => { event.preventDefault(); onSave(resource, key, data); };

  return <>
    {tab === 'floors' && <form onSubmit={(event) => submit(event, 'floors', 'floor', floorForm)} className="hne-form-grid">
      <Field label="Floor number"><input required min="1" type="number" className="hne-input" value={floorForm.number} onChange={(event) => setFloorForm({ ...floorForm, number: Number(event.target.value) })} /></Field>
      <Field label="Display name"><input required className="hne-input" placeholder="e.g. First Floor" value={floorForm.name} onChange={(event) => setFloorForm({ ...floorForm, name: event.target.value })} /></Field>
      <ActiveField value={floorForm.active} onChange={(active) => setFloorForm({ ...floorForm, active })} />
      <FormActions saving={saving} onClear={onClear} label={title} />
    </form>}

    {tab === 'room_types' && <form onSubmit={(event) => submit(event, 'room_types', 'room_type', { ...roomTypeForm, base_price: Number(roomTypeForm.base_price), bed_count: Number(roomTypeForm.bed_count), max_adults: Number(roomTypeForm.max_adults), max_children: Number(roomTypeForm.max_children), max_occupancy: Number(roomTypeForm.max_occupancy), amenities: roomTypeForm.amenities.filter(Boolean) })} className="hne-form-grid">
      <Field label="Category name"><input required className="hne-input" value={roomTypeForm.name} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, name: event.target.value })} /></Field>
      <Field label="Code"><input required className="hne-input" placeholder="DLX-K" value={roomTypeForm.code} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, code: event.target.value })} /></Field>
      <Field label="Base nightly rate (NPR)"><input required min="0" type="number" className="hne-input" value={roomTypeForm.base_price} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, base_price: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
      <Field label="Number of beds"><input required min="1" step="1" type="number" className="hne-input" value={roomTypeForm.bed_count} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, bed_count: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
      <div className="hne-capacity-grid">
        <Field label="Adults"><input required min="0" type="number" className="hne-input" value={roomTypeForm.max_adults} onChange={(event) => { const max_adults = event.target.value === '' ? '' : Number(event.target.value); setRoomTypeForm({ ...roomTypeForm, max_adults, max_occupancy: max_adults === '' || roomTypeForm.max_children === '' ? '' : max_adults + roomTypeForm.max_children }); }} /></Field>
        <Field label="Children"><input required min="0" type="number" className="hne-input" value={roomTypeForm.max_children} onChange={(event) => { const max_children = event.target.value === '' ? '' : Number(event.target.value); setRoomTypeForm({ ...roomTypeForm, max_children, max_occupancy: roomTypeForm.max_adults === '' || max_children === '' ? '' : roomTypeForm.max_adults + max_children }); }} /></Field>
        <Field label="Total capacity"><input readOnly type="number" className="hne-input" value={roomTypeForm.max_occupancy} aria-label="Total capacity, calculated from adults and children" /></Field>
      </div>
      <Field label="Amenities (comma separated)"><input className="hne-input" value={roomTypeForm.amenities.join(', ')} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, amenities: event.target.value.split(',').map((value) => value.trim()) })} /></Field>
      <Field label="Description"><textarea className="hne-textarea" rows={3} value={roomTypeForm.description} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, description: event.target.value })} /></Field>
      <ActiveField value={roomTypeForm.active} onChange={(active) => setRoomTypeForm({ ...roomTypeForm, active })} />
      <FormActions saving={saving} onClear={onClear} label={title} />
    </form>}

    {tab === 'rooms' && (!floors.length || !roomTypes.length ? <p style={{ color: 'var(--danger-red)', fontSize: 13 }}>Create a floor and room category first.</p> : editing ? <form onSubmit={(event) => submit(event, 'rooms', 'room', roomForm)} className="hne-form-grid">
      <Field label="Room number"><input required className="hne-input" value={roomForm.room_number} onChange={(event) => setRoomForm({ ...roomForm, room_number: event.target.value })} /></Field>
      <Field label="Floor"><select className="hne-input" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: Number(event.target.value) })}>{floors.map((floor) => <option key={floor.id} value={floor.number}>{floor.name}</option>)}</select></Field>
      <Field label="Room category"><select className="hne-input" value={roomForm.room_type_id} onChange={(event) => setRoomForm({ ...roomForm, room_type_id: event.target.value })}>{roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name} ({roomType.code})</option>)}</select></Field>
      <Field label="Status"><select className="hne-input" value={roomForm.status} onChange={(event) => setRoomForm({ ...roomForm, status: event.target.value })}>{ROOM_STATUSES.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}</select></Field>
      <div className="hne-option-grid"><label className="hne-check-option"><input type="checkbox" checked={roomForm.smoking} onChange={(event) => setRoomForm({ ...roomForm, smoking: event.target.checked })} /> Smoking room</label><label className="hne-check-option"><input type="checkbox" checked={roomForm.accessible} onChange={(event) => setRoomForm({ ...roomForm, accessible: event.target.checked })} /> Accessible room</label></div>
      <ActiveField value={roomForm.active} onChange={(active) => setRoomForm({ ...roomForm, active })} />
      <FormActions saving={saving} onClear={onClear} label={title} />
    </form> : <form onSubmit={(event) => { event.preventDefault(); onBulkSave(bulkRoomForm); }} className="hne-form-grid">
      {/* <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Create one room or a consecutive range at once.</p> */}
      <Field label="First room number"><input required min="1" type="number" className="hne-input" placeholder="e.g. 101" value={bulkRoomForm.start_room_number} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, start_room_number: event.target.value })} /></Field>
      <Field label="How many rooms?"><input required min="1" max="100" type="number" className="hne-input" value={bulkRoomForm.quantity} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, quantity: Number(event.target.value) })} /></Field>
      {bulkRoomForm.start_room_number && bulkRoomForm.quantity > 0 && <p style={{ margin: 0, padding: 10, borderRadius: 6, background: 'var(--bg-subtle)', fontSize: 12 }}>Will create rooms <strong>{bulkRoomForm.start_room_number}</strong> to <strong>{Number(bulkRoomForm.start_room_number) + bulkRoomForm.quantity - 1}</strong>.</p>}
      <Field label="Floor"><select className="hne-input" value={bulkRoomForm.floor} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, floor: Number(event.target.value) })}>{floors.map((floor) => <option key={floor.id} value={floor.number}>{floor.name}</option>)}</select></Field>
      <Field label="Room category"><select className="hne-input" value={bulkRoomForm.room_type_id} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, room_type_id: event.target.value })}>{roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name} ({roomType.code})</option>)}</select></Field>
      <div className="hne-option-grid"><label className="hne-check-option"><input type="checkbox" checked={bulkRoomForm.smoking} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, smoking: event.target.checked })} /> Smoking rooms</label><label className="hne-check-option"><input type="checkbox" checked={bulkRoomForm.accessible} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, accessible: event.target.checked })} /> Accessible rooms</label></div>
      <ActiveField value={bulkRoomForm.active} onChange={(active) => setBulkRoomForm({ ...bulkRoomForm, active })} />
      <FormActions saving={saving} onClear={onClear} label={`room${bulkRoomForm.quantity === 1 ? '' : 's'}`} />
    </form>)}
  </>;
}
