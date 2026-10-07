import { useEffect, useState } from 'react';
import { usePortalProfile } from '@/lib/portal-context';

type Account = { id: string; name: string; email: string; role: string; roleLabel: string; active: boolean; staffMemberId?: string; lastLoginAt?: string };
type Member = { id: string; name: string; department: string };
type Role = { name: string; label: string };
const suggestedRole = (department: string) => ({ 'All Round': 'ADMIN', 'All Rounder': 'ADMIN', 'Front Desk': 'FRONT_DESK_STAFF', Restaurant: 'RESTAURANT', Housekeeping: 'HOUSEKEEPING', Cleaning: 'HOUSEKEEPING', 'Kitchen Cook': 'KITCHEN', 'Kitchen Helper': 'KITCHEN' }[department] || 'HOUSEKEEPING');

async function request(method = 'GET', body?: object, id = '') {
  const response = await fetch(`/api/users${id ? `/${id}` : ''}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save portal access.');
  return result;
}

export default function StaffAccessPage() {
  const profile = usePortalProfile();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staff, setStaff] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [draft, setDraft] = useState({ id: '', staffMemberId: '', email: '', role: 'FRONT_DESK_STAFF', password: '', active: true });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try { const result = await request(); setAccounts(result.users); setStaff(result.staff); setRoles(result.roles); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load staff accounts.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      await request(draft.id ? 'PATCH' : 'POST', draft.id ? { role: draft.role, active: draft.active, ...(draft.password ? { password: draft.password } : {}) } : draft, draft.id);
      setEditing(false); setMessage(draft.id ? 'Portal access updated. Previous sessions have been signed out.' : 'Portal account created. Share the sign-in details privately with this employee.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save.'); }
    finally { setSaving(false); }
  }
  const available = staff.filter(member => !accounts.some(account => account.staffMemberId === member.id));

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div><h1 style={{ fontSize: 24, fontWeight: 700 }}>Staff Portal Access</h1><p style={{ marginTop: 6, color: 'var(--text-secondary)' }}>Individual sign-ins with access appropriate to each employee’s work.</p></div>
      <button className="hne-btn hne-btn-primary" disabled={saving || loading || !available.length} onClick={() => { setDraft({ id: '', staffMemberId: '', email: '', role: 'FRONT_DESK_STAFF', password: '', active: true }); setEditing(true); setError(''); }}>Create staff account</button>
    </header>
    <div className="hne-card" style={{ padding: 18, lineHeight: 1.7, fontSize: 13 }}>
      <p><strong>Owner:</strong> existing owner account. <strong>All-rounder / Admin:</strong> full hotel management access.</p>
      <p><strong>Front Desk:</strong> reservations, guest folios, payments and checkout. <strong>Housekeeping / Cleaning:</strong> room cleaning and inspection.</p>
      <p><strong>Restaurant:</strong> tables, orders and billing. <strong>Kitchen Cook / Helper:</strong> kitchen tickets and preparation status.</p>
      <p style={{ color: 'var(--text-secondary)' }}>Kitchen helpers and cleaners may share their department’s workspace using individual accounts. Dishwashers do not require a portal for the current workflows. Add employees to the Staff Directory in System Settings first.</p>
    </div>
    {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}
    {message && <p role="status" style={{ color: 'var(--green)' }}>{message}</p>}
    {editing && <form className="hne-card" onSubmit={save} style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 16, fontSize: 18 }}>{draft.id ? 'Edit portal access' : 'Create portal account'}</h2>
      <div className="hne-form-grid">
        {!draft.id && <><label className="hne-form-group"><span className="hne-label">Employee</span><select required className="hne-select" value={draft.staffMemberId} onChange={event => { const member = staff.find(item => item.id === event.target.value); setDraft({ ...draft, staffMemberId: event.target.value, role: suggestedRole(member?.department || '') }); }}><option value="">Select employee</option>{available.map(member => <option key={member.id} value={member.id}>{member.name} — {member.department}</option>)}</select></label>
        <label className="hne-form-group"><span className="hne-label">Staff email address</span><input required type="email" autoComplete="off" className="hne-input" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label></>}
        <label className="hne-form-group"><span className="hne-label">Portal role</span><select className="hne-select" value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })}>{roles.map(role => <option key={role.name} value={role.name}>{role.label}</option>)}</select></label>
        <label className="hne-form-group"><span className="hne-label">{draft.id ? 'New password (optional)' : 'Initial password'}</span><input required={!draft.id} minLength={12} type="password" autoComplete="new-password" className="hne-input" value={draft.password} onChange={event => setDraft({ ...draft, password: event.target.value })} /><small>At least 12 characters. Staff can change it from My Profile.</small></label>
        {draft.id && <label><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} /> Account active</label>}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><button type="submit" className="hne-btn hne-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save access'}</button><button type="button" className="hne-btn hne-btn-secondary" disabled={saving} onClick={() => setEditing(false)}>Cancel</button></div>
    </form>}
    <div className="hne-card hne-table-container"><table className="hne-table"><thead><tr><th>Employee</th><th>Sign-in email</th><th>Portal role</th><th>Status</th><th>Access</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5}>Loading staff accounts…</td></tr> : accounts.map(account => <tr key={account.id}><td>{account.name}</td><td>{account.email}</td><td>{account.roleLabel}</td><td>{account.active ? 'Active' : 'Inactive'}</td><td>{account.role === 'OWNER' || account.role === 'SUPER_ADMIN' || account.id === profile?.userId ? 'Protected account' : <button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={saving} onClick={() => { setDraft({ id: account.id, staffMemberId: account.staffMemberId || '', email: account.email, role: account.role, password: '', active: account.active }); setEditing(true); setError(''); }}>Edit access</button>}</td></tr>)}
    </tbody></table></div>
  </div>;
}
