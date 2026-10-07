export function BookingPaymentOptions({ gateways, choice, onChoice, amount, onAmount, total }: { gateways: Array<'ESEWA' | 'KHALTI'>; choice: 'HOTEL' | 'ONLINE'; onChoice: (choice: 'HOTEL' | 'ONLINE') => void; amount: string; onAmount: (amount: string) => void; total: number }) {
  return <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
    <label className="hne-label" style={{ display: 'block', marginBottom: 12 }}>Payment</label>
    <div style={{ display: 'grid', gap: 12 }}>
      <label><input type="radio" name="paymentChoice" value="HOTEL" checked={choice === 'HOTEL'} onChange={() => onChoice('HOTEL')} /> Pay at hotel</label>
      {gateways.length > 0 ? <><label><input type="radio" name="paymentChoice" value="ONLINE" checked={choice === 'ONLINE'} onChange={() => onChoice('ONLINE')} /> Pay an advance online with {gateways.map((gateway) => gateway === 'ESEWA' ? 'eSewa' : 'Khalti').join(' or ')}</label>{choice === 'ONLINE' && <label>Advance amount (NPR)<input className="hne-input" type="number" min="0.01" max={total} step="0.01" required value={amount || total.toFixed(2)} onChange={(event) => onAmount(event.target.value)} /><p style={{ fontSize: 12, marginTop: 8 }}>Your booking is created first, then you can pay securely. The remaining balance is payable at the hotel.</p></label>}</> : <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Online advance payment is currently unavailable. You can reserve now and arrange payment with the front desk.</p>}
    </div>
  </div>;
}
