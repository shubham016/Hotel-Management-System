import React, { useState } from 'react';
import { useRouter } from '@/lib/router';
import { Shield, Lock, Mail, KeyRound, Sparkles, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from '@/lib/router';
import { authClient } from '@/lib/auth-client';
import { portalHome } from '@/lib/portal-access';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F7F8F9',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px 20px',
        position: 'relative'
      }}
    >
      {/* Background Subtle Gradient Blobs */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '15%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,140,0,0.08) 0%, rgba(247,248,249,0) 70%)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '12%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,160,71,0.07) 0%, rgba(247,248,249,0) 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Main Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(229, 231, 235, 0.8)',
          padding: '40px 36px',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <img
              src="/logo.png"
              alt="Hotel New Era"
              style={{
                height: 64,
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-orange)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ENTERPRISE MANAGEMENT PORTAL
          </div>
          {/* <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            Sign in to access PMS, POS, CRM, Accounting & CMS
          </p> */}
        </div>

        {errorMsg && (
          <div
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

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="hne-form-group" style={{ marginBottom: 0 }}>
            <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} color="var(--primary-orange)" />
              <span>Staff Email Address</span>
            </label>
            <input
              type="email"
              className="hne-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hotelnewera.com"
            />
          </div>

          <div className="hne-form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="hne-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} color="var(--primary-orange)" />
                <span>Password</span>
              </label>
              
            </div>
            <input
              type="password"
              className="hne-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
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
            {/* <span style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> 256-Bit SSL Encrypted
            </span> */}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180 }}>Forgot your password? Ask the Owner or Admin to reset it.</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: 8, boxShadow: 'var(--shadow-glow)' }}
          >
            <span>{isLoading ? 'Signing in…' : 'Sign In'}</span>
            {/* <ArrowRight size={16} /> */}
          </Button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>Use your individual staff account. Your assigned role opens the correct workspace.</p>
      </div>

      <div style={{ marginTop: 24, fontSize: 12.5, color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Public Website
        </Link>
      </div>
    </div>
  );
}
