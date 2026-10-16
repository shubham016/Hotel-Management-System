import { currencyLabel } from '@/lib/display-preferences';
﻿import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { exportToCSV, printElement } from '@/lib/export-service';
import './reports.css';

type Row = { id: string; code: string; name: string; category: string; netBalance: number; debitBalance: number; creditBalance: number };
type Report = {
  company: { name: string; currency_code: string }; asOf: string; scope: string; periodLabel: string;
  trialBalance: Row[]; taxAccountIds: string[]; trialBalanceTotals: { debit: number; credit: number; isBalanced: boolean };
  pnl: { totalRevenue: number; totalCOGS: number; grossProfit: number; totalExpenses: number; netProfit: number; netMargin: string };
  balanceSheet: { totalAssets: number; totalLiabilities: number; totalEquity: number; currentEarnings: number; totalLiabilitiesAndEquity: number; difference: number; isBalanced: boolean };
};
const tabs = [{ id: 'PL', label: 'Profit & Loss' }, { id: 'TRIAL_BALANCE', label: 'Trial Balance' }, { id: 'BALANCE_SHEET', label: 'Balance Sheet' }, { id: 'TAX', label: 'Tax Ledgers' }];
const money = (value: number) => ("" + currencyLabel() + " ") + value.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinancialReportsPage() {
  const [activeReport, setActiveReport] = useState('PL');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/accounting/reports');
      const json = await response.json();
      if (!response.ok || !json.success) throw Error(json.error || 'Unable to load financial reports.');
      setReport(json);
    } catch (failure) { setReport(null); setError(failure instanceof Error ? failure.message : 'Unable to load financial reports.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const rows = report?.trialBalance || [];
  const categoryRows = (categories: string[]) => rows.filter(row => categories.includes(row.category));
  const taxRows = rows.filter(row => report?.taxAccountIds.includes(row.id));
  const pl = report?.pnl;
  const bs = report?.balanceSheet;
  const exportCSV = () => {
    if (!report || !pl || !bs) return;
    const data = activeReport === 'TRIAL_BALANCE' || activeReport === 'TAX'
      ? (activeReport === 'TAX' ? taxRows : rows).map(row => ({ Code: row.code, Account: row.name, Debit: row.debitBalance, Credit: row.creditBalance }))
      : activeReport === 'BALANCE_SHEET'
        ? [...categoryRows(['ASSET', 'LIABILITY', 'EQUITY']).map(row => ({ Account: row.name, Category: row.category, Amount: row.netBalance })),
          { Account: 'Unclosed earnings', Category: 'EQUITY', Amount: bs.currentEarnings },
          { Account: 'Total assets', Category: 'TOTAL', Amount: bs.totalAssets },
          { Account: 'Total liabilities & equity', Category: 'TOTAL', Amount: bs.totalLiabilitiesAndEquity }]
        : [...categoryRows(['REVENUE', 'COST_OF_SALES', 'EXPENSE']).map(row => ({ Account: row.name, Category: row.category, Amount: row.netBalance })),
          { Account: 'Gross profit', Category: 'TOTAL', Amount: pl.grossProfit }, { Account: 'Net profit', Category: 'TOTAL', Amount: pl.netProfit }];
    exportToCSV('Hotel_New_Era_' + activeReport + '_' + report.asOf, data);
  };
  const line = (label: string, amount: number, total = false) => <div key={label} className={'accounting-report-line' + (total ? ' accounting-report-total' : '')}><span>{label}</span><strong>{money(amount)}</strong></div>;
  const accountLines = (categories: string[]) => categoryRows(categories).map(row => line(row.code + ' · ' + row.name, row.netBalance));
  return <div className="accounting-reports">
    <div className="accounting-report-header">
      <h1>Financial Reports</h1>
      <div className="accounting-report-actions">
        <Button variant="secondary" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</Button>
        <Button variant="secondary" onClick={exportCSV} disabled={!report || loading}><FileSpreadsheet size={16} /> Export CSV</Button>
        <Button onClick={() => printElement('printable-financial-report', 'Hotel New Era Financial Statement')} disabled={!report || loading}><Printer size={16} /> Print Report</Button>
      </div>
    </div>
    <div className="accounting-report-actions" role="tablist" aria-label="Financial reports">{tabs.map(tab => <button key={tab.id} role="tab" aria-selected={activeReport === tab.id} className={'hne-btn hne-btn-sm hne-btn-' + (activeReport === tab.id ? 'primary' : 'secondary')} onClick={() => setActiveReport(tab.id)}>{tab.label}</button>)}</div>
    {error && <div role="alert" className="accounting-report-error">{error}</div>}
    {loading ? <p role="status">Loading financial reports…</p> : report && pl && bs && <div id="printable-financial-report">
      <div className="accounting-report-heading"><strong>{report.company.name}</strong><span>{report.scope} · {report.periodLabel} · {report.company.currency_code}</span></div>
      {activeReport === 'PL' && <Card title="Profit & Loss">
        <h3>Revenue</h3>{accountLines(['REVENUE'])}{line('Total revenue', pl.totalRevenue, true)}
        <h3>Cost of Sales</h3>{accountLines(['COST_OF_SALES'])}{line('Total cost of sales', pl.totalCOGS, true)}{line('Gross profit', pl.grossProfit, true)}
        <h3>Expenses</h3>{accountLines(['EXPENSE'])}{line('Total expenses', pl.totalExpenses, true)}{line('Net profit / loss', pl.netProfit, true)}
      </Card>}
      {activeReport === 'TRIAL_BALANCE' && <Card title="Trial Balance"><div className="hne-table-container"><table className="hne-table"><thead><tr><th>Code</th><th>Account</th><th>Debit (NPR)</th><th>Credit (NPR)</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{money(row.debitBalance)}</td><td>{money(row.creditBalance)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Total</th><th>{money(report.trialBalanceTotals.debit)}</th><th>{money(report.trialBalanceTotals.credit)}</th></tr></tfoot></table></div><p role="status">{report.trialBalanceTotals.isBalanced ? 'Balanced' : 'Out of balance'}</p></Card>}
      {activeReport === 'BALANCE_SHEET' && <Card title="Balance Sheet"><div className="accounting-balance-columns"><section><h3>Assets</h3>{accountLines(['ASSET'])}{line('Total assets', bs.totalAssets, true)}</section><section><h3>Liabilities & Equity</h3>{accountLines(['LIABILITY'])}{line('Total liabilities', bs.totalLiabilities, true)}{accountLines(['EQUITY'])}{line('Unclosed earnings', bs.currentEarnings)}{line('Total liabilities & equity', bs.totalLiabilitiesAndEquity, true)}</section></div><p role="status">{bs.isBalanced ? 'Balanced' : 'Out of balance by ' + money(bs.difference)}</p></Card>}
      {activeReport === 'TAX' && <Card title="Tax Ledgers"><p>Ledger balances only. Tax filing status is not recorded.</p><div className="hne-table-container"><table className="hne-table"><thead><tr><th>Code</th><th>Account</th><th>Debit balance (NPR)</th><th>Credit balance (NPR)</th></tr></thead><tbody>{taxRows.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{money(row.debitBalance)}</td><td>{money(row.creditBalance)}</td></tr>)}</tbody></table></div>{!taxRows.length && <p>No tax ledgers found.</p>}</Card>}
    </div>}
  </div>;
}
