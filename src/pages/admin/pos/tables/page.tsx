import React, { useEffect, useState } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Printer,
  CreditCard,
  Building,
  User,
  Clock,
  Sparkles,
  Send,
  Coffee,
  CheckCircle2,
  ChefHat,
  Wine
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const OUTLET_CODES: Record<'DHIKI' | 'TERRACE', string> = { DHIKI: 'DHIKI-REST', TERRACE: 'TERRACE-BAR' };

export default function POSTablesPage() {
  const [selectedOutlet, setSelectedOutlet] = useState<'DHIKI' | 'TERRACE'>('DHIKI');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [postToRoom, setPostToRoom] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('101');
  const [paymentMethod, setPaymentMethod] = useState('FONEPAY');
  // Generated once per settle attempt and held until it succeeds, so a retry (double
  // click, timeout-and-resend) reuses the same key and the server's idempotency check applies.
  const [settleKey, setSettleKey] = useState(() => crypto.randomUUID());

  // Menu catalog and prices are server-authoritative (backend/app/models/menu_item.rb) —
  // fetched here only for display; billing recomputes totals from the same records.
  const [menuItemsByOutlet, setMenuItemsByOutlet] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetch('/api/pos/menu-items')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) return;
        const byOutlet: Record<string, any[]> = {};
        for (const outlet of json.outlets) {
          const key = outlet.outletCode === OUTLET_CODES.DHIKI ? 'DHIKI' : 'TERRACE';
          byOutlet[key] = outlet.items.map((item: any) => ({ id: item.id, name: item.name, price: item.price, cat: item.category }));
        }
        setMenuItemsByOutlet(byOutlet);
      })
      .catch(() => {});
  }, []);

  const menuItems = menuItemsByOutlet[selectedOutlet] || [];

  // A fresh key per opened order/table prevents an idempotency key from a previous,
  // unrelated settlement being silently reused (which would return the old receipt
  // instead of billing the new one).
  useEffect(() => {
    setSettleKey(crypto.randomUUID());
  }, [selectedTable?.id]);

  const [tables, setTables] = useState([
    // Outlet 1: Dhiki Restaurant & Bhojangriha
    { id: 't-01', outlet: 'DHIKI', number: 'T-01', zone: 'Main Bhojangriha', capacity: 4, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 't-02', outlet: 'DHIKI', number: 'T-02', zone: 'Main Bhojangriha', capacity: 4, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 't-03', outlet: 'DHIKI', number: 'T-03', zone: 'Main Bhojangriha', capacity: 4, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 't-04', outlet: 'DHIKI', number: 'T-04', zone: 'Private Dining Cabin', capacity: 6, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 't-05', outlet: 'DHIKI', number: 'T-05', zone: 'Main Bhojangriha', capacity: 4, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 't-06', outlet: 'DHIKI', number: 'T-06', zone: 'Main Bhojangriha', capacity: 4, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 't-07', outlet: 'DHIKI', number: 'T-07', zone: 'Private Dining Cabin', capacity: 8, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 't-08', outlet: 'DHIKI', number: 'T-08', zone: 'Family Section', capacity: 6, status: 'AVAILABLE', kotNo: null, items: [] },

    // Outlet 2: New Era Terrace Lounge & Bar
    { id: 'bar-01', outlet: 'TERRACE', number: 'BAR-01', zone: 'Open-Air Terrace', capacity: 4, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 'bar-02', outlet: 'TERRACE', number: 'BAR-02', zone: 'Open-Air Terrace', capacity: 4, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 'bar-03', outlet: 'TERRACE', number: 'BAR-03', zone: 'Cocktail High-Top', capacity: 2, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 'bar-04', outlet: 'TERRACE', number: 'BAR-04', zone: 'Cocktail High-Top', capacity: 2, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 'bar-05', outlet: 'TERRACE', number: 'BAR-05', zone: 'Terrace Lounge Sofa', capacity: 6, status: 'AVAILABLE', kotNo: null, items: [] },
    { id: 'bar-06', outlet: 'TERRACE', number: 'BAR-06', zone: 'Terrace Lounge Sofa', capacity: 6, status: 'AVAILABLE', kotNo: null, items: [] }
  ]);

  const filteredTables = tables.filter(t => t.outlet === selectedOutlet);

  const calculateTableTotal = (items: any[]) => {
    const foodSub = items.reduce((acc, it) => acc + it.price * it.qty, 0);
    const vat = Math.round(foodSub * 0.13);
    const grand = foodSub + vat;
    return { foodSub, vat, grand };
  };

  const handleAddItemToTable = (item: any) => {
    if (!selectedTable) return;

    const existing = selectedTable.items.find((i: any) => i.id === item.id);
    let updatedItems;
    if (existing) {
      updatedItems = selectedTable.items.map((i: any) =>
        i.id === item.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      updatedItems = [...selectedTable.items, { id: item.id, name: item.name, qty: 1, price: item.price }];
    }

    const updatedTable = {
      ...selectedTable,
      status: 'OCCUPIED',
      kotNo: selectedTable.kotNo || `KOT-${Math.floor(100 + Math.random() * 900)}`,
      items: updatedItems
    };

    setTables(tables.map((t) => (t.id === selectedTable.id ? updatedTable : t)));
    setSelectedTable(updatedTable);
  };

  const handleSettleOrder = async () => {
    if (!selectedTable) return;

    try {
      const res = await fetch('/api/pos/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletCode: OUTLET_CODES[selectedOutlet],
          outletName: selectedOutlet === 'DHIKI' ? 'Dhiki Restaurant & Bhojangriha' : 'New Era Terrace Lounge & Bar',
          tableNumber: selectedTable.number,
          items: selectedTable.items.map((i: any) => ({ menuItemId: i.id, quantity: i.qty })),
          idempotencyKey: settleKey,
          postToRoom,
          roomNumber: selectedRoomNumber,
          paymentMethod
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        const clearedTable = {
          ...selectedTable,
          status: 'AVAILABLE',
          kotNo: null,
          items: []
        };
        setTables(tables.map((t) => (t.id === selectedTable.id ? clearedTable : t)));
        setSelectedTable(null);
        setShowBillingModal(false);
      } else {
        alert(json.error || 'Failed to process settlement');
      }
    } catch (err: any) {
      alert(err.message || 'Error settling bill');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Restaurant & Bar Multi-Outlet POS</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Direct order entry, central kitchen KOT firing, table billing, and automatic PMS room folio posting
          </p>
        </div>

        {/* Outlet Switcher */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setSelectedOutlet('DHIKI'); setSelectedTable(null); }}
            className={`hne-btn ${selectedOutlet === 'DHIKI' ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <UtensilsCrossed size={14} />
            <span>Dhiki Restaurant & Bhojangriha</span>
          </button>
          <button
            onClick={() => { setSelectedOutlet('TERRACE'); setSelectedTable(null); }}
            className={`hne-btn ${selectedOutlet === 'TERRACE' ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Wine size={14} />
            <span>New Era Terrace Lounge & Bar</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Tables Map + Menu/Order Terminal */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTable ? '1.1fr 1fr' : '1fr', gap: 24 }}>
        {/* Table Map Card */}
        <Card
          title={selectedOutlet === 'DHIKI' ? 'Dhiki Restaurant Table Plan (Ground Floor)' : 'Terrace Lounge & Bar Seating Plan'}
          subtitle="Click table to take order, view active KOT, or settle bill"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {filteredTables.map((tbl) => {
              const isOccupied = tbl.status === 'OCCUPIED';
              const isSelected = selectedTable?.id === tbl.id;
              const totals = calculateTableTotal(tbl.items);

              return (
                <div
                  key={tbl.id}
                  onClick={() => setSelectedTable(tbl)}
                  style={{
                    backgroundColor: isSelected ? 'var(--brand-crimson-light)' : '#FFFFFF',
                    border: `2px solid ${isSelected ? 'var(--brand-crimson)' : isOccupied ? 'var(--brand-crimson-subtle)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-card)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>
                      {tbl.number}
                    </div>
                    <Badge variant={isOccupied ? 'danger' : 'success'}>
                      {isOccupied ? 'Occupied' : 'Vacant'}
                    </Badge>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    {tbl.zone} • {tbl.capacity} Pax
                  </div>

                  {isOccupied ? (
                    <div style={{ backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--brand-crimson)' }}>
                        Rs. {totals.grand.toLocaleString()}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                        {tbl.items.length} items • {tbl.kotNo}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--brand-green)', fontWeight: 600 }}>
                      ✓ Ready for Guests
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Table Order Terminal */}
        {selectedTable && (
          <Card
            title={`Active Order: Table ${selectedTable.number}`}
            subtitle={`${selectedOutlet === 'DHIKI' ? 'Dhiki Restaurant' : 'Terrace Bar'} • KOT: ${selectedTable.kotNo || 'New Draft'} • Central Kitchen`}
            action={
              <button
                onClick={() => setSelectedTable(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)' }}
              >
                ✕ Close
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Quick Add Menu Grid */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Quick Menu Catalog (Tap to Add Item)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItemToTable(item)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        backgroundColor: '#FFFFFF',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-crimson-light)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-crimson)', marginTop: 2 }}>
                        Rs. {item.price}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Table Items Table */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Current Order Items ({selectedTable.items.length})
                </div>

                {selectedTable.items.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                    No items added yet. Click menu items above to begin KOT.
                  </div>
                ) : (
                  <div className="hne-table-container">
                    <table className="hne-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTable.items.map((it: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, fontSize: 12.5 }}>{it.name}</td>
                            <td>{it.qty}</td>
                            <td>Rs. {it.price}</td>
                            <td style={{ fontWeight: 700 }}>Rs. {it.price * it.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Order Calculations */}
              {selectedTable.items.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 13 }}>
                  {(() => {
                    const t = calculateTableTotal(selectedTable.items);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Food & Beverage Subtotal:</span>
                          <span>Rs. {t.foodSub.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Government VAT (13%):</span>
                          <span>Rs. {t.vat.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4, color: 'var(--brand-crimson)' }}>
                          <span>Grand Total Due:</span>
                          <span>Rs. {t.grand.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => alert(`KOT #${selectedTable.kotNo || 'KOT-NEW'} fired directly to Main Central Kitchen printer!`)}
                  disabled={selectedTable.items.length === 0}
                >
                  <Send size={14} /> Send KOT to Central Kitchen
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowBillingModal(true)}
                  disabled={selectedTable.items.length === 0}
                >
                  <CreditCard size={14} /> Settle & Print Bill
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Settle Bill Modal */}
      {showBillingModal && selectedTable && (
        <div className="hne-modal-backdrop" onClick={() => setShowBillingModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Settle Bill: Table {selectedTable.number}</h3>
              <button className="hne-modal-close" onClick={() => setShowBillingModal(false)}>✕</button>
            </div>
            <div className="hne-modal-body">
              {(() => {
                const totals = calculateTableTotal(selectedTable.items);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Payable Amount</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand-crimson)' }}>
                        Rs. {totals.grand.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Includes 13% Government VAT
                      </div>
                    </div>

                    <div className="hne-form-group">
                      <label className="hne-label">Settlement Mode</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setPostToRoom(false)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${!postToRoom ? 'var(--brand-crimson)' : 'var(--border)'}`,
                            backgroundColor: !postToRoom ? 'var(--brand-crimson-light)' : '#FFFFFF',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer'
                          }}
                        >
                          Direct POS Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => setPostToRoom(true)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${postToRoom ? 'var(--brand-crimson)' : 'var(--border)'}`,
                            backgroundColor: postToRoom ? 'var(--brand-crimson-light)' : '#FFFFFF',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer'
                          }}
                        >
                          Post to In-House Room
                        </button>
                      </div>
                    </div>

                    {postToRoom ? (
                      <div className="hne-form-group">
                        <label className="hne-label">Select In-House Room Folio</label>
                        <select
                          className="hne-select"
                          value={selectedRoomNumber}
                          onChange={(e) => setSelectedRoomNumber(e.target.value)}
                        >
                          <option value="101">Room 101 • Aarav Pradhan (Luxury)</option>
                          <option value="104">Room 104 • Ramesh Gautam (Luxury)</option>
                          <option value="201">Room 201 • Emily Watson (Deluxe)</option>
                          <option value="301">Room 301 • Binod Karki (Family)</option>
                          <option value="307">Room 307 • Pradeep & Shreya (Honeymoon)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="hne-form-group">
                        <label className="hne-label">Payment Method</label>
                        <select
                          className="hne-select"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="FONEPAY">FonePay QR (Instant Bank / eSewa / Khalti)</option>
                          <option value="CASH">Cash at Counter</option>
                          <option value="CARD">Credit / Debit Card POS</option>
                          <option value="CITY_LEDGER">Corporate City Ledger</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="hne-modal-footer">
              <Button variant="secondary" onClick={() => setShowBillingModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSettleOrder}>Confirm & Post Settlement</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
