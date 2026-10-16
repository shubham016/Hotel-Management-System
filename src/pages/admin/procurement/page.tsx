import { showNepaliDates } from '@/lib/display-preferences';
import { useEffect, useState, type FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FormDialog } from '@/components/admin/FormDialog';
import { usePortalProfile } from '@/lib/portal-context';
import { hasAccess } from '@/lib/portal-access';
import { formatDualDate } from '@/lib/nepali-calendar';
import { money, supplyRequest, type Store, type Supplier, type CatalogItem, type PurchaseOrder } from '../supply-api';
import './procurement.css';
import { SupplierBilling, ReceiptAccounting } from './SupplierBilling';
import type { CashAccount, VatRate } from '../supply-api';

type DraftLine = { itemId: string; quantity: string; unitPrice: string };
type OrderForm = { id: string; version: number; supplierId: string; notes: string; items: DraftLine[]; idempotencyKey: string };
type ActionForm = { kind: 'approve' | 'cancel' | 'receive'; version: number; reason: string; storeId: string; deliveryReference: string; notes: string; quantities: Record<string,string>; idempotencyKey: string };
const drafts = ['DRAFT','SUBMITTED'];
export default function ProcurementPage() {
  const profile = usePortalProfile(); const allowed = (action: string) => hasAccess(profile,'ORDERS',action);
  const [orders,setOrders] = useState<PurchaseOrder[]>([]), [suppliers,setSuppliers] = useState<Supplier[]>([]), [catalog,setCatalog] = useState<CatalogItem[]>([]), [stores,setStores] = useState<Store[]>([]);
  const [loading,setLoading] = useState(true), [saving,setSaving] = useState(false), [error,setError] = useState(''), [formError,setFormError] = useState(''), [message,setMessage] = useState('');
  const [selectedId,setSelectedId] = useState(''), [form,setForm] = useState<OrderForm | null>(null), [action,setAction] = useState<ActionForm | null>(null);
  const [supplierForm,setSupplierForm] = useState<{ name:string;phone:string;email:string;address:string } | null>(null);
  const selected = orders.find(o => o.id === selectedId);
  const [finance,setFinance]=useState<{accounts:CashAccount[];businessDate:string;vatRates:VatRate[];openingReviewRequired:boolean}>({accounts:[],businessDate:'',vatRates:[],openingReviewRequired:false});
  async function load() {
    try { const result = await supplyRequest('procurement/orders'); setOrders(result.purchaseOrders);setSuppliers(result.suppliers);setCatalog(result.catalog);setStores(result.stores);setFinance({accounts:result.accounts,businessDate:result.businessDate,vatRates:result.vatRates,openingReviewRequired:result.openingReviewRequired});setError(''); }
    catch(reason) { setError(reason instanceof Error ? reason.message : 'Unable to load orders.'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); },[]);
  function openForm(order?: PurchaseOrder) {
    setFormError('');setForm({ id:order?.id || '',version:order?.version || 0,supplierId:order?.supplierId || '',notes:order?.notes || '',
      items:order?.items.length ? order.items.map(i => ({ itemId:i.itemId || '',quantity:String(i.quantity),unitPrice:String(i.unitPrice) })) : [{ itemId:'',quantity:'1',unitPrice:'0' }],idempotencyKey:crypto.randomUUID() });
  }
  function changeForm(values: Partial<OrderForm>) { setForm(current => current ? {...current,...values,idempotencyKey:crypto.randomUUID()} : current); }
  function changeLine(index:number,values:Partial<DraftLine>) { if(form) changeForm({items:form.items.map((line,i) => i === index ? {...line,...values} : line)}); }
  async function saveOrder(e:FormEvent) {
    e.preventDefault();if(!form || saving)return;setSaving(true);setFormError('');
    try { const result = await supplyRequest(`procurement/orders${form.id ? `/${form.id}` : ''}`,form.id ? 'PATCH':'POST',form);setForm(null);setSelectedId(result.data.id);setMessage('Purchase order saved.');await load(); }
    catch(reason) { setFormError(reason instanceof Error ? reason.message : 'Unable to save order.'); }finally{setSaving(false);}
  }
  function openAction(kind:ActionForm['kind']) { if(!selected)return;setFormError('');setAction({kind,version:selected.version,reason:'',storeId:stores.find(s => s.code === 'MAIN')?.id || stores[0]?.id || '',deliveryReference:'',notes:'',quantities:{},idempotencyKey:crypto.randomUUID()}); }
  function changeAction(values:Partial<ActionForm>) { setAction(current => current ? {...current,...values,idempotencyKey:crypto.randomUUID()} : current); }
  async function saveAction(e:FormEvent) {
    e.preventDefault();if(!action || !selected || saving)return;setSaving(true);setFormError('');
    try {
      const items = Object.entries(action.quantities).filter(([,qty]) => Number(qty)>0).map(([lineId,quantity]) => ({lineId,quantity}));
      const result = await supplyRequest(`procurement/orders/${selected.id}/${action.kind}`,'POST',{...action,items});
      setMessage(action.kind === 'receive' ? `Goods received: ${result.receiptNumber}.` : action.kind === 'approve' ? 'Purchase order approved.' : selected.receipts.length ? 'Remaining order closed.' : 'Purchase order cancelled.');setAction(null);await load();
    }catch(reason){setFormError(reason instanceof Error ? reason.message : 'Unable to save.');}finally{setSaving(false);}
  }
  async function saveSupplier(e:FormEvent) {
    e.preventDefault();if(!supplierForm || saving)return;setSaving(true);setFormError('');
    try{await supplyRequest('procurement/orders/supplier','POST',supplierForm);setSupplierForm(null);setMessage('Supplier added.');await load();}
    catch(reason){setFormError(reason instanceof Error ? reason.message : 'Unable to save supplier.');}finally{setSaving(false);}
  }
  const actionTitle = action?.kind === 'receive' ? 'Receive goods' : action?.kind === 'approve' ? 'Approve order' : selected?.receipts.length ? 'Close remainder' : 'Cancel order';
  return <div style={{display:'flex',flexDirection:'column',gap:20}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}><h1 style={{fontSize:24}}>Procurement</h1><div style={{display:'flex',flexWrap:'wrap',gap:8}}><Button variant="secondary" disabled={loading || saving} onClick={() => void load()}><RefreshCw size={15}/> Refresh</Button>{allowed('supplier') && <Button variant="secondary" disabled={saving} onClick={() => {setFormError('');setSupplierForm({name:'',phone:'',email:'',address:''});}}>Add supplier</Button>}{allowed('create') && <Button disabled={loading || saving || !suppliers.length || !catalog.length} onClick={() => openForm()}>New purchase order</Button>}</div></header>
    {error && <p role="alert" style={{color:'var(--danger-red)'}}>{error}</p>}{message && <p role="status" style={{color:'var(--brand-green)'}}>{message}</p>}
    {!loading && (!catalog.length || !suppliers.length) && <p>{!catalog.length ? 'Add catalog items in Inventory before ordering. ' : ''}{!suppliers.length ? 'Add a supplier before ordering.' : ''}</p>}
    <Card title={`Purchase orders (${orders.length})`}>{loading ? <p>Loading purchase orders…</p> : <div className="hne-table-container"><table className="hne-table"><thead><tr><th>Order</th><th>Supplier</th><th>Order date</th><th>Order value</th><th>Receiving</th><th>Status</th><th>Action</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><strong>{o.poNumber}</strong></td><td>{o.supplier?.name || 'Not assigned'}</td><td>{formatDualDate(o.orderDate).adFormatted}{showNepaliDates() && <div style={{fontSize:11}}>{formatDualDate(o.orderDate).bsDateString} BS</div>}</td><td>{money(o.grandTotal)}</td><td>{o.receipts.length} receipt(s)<div style={{fontSize:11}}>{o.items.length ? `${o.items.filter(i => i.receivedQuantity === i.quantity).length} / ${o.items.length} lines complete` : 'Item details required'}</div></td><td><Badge variant={o.status === 'RECEIVED' ? 'success' : ['CANCELLED','CLOSED'].includes(o.status) ? 'outline' : 'warning'}>{o.status.replaceAll('_',' ')}</Badge></td><td><Button size="sm" variant="secondary" disabled={saving} onClick={() => setSelectedId(o.id)}>View</Button></td></tr>)}{!orders.length && <tr><td colSpan={7}>No purchase orders.</td></tr>}</tbody></table></div>}</Card>
    <Card title={`Suppliers (${suppliers.length})`}><div className="hne-table-container"><table className="hne-table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead><tbody>{suppliers.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.phone || '—'}</td><td>{s.email || '—'}</td><td>{s.address || '—'}</td></tr>)}{!suppliers.length && <tr><td colSpan={4}>No suppliers registered.</td></tr>}</tbody></table></div></Card>
    {selected && !form && !action && !supplierForm && <FormDialog title={selected.poNumber} className="supply-order-dialog" saving={saving} onClose={() => setSelectedId('')}>
      <p>{selected.supplier?.name || 'Supplier not assigned'} · {selected.status.replaceAll('_',' ')} · {formatDualDate(selected.orderDate).combined}</p>{selected.notes && <p style={{marginTop:8}}>{selected.notes}</p>}
      <div className="hne-table-container" style={{margin:'16px 0'}}><table className="hne-table"><thead><tr><th>Item</th><th>Ordered</th><th>Received</th><th>Unit price</th><th>Line value</th></tr></thead><tbody>{selected.items.map(i => <tr key={i.id}><td>{i.description}</td><td>{i.quantity} {i.unit}</td><td>{i.receivedQuantity} {i.unit}</td><td>{money(i.unitPrice)}</td><td>{money(i.lineTotal)}</td></tr>)}{!selected.items.length && <tr><td colSpan={5}>Edit this order to add item details before approval.</td></tr>}</tbody></table></div>
      <p style={{fontWeight:700}}>Order value: {money(selected.grandTotal)}</p>
      {selected.cancellationReason && <p style={{marginTop:12}}>Reason: {selected.cancellationReason}</p>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}>{drafts.includes(selected.status) && <>{allowed('update') && <Button variant="secondary" disabled={saving} onClick={() => openForm(selected)}>Edit order</Button>}{allowed('approve') && <Button disabled={saving || !selected.items.length} onClick={() => openAction('approve')}>Approve order</Button>}</>}{['APPROVED','PARTIALLY_RECEIVED'].includes(selected.status) && allowed('receive') && <Button disabled={saving || finance.openingReviewRequired || !stores.length} onClick={() => openAction('receive')}>Receive goods</Button>}{['DRAFT','SUBMITTED','APPROVED','PARTIALLY_RECEIVED'].includes(selected.status) && allowed('cancel') && <Button variant="danger" disabled={saving} onClick={() => openAction('cancel')}>{selected.receipts.length ? 'Close remainder' : 'Cancel order'}</Button>}</div>
      <SupplierBilling order={selected} {...finance} onSaved={load}/><h3 style={{marginBottom:12,marginTop:20}}>Goods receipts</h3>{selected.receipts.map(r => <section key={r.id} style={{borderTop:'1px solid var(--border)',padding:'14px 0'}}><strong>{r.number}</strong><p>{r.businessDate} · {r.store} · Delivery: {r.deliveryReference}</p><p style={{fontSize:12}}>Received by {r.staff}</p>{r.items.map(i => <p key={i.id}>{i.itemName}: {i.quantity} {i.unit} · {money(i.totalCost)}</p>)}{r.notes && <p>{r.notes}</p>}<ReceiptAccounting orderId={selected.id} receipt={r} onSaved={load}/></section>)}{!selected.receipts.length && <p>No goods received.</p>}
    </FormDialog>}
    {form && <FormDialog title={form.id ? 'Edit purchase order' : 'New purchase order'} className="supply-order-dialog" saving={saving} onClose={() => setForm(null)}><form onSubmit={saveOrder}>
      {formError && <p role="alert" style={{color:'var(--danger-red)',marginBottom:12}}>{formError}</p>}<fieldset disabled={saving} style={{border:0,padding:0,display:'grid',gap:14}}>
        <label><span className="hne-label">Supplier</span><select required className="hne-select" value={form.supplierId} onChange={e => changeForm({supplierId:e.target.value})}><option value="">Select supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {form.items.map((line,index) => <div key={index} className="supply-order-line"><label><span className="hne-label">Item {index+1}</span><select required className="hne-select" value={line.itemId} onChange={e => changeLine(index,{itemId:e.target.value,unitPrice:String(catalog.find(i => i.id === e.target.value)?.cost || 0)})}><option value="">Select item</option>{catalog.map(i => <option key={i.id} value={i.id}>{i.sku} · {i.name} ({i.unit})</option>)}</select></label><label><span className="hne-label">Quantity {index+1}</span><input required className="hne-input" type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => changeLine(index,{quantity:e.target.value})}/></label><label><span className="hne-label">Unit price {index+1} (NPR)</span><input required className="hne-input" type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => changeLine(index,{unitPrice:e.target.value})}/></label><Button variant="secondary" type="button" disabled={saving || form.items.length === 1} onClick={() => changeForm({items:form.items.filter((_,i) => i!==index)})}>Remove</Button></div>)}
        <Button type="button" variant="secondary" disabled={saving || form.items.length >= 100} onClick={() => changeForm({items:[...form.items,{itemId:'',quantity:'1',unitPrice:'0'}]})}>Add line</Button>
        <p style={{fontWeight:700}}>Order value: {money(form.items.reduce((sum,line) => sum+Math.round(Number(line.quantity || 0)*Number(line.unitPrice || 0)*100)/100,0))}</p>
        <label><span className="hne-label">Notes</span><textarea className="hne-input" value={form.notes} onChange={e => changeForm({notes:e.target.value})}/></label>
      </fieldset><div className="hne-modal-footer"><Button type="button" variant="secondary" disabled={saving} onClick={() => setForm(null)}>Close</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save order'}</Button></div>
    </form></FormDialog>}
    {action && selected && <FormDialog title={actionTitle} saving={saving} onClose={() => setAction(null)}><form onSubmit={saveAction}>
      {formError && <p role="alert" style={{color:'var(--danger-red)',marginBottom:12}}>{formError}</p>}<fieldset disabled={saving} style={{border:0,padding:0,display:'grid',gap:14}}>
        {action.kind === 'approve' && <p>Approve {selected.poNumber} for {money(selected.grandTotal)}?</p>}
        {action.kind === 'cancel' && <label><span className="hne-label">Reason</span><textarea required minLength={3} className="hne-input" value={action.reason} onChange={e => changeAction({reason:e.target.value})}/></label>}
        {action.kind === 'receive' && <><label><span className="hne-label">Receiving store</span><select required className="hne-select" value={action.storeId} onChange={e => changeAction({storeId:e.target.value})}>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label><span className="hne-label">Delivery note / reference</span><input required className="hne-input" value={action.deliveryReference} onChange={e => changeAction({deliveryReference:e.target.value})}/></label>
          {selected.items.filter(i => i.quantity>i.receivedQuantity).map(i => <label key={i.id}><span className="hne-label">Receive {i.description} ({i.unit})</span><input type="number" className="hne-input" min="0" step="0.01" max={i.quantity-i.receivedQuantity} value={action.quantities[i.id] || ''} onChange={e => changeAction({quantities:{...action.quantities,[i.id]:e.target.value}})}/><small>Outstanding: {i.quantity-i.receivedQuantity} {i.unit}</small></label>)}
          <label><span className="hne-label">Notes</span><textarea className="hne-input" value={action.notes} onChange={e => changeAction({notes:e.target.value})}/></label><p style={{fontSize:12}}>Enter delivered quantities only.</p>
        </>}
      </fieldset><div className="hne-modal-footer"><Button type="button" variant="secondary" disabled={saving} onClick={() => setAction(null)}>Close</Button><Button type="submit" variant={action.kind === 'cancel' ? 'danger' : 'primary'} disabled={saving}>{saving ? 'Saving…' : actionTitle}</Button></div>
    </form></FormDialog>}
    {supplierForm && <FormDialog title="Add supplier" saving={saving} onClose={() => setSupplierForm(null)}><form onSubmit={saveSupplier}>
      {formError && <p role="alert" style={{color:'var(--danger-red)'}}>{formError}</p>}<fieldset disabled={saving} style={{border:0,padding:0,display:'grid',gap:14}}>{[['name','Supplier name'],['phone','Phone'],['email','Email'],['address','Address']].map(([key,label]) => <label key={key}><span className="hne-label">{label}</span><input required={key==='name'} className="hne-input" type={key==='email' ? 'email':'text'} value={supplierForm[key as keyof typeof supplierForm]} onChange={e => setSupplierForm(current => current ? {...current,[key]:e.target.value} : current)}/></label>)}</fieldset><div className="hne-modal-footer"><Button variant="secondary" type="button" disabled={saving} onClick={() => setSupplierForm(null)}>Close</Button><Button type="submit" disabled={saving}>Save supplier</Button></div>
    </form></FormDialog>}
  </div>;
}
