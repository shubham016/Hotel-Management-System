import React, { useState } from 'react';
import { Pencil, Power } from 'lucide-react';
import { FormDialog } from '@/components/admin/FormDialog';

export type ClientRecord = {
  id: string;
  name: string;
  active: boolean;
  position?: number;
  department?: string;
  price?: number;
  code?: string;
  unit_price?: number;
  pricing_unit?: string;
  taxable?: boolean;
};

type Kind = 'staff' | 'laundry' | 'extras';
type Field = { key: keyof ClientRecord; label: string; type?: 'number' | 'select'; options?: { value: string; label: string }[] };

const configurations: Record<Kind, { title: string; resource: string; param: string; fields: Field[] }> = {
  staff: {
    title: 'Staff Directory', resource: 'staff_members', param: 'staff_member',
    fields: [{ key: 'name', label: 'Name' }, { key: 'department', label: 'Department' }, { key: 'position', label: 'Order', type: 'number' }]
  },
  laundry: {
    title: 'Laundry Tariffs', resource: 'laundry_items', param: 'laundry_item',
    fields: [{ key: 'name', label: 'Item' }, { key: 'price', label: 'Price before VAT (Rs.)', type: 'number' }, { key: 'position', label: 'Order', type: 'number' }]
  },
  extras: {
    title: 'Extra Services', resource: 'service_offerings', param: 'service_offering',
    fields: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' },
      { key: 'unit_price', label: 'Price before VAT (Rs.)', type: 'number' },
      { key: 'pricing_unit', label: 'Charged', type: 'select', options: [
        { value: 'PER_BOOKING', label: 'Per booking' }, { value: 'PER_NIGHT', label: 'Per night' },
        { value: 'PER_GUEST', label: 'Per guest' }, { value: 'PER_GUEST_PER_NIGHT', label: 'Per guest per night' }
      ] },
      { key: 'taxable', label: '13% VAT', type: 'select', options: [{ value: 'true', label: 'Applies' }, { value: 'false', label: 'Does not apply' }] }
    ]
  }
};

function blank(kind: Kind, count: number): ClientRecord {
  return {
    id: '', name: '', active: true, position: count + 1,
    department: '', price: 0, code: '', unit_price: 0,
    pricing_unit: kind === 'extras' ? 'PER_BOOKING' : undefined, taxable: true
  };
}

export function ClientDataEditor({ kind, records, onSaved }: { kind: Kind; records: ClientRecord[]; onSaved: () => Promise<void> }) {
  const config = configurations[kind];
  const recordName = kind === 'staff' ? 'staff member' : kind === 'laundry' ? 'laundry item' : 'service';
  const [draft, setDraft] = useState<ClientRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function request(path: string, method: string, body?: object) {
    const response = await fetch(`/api/${path}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      const details = result.details ? Object.entries(result.details).map(([key, value]) => `${key}: ${(value as string[]).join(', ')}`).join('; ') : '';
      throw new Error(details || result.error || 'Unable to save changes.');
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true); setError('');
    try {
      const values = Object.fromEntries(config.fields.map((field) => [field.key, draft[field.key]]));
      const path = `${config.resource}${draft.id ? `/${draft.id}` : ''}`;
      await request(path, draft.id ? 'PATCH' : 'POST', { [config.param]: { ...values, active: draft.active } });
      await onSaved();
      setDraft(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save changes.');
    } finally { setSaving(false); }
  }

  async function deactivate(record: ClientRecord) {
    if (!window.confirm(`Deactivate ${record.name}?`)) return;
    setSaving(true); setError('');
    try { await request(`${config.resource}/${record.id}`, 'DELETE'); await onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to deactivate.'); }
    finally { setSaving(false); }
  }

  const editor = draft && <form onSubmit={save} className="hne-form-grid" style={{ marginBottom: 0 }}>
    {error && <p role="alert" style={{ color: 'var(--danger-red)', gridColumn: '1 / -1' }}>{error}</p>}
    {config.fields.map((field) => <label key={field.key} className="hne-form-group">
      <span className="hne-label">{field.label}</span>
      {field.type === 'select' ? <select disabled={saving} className="hne-select" value={String(draft[field.key] ?? '')} onChange={(event) => setDraft({ ...draft, [field.key]: field.key === 'taxable' ? event.target.value === 'true' : event.target.value })}>
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select> : <input disabled={saving} autoFocus={field.key === config.fields[0].key} required className="hne-input" type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} step={field.key === 'price' || field.key === 'unit_price' ? '0.01' : '1'} value={String(draft[field.key] ?? '')} onChange={(event) => setDraft({ ...draft, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value })} />}
    </label>)}
    <label className="hne-form-group"><span className="hne-label">Status</span><select disabled={saving} className="hne-select" value={draft.active ? 'true' : 'false'} onChange={(event) => setDraft({ ...draft, active: event.target.value === 'true' })}><option value="true">Active</option><option value="false">Inactive</option></select></label>
    <div className="hne-client-record-dialog-actions" style={{ display: 'flex', gap: 8, alignItems: 'end' }}><button type="button" disabled={saving} className="hne-btn hne-btn-secondary hne-btn-sm" onClick={() => { setDraft(null); setError(''); }}>Cancel</button><button disabled={saving} className="hne-btn hne-btn-primary hne-btn-sm" type="submit">{saving ? 'Saving…' : draft.id ? 'Save changes' : `Add ${recordName}`}</button></div>
  </form>;

  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>

      <button type="button" disabled={saving} className="hne-btn hne-btn-primary hne-btn-sm" onClick={() => { setDraft(blank(kind, records.length)); setError(''); }}>Add {kind === 'staff' ? 'staff member' : kind === 'laundry' ? 'laundry item' : 'service'}</button>
    </div>
    {error && !draft && <p role="alert" style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>}
    {draft && <FormDialog title={`${draft.id ? 'Edit' : 'Add'} ${recordName}`} saving={saving} onClose={() => { setDraft(null); setError(''); }}>{editor}</FormDialog>}
    <div className="hne-table-container"><table className="hne-table"><thead><tr>{config.fields.map((field) => <th key={field.key}>{field.label}</th>)}<th>Status</th><th>Actions</th></tr></thead><tbody>
      {records.map((record) => <tr key={record.id}>{config.fields.map((field) => <td key={field.key}>{field.key === 'taxable' ? (record.taxable ? 'Applies' : 'No VAT') : field.key === 'pricing_unit' ? field.options?.find((option) => option.value === record.pricing_unit)?.label : String(record[field.key] ?? '')}</td>)}<td>{record.active ? 'Active' : 'Inactive'}</td><td style={{ whiteSpace: 'nowrap' }}><button type="button" className="hne-btn hne-btn-secondary hne-btn-sm" style={kind === 'extras' ? { padding: 8 } : undefined} disabled={saving} aria-label={`Edit ${record.name}`} title="Edit" onClick={() => { setDraft({ ...record }); setError(''); }}>{kind === 'extras' ? <Pencil size={16} aria-hidden="true" /> : 'Edit'}</button>{record.active && <button type="button" className={`hne-btn ${kind === 'extras' ? 'hne-btn-secondary' : 'hne-btn-danger'} hne-btn-sm`} style={{ marginLeft: 6, ...(kind === 'extras' ? { padding: 8, color: 'var(--danger-red)' } : {}) }} disabled={saving} aria-label={`Deactivate ${record.name}`} title="Deactivate" onClick={() => deactivate(record)}>{kind === 'extras' ? <Power size={16} aria-hidden="true" /> : 'Deactivate'}</button>}</td></tr>)}
    </tbody></table></div>
  </div>;
}
