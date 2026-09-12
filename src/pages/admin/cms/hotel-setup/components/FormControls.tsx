import type { ReactNode } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="hne-label">{label}{children}</label>;
}

export function ActiveField({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return <Field label="Status"><select className="hne-input" value={String(value)} onChange={(event) => onChange(event.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive</option></select></Field>;
}

export function FormActions({ saving, onClear, label }: { saving: boolean; onClear: () => void; label: string }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}><Button type="button" variant="secondary" size="sm" onClick={onClear}>Clear</Button><Button type="submit" variant="primary" size="sm" disabled={saving}>{saving ? <Loader2 className="hne-spin" size={14} /> : <Plus size={14} />}<span>{saving ? 'Saving…' : `Save ${label}`}</span></Button></div>;
}
