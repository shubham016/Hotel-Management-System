import { currencyLabel } from '@/lib/display-preferences';
import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Send, UtensilsCrossed } from 'lucide-react';
import Link from '@/lib/router';
import { posRequest, type DiningTable, type KitchenOrder, type MenuItem, type Outlet } from '../orders-api';

type DraftItem = { menuItemId: string; quantity: number };
type RoomOption = { roomNumber: string; guestName: string };
export default function RestaurantPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletCode, setOutletCode] = useState('');
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedId, setSelected] = useState('');
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [taxes, setTaxes] = useState<{ rate: number; inclusive: boolean }[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomNumber, setRoomNumber] = useState('');
  const [mode, setMode] = useState('CASH');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const sendKey = useRef(crypto.randomUUID());
  const settleKey = useRef(crypto.randomUUID());
  const activeOutlet = useRef(outletCode);
  activeOutlet.current = outletCode;
  const outlet = outlets.find(item => item.outletCode === outletCode);
  const table = tables.find(item => item.id === selectedId);
  const menu = outlet?.items || [];
  const money = (amount: number) => `${currencyLabel()} ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    posRequest('menu-items').then(result => { setOutlets(result.outlets); setOutletCode(result.outlets[0]?.outletCode || ''); if (!result.outlets.length) setLoading(false); })
      .catch(reason => { setError(reason.message); setLoading(false); });
  }, []);
  async function load(code: string) {
    if (!code) return;
    try {
      const result = await posRequest(`tables?outlet=${encodeURIComponent(code)}`);
      if (activeOutlet.current !== code) return;
      setTables(result.tables); setRooms(result.inHouseRooms || []); setTaxes(result.taxes || []);
    } catch (reason) { if (activeOutlet.current === code) setError(reason instanceof Error ? reason.message : 'Unable to load tables.'); }
    finally { if (activeOutlet.current === code) setLoading(false); }
  }
  useEffect(() => { if (!outletCode) return; setLoading(true); void load(outletCode); const timer = window.setInterval(() => void load(outletCode), 10000); return () => window.clearInterval(timer); }, [outletCode]);
  function select(id: string) {
    if (draft.length && !window.confirm('Discard the unsent items for this table?')) return;
    setSelected(id); setDraft([]); setNotes(''); setError(''); setMessage(''); sendKey.current = crypto.randomUUID(); settleKey.current = crypto.randomUUID();
  }
  function add(item: MenuItem) {
    if (busy) return;
    setDraft(current => { const existing = current.find(line => line.menuItemId === item.id); return existing ? current.map(line => line.menuItemId === item.id ? { ...line, quantity: Math.min(100, line.quantity + 1) } : line) : [...current, { menuItemId: item.id, quantity: 1 }]; });
    sendKey.current = crypto.randomUUID();
  }
  async function send() {
    if (!table || !draft.length) return;
    setBusy(true); setError(''); setMessage('');
    try { const result = await posRequest('kitchen_orders', 'POST', { tableId: table.id, items: draft, notes, idempotencyKey: sendKey.current }); setDraft([]); setNotes(''); sendKey.current = crypto.randomUUID(); setMessage(`${result.order.number} sent to the kitchen.`); await load(outletCode); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to send kitchen order.'); }
    finally { setBusy(false); }
  }
  async function serve(order: KitchenOrder) {
    setBusy(true); setError('');
    try { await posRequest(`kitchen_orders/${order.id}`, 'PATCH', { status: 'SERVED' }); await load(outletCode); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to mark served.'); }
    finally { setBusy(false); }
  }
  const subtotal = table?.orders.reduce((total, order) => total + order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0), 0) || 0;
  const taxAmount = taxes.reduce((total, tax) => tax.inclusive ? total : total + Math.round((subtotal + total) * tax.rate) / 100, 0);
  const allServed = Boolean(table?.orders.length && table.orders.every(order => order.status === 'SERVED'));
  async function settle() {
    if (!table || !allServed || draft.length) return;
    if (!window.confirm(mode === 'ROOM' ? `Post ${money(subtotal + taxAmount)} to Room ${roomNumber}?` : `Confirm ${money(subtotal + taxAmount)} has been received by ${mode.replaceAll('_', ' ')}?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await posRequest('billing', 'POST', { outletCode, outletName: outlet?.name, tableNumber: table.table_number, kitchenOrderIds: table.orders.map(order => order.id), idempotencyKey: settleKey.current, paymentMethod: mode, postToRoom: mode === 'ROOM', roomNumber: mode === 'ROOM' ? roomNumber : undefined });
      setMessage(mode === 'ROOM' ? `Posted to guest folio ${result.folioNumber}.` : `Payment recorded. Reference: ${result.voucherNumber}.`); settleKey.current = crypto.randomUUID(); await load(outletCode);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to settle this bill.'); }
    finally { setBusy(false); }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h1 style={{ fontSize: 24, display: 'flex', gap: 10, alignItems: 'center' }}><UtensilsCrossed /> Restaurant</h1></div><div style={{ display: 'flex', gap: 8 }}><Link href="/admin/pos/kot" className="hne-btn hne-btn-secondary">Kitchen orders</Link><button className="hne-btn hne-btn-secondary" disabled={busy} onClick={() => void load(outletCode)}><RefreshCw size={16} /> Refresh</button></div></header>
    <label style={{ maxWidth: 420 }}><span className="hne-label">Restaurant / outlet</span><select className="hne-select" value={outletCode} disabled={busy} onChange={event => { if (draft.length && !window.confirm('Discard the unsent items?')) return; setOutletCode(event.target.value); setSelected(''); setDraft([]); setTables([]); setNotes(''); setError(''); setMessage(''); }}>{outlets.map(item => <option key={item.id} value={item.outletCode}>{item.name}</option>)}</select></label>
    {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}{message && <p role="status" style={{ color: 'var(--green)' }}>{message}</p>}
    {loading ? <p>Loading tables…</p> : tables.length === 0 ? <p>No tables configured for this outlet.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>{tables.map(item => <button key={item.id} disabled={busy} className="hne-card" onClick={() => select(item.id)} style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: `2px solid ${item.id === selectedId ? 'var(--primary-orange)' : 'var(--border)'}` }}><strong>Table {item.table_number}</strong><p style={{ fontSize: 12, marginTop: 6 }}>{item.orders.length ? `${item.orders.length} active ticket(s)` : 'Available'} · {item.capacity} seats</p>{item.orders.some(order => order.status === 'READY') && <p style={{ color: 'var(--green)', fontSize: 12 }}>Order ready to serve</p>}</button>)}</div>}
    {table && <section className="hne-card" style={{ padding: 20 }}><h2 style={{ fontSize: 20, marginBottom: 16 }}>Table {table.table_number}</h2>
      <h3 style={{ fontSize: 15, marginBottom: 10 }}>Add menu items</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>{menu.map(item => <button className="hne-btn hne-btn-secondary" disabled={busy} key={item.id} onClick={() => add(item)} style={{ display: 'block', textAlign: 'left', whiteSpace: 'normal' }}>{item.name}<br /><small>{money(item.price)}</small></button>)}</div>
      {draft.length > 0 && <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-main)', borderRadius: 8 }}><h3 style={{ fontSize: 16 }}>Unsent items</h3>{draft.map(item => <div key={item.menuItemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}><span>{item.quantity} × {menu.find(product => product.id === item.menuItemId)?.name}</span><button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={busy} onClick={() => { setDraft(current => current.filter(line => line.menuItemId !== item.menuItemId)); sendKey.current = crypto.randomUUID(); }}>Remove</button></div>)}<label className="hne-form-group"><span className="hne-label">Kitchen notes / dietary requirements</span><textarea className="hne-input" maxLength={500} disabled={busy} value={notes} onChange={event => { setNotes(event.target.value); sendKey.current = crypto.randomUUID(); }} /></label><button disabled={busy} className="hne-btn hne-btn-primary" onClick={() => void send()}><Send size={16} /> {busy ? 'Sending…' : 'Send to kitchen'}</button></div>}
      <div style={{ marginTop: 24 }}><h3 style={{ fontSize: 16, marginBottom: 12 }}>Saved orders</h3>{!table.orders.length ? <p style={{ color: 'var(--text-secondary)' }}>No orders sent yet.</p> : table.orders.map(order => <article key={order.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}><div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}><strong>{order.number}</strong><span>{order.status}</span></div>{order.items.map((item, index) => <p key={index} style={{ marginTop: 6 }}>{item.quantity} × {item.name} — {money(Number(item.unitPrice) * item.quantity)}</p>)}{order.notes && <p style={{ fontSize: 12, marginTop: 6 }}>Notes: {order.notes}</p>}{order.status === 'READY' && <button className="hne-btn hne-btn-primary hne-btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={() => void serve(order)}>Mark served</button>}</article>)}</div>
      {table.orders.length > 0 && <div style={{ marginTop: 24 }}><p>Subtotal: {money(subtotal)} · VAT: {money(taxAmount)}</p><p style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 16px' }}>Total: {money(subtotal + taxAmount)}</p><div style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}><label><span className="hne-label">Settlement</span><select className="hne-select" disabled={busy} value={mode} onChange={event => { setMode(event.target.value); settleKey.current = crypto.randomUUID(); }}>{['CASH', 'BANK_TRANSFER', 'CARD', 'FONEPAY', 'ESEWA', 'KHALTI', 'ROOM'].map(value => <option key={value} value={value}>{value === 'ROOM' ? 'Post to guest room' : value.replaceAll('_', ' ')}</option>)}</select></label>{mode === 'ROOM' && <label><span className="hne-label">In-house guest room</span><select required className="hne-select" disabled={busy} value={roomNumber} onChange={event => { setRoomNumber(event.target.value); settleKey.current = crypto.randomUUID(); }}><option value="">Select room</option>{rooms.map(room => <option key={room.roomNumber} value={room.roomNumber}>Room {room.roomNumber} — {room.guestName}</option>)}</select></label>}<button className="hne-btn hne-btn-primary" disabled={busy || !allServed || draft.length > 0 || (mode === 'ROOM' && !roomNumber)} onClick={() => void settle()}>Confirm settlement</button></div>{(!allServed || draft.length > 0) && <p style={{ fontSize: 12, marginTop: 10, color: 'var(--text-secondary)' }}>Send unsent items and mark every order served before settling this table.</p>}<p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Record direct payments only after receiving them. Selecting a wallet here records the payment; it does not collect it online.</p></div>}
    </section>}
  </div>;
}
