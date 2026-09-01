'use client';

import React, { useState } from 'react';
import {
  Users,
  BedDouble,
  DollarSign,
  TrendingUp,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  CalendarCheck,
  Building2,
  CheckCircle2,
  Moon
} from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'GM' | 'FRONTDESK' | 'FINANCE' | 'HOUSEKEEPING'>('GM');

  // Business Operational Data for 43 Saleable Rooms
  const stats = {
    occupancyPct: 74.4,
    totalRooms: 43,
    occupiedRooms: 32,
    availableRooms: 11,
    dirtyRooms: 4,
    todayArrivals: 8,
    todayDepartures: 5,
    inHouseGuests: 58,
    todayTotalRevenue: 184500,
    todayRoomRevenue: 128500,
    todayFnbRevenue: 56000,
    adr: 4015, // Average Daily Rate (NPR)
    revPar: 2988, // RevPAR (NPR)
    pendingReceivables: 64200,
    pendingPayables: 18500,
    netProfit: 112400
  };

  const todayArrivalsList = [
    { resNo: 'RES-202608-0101', guest: 'Aarav Pradhan', room: '101 (DLX-K)', adults: 2, checkIn: '14:00', status: 'IN_HOUSE', balance: 'Rs. 14,210' },
    { resNo: 'RES-202608-0102', guest: 'Emily Watson', room: '201 (EXE-S)', adults: 2, checkIn: '15:30', status: 'ARRIVING_TODAY', balance: 'Rs. 32,770' },
    { resNo: 'RES-202608-0103', guest: 'Binod Karki', room: '301 (FAM-V)', adults: 4, checkIn: '16:00', status: 'ARRIVING_TODAY', balance: 'Rs. 47,460' }
  ];

  const recentTransactions = [
    { voucher: 'SV-991201', desc: 'Folio Settlement (Aarav Pradhan - Room 101)', amount: 'Rs. 19,210', type: 'ROOM_CHECKOUT', status: 'POSTED', time: '10:45 AM' },
    { voucher: 'POS-884102', desc: 'The Panorama Restaurant KOT #KOT-012 (Table T-02)', amount: 'Rs. 3,850', type: 'POS_SALE', status: 'POSTED', time: '12:15 PM' },
    { voucher: 'POS-884103', desc: 'Room 201 Lake Suite - Minibar & Craft Cocktails', amount: 'Rs. 2,100', type: 'ROOM_POSTING', status: 'POSTED', time: '01:30 PM' },
    { voucher: 'GRN-440101', desc: 'Main Store - Annapurna Organic Farm Veggies', amount: 'Rs. 12,400', type: 'PURCHASE_GRN', status: 'POSTED', time: '09:00 AM' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Hotel Operational Command Center</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Real-time business intelligence across Rooms, POS Outlets, Housekeeping, and General Ledger
          </p>
        </div>

        {/* Quick Tabs */}
        <div style={{ display: 'flex', gap: 8, backgroundColor: '#FFFFFF', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {[
            { id: 'GM', label: 'Executive GM' },
            { id: 'FRONTDESK', label: 'Front Desk' },
            { id: 'FINANCE', label: 'Finance & ERP' },
            { id: 'HOUSEKEEPING', label: 'Housekeeping' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === t.id ? 'var(--primary-orange)' : 'transparent',
                color: activeTab === t.id ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        <MetricCard
          title="Occupancy Rate"
          value={`${stats.occupancyPct}%`}
          subtitle={`${stats.occupiedRooms} of ${stats.totalRooms} Rooms Occupied`}
          icon={<BedDouble size={20} />}
          trend={{ value: '8.4%', isPositive: true }}
          colorTheme="orange"
        />

        <MetricCard
          title="Today's Gross Revenue"
          value={`Rs. ${stats.todayTotalRevenue.toLocaleString()}`}
          subtitle={`Rooms: Rs. ${stats.todayRoomRevenue.toLocaleString()} | F&B: Rs. ${stats.todayFnbRevenue.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          trend={{ value: '14.2%', isPositive: true }}
          colorTheme="green"
        />

        <MetricCard
          title="Average Daily Rate (ADR)"
          value={`Rs. ${stats.adr.toLocaleString()}`}
          subtitle={`RevPAR: Rs. ${stats.revPar.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          colorTheme="golden"
        />

        <MetricCard
          title="In-House Guests"
          value={stats.inHouseGuests}
          subtitle={`Today: ${stats.todayArrivals} Inbound • ${stats.todayDepartures} Outbound`}
          icon={<Users size={20} />}
          colorTheme="blue"
        />
      </div>

      {/* Main Two-Column Operations Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        {/* Left Column: Front Desk Live Queue */}
        <Card
          title="Today's Front Desk Activity & Inbound Guests"
          subtitle="Real-time check-in and folio settlement queue"
          action={
            <Link href="/admin/pms/frontdesk" className="hne-btn hne-btn-secondary hne-btn-sm">
              Open Front Desk
            </Link>
          }
        >
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>Res # / Guest</th>
                  <th>Room</th>
                  <th>Arrival</th>
                  <th>Status</th>
                  <th>Balance Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {todayArrivalsList.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{row.guest}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.resNo}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{row.room}</span>
                    </td>
                    <td>{row.checkIn}</td>
                    <td>
                      <Badge variant={row.status === 'IN_HOUSE' ? 'success' : 'orange'}>
                        {row.status === 'IN_HOUSE' ? 'In House' : 'Expected'}
                      </Badge>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-orange)' }}>{row.balance}</td>
                    <td>
                      <Link
                        href="/admin/pms/frontdesk"
                        style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-orange)', textDecoration: 'none' }}
                      >
                        Folio →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Column: Live Automated General Ledger Stream */}
        <Card
          title="Automated Double-Entry General Ledger Postings"
          subtitle="Live audit of journals generated from PMS & POS operations"
          action={
            <Link href="/admin/accounting/journals" className="hne-btn hne-btn-secondary hne-btn-sm">
              View All Journals
            </Link>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentTransactions.map((tx, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-orange)' }}>{tx.voucher}</span>
                    <Badge variant="success" style={{ fontSize: 10, padding: '2px 6px' }}>{tx.status}</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginTop: 2 }}>{tx.desc}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Posted at {tx.time}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{tx.amount}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Balanced Dr = Cr</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Grid: Department Health Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Housekeeping Status */}
        <div className="hne-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Housekeeping Matrix</h3>
            <Link href="/admin/housekeeping" style={{ fontSize: 12, color: 'var(--primary-orange)', fontWeight: 600 }}>Manage →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            <div style={{ backgroundColor: 'var(--green-light)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>7</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Clean</div>
            </div>
            <div style={{ backgroundColor: 'var(--golden-light)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#B45309' }}>2</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Dirty</div>
            </div>
            <div style={{ backgroundColor: 'var(--primary-orange-light)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-orange)' }}>3</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Inspected</div>
            </div>
          </div>
        </div>

        {/* Restaurant Outlets */}
        <div className="hne-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Panorama Restaurant POS</h3>
            <Link href="/admin/pos/tables" style={{ fontSize: 12, color: 'var(--primary-orange)', fontWeight: 600 }}>Floor Plan →</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: 13 }}>Active Dining Tables</span>
            <span style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>5 / 8 Tables (62.5%)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: 13 }}>Pending Kitchen Orders (KOT)</span>
            <Badge variant="orange">3 In Kitchen</Badge>
          </div>
        </div>

        {/* Night Audit & End-of-Day */}
        <div className="hne-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Night Audit Status</h3>
            <Badge variant="success">Day Open</Badge>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Current Business Date: <strong>{new Date().toISOString().split('T')[0]}</strong>. All room postings and cashier shifts balanced.
          </p>
          <Link href="/admin/pms/night-audit" className="hne-btn hne-btn-secondary hne-btn-sm" style={{ alignSelf: 'flex-start' }}>
            <Moon size={14} />
            <span>Launch Night Audit Wizard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
