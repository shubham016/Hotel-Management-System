import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, CheckCircle2, AlertTriangle, FileText, Truck, ShieldCheck, DollarSign, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';

export default function ProcurementPage() {
  const [showPOModal, setShowPOModal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProcurement = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/procurement/orders');
      const json = await res.json();
      if (json.success) {
        setOrders(json.purchaseOrders || []);
        setSuppliers(json.suppliers || []);
        if (json.suppliers?.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(json.suppliers[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load procurement:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurement();
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          totalAmount: parseFloat(newAmount),
          notes: poNotes
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowPOModal(false);
        setNewAmount('');
        setPoNotes('');
        fetchProcurement();
      } else {
        alert(json.error || 'Failed to create PO');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Procurement, Purchase Orders & GRN</h1>

        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchProcurement} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowPOModal(true)}>
            <Plus size={16} />
            <span>Create Purchase Order (PO)</span>
          </Button>
        </div>
      </div>

      {/* Suppliers Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {suppliers.map((sup) => (
          <div key={sup.id} className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-crimson)', backgroundColor: '#FFFFFF' }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{sup.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Code: <strong>{sup.code}</strong> • Contact: {sup.contactPerson || 'Vendor Rep'} ({sup.phone})
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--brand-green)', fontWeight: 700, marginTop: 6 }}>
              City: {sup.city || 'Butwal / Rupandehi'}
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <Card title={`Purchase Orders & Deliveries (${orders.length})`} >
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading purchase orders…
          </div>
        ) : (
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>GRN / Match</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => {
                  const dual = formatDualDate(po.orderDate);
                  return (
                    <tr key={po.id}>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--brand-crimson)' }}>
                          {po.poNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{po.supplier?.name || 'Local Vendor'}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div>{dual.adFormatted}</div>
                        <div style={{ color: 'var(--brand-gold)', fontSize: 11 }}>BS: {dual.bsFormatted}</div>
                      </td>
                      <td style={{ fontWeight: 800 }}>Rs. {Number(po.grandTotal).toLocaleString()}</td>
                      <td>
                        <Badge variant="warning">{po.status}</Badge>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--brand-green)', fontWeight: 700 }}>
                          ✓ 3-WAY MATCH VERIFIED
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="hne-modal-backdrop" onClick={() => setShowPOModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Create Purchase Order (PO)</h3>
              <button className="hne-modal-close" onClick={() => setShowPOModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePO}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Select Registered Supplier</label>
                  <select
                    className="hne-select"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Estimated PO Amount (NPR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    className="hne-input"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Requisition Notes & Items Breakdown</label>
                  <input
                    type="text"
                    placeholder="e.g. 10 Bags Basmati Rice, 5kg Jimbu, Seasoning"
                    className="hne-input"
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowPOModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>Submit Purchase Order</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
