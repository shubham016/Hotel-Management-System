import { currencyLabel, showNepaliDates } from '@/lib/display-preferences';
import { useEffect, useState } from 'react';
import { AlertTriangle, Printer, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';
import { publishRoomUpdate, useRoomUpdates } from '@/lib/room-updates';
import Link from '@/lib/router';

type AuditStatus = {
  currentDate: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: string;
  openFoliosCount: number;
  unsettledBalanceTotal: number;
  pendingArrivals: number;
  dueDepartures: number;
  overdueDepartures: number;
  unsettledOrders: number;
  occupiedTables: number;
  calendarDate: string;
  canClose: boolean;
  cashierClosing: { id: string; opening_cash: string; expected_cash: string; counted_cash: string; variance: string; notes: string } | null;
  reconciliation: { blockers: string[]; cashNet: string; revenue: string; vat: string; openGuestBalance: string; tenders: { method: string; receipts: string; refunds: string; payments?: string; payrollPayments?: string; net: string }[]; unclassifiedReceipts: { id: string; voucherNumber: string; amount: string }[] };
  closingHistory: { id: string; businessDate: string; nextBusinessDate: string; closedBy: string; closedAt: string; cashier: { expected_cash: string; counted_cash: string; variance: string } }[];
};
type AuditResult = { businessDateAD: string; foliosAudited: number; totalRevenuePosted: number; extensionConflicts: number };
type ClosingReport = { id: string; businessDate: string; nextBusinessDate: string; closedBy: string; cashier: NonNullable<AuditStatus['cashierClosing']>; summary: AuditStatus['reconciliation'] };

export default function NightAuditPage() {
  const [status, setStatus] = useState<AuditStatus | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [openingCash, setOpeningCash] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDay, setConfirmDay] = useState(false);
  const [receiptMethods, setReceiptMethods] = useState<Record<string, string>>({});
  const [report, setReport] = useState<ClosingReport | null>(null);
  useEffect(() => { if (report) document.getElementById('closing-report')?.scrollIntoView({ behavior: 'smooth' }); }, [report]);
  const loadReport = async (id: string) => {
    try {
      const response = await fetch(`/api/pms/night-audit?closingId=${encodeURIComponent(id)}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load closing report.');
      setReport(payload.closingReport);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load closing report.'); }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/pms/night-audit');
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load night audit.');
      setStatus(payload); setError('');
    } catch (reason) {
      setStatus(null);
      setError(reason instanceof Error ? reason.message : 'Unable to load night audit.');
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchStatus(); }, []);
  useRoomUpdates(fetchStatus);

  const execute = async () => {
    setProcessing(true); setError('');
    try {
      const response = await fetch('/api/pms/night-audit', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to run overnight check.');
      setResult(payload.summary); setConfirming(false); publishRoomUpdate();
      await fetchStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to run overnight check.');
    } finally { setProcessing(false); }
  };
  const date = status ? formatDualDate(status.currentDate) : null;
  const nextDate = status ? new Date(`${status.currentDate}T12:00:00`) : null;
  if (nextDate) nextDate.setDate(nextDate.getDate() + 1);
  const expectedCash = Number(openingCash || 0) + Number(status?.reconciliation.cashNet || 0);
  const closeAction = async (operation: string, extra: Record<string, string> = {}) => {
    if (!status) return;
    setProcessing(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/pms/night-audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, businessDate: status.currentDate, openingCash, countedCash, notes, ...extra }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to complete closing.');
      setNotice(operation === 'CLOSE_DAY' ? `Day closed. Business date: ${formatDualDate(payload.businessDate).adFormatted}.` : operation === 'REOPEN_CASHIER' ? 'Cashier reopened.' : operation === 'CLASSIFY_RECEIPT' ? 'Receipt classified.' : 'Cashier closed.');
      setConfirmDay(false); setNotes(''); setCountedCash(''); if (operation === 'CLOSE_CASHIER' || operation === 'CLOSE_DAY') setOpeningCash(''); publishRoomUpdate();
      await fetchStatus();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to complete closing.'); }
    finally { setProcessing(false); }
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Night Audit</h1>
      <Button variant="secondary" size="sm" onClick={() => fetchStatus()} disabled={loading || processing}><RefreshCw size={14} /> Refresh</Button>
    </div>
    {date && <div style={{ fontSize: 13 }}>Business date: {date.adFormatted}{showNepaliDates() && <span> · BS {date.bsFormatted}</span>} · FY {date.fiscalYearBS}</div>}
    {notice && <div role="status">{notice}</div>}
    {error && <div role="alert" style={{ color: 'var(--danger-red)' }}>{error}</div>}
    {loading && <p>Loading night audit…</p>}
    {status && <>
      <Card title="Operational checks">
        <div className="hne-table-container"><table className="hne-table"><thead><tr><th>Check</th><th>Value</th><th>Action</th></tr></thead><tbody>
          <tr><td>Occupied rooms</td><td>{status.occupiedRooms} / {status.totalRooms} ({status.occupancyRate}%)</td><td><Link href="/admin/pms/rooms">View rooms</Link></td></tr>
          <tr><td>Pending arrivals through today</td><td><Badge variant={status.pendingArrivals ? 'warning' : 'success'}>{status.pendingArrivals}</Badge></td><td><Link href="/admin/pms/reservations">Review bookings</Link></td></tr>
          <tr><td>Departures due through today</td><td>{status.dueDepartures}</td><td><Link href="/admin/pms/frontdesk">Review departures</Link></td></tr>
          <tr><td>Past checkout deadline</td><td><Badge variant={status.overdueDepartures ? 'warning' : 'success'}>{status.overdueDepartures}</Badge></td><td><Link href="/admin/pms/frontdesk">Review stays</Link></td></tr>
          <tr><td>Active guest folios</td><td>{status.openFoliosCount}</td><td><Link href="/admin/pms/frontdesk">View folios</Link></td></tr>
          <tr><td>Outstanding guest balance</td><td>{currencyLabel()} {status.unsettledBalanceTotal.toLocaleString()}</td><td><Link href="/admin/pms/frontdesk">Review balances</Link></td></tr>
          <tr><td>Unsettled restaurant orders</td><td><Badge variant={status.unsettledOrders ? 'warning' : 'success'}>{status.unsettledOrders}</Badge></td><td><Link href="/admin/pos/tables">View tables</Link></td></tr>
          <tr><td>Occupied restaurant tables</td><td>{status.occupiedTables}</td><td><Link href="/admin/pos/tables">View tables</Link></td></tr>
        </tbody></table></div>
      </Card>
      <Card title="Property cashier">
        <div className="hne-table-container"><table className="hne-table"><thead><tr><th>Method</th><th>Receipts</th><th>Refunds</th><th>Supplier payments</th><th>Payroll &amp; advances</th><th>Net</th></tr></thead><tbody>
          {status.reconciliation.tenders.map(tender => <tr key={tender.method}><td>{tender.method.replaceAll('_', ' ')}</td><td>{currencyLabel()} {Number(tender.receipts).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.refunds).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.payments || 0).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.payrollPayments || 0).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.net).toLocaleString()}</td></tr>)}
          {status.reconciliation.tenders.length === 0 && <tr><td colSpan={6}>No receipts, refunds, or payments.</td></tr>}
        </tbody></table></div>
        {status.reconciliation.unclassifiedReceipts.map(receipt => <div key={receipt.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, alignItems: 'center' }}>
          <span>{receipt.voucherNumber} · {currencyLabel()} {Number(receipt.amount).toLocaleString()}</span>
          <select className="hne-input" aria-label={`Payment method for ${receipt.voucherNumber}`} style={{ width: 180 }} value={receiptMethods[receipt.id] || ''} onChange={event => setReceiptMethods(current => ({ ...current, [receipt.id]: event.target.value }))}>
            <option value="">Choose method</option>{['CASH','CARD','BANK_TRANSFER','FONEPAY','ESEWA','KHALTI','OTA'].map(method => <option key={method}>{method}</option>)}
          </select>
          {status.canClose && <Button variant="secondary" disabled={processing || !receiptMethods[receipt.id]} onClick={() => closeAction('CLASSIFY_RECEIPT', { receiptId: receipt.id, paymentMethod: receiptMethods[receipt.id] })}>Classify receipt</Button>}
        </div>)}
        {status.cashierClosing ? <>
          <dl style={{ display: 'flex', gap: 24, flexWrap: 'wrap', margin: '16px 0' }}>
            <div><dt>Expected cash</dt><dd>{currencyLabel()} {Number(status.cashierClosing.expected_cash).toLocaleString()}</dd></div>
            <div><dt>Counted cash</dt><dd>{currencyLabel()} {Number(status.cashierClosing.counted_cash).toLocaleString()}</dd></div>
            <div><dt>Difference</dt><dd>{currencyLabel()} {Number(status.cashierClosing.variance).toLocaleString()}</dd></div>
          </dl>
          <Badge variant="success">Cashier closed</Badge>
          {status.canClose && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}><input className="hne-input" aria-label="Reason to reopen cashier" placeholder="Reason to reopen" value={notes} onChange={event => setNotes(event.target.value)} style={{ maxWidth: 350 }} /><Button variant="secondary" disabled={processing || notes.trim().length < 3} onClick={() => closeAction('REOPEN_CASHIER')}>Reopen cashier</Button></div>}
        </> : status.canClose && <form onSubmit={event => { event.preventDefault(); closeAction('CLOSE_CASHIER'); }} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label className="hne-form-group">Opening cash (NPR)<input className="hne-input" type="number" min="0" step="0.01" required value={openingCash} onChange={event => setOpeningCash(event.target.value)} /><small>Cash in the drawer before this day's transactions.</small></label>
            <label className="hne-form-group">Expected cash (NPR)<input className="hne-input" readOnly value={openingCash.trim() === '' ? '' : expectedCash.toFixed(2)} /></label>
            <label className="hne-form-group">Counted cash (NPR)<input className="hne-input" type="number" min="0" step="0.01" required value={countedCash} onChange={event => setCountedCash(event.target.value)} /></label>
          </div>
          <label className="hne-form-group">Notes / cash difference<textarea className="hne-input" value={notes} onChange={event => setNotes(event.target.value)} required={countedCash !== '' && Number(countedCash) !== expectedCash} /></label>
          <div><Button variant="primary" type="submit" disabled={processing || status.reconciliation.unclassifiedReceipts.length > 0}>{processing ? 'Saving…' : 'Close cashier'}</Button></div>
        </form>}
      </Card>
      <Card title="Close business day">
        {status.reconciliation.blockers.length > 0 && <ul style={{ marginTop: 0 }}>{status.reconciliation.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>}
        {!status.cashierClosing && <p>Close and reconcile the cashier first.</p>}
        {status.canClose && (confirmDay ? <div>
          <p>Close {date?.adFormatted} and advance to {nextDate ? formatDualDate(nextDate).adFormatted : ''}?</p>
          <div style={{ display: 'flex', gap: 10 }}><Button variant="secondary" disabled={processing} onClick={() => setConfirmDay(false)}>Cancel</Button><Button variant="primary" disabled={processing} onClick={() => closeAction('CLOSE_DAY')}>{processing ? 'Closing…' : 'Confirm daily close'}</Button></div>
        </div> : <Button variant="primary" disabled={processing || !status.cashierClosing || status.reconciliation.blockers.length > 0 || status.currentDate > status.calendarDate} onClick={() => setConfirmDay(true)}>Close business day</Button>)}
      </Card>
      <Card title="Overnight extensions">
        {confirming ? <>
          <p style={{ fontSize: 13, marginBottom: 16 }}>Add extra-night charges to eligible overdue stays? Conflicting bookings will be left for staff to resolve.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" disabled={processing} onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="primary" disabled={processing} onClick={execute}>{processing ? 'Processing…' : 'Confirm overnight check'}</Button>
          </div>
        </> : <Button variant="primary" disabled={processing} onClick={() => setConfirming(true)}>Run overnight check</Button>}
      </Card>
    </>}
    {result && <Card title={result.extensionConflicts ? 'Overnight check — conflicts need attention' : 'Overnight check complete'}>
      {result.extensionConflicts > 0 && <div role="alert" style={{ display: 'flex', gap: 8, color: 'var(--danger-red)', marginBottom: 14 }}><AlertTriangle size={18} />Resolve room conflicts before accepting incoming guests.</div>}
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, margin: '0 0 16px' }}>
        <div><dt>Date</dt><dd style={{ margin: '4px 0' }}>{formatDualDate(result.businessDateAD).adFormatted}</dd></div>
        <div><dt>Stays extended</dt><dd style={{ margin: '4px 0' }}>{result.foliosAudited}</dd></div>
        <div><dt>Extra-night charges</dt><dd style={{ margin: '4px 0' }}>{currencyLabel()} {result.totalRevenuePosted.toLocaleString()}</dd></div>
        <div><dt>Room conflicts</dt><dd style={{ margin: '4px 0' }}>{result.extensionConflicts}</dd></div>
      </dl>
      <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print result</Button>
    </Card>}
    {status && status.closingHistory.length > 0 && <Card title="Closing history"><div className="hne-table-container"><table className="hne-table"><thead><tr><th>Closed date</th><th>Next date</th><th>Closed by</th><th>Counted cash</th><th>Difference</th><th>Report</th></tr></thead><tbody>{status.closingHistory.map(record => <tr key={record.id}><td>{formatDualDate(record.businessDate).combined}</td><td>{formatDualDate(record.nextBusinessDate).adFormatted}</td><td>{record.closedBy}</td><td>{currencyLabel()} {Number(record.cashier.counted_cash).toLocaleString()}</td><td>{currencyLabel()} {Number(record.cashier.variance).toLocaleString()}</td><td><Button variant="secondary" size="sm" onClick={() => loadReport(record.id)}>View report</Button></td></tr>)}</tbody></table></div></Card>}
    {report && <div id="closing-report"><Card title={`Closing report · ${formatDualDate(report.businessDate).combined}`}>
      <div style={{ fontSize: 13, marginBottom: 14 }}>Closed by: {report.closedBy}</div>
      <div className="hne-table-container"><table className="hne-table"><thead><tr><th>Method</th><th>Receipts</th><th>Refunds</th><th>Supplier payments</th><th>Payroll &amp; advances</th><th>Net</th></tr></thead><tbody>{report.summary.tenders.map(tender => <tr key={tender.method}><td>{tender.method.replaceAll('_', ' ')}</td><td>{currencyLabel()} {Number(tender.receipts).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.refunds).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.payments || 0).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.payrollPayments || 0).toLocaleString()}</td><td>{currencyLabel()} {Number(tender.net).toLocaleString()}</td></tr>)}</tbody></table></div>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {Object.entries({ 'Opening cash': report.cashier.opening_cash, 'Expected cash': report.cashier.expected_cash, 'Counted cash': report.cashier.counted_cash, 'Cash difference': report.cashier.variance, 'Revenue posted': report.summary.revenue, 'VAT posted': report.summary.vat, 'Guest balance carried forward': report.summary.openGuestBalance }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd style={{ margin: '4px 0' }}>{currencyLabel()} {Number(value).toLocaleString()}</dd></div>)}
      </dl>
      {report.cashier.notes && <p>{report.cashier.notes}</p>}
      <div style={{ display: 'flex', gap: 10 }}><Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print report</Button><Button variant="secondary" onClick={() => setReport(null)}>Close report</Button></div>
    </Card></div>}
  </div>;
}
