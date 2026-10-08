import React, { useState } from 'react';
import { useRouter } from '@/lib/router';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from '@/lib/router';
import { authClient } from '@/lib/auth-client';
import { portalHome } from '@/lib/portal-access';
import './Login.css';
import { FormDialog } from '@/components/admin/FormDialog';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  async function requestPasswordReset(event: React.FormEvent) {
    event.preventDefault(); setResetSending(true); setResetError('');
    try {
      const response = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to send your request.');
      setResetMessage(result.message);
    } catch (reason) { setResetError(reason instanceof Error ? reason.message : 'Unable to send your request. Please try again.'); }
    finally { setResetSending(false); }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (data.success && data.data?.token) {
        authClient.save(data.data, rememberMe);
        router.replace(portalHome(data.data));
      } else {
        setErrorMsg(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('The authentication service is unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="hne-login-page">
      {/* Main Login Card */}
      <div className="hne-login-card">
        {/* Brand Header */}
        <div className="hne-login-header">
          <div className="hne-login-brand">
            <img
              src="/logo.png"
              alt="Hotel New Era"
              style={{
                height: 72,
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger-red)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Shield size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="hne-login-form">
          <div className="hne-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="login-email" className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} color="var(--primary-orange)" />
              <span>Staff Email Address</span>
            </label>
            <input
              id="login-email"
              name="email"
              autoComplete="username"
              type="email"
              className="hne-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
            />
          </div>

          <div className="hne-form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="login-password" className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} color="var(--primary-orange)" />
                <span>Password</span>
              </label>
              
            </div>
            <div style={{ position: 'relative' }}><input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              className="hne-input"
              style={{ paddingRight: 48 }}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            /><button type="button" aria-controls="login-password" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(visible => !visible)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 0, borderRadius: 4, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--primary-orange)' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Remember me</span>
            </label>
            <button type="button" className="hne-login-forgot" disabled={isLoading} onClick={() => { setResetEmail(email); setResetMessage(''); setResetError(''); setResetOpen(true); }}>Forgot your password?</button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: 4, boxShadow: 'none' }}
          >
            <span>{isLoading ? 'Signing in…' : 'Sign In'}</span>
          </Button>
        </form>

      </div>

      {resetOpen && <FormDialog title="Request password reset" description="Your hotel administrator will review the request and reset your password." saving={resetSending} onClose={() => setResetOpen(false)}>
        <form onSubmit={requestPasswordReset}>
          {resetError && <p role="alert" style={{ color: 'var(--danger-red)', marginBottom: 16 }}>{resetError}</p>}
          {resetMessage ? <p role="status" style={{ lineHeight: 1.7, fontSize: 14 }}>{resetMessage} Once your administrator provides a replacement password, sign in and use My Profile to choose your own password.</p> : <label className="hne-form-group"><span className="hne-label">Staff email address</span><input required autoFocus type="email" autoComplete="email" className="hne-input" disabled={resetSending} value={resetEmail} onChange={event => setResetEmail(event.target.value)} placeholder="Enter your sign-in email" /></label>}
          <div className="hne-client-record-dialog-actions" style={{ display: 'flex', gap: 8, marginTop: 20 }}><button type="button" className="hne-btn hne-btn-secondary" disabled={resetSending} onClick={() => setResetOpen(false)}>{resetMessage ? 'Close' : 'Cancel'}</button>{!resetMessage && <button type="submit" className="hne-btn hne-btn-primary" disabled={resetSending}>{resetSending ? 'Sending…' : 'Send request'}</button>}</div>
        </form>
      </FormDialog>}
      <div style={{ marginTop: 24, fontSize: 12.5, color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Public Website
        </Link>
      </div>
    </div>
  );
}
