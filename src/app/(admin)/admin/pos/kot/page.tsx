'use client';

import React, { useState } from 'react';
import { ChefHat, Clock, CheckCircle2, AlertCircle, UtensilsCrossed, ArrowRight, RefreshCw, Flame, Wine } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function KOTDisplayPage() {
  const [orders, setOrders] = useState([
    {
      id: 'kot-012',
      number: 'KOT-012',
      outlet: 'Dhiki Restaurant & Bhojangriha',
      table: 'T-01',
      server: 'Suman Thapa',
      time: '12:15 PM (12 mins ago)',
      status: 'PREPARING',
      notes: 'Guest requested extra Jimbu tempering on Thakali Set',
      items: [
        { name: 'Royal Thakali Mutton Khana Set', qty: 2, done: false },
        { name: 'Everest Craft Beer (Bottle)', qty: 2, done: true }
      ]
    },
    {
      id: 'kot-013',
      number: 'KOT-013',
      outlet: 'Dhiki Restaurant & Bhojangriha',
      table: 'T-02',
      server: 'Pooja GC',
      time: '12:20 PM (7 mins ago)',
      status: 'PREPARING',
      notes: 'Bhojangriha charcoal grill priority',
      items: [
        { name: 'Bhojangriha Charcoal Sekuwa', qty: 1, done: false },
        { name: 'Palpali Chukauni & Batuk', qty: 1, done: false },
        { name: 'Lumbini Sunset Signature Cocktail', qty: 2, done: true }
      ]
    },
    {
      id: 'kot-014',
      number: 'KOT-014',
      outlet: 'New Era Terrace Lounge & Bar',
      table: 'BAR-01 (Terrace)',
      server: 'Bikash Adhikari',
      time: '12:24 PM (3 mins ago)',
      status: 'PLACED',
      notes: 'Terrace garden service with extra sizzler sauce',
      items: [
        { name: 'New Era Sizzler (Chicken)', qty: 1, done: false },
        { name: 'Woodfired Truffle Mushroom Pizza', qty: 1, done: false },
        { name: 'Everest Craft Beer (Bottle)', qty: 2, done: false }
      ]
    },
    {
      id: 'kot-015',
      number: 'KOT-015',
      outlet: 'Room Service (In-House)',
      table: 'Room 201 (Deluxe)',
      server: 'Ramesh Sunar',
      time: '12:27 PM (Just now)',
      status: 'PLACED',
      notes: 'Deliver to Room 201 with cutlery set',
      items: [
        { name: 'Claypot Tandoori Chicken (Half)', qty: 1, done: false },
        { name: 'Single-Estate Palpa Coffee', qty: 2, done: false }
      ]
    }
  ]);

  const toggleItemDone = (orderId: string, itemIdx: number) => {
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        const updatedItems = o.items.map((it, idx) => idx === itemIdx ? { ...it, done: !it.done } : it);
        const allDone = updatedItems.every(i => i.done);
        return {
          ...o,
          items: updatedItems,
          status: allDone ? 'READY' : 'PREPARING'
        };
      }
      return o;
    }));
  };

  const handleMarkOrderReady = (orderId: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'READY', items: o.items.map(i => ({ ...i, done: true })) } : o));
  };

  const handleDispatchOrder = (orderId: string) => {
    setOrders(orders.filter(o => o.id !== orderId));
    alert('KOT marked as Served / Dispatched to table service staff!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Main Central Kitchen Display (KDS / KOT)</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Real-time kitchen order tickets for <strong>Dhiki Restaurant</strong>, <strong>Terrace Lounge & Bar</strong>, and <strong>24/7 In-Room Dining</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Auto-Sync Active
          </Button>
        </div>
      </div>

      {/* Active Orders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {orders.map((order) => (
          <div
            key={order.id}
            className="hne-card"
            style={{
              padding: 20,
              backgroundColor: '#FFFFFF',
              border: `2px solid ${order.status === 'READY' ? 'var(--brand-green)' : order.status === 'PREPARING' ? 'var(--brand-gold)' : 'var(--brand-crimson)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16
            }}
          >
            <div>
              {/* Card Topbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>
                    {order.number} • {order.table}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--brand-crimson)', fontWeight: 700 }}>
                    {order.outlet}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    Server: {order.server}
                  </div>
                </div>

                <Badge variant={order.status === 'READY' ? 'success' : order.status === 'PREPARING' ? 'warning' : 'danger'}>
                  {order.status}
                </Badge>
              </div>

              {/* Order Notes */}
              {order.notes && (
                <div style={{ backgroundColor: 'var(--brand-gold-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--brand-gold-hover)', fontWeight: 600, marginBottom: 14 }}>
                  ⚠️ {order.notes}
                </div>
              )}

              {/* Items Checkoff List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleItemDone(order.id, idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: item.done ? 'var(--brand-green-light)' : 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textDecoration: item.done ? 'line-through' : 'none',
                      color: item.done ? 'var(--text-muted)' : 'var(--text-primary)',
                      transition: 'background var(--transition-fast)'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {item.qty}x {item.name}
                    </span>
                    <input
                      type="checkbox"
                      checked={item.done}
                      readOnly
                      style={{ width: 16, height: 16, accentColor: 'var(--brand-green)', cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              {order.status !== 'READY' ? (
                <Button
                  variant="success"
                  size="sm"
                  style={{ flex: 1 }}
                  onClick={() => handleMarkOrderReady(order.id)}
                >
                  <CheckCircle2 size={14} /> Mark All Ready
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  style={{ flex: 1 }}
                  onClick={() => handleDispatchOrder(order.id)}
                >
                  <UtensilsCrossed size={14} /> Dispatch to Server
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
