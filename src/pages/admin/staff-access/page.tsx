import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePortalProfile } from '@/lib/portal-context';
import { FormDialog } from '@/components/admin/FormDialog';
import { useSearchParams } from 'react-router-dom';

type Account = { id: string; name: string; email: string; role: string; roleLabel: string; active: boolean; staffMemberId?: string; lastLoginAt?: string; passwordResetRequestedAt?: string; passwordResetEmailStatus?: string };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staff, setStaff] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [draft, setDraft] = useState({ id: '', staffMemberId: '', email: '', role: 'FRONT_DESK_STAFF', password: '', active: true });
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try { const result = await request(); setAccounts(result.users); setStaff(result.staff); setRoles(result.roles); }
    catch (reason) { setAccounts([]); setStaff([]); setRoles([]); setError(reason instanceof Error ? reason.message : 'Unable to load staff accounts.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { setShowPassword(false); }, [draft.id, editing]);
  useEffect(() => {
    const userId = searchParams.get('user');
    if (loading || !userId) return;
    const account = accounts.find(item => item.id === userId);
    if (account && account.id !== profile?.userId && !['OWNER', 'SUPER_ADMIN'].includes(account.role)) {
      setDraft({ id: account.id, staffMemberId: account.staffMemberId || '', email: account.email, role: account.role, password: '', active: account.active });
      setEditing(true); setError('');
    }
    setSearchParams(current => { const next = new URLSearchParams(current); next.delete('user'); return next; }, { replace: true });
  }, [accounts, loading, profile?.userId, searchParams, setSearchParams]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      await request(draft.id ? 'PATCH' : 'POST', draft.id ? { role: draft.role, active: draft.active, ...(draft.password ? { password: draft.password } : {}) } : draft, draft.id);
      setEditing(false); setMessage(draft.id ? draft.password ? 'Password reset. Share the replacement password privately. The employee can change it in My Profile after signing in. Previous sessions have been signed out.' : 'Portal access updated. Previous sessions have been signed out.' : 'Portal account created. Share the sign-in details privately with this employee.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save.'); }
    finally { setSaving(false); }
  }
  const available = staff.filter(member => !accounts.some(account => account.staffMemberId === member.id));

  async function deleteAccount(account: Account) {
    if (!window.confirm(`Delete portal access for ${account.name}? Their employee directory record will remain.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await request('DELETE', undefined, account.id);
      if (draft.id === account.id) setEditing(false);
      setMessage('Staff portal account deleted.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete account.'); }
    finally { setSaving(false); }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div><h1 style={{ fontSize: 24, fontWeight: 700 }}>Staff Portal Access</h1></div>
      <button type="button" className="hne-btn hne-btn-primary hne-btn-sm" style={{ minHeight: 36, padding: '8px 12px', fontSize: 13, gap: 6, borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' }} disabled={saving || loading || !available.length} onClick={() => { setDraft({ id: '', staffMemberId: '', email: '', role: 'FRONT_DESK_STAFF', password: '', active: true }); setEditing(true); setError(''); }}><Plus size={16} aria-hidden="true" />Create staff account</button>
    </header>

    {error && !editing && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}
    {message && <p role="status" style={{ color: 'var(--green)' }}>{message}</p>}
    {accounts.some(account => account.passwordResetRequestedAt && ['NOT_CONFIGURED', 'FAILED'].includes(account.passwordResetEmailStatus || '')) && <p role="status" style={{ fontSize: 13, color: 'var(--danger-red)' }}>Email delivery is unavailable for one or more password reset requests. The requests are saved below for Owner/Admin to process.</p>}
    {editing && <FormDialog title={draft.id ? 'Edit portal access' : 'Create staff account'} description={draft.id ? draft.email : undefined} saving={saving} onClose={() => { setEditing(false); setError(''); }}><form onSubmit={save}>
      {error && <p role="alert" style={{ color: 'var(--danger-red)', marginBottom: 16 }}>{error}</p>}
      {draft.id && accounts.find(account => account.id === draft.id)?.passwordResetRequestedAt && <p role="status" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>This employee requested a password reset. Verify their identity, enter a replacement password, and share it privately.</p>}
      <fieldset disabled={saving} className="hne-form-grid" style={{ border: 0, padding: 0, margin: 0 }}>
        {!draft.id && <><label className="hne-form-group"><span className="hne-label">Employee</span><select required className="hne-select" value={draft.staffMemberId} onChange={event => { const member = staff.find(item => item.id === event.target.value); setDraft({ ...draft, staffMemberId: event.target.value, role: suggestedRole(member?.department || '') }); }}><option value="">Select employee</option>{available.map(member => <option key={member.id} value={member.id}>{member.name} — {member.department}</option>)}</select></label>
        <label className="hne-form-group"><span className="hne-label">Staff email address</span><input required type="email" autoComplete="off" className="hne-input" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label></>}
        <label className="hne-form-group"><span className="hne-label">Portal role</span><select className="hne-select" value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })}>{roles.map(role => <option key={role.name} value={role.name}>{role.label}</option>)}</select></label>
        <div className="hne-form-group"><label htmlFor="staff-access-password" className="hne-label">{draft.id ? 'New password (optional)' : 'Initial password'}</label><div style={{ position: 'relative' }}><input id="staff-access-password" required={!draft.id} minLength={12} type={showPassword ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} className="hne-input" style={{ paddingRight: 48 }} value={draft.password} onChange={event => setDraft({ ...draft, password: event.target.value })} /><button type="button" aria-controls="staff-access-password" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(visible => !visible)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 0, borderRadius: 4, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div><small>At least 12 characters. Staff can change it from My Profile.</small></div>
        {draft.id && <label><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} /> Account active</label>}
      </fieldset>
      <div className="hne-client-record-dialog-actions" style={{ display: 'flex', gap: 8, marginTop: 16 }}><button type="button" className="hne-btn hne-btn-secondary" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Cancel</button><button type="submit" className="hne-btn hne-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save access'}</button></div>
    </form></FormDialog>}
    <div className="hne-card hne-table-container"><table className="hne-table"><thead><tr><th>Employee</th><th>Sign-in email</th><th>Portal role</th><th>Status</th><th>Access</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5}>Loading staff accounts…</td></tr> : accounts.map(account => <tr key={account.id}><td>{account.name}{account.passwordResetRequestedAt && <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--primary-orange)', fontWeight: 600 }}>Password reset requested</span>}</td><td>{account.email}</td><td>{account.roleLabel}</td><td>{account.active ? 'Active' : 'Inactive'}</td><td>{account.role === 'OWNER' || account.role === 'SUPER_ADMIN' || account.id === profile?.userId ? 'Protected account' : <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><button type="button" className="hne-btn hne-btn-secondary hne-btn-sm" style={{ padding: 8 }} disabled={saving} aria-label={`Edit portal access for ${account.name}`} title="Edit access" onClick={() => { setDraft({ id: account.id, staffMemberId: account.staffMemberId || '', email: account.email, role: account.role, password: '', active: account.active }); setEditing(true); setError(''); }}><Pencil size={16} aria-hidden="true" /></button><button type="button" className="hne-btn hne-btn-secondary hne-btn-sm" style={{ color: 'var(--danger-red)', padding: 8 }} disabled={saving} aria-label={`Delete portal access for ${account.name}`} title="Delete account" onClick={() => void deleteAccount(account)}><Trash2 size={16} aria-hidden="true" /></button></div>}</td></tr>)}
    </tbody></table></div>
  </div>;
}
