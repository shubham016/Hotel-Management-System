import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { ROOM_STATUSES, readableStatus } from '../constants';
import type { BulkRoomUpdateForm, Floor, RoomType } from '../types';
import { Field } from './FormControls';

type Props = {
  form: BulkRoomUpdateForm;
  setForm: Dispatch<SetStateAction<BulkRoomUpdateForm>>;
  floors: Floor[];
  roomTypes: RoomType[];
  saving: boolean;
  roomCount: number;
  onSave: () => void;
  onCancel: () => void;
};

const booleanValue = (value: string): boolean | '' => value === '' ? '' : value === 'true';

export function BulkRoomEditForm({ form, setForm, floors, roomTypes, saving, roomCount, onSave, onCancel }: Props) {
  const hasChanges = Object.values(form).some((value) => value !== '');
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(); };

  return <form onSubmit={submit} className="hne-form-grid">
    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Only selected settings will change. Room numbers remain unchanged for all {roomCount} rooms.</p>
    <Field label="Move to floor"><select className="hne-input" value={form.floor} onChange={(event) => setForm({ ...form, floor: event.target.value === '' ? '' : Number(event.target.value) })}><option value="">No change</option>{floors.map((floor) => <option key={floor.id} value={floor.number}>{floor.name}</option>)}</select></Field>
    <Field label="Room category"><select className="hne-input" value={form.room_type_id} onChange={(event) => setForm({ ...form, room_type_id: event.target.value })}><option value="">No change</option>{roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name} ({roomType.code})</option>)}</select></Field>
    <Field label="Status"><select className="hne-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="">No change</option>{ROOM_STATUSES.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}</select></Field>
    <Field label="Active"><select className="hne-input" value={String(form.active)} onChange={(event) => setForm({ ...form, active: booleanValue(event.target.value) })}><option value="">No change</option><option value="true">Active</option><option value="false">Inactive</option></select></Field>
    <Field label="Smoking"><select className="hne-input" value={String(form.smoking)} onChange={(event) => setForm({ ...form, smoking: booleanValue(event.target.value) })}><option value="">No change</option><option value="true">Smoking</option><option value="false">Non-smoking</option></select></Field>
    <Field label="Accessibility"><select className="hne-input" value={String(form.accessible)} onChange={(event) => setForm({ ...form, accessible: booleanValue(event.target.value) })}><option value="">No change</option><option value="true">Accessible</option><option value="false">Not accessible</option></select></Field>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" className="hne-btn hne-btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="hne-btn hne-btn-primary" disabled={saving || !hasChanges}>{saving ? 'Saving…' : `Update ${roomCount} rooms`}</button></div>
  </form>;
}
