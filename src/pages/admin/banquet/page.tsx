import { currencyLabel, showNepaliDates } from '@/lib/display-preferences';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormDialog } from '@/components/admin/FormDialog';
import { DualCalendarPicker } from '@/components/ui/DualCalendarPicker';
import { formatDualDate } from '@/lib/nepali-calendar';
import { usePortalProfile } from '@/lib/portal-context';
import { hasAccess } from '@/lib/portal-access';
import './banquet.css';

type Tax = { rate?: string; inclusive?: boolean };
type Hall = { id: string; name: string; code: string; theater_capacity: number; base_rent: string };
type CashAccount = { id: string; code: string; name: string };
type Transaction = { id: string; kind: string; number: string; amount: number; method: string | null; reference: string | null; businessDate: string; voucherNumber: string | null; user: string; reason: string | null };
type Booking = { id: string; bookingNumber: string; eventName: string; eventType: string; hallCode: string; hallName: string; guestName: string; phone: string; startDate: string; expectedPax: number; setupLayout: string | null; hallRent: number; cateringTotal: number; grandTotal: number; hallNet: number; cateringNet: number; taxAmount: number; tax: Tax; advancePaid: number; balanceDue: number; legacyAdvance: number; cancellationFee: number; refundDue: number; cancellationReason: string | null; notes: string | null; version: number; status: string; transactions: Transaction[] };
type EventForm = { eventName: string; eventType: string; hallCode: string; guestName: string; phone: string; startDate: string; expectedPax: string; setupLayout: string; hallRent: string; cateringTotal: string; specialRequests: string };
type Operation = 'receipt' | 'refund' | 'settle' | 'cancel' | 'reconcile';
type ActionForm = { kind: Operation; key: string; amount: string; paymentMethod: string; accountId: string; transactionRef: string; reason: string; cancellationFee: string; reconciliationMode: string; voucherNumber: string; confirmedUnposted: boolean; version: number };
const money = (value: number) => `${currencyLabel()} ${value.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const titles: Record<Operation, string> = { receipt: 'Record payment', refund: 'Record refund', settle: 'Complete & settle', cancel: 'Cancel event', reconcile: 'Reconcile earlier advance' };
const dateToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
async function request(path = '', method = 'GET', body?: unknown) {
  const response = await fetch(`/api/banquet/bookings${path}`, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok || !data.success) {
    const details = data.details ? Object.entries(data.details).map(([field, errors]) => `${field.replaceAll('_', ' ')}: ${(Array.isArray(errors) ? errors : [errors]).join(', ')}`).join('; ') : '';
    throw new Error(details || data.error || 'Unable to save event.');
  }
  return data;
}
function preview(form: EventForm, tax: Tax) {
  const base = Math.round(Number(form.hallRent || 0) * 100) + Math.round(Number(form.cateringTotal || 0) * 100);
  const rate = Number(tax.rate || 0) / 100;
  const vat = tax.inclusive ? Math.round(base - base / (1 + rate)) : Math.round(base * rate);
  return { vat: vat / 100, total: (base + (tax.inclusive ? 0 : vat)) / 100 };
}
export default function BanquetManagementPage() {
  const profile = usePortalProfile();
  const allowed = (action: string) => hasAccess(profile, 'BOOKINGS', action);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [tax, setTax] = useState<Tax>({});
  const [businessDate, setBusinessDate] = useState(dateToday());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingVersion, setEditingVersion] = useState(0);
  const [form, setForm] = useState<EventForm | null>(null);
  const [action, setAction] = useState<ActionForm | null>(null);
  const createKey = useRef(crypto.randomUUID());
  const selected = bookings.find(b => b.id === selectedId);

  async function load() {
    try {
      const data = await request();
      setBookings(data.bookings); setHalls(data.halls); setAccounts(data.accounts); setTax(data.tax); setBusinessDate(data.businessDate); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load events.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function openEvent(booking?: Booking) {
    setFormError(''); setEditingId(booking?.id || ''); setEditingVersion(booking?.version || 0); createKey.current = crypto.randomUUID();
    const hall = halls.find(h => h.code === booking?.hallCode) || halls[0];
    setForm({ eventName: booking?.eventName || '', eventType: booking?.eventType || 'CONFERENCE', hallCode: booking?.hallCode || hall?.code || '', guestName: booking?.guestName || '', phone: booking?.phone || '',
      startDate: booking?.startDate || businessDate, expectedPax: String(booking?.expectedPax || 1), setupLayout: booking?.setupLayout || '', hallRent: String(booking?.hallRent ?? hall?.base_rent ?? 0), cateringTotal: String(booking?.cateringTotal || 0), specialRequests: booking?.notes || '' });
  }
  function change<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm(current => current ? { ...current, [key]: value } : current); createKey.current = crypto.randomUUID();
  }
  async function saveEvent(event: FormEvent) {
    event.preventDefault(); if (!form || saving) return; setSaving(true); setFormError('');
    try {
      const data = await request(editingId ? `/${editingId}` : '', editingId ? 'PATCH' : 'POST', { ...form, version: editingVersion, idempotencyKey: createKey.current });
      setForm(null); setSelectedId(data.data.id); setMessage(editingId ? 'Event updated.' : 'Event booked.'); await load();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Unable to save event.'); }
    finally { setSaving(false); }
  }
  function openAction(kind: Operation) {
    if (!selected) return; setFormError('');
    setAction({ kind, key: crypto.randomUUID(), amount: String(kind === 'refund' ? selected.status === 'CANCELLED' ? selected.refundDue : selected.advancePaid : selected.balanceDue), paymentMethod: 'CASH', accountId: accounts[0]?.id || '', transactionRef: '', reason: '', cancellationFee: '0', reconciliationMode: 'LINK', voucherNumber: '', confirmedUnposted: false, version: selected.version });
  }
  function changeAction(values: Partial<ActionForm>) { setAction(current => current ? { ...current, ...values, key: crypto.randomUUID() } : current); }
  async function saveAction(event: FormEvent) {
    event.preventDefault(); if (!action || !selected || saving) return; setSaving(true); setFormError('');
    try {
      await request(`/${selected.id}/${action.kind}`, 'POST', { ...action, idempotencyKey: action.key });
      setAction(null); setMessage(action.kind === 'cancel' ? 'Event cancelled.' : action.kind === 'settle' ? 'Event completed and settled.' : action.kind === 'refund' ? 'Refund recorded.' : action.kind === 'reconcile' ? 'Earlier advance reconciled.' : 'Payment recorded.'); await load();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Unable to save transaction.'); }
    finally { setSaving(false); }
  }
  function printStatement(booking: Booking) {
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const popup = window.open('', '_blank', 'width=900,height=800'); if (!popup) { setError('Allow pop-ups to print the statement.'); return; }
    popup.document.write(`<html><head><title>${escape(booking.bookingNumber)}</title><style>body{font:14px Arial;padding:28px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}h1{font-size:22px}</style></head><body><h1>${escape(profile?.properties?.[0]?.name || 'Banquet statement')}</h1><h2>${escape(booking.eventName)}</h2><p>${escape(booking.bookingNumber)} Â· ${escape(booking.status)}</p><p>${escape(booking.hallName)} Â· ${escape(formatDualDate(booking.startDate).combined)} Â· ${booking.expectedPax} guests</p><p>${escape(booking.guestName)} Â· ${escape(booking.phone)}</p><table><tr><th>Hall charge</th><th>Catering charge</th><th>VAT</th><th>Total</th><th>Net paid</th><th>Balance due</th><th>Refund due</th></tr><tr>${[booking.hallNet, booking.cateringNet, booking.taxAmount, booking.grandTotal, booking.advancePaid, booking.balanceDue, booking.refundDue].map(v => `<td>${money(v)}</td>`).join('')}</tr></table><table><tr><th>Date</th><th>Document</th><th>Type</th><th>Amount</th><th>Method</th><th>Reference</th><th>Voucher</th></tr>${booking.transactions.map(t => `<tr>${[t.businessDate, t.number, t.kind.replaceAll('_', ' '), money(t.amount), t.method, t.reference, t.voucherNumber].map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</table>${booking.legacyAdvance > 0 ? `<p>Earlier advance awaiting reconciliation: ${money(booking.legacyAdvance)}</p>` : ''}${booking.cancellationReason ? `<p>Cancellation: ${escape(booking.cancellationReason)} Â· Charge: ${money(booking.cancellationFee)}</p>` : ''}</body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  }

  const editing = bookings.find(b => b.id === editingId);
  const formTax = form && editing && Number(form.hallRent) === editing.hallRent && Number(form.cateringTotal) === editing.cateringTotal ? editing.tax : tax;
  const quote = form ? preview(form, formTax) : null;
  const needsTender = action && selected && (['receipt', 'refund', 'reconcile'].includes(action.kind) || (action.kind === 'settle' && selected.balanceDue > 0));
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <h1 style={{ fontSize: 24 }}>Banquet & Events</h1><div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" disabled={loading || saving} onClick={() => void load()}><RefreshCw size={15} /> Refresh</Button>{allowed('create') && <Button disabled={loading || saving || !halls.length} onClick={() => openEvent()}><Plus size={16} /> New event</Button>}</div>
    </header>
    {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}{message && <p role="status" style={{ color: 'var(--brand-green)' }}>{message}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12 }}>{halls.map(h => <div className="hne-card" key={h.id} style={{ padding: 18 }}><strong>{h.name}</strong><div style={{ marginTop: 6 }}>Capacity: {h.theater_capacity} Â· Daily rate: {money(Number(h.base_rent))}</div></div>)}</div>
    <Card title={`Events (${bookings.length})`}>
      {loading ? <p>Loading eventsâ€¦</p> : <div className="hne-table-container"><table className="hne-table"><thead><tr><th>Event</th><th>Hall / Date</th><th>Organizer</th><th>Guests</th><th>Total</th><th>Paid / Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {bookings.map(b => <tr key={b.id}><td><strong>{b.eventName}</strong><div style={{ fontSize: 11 }}>{b.bookingNumber}</div></td><td>{b.hallName}<div style={{ fontSize: 12 }}>{formatDualDate(b.startDate).adFormatted}{showNepaliDates() && <span><br />{formatDualDate(b.startDate).bsDateString} BS</span>}</div></td><td>{b.guestName}<div style={{ fontSize: 12 }}>{b.phone}</div></td><td>{b.expectedPax}</td><td>{money(b.grandTotal)}</td><td>{money(b.advancePaid)}<div style={{ fontSize: 12 }}>{b.refundDue > 0 ? `Refund due: ${money(b.refundDue)}` : `Due: ${money(b.balanceDue)}`}</div></td><td><Badge variant={b.status === 'CANCELLED' ? 'danger' : b.status === 'COMPLETED' ? 'success' : 'primary'}>{b.status}</Badge></td><td><Button variant="secondary" size="sm" disabled={saving} onClick={() => { setSelectedId(b.id); setFormError(''); }}>View</Button></td></tr>)}
        {!bookings.length && <tr><td colSpan={8}>No events booked.</td></tr>}
      </tbody></table></div>}
    </Card>
    {selected && !form && !action && <FormDialog title={selected.eventName} className="banquet-event-details" saving={saving} onClose={() => setSelectedId('')}>
      <p>{selected.bookingNumber} Â· {selected.status}</p><p style={{ marginTop: 8 }}>{selected.hallName} Â· {formatDualDate(selected.startDate).combined}</p><p>{selected.guestName} Â· {selected.phone} Â· {selected.expectedPax} guests</p>
      {selected.notes && <p style={{ marginTop: 8 }}>{selected.notes}</p>}
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, margin: '20px 0' }}>{[['Hall charge', selected.hallNet], ['Catering charge', selected.cateringNet], ['VAT', selected.taxAmount], ['Total', selected.grandTotal], ['Net paid', selected.advancePaid], ['Balance due', selected.balanceDue], ...(selected.status === 'CANCELLED' ? [['Cancellation charge', selected.cancellationFee], ['Refund due', selected.refundDue]] : [])].map(([label, value]) => <div key={String(label)} style={{ display: 'contents' }}><dt>{label}</dt><dd style={{ fontWeight: 700 }}>{money(Number(value))}</dd></div>)}</dl>
      {selected.cancellationReason && <p>Cancellation reason: {selected.cancellationReason}</p>}
      {selected.legacyAdvance > 0 && <p role="alert" style={{ marginBottom: 12 }}>Earlier advance awaiting reconciliation: {money(selected.legacyAdvance)}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {selected.status === 'CONFIRMED' && allowed('update') && <Button variant="secondary" disabled={saving} onClick={() => openEvent(selected)}>Edit event</Button>}
        {selected.legacyAdvance > 0 ? allowed('reconcile') && <Button disabled={saving} onClick={() => openAction('reconcile')}>Reconcile advance</Button> : <>
          {selected.status === 'CONFIRMED' && <>{selected.balanceDue > 0 && allowed('receipt') && <Button disabled={saving} onClick={() => openAction('receipt')}>Record payment</Button>}{allowed('settle') && <Button disabled={saving || selected.startDate > businessDate} onClick={() => openAction('settle')}>Complete & settle</Button>}{allowed('cancel') && <Button variant="danger" disabled={saving} onClick={() => openAction('cancel')}>Cancel event</Button>}</>}
          {selected.status !== 'COMPLETED' && (selected.status === 'CANCELLED' ? selected.refundDue : selected.advancePaid) > 0 && allowed('refund') && <Button variant="secondary" disabled={saving} onClick={() => openAction('refund')}>Refund</Button>}
        </>}
        <Button variant="secondary" disabled={saving} onClick={() => printStatement(selected)}>Print statement</Button>
      </div>
      <h3 style={{ marginBottom: 8 }}>Transactions</h3><div className="hne-table-container"><table className="hne-table"><thead><tr><th>Date / Document</th><th>Type</th><th>Amount</th><th>Method / Reference</th><th>Voucher / Staff</th></tr></thead><tbody>{selected.transactions.map(t => <tr key={t.id}><td>{t.businessDate}<div style={{ fontSize: 11 }}>{t.number}</div></td><td>{t.kind.replaceAll('_', ' ')}</td><td>{money(t.amount)}</td><td>{t.method?.replaceAll('_', ' ')}<div style={{ fontSize: 11 }}>{t.reference}{t.reason && <div>{t.reason}</div>}</div></td><td>{t.voucherNumber}<div style={{ fontSize: 11 }}>{t.user}</div></td></tr>)}{!selected.transactions.length && <tr><td colSpan={5}>No transactions recorded.</td></tr>}</tbody></table></div>
    </FormDialog>}
    {form && <FormDialog title={editingId ? 'Edit event' : 'New event'} saving={saving} onClose={() => setForm(null)}><form onSubmit={saveEvent}>
      {formError && <p role="alert" style={{ color: 'var(--danger-red)', marginBottom: 12 }}>{formError}</p>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, display: 'grid', gap: 14 }}>
        <label className="hne-form-group"><span className="hne-label">Event name</span><input required className="hne-input" value={form.eventName} onChange={e => change('eventName', e.target.value)} /></label>
        <label className="hne-form-group"><span className="hne-label">Hall</span><select required className="hne-select" value={form.hallCode} onChange={e => { change('hallCode', e.target.value); change('hallRent', String(halls.find(h => h.code === e.target.value)?.base_rent || 0)); }}>{!halls.some(h => h.code === form.hallCode) && <option value={form.hallCode}>{editing?.hallName} (inactive)</option>}{halls.map(h => <option key={h.id} value={h.code}>{h.name} ({h.theater_capacity})</option>)}</select></label>
        <label className="hne-form-group"><span className="hne-label">Event type</span><select className="hne-select" value={form.eventType} onChange={e => change('eventType', e.target.value)}>{['CONFERENCE', 'SEMINAR', 'WEDDING', 'CORPORATE_DINNER', 'MEETING'].map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
        <DualCalendarPicker label="Event date" value={form.startDate} onChange={value => change('startDate', value)} minDate={editing && editing.startDate < businessDate ? editing.startDate : businessDate} />
        <label className="hne-form-group"><span className="hne-label">Guests</span><input required type="number" min={1} max={halls.find(h => h.code === form.hallCode)?.theater_capacity} className="hne-input" value={form.expectedPax} onChange={e => change('expectedPax', e.target.value)} /></label>
        <label className="hne-form-group"><span className="hne-label">Organizer name</span><input required className="hne-input" value={form.guestName} onChange={e => change('guestName', e.target.value)} /></label>
        <label className="hne-form-group"><span className="hne-label">Phone</span><input required type="tel" className="hne-input" value={form.phone} onChange={e => change('phone', e.target.value)} /></label>
        <label className="hne-form-group"><span className="hne-label">Layout</span><input className="hne-input" value={form.setupLayout} onChange={e => change('setupLayout', e.target.value)} /></label>
        <label className="hne-form-group"><span className="hne-label">Hall rent (NPR{formTax.inclusive ? ', VAT inclusive' : ''})</span><input required type="number" min={0} step="0.01" className="hne-input" value={form.hallRent} onChange={e => change('hallRent', e.target.value)} /></label>
        <label className="hne-form-group"><span className="hne-label">Catering (NPR{formTax.inclusive ? ', VAT inclusive' : ''})</span><input required type="number" min={0} step="0.01" className="hne-input" value={form.cateringTotal} onChange={e => change('cateringTotal', e.target.value)} /></label>
        <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}><dt>VAT ({Number(formTax.rate || 0)}%)</dt><dd>{money(editing && form.hallRent === String(editing.hallRent) && form.cateringTotal === String(editing.cateringTotal) ? editing.taxAmount : quote?.vat || 0)}</dd><dt>Total</dt><dd style={{ fontWeight: 700 }}>{money(editing && Number(form.hallRent) === editing.hallRent && Number(form.cateringTotal) === editing.cateringTotal ? editing.grandTotal : quote?.total || 0)}</dd></dl>
        <label className="hne-form-group"><span className="hne-label">Notes</span><textarea className="hne-input" value={form.specialRequests} onChange={e => change('specialRequests', e.target.value)} /></label>
      </fieldset><div className="hne-modal-footer"><Button type="button" variant="secondary" disabled={saving} onClick={() => setForm(null)}>Close</Button><Button type="submit" disabled={saving}>{saving ? 'Savingâ€¦' : 'Save event'}</Button></div>
    </form></FormDialog>}
    {action && selected && <FormDialog title={titles[action.kind]} saving={saving} onClose={() => setAction(null)}><form onSubmit={saveAction}>
      {formError && <p role="alert" style={{ color: 'var(--danger-red)', marginBottom: 12 }}>{formError}</p>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, display: 'grid', gap: 14 }}>
        {action.kind === 'settle' && <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}><dt>Event total</dt><dd>{money(selected.grandTotal)}</dd><dt>Paid</dt><dd>{money(selected.advancePaid)}</dd><dt>Payment to record</dt><dd>{money(selected.balanceDue)}</dd></dl>}
        {['receipt', 'refund'].includes(action.kind) && <label className="hne-form-group"><span className="hne-label">Amount (NPR)</span><input required type="number" min="0.01" step="0.01" max={action.kind === 'receipt' ? selected.balanceDue : selected.status === 'CANCELLED' ? selected.refundDue : selected.advancePaid} className="hne-input" value={action.amount} onChange={e => changeAction({ amount: e.target.value })} /></label>}
        {action.kind === 'cancel' && <><label className="hne-form-group"><span className="hne-label">Cancellation charge (NPR, VAT inclusive)</span><input required type="number" min={0} max={selected.advancePaid} step="0.01" className="hne-input" value={action.cancellationFee} onChange={e => changeAction({ cancellationFee: e.target.value })} /></label><div>Refund due: {money(Math.max(0, selected.advancePaid - Number(action.cancellationFee)))}</div></>}
        {action.kind === 'reconcile' && <><div>Earlier advance: {money(selected.legacyAdvance)}</div><label className="hne-form-group"><span className="hne-label">Reconciliation</span><select className="hne-select" value={action.reconciliationMode} onChange={e => changeAction({ reconciliationMode: e.target.value })}><option value="LINK">Link existing receipt</option><option value="POST_NEW">Post unrecorded receipt</option></select></label>{action.reconciliationMode === 'LINK' ? <label className="hne-form-group"><span className="hne-label">Prior journal voucher</span><input required className="hne-input" value={action.voucherNumber} onChange={e => changeAction({ voucherNumber: e.target.value })} /></label> : <label><input type="checkbox" required checked={action.confirmedUnposted} onChange={e => changeAction({ confirmedUnposted: e.target.checked })} /> This advance has not been posted to Accounts.</label>}</>}
        {needsTender && <><label className="hne-form-group"><span className="hne-label">Payment method</span><select className="hne-select" value={action.paymentMethod} onChange={e => changeAction({ paymentMethod: e.target.value })}><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option></select></label><label className="hne-form-group"><span className="hne-label">Cash / bank account</span><select required className="hne-select" value={action.accountId} onChange={e => changeAction({ accountId: e.target.value })}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} Â· {a.name}</option>)}</select></label><label className="hne-form-group"><span className="hne-label">Receipt / transfer reference{action.paymentMethod === 'CASH' ? ' (optional)' : ''}</span><input required={action.paymentMethod === 'BANK_TRANSFER'} className="hne-input" value={action.transactionRef} onChange={e => changeAction({ transactionRef: e.target.value })} /></label></>}
        {['refund', 'cancel', 'reconcile'].includes(action.kind) && <label className="hne-form-group"><span className="hne-label">Reason</span><textarea required minLength={3} className="hne-input" value={action.reason} onChange={e => changeAction({ reason: e.target.value })} /></label>}
        {needsTender && <p style={{ fontSize: 12 }}>{action.kind === 'refund' ? 'Confirm the money has been paid out before recording this refund.' : action.kind === 'reconcile' ? 'Check the original receipt before reconciling this advance.' : 'Confirm the money has been received before recording this payment.'}</p>}
      </fieldset><div className="hne-modal-footer"><Button type="button" variant="secondary" disabled={saving} onClick={() => setAction(null)}>Close</Button><Button type="submit" variant={action.kind === 'cancel' || action.kind === 'refund' ? 'danger' : 'primary'} disabled={saving || Boolean(needsTender && !accounts.length)}>{saving ? 'Savingâ€¦' : titles[action.kind]}</Button></div>
    </form></FormDialog>}
  </div>;
}
