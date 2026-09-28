import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createPaymentRequest, verifyPaymentRequest, type PaymentRequest } from './api';
import { Button } from '@/components/ui/Button';

type Props = {
  folioId: string;
  kind: 'ADVANCE' | 'CHECKOUT';
  balanceDue: number;
  onClose: () => void;
  onCompleted: () => void;
};

export function PaymentRequestModal({ folioId, kind, balanceDue, onClose, onCompleted }: Props) {
  const [amount, setAmount] = useState(balanceDue.toFixed(2));
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!request || request.status === 'COMPLETED' || request.status === 'FAILED') return;
    const timer = window.setInterval(() => {
      if (request.status !== 'INITIATED') return;
      verifyPaymentRequest(request.token).then((updated) => {
        setRequest(updated);
        if (updated.status === 'COMPLETED') onCompleted();
      }).catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [request, onCompleted]);

  const create = async () => {
    setBusy(true); setError('');
    try {
      setRequest(await createPaymentRequest(folioId, kind, kind === 'ADVANCE' ? Number(amount) : undefined));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create payment request.');
    } finally { setBusy(false); }
  };

  const check = async () => {
    if (!request) return;
    setBusy(true); setError('');
    try {
      const updated = await verifyPaymentRequest(request.token);
      setRequest(updated);
      if (updated.status === 'COMPLETED') onCompleted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to check payment.');
    } finally { setBusy(false); }
  };

  return <div className="hne-modal-backdrop" onClick={onClose}>
    <div className="hne-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 480 }}>
      <div className="hne-modal-header"><h3 className="hne-modal-title">{kind === 'ADVANCE' ? 'Advance Payment' : 'Checkout Payment'}</h3><button type="button" className="hne-modal-close" onClick={onClose} aria-label="Close">×</button></div>
      <div className="hne-modal-body" style={{ display: 'grid', gap: 14 }}>
        <div>Outstanding balance: <strong>Rs. {balanceDue.toLocaleString()}</strong></div>
        {!request && <>
          {kind === 'ADVANCE' && <label className="hne-form-group">Advance amount (NPR)<input className="hne-input" type="number" min="0.01" max={balanceDue} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>The QR opens a secure Hotel New Era payment page. The guest selects a configured gateway and sees the exact amount before paying.</p>
          <Button type="button" variant="primary" onClick={create} disabled={busy || (kind === 'ADVANCE' && !(Number(amount) > 0 && Number(amount) <= balanceDue))}>{busy ? 'Creating…' : 'Generate payment QR'}</Button>
        </>}
        {request && <>
          <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 800 }}>Rs. {request.amount.toLocaleString()}</div>
          <div style={{ background: '#fff', padding: 14, width: 'fit-content', margin: '0 auto', borderRadius: 8 }}><QRCodeSVG value={request.paymentUrl} size={210} /></div>
          <div style={{ fontSize: 12, textAlign: 'center', overflowWrap: 'anywhere' }}><a href={request.paymentUrl} target="_blank" rel="noreferrer">{request.paymentUrl}</a></div>
          <div style={{ textAlign: 'center', fontSize: 12 }}>Status: <strong>{request.status}</strong>{request.receiptNumber ? ` · Receipt ${request.receiptNumber}` : ''}</div>
          {request.availableGateways.length > 0 && <div style={{ textAlign: 'center', fontSize: 12 }}>Payment options: {request.availableGateways.map((gateway) => gateway === 'ESEWA' ? 'eSewa' : 'Khalti').join(' · ')}</div>}
          {request.availableGateways.length === 0 && <div role="alert" style={{ color: 'var(--danger-red)', fontSize: 12 }}>No merchant gateway is configured yet. Do not ask the guest to pay through this QR.</div>}
          {request.availableGateways.some((gateway) => request.gatewayModes[gateway] === 'SANDBOX') && <div role="alert" style={{ color: 'var(--danger-red)', fontSize: 12, textAlign: 'center' }}>Sandbox payment only. This QR cannot collect real money; do not give it to a guest.</div>}
          {new URL(request.paymentUrl).hostname === 'localhost' && <div role="alert" style={{ color: 'var(--danger-red)', fontSize: 12, textAlign: 'center' }}>This QR points to localhost and only works on this computer. Set a public payment URL before guest use.</div>}
          {request.status === 'INITIATED' && <Button type="button" variant="secondary" onClick={check} disabled={busy}>{busy ? 'Checking…' : 'Check payment status'}</Button>}
        </>}
        {error && <div role="alert" style={{ color: 'var(--danger-red)', fontSize: 12 }}>{error}</div>}
      </div>
      <div className="hne-modal-footer"><Button type="button" variant="secondary" onClick={onClose}>Close</Button></div>
    </div>
  </div>;
}
