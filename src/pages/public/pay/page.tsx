import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { loadPaymentRequest, startPaymentRequest, verifyPaymentRequest, type PaymentRequest } from '@/components/payments/api';

export default function PayPage() {
  const { token = '' } = useParams();
  const [query] = useSearchParams();
  const returnedFromGateway = query.has('gateway');
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = returnedFromGateway ? verifyPaymentRequest : loadPaymentRequest;
    load(token).then(setRequest).catch((reason) => setError(reason instanceof Error ? reason.message : 'Payment request unavailable.'));
  }, [token, returnedFromGateway]);

  const pay = async (gateway: 'ESEWA' | 'KHALTI') => {
    setBusy(true); setError('');
    try {
      const result = await startPaymentRequest(token, gateway);
      setRequest(result);
      if (result.redirect.fields) {
        const form = document.createElement('form');
        form.method = 'POST'; form.action = result.redirect.url;
        Object.entries(result.redirect.fields).forEach(([name, value]) => {
          const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
        });
        document.body.appendChild(form); form.submit();
      } else window.location.assign(result.redirect.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start payment.');
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true); setError('');
    try { setRequest(await verifyPaymentRequest(token)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to verify payment.'); }
    finally { setBusy(false); }
  };

  return <div style={{ maxWidth: 540, margin: '48px auto', padding: 24 }} className="hne-card">
    <img src="/logo.png" alt="Hotel New Era" style={{ height: 48, marginBottom: 20 }} />
    <h1 style={{ fontSize: 24, marginBottom: 12 }}>Hotel New Era Payment</h1>
    {!request && !error && <p>Loading payment details…</p>}
    {request && <>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{request.kind === 'ADVANCE' ? 'Booking advance' : 'Checkout balance'} · {request.confirmationNumber}</p>
      <div style={{ fontSize: 32, fontWeight: 800, margin: '20px 0' }}>NPR {request.amount.toLocaleString()}</div>
      {request.status === 'COMPLETED' ? <div role="status" style={{ color: 'var(--green)' }}>Payment verified. Receipt {request.receiptNumber}. Thank you.</div> :
        request.status === 'FAILED' ? <div role="alert">This payment attempt did not complete. Please contact the front desk.</div> :
        request.status === 'INITIATED' ? <div><p>Payment is awaiting gateway confirmation.</p><Button type="button" variant="secondary" disabled={busy} onClick={verify}>Check payment status</Button></div> :
        new Date(request.expiresAt).getTime() <= Date.now() ? <div role="alert">This payment request has expired. Please ask the front desk for a new QR.</div> :
        <div style={{ display: 'grid', gap: 10 }}>
          {request.availableGateways.some((gateway) => request.gatewayModes[gateway] === 'SANDBOX') && <p role="alert" style={{ color: 'var(--danger-red)' }}>Test payment only. No real money will be collected through a sandbox gateway.</p>}
          {request.availableGateways.includes('ESEWA') && <Button type="button" variant="primary" disabled={busy} onClick={() => pay('ESEWA')}>Pay NPR {request.amount.toLocaleString()} with eSewa{request.gatewayModes.ESEWA === 'SANDBOX' ? ' (test)' : ''}</Button>}
          {request.availableGateways.includes('KHALTI') && <Button type="button" variant="primary" disabled={busy} onClick={() => pay('KHALTI')}>Pay NPR {request.amount.toLocaleString()} with Khalti{request.gatewayModes.KHALTI === 'SANDBOX' ? ' (test)' : ''}</Button>}
          {request.availableGateways.length === 0 && <p>Online payment is not available yet. Please contact the front desk.</p>}
        </div>}
    </>}
    {error && <div role="alert" style={{ marginTop: 16, color: 'var(--danger-red)' }}>{error}</div>}
  </div>;
}
