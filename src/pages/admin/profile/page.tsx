import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import { usePortalProfile } from '@/lib/portal-context';
import { portalLabel } from '@/lib/portal-access';

export default function ProfilePage() {
  const profile = usePortalProfile();
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (password !== passwordConfirmation) { setError('The new passwords do not match.'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, password, passwordConfirmation }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to change password.');
      authClient.clear(); navigate('/login', { replace: true, state: { message: result.message } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to change password.'); }
    finally { setSaving(false); }
  }
  return <div style={{ maxWidth: 600 }}><h1 style={{ fontSize: 24, marginBottom: 18 }}>My Profile</h1><div className="hne-card" style={{ padding: 22 }}><p style={{ fontWeight: 700 }}>{profile?.firstName} {profile?.lastName}</p><p>{profile?.email}</p><p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{portalLabel(profile)}</p>
    <form onSubmit={save}><h2 style={{ fontSize: 18, marginBottom: 16 }}>Change password</h2>{error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}
      <label className="hne-form-group"><span className="hne-label">Current password</span><input required type="password" autoComplete="current-password" className="hne-input" value={currentPassword} onChange={event => setCurrent(event.target.value)} /></label>
      <label className="hne-form-group"><span className="hne-label">New password</span><input required minLength={12} type="password" autoComplete="new-password" className="hne-input" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="hne-form-group"><span className="hne-label">Confirm new password</span><input required minLength={12} type="password" autoComplete="new-password" className="hne-input" value={passwordConfirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      <p style={{ fontSize: 12, marginBottom: 16, color: 'var(--text-secondary)' }}>Use at least 12 characters. Changing your password signs out your existing sessions.</p><button disabled={saving} className="hne-btn hne-btn-primary">{saving ? 'Saving…' : 'Change password'}</button>
    </form></div></div>;
}
