import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Card } from '@/components/ui/Card';
import { ROOM_STATUSES, readableStatus } from '../constants';
import type { Floor, FloorForm, RoomForm, RoomType, RoomTypeForm, SetupTab } from '../types';
import { ActiveField, Field, FormActions } from './FormControls';

type Props = {
  tab: SetupTab; editing: boolean; saving: boolean; floors: Floor[]; roomTypes: RoomType[];
  floorForm: FloorForm; roomTypeForm: RoomTypeForm; roomForm: RoomForm;
  setFloorForm: Dispatch<SetStateAction<FloorForm>>;
  setRoomTypeForm: Dispatch<SetStateAction<RoomTypeForm>>;
  setRoomForm: Dispatch<SetStateAction<RoomForm>>;
  onSave: (resource: string, key: string, data: unknown) => void;
  onClear: () => void;
};

export function SetupForm(props: Props) {
  const { tab, editing, saving, floors, roomTypes, floorForm, roomTypeForm, roomForm, setFloorForm, setRoomTypeForm, setRoomForm, onSave, onClear } = props;
  const title = tab === 'floors' ? 'Floor' : tab === 'room_types' ? 'Room Category' : 'Room';
  const submit = (event: FormEvent, resource: string, key: string, data: unknown) => { event.preventDefault(); onSave(resource, key, data); };

  return <Card title={`${editing ? 'Edit' : 'Add'} ${title}`}>
    {tab === 'floors' && <form onSubmit={(event) => submit(event, 'floors', 'floor', floorForm)} className="hne-form-grid">
      <Field label="Floor number"><input required min="1" type="number" className="hne-input" value={floorForm.number} onChange={(event) => setFloorForm({ ...floorForm, number: Number(event.target.value) })} /></Field>
      <Field label="Display name"><input required className="hne-input" placeholder="e.g. First Floor" value={floorForm.name} onChange={(event) => setFloorForm({ ...floorForm, name: event.target.value })} /></Field>
      <ActiveField value={floorForm.active} onChange={(active) => setFloorForm({ ...floorForm, active })} />
      <FormActions saving={saving} onClear={onClear} label={title} />
    </form>}

    {tab === 'room_types' && <form onSubmit={(event) => submit(event, 'room_types', 'room_type', roomTypeForm)} className="hne-form-grid">
      <Field label="Category name"><input required className="hne-input" value={roomTypeForm.name} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, name: event.target.value })} /></Field>
      <Field label="Code"><input required className="hne-input" placeholder="DLX-K" value={roomTypeForm.code} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, code: event.target.value })} /></Field>
      <Field label="Base nightly rate (NPR)"><input required min="0" type="number" className="hne-input" value={roomTypeForm.base_price} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, base_price: Number(event.target.value) })} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Field label="Adults"><input min="0" type="number" className="hne-input" value={roomTypeForm.max_adults} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, max_adults: Number(event.target.value) })} /></Field>
        <Field label="Children"><input min="0" type="number" className="hne-input" value={roomTypeForm.max_children} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, max_children: Number(event.target.value) })} /></Field>
        <Field label="Total"><input min="1" type="number" className="hne-input" value={roomTypeForm.max_occupancy} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, max_occupancy: Number(event.target.value) })} /></Field>
      </div>
      <Field label="Amenities (comma separated)"><input className="hne-input" value={roomTypeForm.amenities.join(', ')} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, amenities: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></Field>
      <Field label="Description"><textarea className="hne-textarea" rows={3} value={roomTypeForm.description} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, description: event.target.value })} /></Field>
      <ActiveField value={roomTypeForm.active} onChange={(active) => setRoomTypeForm({ ...roomTypeForm, active })} />
      <FormActions saving={saving} onClear={onClear} label={title} />
    </form>}

    {tab === 'rooms' && <form onSubmit={(event) => submit(event, 'rooms', 'room', roomForm)} className="hne-form-grid">
      {!floors.length || !roomTypes.length ? <p style={{ color: 'var(--danger-red)', fontSize: 13 }}>Create a floor and room category first.</p> : <>
        <Field label="Room number"><input required className="hne-input" placeholder="e.g. 101" value={roomForm.room_number} onChange={(event) => setRoomForm({ ...roomForm, room_number: event.target.value })} /></Field>
        <Field label="Floor"><select className="hne-input" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: Number(event.target.value) })}>{floors.map((floor) => <option key={floor.id} value={floor.number}>{floor.name}</option>)}</select></Field>
        <Field label="Room category"><select className="hne-input" value={roomForm.room_type_id} onChange={(event) => setRoomForm({ ...roomForm, room_type_id: event.target.value })}>{roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name} ({roomType.code})</option>)}</select></Field>
        <Field label="Status"><select className="hne-input" value={roomForm.status} onChange={(event) => setRoomForm({ ...roomForm, status: event.target.value })}>{ROOM_STATUSES.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}</select></Field>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={roomForm.smoking} onChange={(event) => setRoomForm({ ...roomForm, smoking: event.target.checked })} /> Smoking room</label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={roomForm.accessible} onChange={(event) => setRoomForm({ ...roomForm, accessible: event.target.checked })} /> Accessible room</label>
        <ActiveField value={roomForm.active} onChange={(active) => setRoomForm({ ...roomForm, active })} />
        <FormActions saving={saving} onClear={onClear} label={title} />
      </>}
    </form>}
  </Card>;
}
