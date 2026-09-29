import React, { useState } from 'react';

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

  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Changes save to the database and appear in hotel operations immediately.</p>
      <button type="button" className="hne-btn hne-btn-primary hne-btn-sm" onClick={() => { setDraft(blank(kind, records.length)); setError(''); }}>Add {kind === 'staff' ? 'staff member' : kind === 'laundry' ? 'laundry item' : 'service'}</button>
    </div>
    {error && <p role="alert" style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>}
    {draft && <form onSubmit={save} className="hne-form-grid" style={{ marginBottom: 18 }}>
      {config.fields.map((field) => <label key={field.key} className="hne-form-group">
        <span className="hne-label">{field.label}</span>
        {field.type === 'select' ? <select className="hne-select" value={String(draft[field.key] ?? '')} onChange={(event) => setDraft({ ...draft, [field.key]: field.key === 'taxable' ? event.target.value === 'true' : event.target.value })}>
          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select> : <input required className="hne-input" type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} step={field.key === 'price' || field.key === 'unit_price' ? '0.01' : '1'} value={String(draft[field.key] ?? '')} onChange={(event) => setDraft({ ...draft, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value })} />}
      </label>)}
      <label className="hne-form-group"><span className="hne-label">Status</span><select className="hne-select" value={draft.active ? 'true' : 'false'} onChange={(event) => setDraft({ ...draft, active: event.target.value === 'true' })}><option value="true">Active</option><option value="false">Inactive</option></select></label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}><button disabled={saving} className="hne-btn hne-btn-primary hne-btn-sm" type="submit">{saving ? 'Saving…' : 'Save'}</button><button type="button" className="hne-btn hne-btn-secondary hne-btn-sm" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    <div className="hne-table-container"><table className="hne-table"><thead><tr>{config.fields.map((field) => <th key={field.key}>{field.label}</th>)}<th>Status</th><th>Actions</th></tr></thead><tbody>
      {records.map((record) => <tr key={record.id}>{config.fields.map((field) => <td key={field.key}>{field.key === 'taxable' ? (record.taxable ? 'Applies' : 'No VAT') : field.key === 'pricing_unit' ? field.options?.find((option) => option.value === record.pricing_unit)?.label : String(record[field.key] ?? '')}</td>)}<td>{record.active ? 'Active' : 'Inactive'}</td><td><button type="button" className="hne-btn hne-btn-secondary hne-btn-sm" onClick={() => { setDraft({ ...record }); setError(''); }}>Edit</button>{record.active && <button type="button" className="hne-btn hne-btn-danger hne-btn-sm" style={{ marginLeft: 6 }} disabled={saving} onClick={() => deactivate(record)}>Deactivate</button>}</td></tr>)}
    </tbody></table></div>
  </div>;
}
