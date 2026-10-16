import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FormDialog } from '@/components/admin/FormDialog';
import { usePortalProfile } from '@/lib/portal-context';
import { hasAccess } from '@/lib/portal-access';
import { money, supplyRequest, type Item, type Store, type Movement } from '../supply-api';

type MoveForm = { operation: string; itemId: string; storeId: string; destinationStoreId: string; quantity: string; department: string; notes: string; idempotencyKey: string };
export default function InventoryStoresPage() {
  const profile = usePortalProfile();
  const allowed = (action: string) => hasAccess(profile, 'ITEMS', action);
  const [items, setItems] = useState<Item[]>([]), [stores, setStores] = useState<Store[]>([]), [movements, setMovements] = useState<Movement[]>([]);
  const [storeId, setStoreId] = useState(''), [search, setSearch] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [formError, setFormError] = useState(''), [message, setMessage] = useState('');
  const [move, setMove] = useState<MoveForm | null>(null), [master, setMaster] = useState<'catalog' | 'store' | null>(null);
  const [fields, setFields] = useState({ name: '', sku: '', code: '', unit: '', category: '', standardCost: '0', minStock: '0' });
  const activeStore = useRef(storeId); activeStore.current = storeId;
  const [opening,setOpening]=useState({required:false,value:0,posted:0});
  const [review,setReview]=useState<{mode:string;reason:string;confirmedReview:boolean;idempotencyKey:string}|null>(null);
  async function saveReview(e:FormEvent){e.preventDefault();if(!review||saving)return;setSaving(true);setFormError('');try{await supplyRequest('inventory/items/reconcile','POST',review);setReview(null);setMessage('Opening stock reviewed.');await load();}catch(e){setFormError(e instanceof Error?e.message:'Unable to review stock.');}finally{setSaving(false);}}
  async function load(id = storeId) {
    try {
      const data = await supplyRequest(`inventory/items${id ? `?storeId=${encodeURIComponent(id)}` : ''}`);
      if (activeStore.current !== id) return;
      setItems(data.items); setStores(data.stores); setMovements(data.movements);setOpening({required:data.openingReviewRequired,value:data.openingStockValue,posted:data.postedStockValue}); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load inventory.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { setLoading(true); void load(storeId); }, [storeId]);
  const selectedItem = items.find(item => item.id === move?.itemId);
  const available = selectedItem?.storesBreakdown.find(b => b.storeId === move?.storeId)?.qty || 0;
  const filtered = items.filter(i => `${i.name} ${i.sku}`.toLowerCase().includes(search.toLowerCase()));
  function openMove() {
    setFormError('');setMove({ operation: 'ISSUE', itemId: '', storeId: storeId || stores.find(s => s.code === 'MAIN')?.id || stores[0]?.id || '', destinationStoreId: '', quantity: '', department: '', notes: '', idempotencyKey: crypto.randomUUID() });
  }
  function changeMove(values: Partial<MoveForm>) { setMove(current => current ? { ...current, ...values, idempotencyKey: crypto.randomUUID() } : current); }
  async function saveMove(e: FormEvent) {
    e.preventDefault();if (!move || saving) return;setSaving(true);setFormError('');
    try { const result = await supplyRequest('inventory/items', 'POST', move);setMove(null);setMessage(`${result.data.number}: stock ${move.operation === 'TRANSFER' ? 'transferred' : 'issued'}.`);await load(); }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Unable to move stock.'); } finally { setSaving(false); }
  }
  function openMaster(kind: 'catalog' | 'store') { setMaster(kind);setFormError('');setFields({ name: '', sku: '', code: '', unit: '', category: '', standardCost: '0', minStock: '0' }); }
  async function saveMaster(e: FormEvent) {
    e.preventDefault();if (!master || saving) return;setSaving(true);setFormError('');
    try { await supplyRequest(`inventory/items/${master}`, 'POST', fields);setMessage(master === 'store' ? 'Store added.' : 'Item added.');setMaster(null);await load(); }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Unable to save.'); } finally { setSaving(false); }
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><h1 style={{ fontSize: 24 }}>Inventory & Stores</h1><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Button variant="secondary" disabled={loading || saving} onClick={() => void load()}><RefreshCw size={15} /> Refresh</Button>
      {allowed('store') && <Button variant="secondary" disabled={saving} onClick={() => openMaster('store')}>Add store</Button>}{allowed('catalog') && <Button variant="secondary" disabled={saving} onClick={() => openMaster('catalog')}>Add item</Button>}
      {allowed('create') && <Button disabled={loading || saving || opening.required || !items.length || !stores.length} onClick={openMove}>Issue / transfer</Button>}
    </div></header>
    {opening.required&&<div role="status"><p>Review opening stock before receiving goods, posting invoices, or moving stock.</p>{allowed('reconcile')&&<Button variant="secondary" onClick={()=>{setFormError('');setReview({mode:'LINK',reason:'',confirmedReview:false,idempotencyKey:crypto.randomUUID()});}}>Review opening stock</Button>}</div>}
    {review&&<FormDialog title="Review opening stock" saving={saving} onClose={()=>setReview(null)}><form onSubmit={saveReview}>{formError&&<p role="alert">{formError}</p>}<fieldset disabled={saving} style={{border:0,padding:0,display:'grid',gap:14}}><dl><dt>Stock value · all property stores</dt><dd>{money(opening.value)}</dd><dt>Posted stock balance</dt><dd>{money(opening.posted)}</dd><dt>Difference</dt><dd>{money(opening.value-opening.posted)}</dd></dl><label><span className="hne-label">Reconciliation</span><select className="hne-select" value={review.mode} onChange={e=>setReview(r=>r?{...r,mode:e.target.value,idempotencyKey:crypto.randomUUID()}:r)}><option value="LINK">Confirm matching posted stock balance</option><option value="ADJUST">Post difference against opening equity</option></select></label><label><span className="hne-label">Review reason</span><textarea required minLength={3} className="hne-input" value={review.reason} onChange={e=>setReview(r=>r?{...r,reason:e.target.value,idempotencyKey:crypto.randomUUID()}:r)}/></label><label><input required type="checkbox" checked={review.confirmedReview} onChange={e=>setReview(r=>r?{...r,confirmedReview:e.target.checked,idempotencyKey:crypto.randomUUID()}:r)}/> I checked the stock valuation and prior accounting entries.</label></fieldset><div className="hne-modal-footer"><Button type="submit" disabled={saving}>Confirm stock review</Button></div></form></FormDialog>}
    {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}{message && <p role="status" style={{ color: 'var(--brand-green)' }}>{message}</p>}
    <label style={{ maxWidth: 400 }}><span className="hne-label">Store</span><select className="hne-select" value={storeId} disabled={saving} onChange={e => setStoreId(e.target.value)}><option value="">All stores</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>{[['Stock value', money(items.reduce((sum, i) => sum + i.totalValuation, 0))], ['Catalog items', items.length], ['Low stock', items.filter(i => i.isLow).length]].map(([label,value]) => <div className="hne-card" key={String(label)} style={{ padding: 18 }}><div style={{ fontSize: 12 }}>{label}</div><strong style={{ fontSize: 22 }}>{value}</strong></div>)}</div>
    <Card title={`Stock (${filtered.length})`}><input aria-label="Search inventory" className="hne-input" placeholder="Search item or SKU" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16 }} />
      {loading ? <p>Loading inventory…</p> : <div className="hne-table-container"><table className="hne-table"><thead><tr><th>SKU / Item</th><th>Category</th><th>On hand</th><th>Store balances</th><th>Average cost</th><th>Stock value</th><th>Status</th></tr></thead><tbody>{filtered.map(i => <tr key={i.id}><td><strong>{i.name}</strong><div style={{ fontSize: 11 }}>{i.sku}</div></td><td>{i.category}</td><td>{i.currentStock} {i.unit}<div style={{ fontSize: 11 }}>Min: {i.minStock}</div></td><td>{i.storesBreakdown.map(s => <div key={s.storeId}>{s.storeName}: {s.qty} {i.unit}</div>)}</td><td>{money(i.unitPrice)}</td><td>{money(i.totalValuation)}</td><td><Badge variant={i.isLow ? 'warning' : 'success'}>{i.isLow ? 'LOW STOCK' : 'IN STOCK'}</Badge></td></tr>)}{!filtered.length && <tr><td colSpan={7}>No items found.</td></tr>}</tbody></table></div>}
    </Card>
    <Card title="Stock movements"><div className="hne-table-container"><table className="hne-table"><thead><tr><th>Date / Reference</th><th>Item</th><th>Type</th><th>Quantity</th><th>From / To</th><th>Value</th><th>Staff / Notes</th></tr></thead><tbody>{movements.map(m => <tr key={m.id}><td>{m.businessDate}<div style={{ fontSize: 11 }}>{m.number}</div></td><td>{m.itemName}</td><td>{m.kind}</td><td>{m.quantity} {m.unit}</td><td>{m.sourceStore || 'Supplier'} → {m.destinationStore || m.department}</td><td>{money(m.totalCost)}</td><td>{m.staff}<div style={{ fontSize: 11 }}>{m.notes}</div></td></tr>)}{!movements.length && <tr><td colSpan={7}>No stock movements recorded.</td></tr>}</tbody></table></div></Card>
    {move && <FormDialog title="Issue / transfer stock" saving={saving} onClose={() => setMove(null)}><form onSubmit={saveMove}>
      {formError && <p role="alert" style={{ color: 'var(--danger-red)', marginBottom: 12 }}>{formError}</p>}<fieldset disabled={saving} style={{ border: 0, padding: 0, display: 'grid', gap: 14 }}>
        <label><span className="hne-label">Movement</span><select className="hne-select" value={move.operation} onChange={e => changeMove({ operation: e.target.value })}><option value="ISSUE">Issue to department</option><option value="TRANSFER">Transfer to store</option></select></label>
        <label><span className="hne-label">Source store</span><select required className="hne-select" value={move.storeId} onChange={e => changeMove({ storeId: e.target.value, itemId: '', quantity: '' })}>{stores.filter(s => !storeId || s.id === storeId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label><span className="hne-label">Item</span><select required className="hne-select" value={move.itemId} onChange={e => changeMove({ itemId: e.target.value })}><option value="">Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}</select></label>
        {selectedItem && <p style={{ fontSize: 12 }}>Available: {available} {selectedItem.unit}</p>}
        <label><span className="hne-label">Quantity</span><input required type="number" min="0.01" step="0.01" max={available} className="hne-input" value={move.quantity} onChange={e => changeMove({ quantity: e.target.value })} /></label>
        {move.operation === 'TRANSFER' ? <label><span className="hne-label">Destination store</span><select required className="hne-select" value={move.destinationStoreId} onChange={e => changeMove({ destinationStoreId: e.target.value })}><option value="">Select store</option>{stores.filter(s => s.id !== move.storeId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label> : <label><span className="hne-label">Department</span><input required className="hne-input" value={move.department} onChange={e => changeMove({ department: e.target.value })} /></label>}
        <label><span className="hne-label">Reference / notes</span><textarea className="hne-input" value={move.notes} onChange={e => changeMove({ notes: e.target.value })} /></label>
      </fieldset><div className="hne-modal-footer"><Button type="button" variant="secondary" disabled={saving} onClick={() => setMove(null)}>Close</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Confirm movement'}</Button></div>
    </form></FormDialog>}
    {master && <FormDialog title={master === 'store' ? 'Add store' : 'Add item'} saving={saving} onClose={() => setMaster(null)}><form onSubmit={saveMaster}>
      {formError && <p role="alert" style={{ color: 'var(--danger-red)' }}>{formError}</p>}<fieldset disabled={saving} style={{ display: 'grid', gap: 14, padding: 0, border: 0 }}>
        {(master === 'store' ? [['code','Store code'],['name','Store name']] : [['sku','SKU'],['name','Item name'],['unit','Unit'],['category','Category'],['standardCost','Reference unit cost (NPR)'],['minStock','Minimum stock']]).map(([key,label]) => <label key={key}><span className="hne-label">{label}</span><input className="hne-input" required={key !== 'category'} type={['standardCost','minStock'].includes(key) ? 'number' : 'text'} min={0} step="0.01" value={fields[key as keyof typeof fields]} onChange={e => setFields(current => ({ ...current, [key]: e.target.value }))} /></label>)}
      </fieldset><div className="hne-modal-footer"><Button variant="secondary" type="button" disabled={saving} onClick={() => setMaster(null)}>Close</Button><Button type="submit" disabled={saving}>Save</Button></div>
    </form></FormDialog>}
  </div>;
}
