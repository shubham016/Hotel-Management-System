'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  BedDouble,
  DollarSign,
  LogIn,
  LogOut,
  UtensilsCrossed,
  Moon
} from 'lucide-react';
import { StatTile } from '@/components/ui/StatTile';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

type DashboardData = {
  businessDate: string;
  occupancy: { totalRooms: number; occupiedRooms: number; vacantRooms: number; occupancyPct: number };
  guests: { todayArrivals: number; todayDepartures: number; inHouseGuests: number };
  revenue: { today: { room: number; fnb: number; banquet: number; total: number }; adr: number; revPar: number };
  receivables: { pendingReceivables: number };
  arrivals: { confirmationNumber: string; guestName: string; room: string; adults: number; balanceDue: number }[];
  recentTransactions: { voucherNumber: string; narration: string; sourceModule: string; amount: number; status: string; postedAt: string }[];
  housekeeping: { clean: number; dirty: number; inspectionRequired: number };
  pos: { activeTables: number; totalTables: number; ordersToday: number };
  trends: { arrivals: number[]; departures: number[]; inHouse: number[]; revenue: number[]; restaurantOrders: number[] };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json);
        else setError(json.error || 'Failed to load dashboard');
      })
      .catch(() => setError('Failed to load dashboard'));
  }, []);

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard…</div>;
  }

  const { occupancy, guests, revenue, receivables, arrivals, recentTransactions, housekeeping, pos, trends } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Hotel Operational Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Good afternoon. Here's what's happening today.

          {/* &middot; Business Date {data.businessDate} */}
        </p>
      </div>

      {/* Stat Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <StatTile
          label="Arrivals"
          value={guests.todayArrivals}
          icon={<LogIn size={15} />}
          colorTheme="green"
          sparkline={trends.arrivals}
        />

        <StatTile
          label="Departures"
          value={guests.todayDepartures}
          icon={<LogOut size={15} />}
          colorTheme="golden"
          sparkline={trends.departures}
        />

        <StatTile
          label="In-house"
          value={guests.inHouseGuests}
          icon={<Users size={15} />}
          colorTheme="blue"
          sparkline={trends.inHouse}
        />

        <StatTile
          label="Occupancy"
          value={`${occupancy.occupancyPct}%`}
          icon={<BedDouble size={15} />}
          colorTheme="orange"
          progress={{ pct: occupancy.occupancyPct, caption: `${occupancy.occupiedRooms} of ${occupancy.totalRooms} rooms` }}
        />

        <StatTile
          label="Gross Revenue"
          value={`Rs. ${revenue.today.total.toLocaleString()}`}
          icon={<DollarSign size={15} />}
          colorTheme="green"
          caption={`RevPAR Rs. ${revenue.revPar.toLocaleString()}`}
          sparkline={trends.revenue}
        />

        <StatTile
          label="Orders"
          value={pos.ordersToday}
          icon={<UtensilsCrossed size={15} />}
          colorTheme="golden"
          sparkline={trends.restaurantOrders}
        />
      </div>

      {/* Main Two-Column Operations Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        {/* Left Column: Front Desk Live Queue */}
        <Card
          title="Today's Expected Arrivals"
          subtitle="Confirmed reservations checking in today"
          action={
            <Link href="/admin/pms/frontdesk" className="hne-btn hne-btn-secondary hne-btn-sm">
              Open Front Desk
            </Link>
          }
        >
          {arrivals.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No arrivals scheduled for today.
            </div>
          ) : (
            <div className="hne-table-container">
              <table className="hne-table">
                <thead>
                  <tr>
                    <th>Res # / Guest</th>
                    <th>Room</th>
                    <th>Adults</th>
                    <th>Balance Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {arrivals.map((row) => (
                    <tr key={row.confirmationNumber}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{row.guestName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.confirmationNumber}</div>
                      </td>
                      <td><span style={{ fontWeight: 600 }}>{row.room}</span></td>
                      <td>{row.adults}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-orange)' }}>Rs. {row.balanceDue.toLocaleString()}</td>
                      <td>
                        <Link href="/admin/pms/frontdesk" style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-orange)', textDecoration: 'none' }}>
                          Front Desk →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Right Column: Live General Ledger Stream */}
        <Card
          title="Automated Double-Entry General Ledger Postings"
          subtitle="Most recent journal vouchers posted from PMS &amp; POS operations"
          action={
            <Link href="/admin/accounting/journals" className="hne-btn hne-btn-secondary hne-btn-sm">
              View All Journals
            </Link>
          }
        >
          {recentTransactions.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No journal postings yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentTransactions.map((tx) => (
                <div
                  key={tx.voucherNumber}
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
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-orange)' }}>{tx.voucherNumber}</span>
                      <Badge variant="success" style={{ fontSize: 10, padding: '2px 6px' }}>{tx.status}</Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginTop: 2 }}>{tx.narration}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {tx.sourceModule} • {new Date(tx.postedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Rs. {tx.amount.toLocaleString()}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Balanced Dr = Cr</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{housekeeping.clean}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Clean</div>
            </div>
            <div style={{ backgroundColor: 'var(--golden-light)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--golden)' }}>{housekeeping.dirty}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Dirty</div>
            </div>
            <div style={{ backgroundColor: 'var(--primary-orange-light)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-orange)' }}>{housekeeping.inspectionRequired}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Inspection</div>
            </div>
          </div>
        </div>

        {/* Restaurant Outlets */}
        <div className="hne-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Restaurant &amp; Bar POS</h3>
            <Link href="/admin/pos/tables" style={{ fontSize: 12, color: 'var(--primary-orange)', fontWeight: 600 }}>Floor Plan →</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: 13 }}>Active Dining Tables</span>
            <span style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>
              {pos.activeTables} / {pos.totalTables} Tables
              {pos.totalTables > 0 ? ` (${Math.round((pos.activeTables / pos.totalTables) * 100)}%)` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: 13 }}>Pending Receivables (Open Folios)</span>
            <Badge variant="orange">Rs. {receivables.pendingReceivables.toLocaleString()}</Badge>
          </div>
        </div>

        {/* Night Audit & End-of-Day */}
        <div className="hne-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Night Audit</h3>
            <Badge variant="success">Day Open</Badge>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Current business date: <strong>{data.businessDate}</strong>.
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
