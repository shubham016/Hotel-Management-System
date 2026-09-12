import React, { useState, useEffect } from 'react';
import { Boxes, Plus, Search, Filter, AlertTriangle, ArrowRightLeft, ArrowDownRight, Package, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function InventoryStoresPage() {
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [selectedItemId, setSelectedItemId] = useState('');
  const [issueQty, setIssueQty] = useState('1');
  const [issueDept, setIssueDept] = useState('Main Central Kitchen');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory/items');
      const json = await res.json();
      if (json.success) {
        setItems(json.items || []);
        setStores(json.stores || []);
        if (json.items?.length > 0 && !selectedItemId) {
          setSelectedItemId(json.items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleIssueStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          quantity: parseFloat(issueQty),
          departmentName: issueDept
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowIssueModal(false);
        fetchInventory();
      } else {
        alert(json.error || 'Failed to issue stock');
      }
    } catch (err: any) {
      alert(err.message || 'Error issuing stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((it) => {
    const matchesSearch = it.name.toLowerCase().includes(searchTerm.toLowerCase()) || it.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Store Inventory & Stock Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Real-time multi-store inventory tracking, reorder levels, valuation, and department stock issue
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchInventory} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowIssueModal(true)}>
            <ArrowRightLeft size={16} />
            <span>Issue Stock to Department</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-crimson)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Inventory Valuation</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            Rs. {items.reduce((acc, it) => acc + it.totalValuation, 0).toLocaleString()}
          </div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid var(--brand-green)', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Active SKUs in Catalog</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand-green)', marginTop: 4 }}>
            {items.length} Tracked Items
          </div>
        </div>

        <div className="hne-card" style={{ padding: 18, borderLeft: '4px solid #DC2626', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Low Stock Alert Items</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
            {items.filter(it => it.isLow).length} Items Below Min Level
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <Card title={`Store Inventory Catalog (${filteredItems.length})`} subtitle="Real-time stock quantities across Main Store, Central Kitchen & Terrace Bar">
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by Item Name or SKU..."
            className="hne-input"
            style={{ paddingLeft: 36 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading inventory items from PostgreSQL...
          </div>
        ) : (
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>In-Stock</th>
                  <th>Unit Cost</th>
                  <th>Total Valuation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--brand-crimson)' }}>
                        {it.sku}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                    </td>
                    <td>
                      <Badge variant="outline">{it.category}</Badge>
                    </td>
                    <td style={{ fontSize: 12 }}>{it.unit}</td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 15, color: it.isLow ? 'var(--danger-red)' : 'var(--brand-green)' }}>
                        {it.currentStock}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                        (Min: {it.minStock})
                      </span>
                    </td>
                    <td>Rs. {it.unitPrice.toLocaleString()}</td>
                    <td style={{ fontWeight: 800 }}>Rs. {it.totalValuation.toLocaleString()}</td>
                    <td>
                      {it.isLow ? (
                        <Badge variant="danger">LOW STOCK</Badge>
                      ) : (
                        <Badge variant="success">IN STOCK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Issue Stock Modal */}
      {showIssueModal && (
        <div className="hne-modal-backdrop" onClick={() => setShowIssueModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Issue Stock to Department</h3>
              <button className="hne-modal-close" onClick={() => setShowIssueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleIssueStock}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Select Item</label>
                  <select
                    className="hne-select"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                  >
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        [{it.sku}] {it.name} (Stock: {it.currentStock} {it.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Quantity to Issue</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="hne-input"
                    value={issueQty}
                    onChange={(e) => setIssueQty(e.target.value)}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Receiving Department / Store</label>
                  <select
                    className="hne-select"
                    value={issueDept}
                    onChange={(e) => setIssueDept(e.target.value)}
                  >
                    <option value="Main Central Kitchen">Main Central Kitchen</option>
                    <option value="Dhiki Restaurant Bhojangriha">Dhiki Restaurant Bhojangriha</option>
                    <option value="New Era Terrace Lounge & Bar">New Era Terrace Lounge & Bar</option>
                    <option value="Housekeeping & Guest Rooms">Housekeeping & Guest Rooms</option>
                  </select>
                </div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowIssueModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>Confirm Issue</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
