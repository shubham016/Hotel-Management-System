import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock3, Loader2, LockKeyhole, ShieldCheck, TriangleAlert } from 'lucide-react';
import { loadPaymentRequest, startPaymentRequest, verifyPaymentRequest, type PaymentRequest } from '@/components/payments/api';
import './payment.css';
import { PaymentReceipt } from './components/PaymentReceipt';

export default function PayPage() {
  const { token = '', gateway } = useParams();
  const [query] = useSearchParams();
  const returnedFromGateway = Boolean(gateway) || query.has('gateway');
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setRequest(null); setError(''); setBusy(returnedFromGateway);
      try {
        const loaded = await loadPaymentRequest(token);
        if (!active) return;
        setRequest(loaded);
        if (returnedFromGateway) {
          try {
            const verified = await verifyPaymentRequest(token);
            if (active) setRequest(verified);
          } catch (reason) {
            if (active) setError(`${reason instanceof Error ? reason.message : 'Unable to verify payment.'} Use “Check payment status” to try again.`);
          }
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Payment request unavailable.');
      } finally {
        if (active) setBusy(false);
      }
    };
    void load();
    return () => { active = false; };
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

  const amount = request?.amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const completed = request?.status === 'COMPLETED';
  const initiated = request?.status === 'INITIATED';
  const failed = request?.status === 'FAILED';
  const expired = request ? new Date(request.expiresAt).getTime() <= Date.now() : false;

  return <main className="hne-payment">
    <div className="hne-payment-shell">
      <header className="hne-payment-brand">
        <img src="/logo.png" alt="Hotel New Era" />
        <span className="hne-payment-brand-divider" aria-hidden="true" />
        <span>Guest payments</span>
      </header>
      <section className="hne-payment-card" aria-labelledby="payment-title" aria-busy={busy}>
        {completed && request ? <PaymentReceipt request={request} /> : <>
        <div className="hne-payment-intro">
          <span className="hne-payment-eyebrow"><ShieldCheck size={16} aria-hidden="true" /> HOTEL NEW ERA · BUTWAL</span>
          <h1 id="payment-title">{completed ? 'Thank you for your payment' : 'A simple way to settle your stay'}</h1>
          <p>{completed ? 'Your payment has been confirmed by the payment provider.' : 'Review your payment details and continue with your preferred wallet.'}</p>
        </div>
        {!request && !error && <div className="hne-payment-loading" role="status"><Loader2 className="hne-payment-spinner" size={26} aria-hidden="true" /><p>{returnedFromGateway ? 'Checking your payment…' : 'Loading your payment details…'}</p></div>}
        {request && <>
          <div className="hne-payment-summary">
            <div className="hne-payment-summary-top"><span>{completed ? 'Amount paid' : 'Amount to pay'}</span><span className={`hne-payment-badge${completed ? ' is-complete' : ''}`}>{completed ? 'Paid' : request.kind === 'ADVANCE' ? 'Booking advance' : 'Checkout balance'}</span></div>
            <div className="hne-payment-amount"><span>NPR</span> {amount}</div>
            <dl className="hne-payment-details">
              <div><dt>Booking reference</dt><dd>{request.confirmationNumber}</dd></div>
              <div><dt>Guest</dt><dd>{request.guestName}</dd></div>
              {completed && request.receiptNumber && <div><dt>Receipt number</dt><dd>{request.receiptNumber}</dd></div>}
            </dl>
          </div>
          <div className="hne-payment-body">
            {request.kind === 'ADVANCE' && <p className="hne-payment-method-hint">Cancellation before check-in: 10% of the advance paid is retained; 90% is refundable. Contact the front desk to arrange your cancellation and refund.</p>}
            {failed ? <div className="hne-payment-status is-warning" role="alert"><TriangleAlert size={32} aria-hidden="true" /><h2>Payment not completed</h2><p>This payment attempt did not complete. Please ask the front desk to help you with the next step.</p></div> :
              initiated ? <div className="hne-payment-status" role="status"><Clock3 size={32} aria-hidden="true" /><h2>Awaiting confirmation</h2><p>We’re waiting for the payment provider to confirm your payment. Check its status before making another payment.</p><button className="hne-payment-action" type="button" disabled={busy} onClick={verify}>{busy && <Loader2 className="hne-payment-spinner" size={18} aria-hidden="true" />}{busy ? 'Please wait…' : 'Check payment status'}</button>{request.canResume && request.gateway === 'ESEWA' && !expired && request.availableGateways.includes('ESEWA') && <><p className="hne-payment-method-hint">Haven’t authorized your payment yet? Return to the same eSewa checkout.</p><button className="hne-payment-action hne-payment-action-secondary" type="button" disabled={busy} onClick={() => pay('ESEWA')}>Return to eSewa{request.gatewayModes.ESEWA === 'SANDBOX' ? ' (test)' : ''}<ArrowRight size={18} aria-hidden="true" /></button></>}</div> :
              expired ? <div className="hne-payment-status is-warning" role="alert"><Clock3 size={32} aria-hidden="true" /><h2>Payment link expired</h2><p>Please ask the front desk for a new payment QR code.</p></div> :
              <>
                <h2>Choose how to pay</h2>
                <p className="hne-payment-method-hint">Continue to your wallet to authorize the payment.</p>
                {request.availableGateways.some((gateway) => request.gatewayModes[gateway] === 'SANDBOX') && <div className="hne-payment-notice" role="alert"><TriangleAlert size={18} aria-hidden="true" /><p><strong>Test payment mode</strong>Wallets marked “Test” cannot collect real money.</p></div>}
                <div className="hne-payment-methods">
                  {request.availableGateways.map((gateway) => {
                    const name = gateway === 'ESEWA' ? 'eSewa' : 'Khalti';
                    return <button key={gateway} className={`hne-payment-method ${gateway === 'ESEWA' ? 'is-esewa' : 'is-khalti'}`} type="button" disabled={busy} onClick={() => pay(gateway)} aria-label={`Pay NPR ${amount} with ${name}${request.gatewayModes[gateway] === 'SANDBOX' ? ' (test)' : ''}`}>
                      <span className="hne-payment-wallet" aria-hidden="true">{gateway === 'ESEWA' ? 'e' : 'K'}</span>
                      <span className="hne-payment-method-label"><strong>Pay with {name}{request.gatewayModes[gateway] === 'SANDBOX' && <span className="hne-payment-test">Test</span>}</strong><span>Continue to {name}</span></span>
                      {busy ? <Loader2 className="hne-payment-spinner" size={20} aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
                    </button>;
                  })}
                </div>
                {busy && <p className="hne-payment-method-hint" role="status">Opening payment provider…</p>}
                {request.availableGateways.length === 0 ? <div className="hne-payment-status"><Clock3 size={28} aria-hidden="true" /><h2>Online payment unavailable</h2><p>Please contact the front desk to arrange your payment.</p></div> : <p className="hne-payment-expiry"><Clock3 size={14} aria-hidden="true" /> Link expires {new Date(request.expiresAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu' })} (Nepal time)</p>}
              </>}
          </div>
        </>}
        </>}
        {error && <div className="hne-payment-error" role="alert"><TriangleAlert size={20} aria-hidden="true" /><div><strong>{request ? 'Unable to complete this step' : 'Payment details unavailable'}</strong><p>{error}</p>{!request && <button className="hne-payment-action" type="button" onClick={() => window.location.reload()}>Try again</button>}</div></div>}
        {!completed && <div className="hne-payment-assurance"><LockKeyhole size={16} aria-hidden="true" /><p>Your wallet handles payment authorization.<br />Hotel New Era never asks for your wallet PIN or OTP.</p></div>}
      </section>
      <footer className="hne-payment-footer"><p>Need a hand? <a href="/contact" target="_blank" rel="noreferrer">Contact the front desk <ArrowRight size={13} aria-hidden="true" /></a></p><span>Hotel New Era · Guest payment service</span></footer>
    </div>
  </main>;
}
