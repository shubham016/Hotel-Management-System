import { useEffect, useState } from 'react';
import { ChefHat, RefreshCw } from 'lucide-react';
import { usePortalProfile } from '@/lib/portal-context';
import { posRequest, type KitchenOrder } from '../orders-api';

export default function KitchenPage() {
  const profile = usePortalProfile();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState('');
  const [now, setNow] = useState(Date.now());
  const canServe = profile?.role !== 'KITCHEN';
  async function load() {
    try { const result = await posRequest('kitchen_orders'); setOrders(result.orders.filter((order: KitchenOrder) => order.status !== 'SERVED')); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load kitchen orders.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 10000); return () => window.clearInterval(timer); }, []);
  async function update(order: KitchenOrder, status: string) {
    setUpdating(order.id);
    try { await posRequest(`kitchen_orders/${order.id}`, 'PATCH', { status }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update order.'); }
    finally { setUpdating(''); }
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><h1 style={{ fontSize: 24, display: 'flex', gap: 10, alignItems: 'center' }}><ChefHat /> Kitchen Orders</h1><p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Prepare orders and mark them ready for service. Updates every 10 seconds.</p></div><button className="hne-btn hne-btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button></header>
    {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{['PLACED', 'PREPARING', 'READY'].map(status => <div className="hne-card" key={status} style={{ padding: '12px 20px' }}><strong>{orders.filter(order => order.status === status).length}</strong> {status === 'PLACED' ? 'New' : status === 'PREPARING' ? 'Preparing' : 'Ready'}</div>)}</div>
    {loading ? <p>Loading kitchen orders…</p> : orders.length === 0 ? <div className="hne-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>No active kitchen orders. New restaurant orders will appear here.</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
      {orders.map(order => <article className="hne-card" key={order.id} style={{ padding: 20, borderTop: `4px solid ${order.status === 'READY' ? '#16a34a' : order.status === 'PREPARING' ? '#d97706' : '#dc2626'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h2 style={{ fontSize: 17, fontWeight: 700 }}>Table {order.table}</h2><span style={{ fontWeight: 700 }}>{order.status}</span></div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{order.outlet}<br />{order.number}<br />Sent by {order.server} · {Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000))} min ago</p>
        {order.notes && <p style={{ padding: 10, marginTop: 12, background: 'var(--primary-orange-light)', borderRadius: 6 }}>{order.notes}</p>}
        <ul style={{ paddingLeft: 20, margin: '18px 0', lineHeight: 1.8 }}>{order.items.map((item, index) => <li key={`${item.menuItemId}-${index}`}><strong>{item.quantity} ×</strong> {item.name}</li>)}</ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {order.status === 'PLACED' && <button className="hne-btn hne-btn-secondary" disabled={updating === order.id} onClick={() => void update(order, 'PREPARING')}>Start preparing</button>}
          {['PLACED', 'PREPARING'].includes(order.status) && <button className="hne-btn hne-btn-primary" disabled={updating === order.id} onClick={() => void update(order, 'READY')}>Mark ready</button>}
          {order.status === 'READY' && (canServe ? <button className="hne-btn hne-btn-primary" disabled={updating === order.id} onClick={() => void update(order, 'SERVED')}>Mark served</button> : <p style={{ color: 'var(--green)' }}>Ready for restaurant staff to collect.</p>)}
        </div>
      </article>)}
    </div>}
  </div>;
}
