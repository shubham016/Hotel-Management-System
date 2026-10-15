import React, { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { FormDialog } from '@/components/admin/FormDialog';
import { BsMonthPicker, BsDatePicker } from '@/components/ui/BsCalendarFields';
import { formatNepaliDate } from '@/lib/nepali-calendar';
import { calculateSalaryBreakdown } from '@/lib/payroll-totals';
import './payroll.css';

type Account = { id: string; account_code: string; name: string; category: string; cash_or_bank: boolean };
type Staff = { id: string; name: string; department: string; active: boolean; monthly_salary: string | null; basic_salary: string | null; monthly_allowance: string | null };
type Advance = { id: string; amount: string; paid_on: string; paid_on_bs: string | null; payment_method: string; payment_reference: string };
type Entry = { id: string; employee_name: string; department: string; staff_member_id: string; period: string; period_calendar: string; period_key: string; period_label: string; period_start_ad: string; period_end_ad: string; paid_on_bs: string | null; tds_rate: string | null; tds_amount: string; tds_reason: string | null; tds_review_required: boolean; tds_fiscal_year: number | null; base_salary: string; monthly_allowance: string; gross_salary: string; earnings: string; deductions: string; advance_amount: string; net_pay: string; status: string; notes: string; paid_on: string | null; payment_method: string | null; payment_reference: string | null; approval_voucher: string | null; payment_voucher: string | null; advances: Advance[] };
type Configuration = Record<string, string>;
type Data = { property: string; staff: Staff[]; accounts: Account[]; entries: Entry[]; configuration: Configuration | null; payroll_period: { system: string; period: string; label: string; start_ad: string; end_ad: string }; current_bs_period: string; legacy_ad_periods: string[] };
type Dialog = { kind: 'salary' | 'edit' | 'pay' | 'advance' | 'configuration'; entry?: Entry; staff?: Staff };
const mappings = [{ key: 'expense', label: 'Salary expense', category: 'EXPENSE' }, { key: 'payable', label: 'Salary payable', category: 'LIABILITY' }, { key: 'deductions', label: 'Deductions payable', category: 'LIABILITY' }, { key: 'advances', label: 'Staff advances', category: 'ASSET' }, { key: 'tds', label: 'Salary TDS payable', category: 'LIABILITY' }];
const amount = (value: string | number) => Number(value).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => { const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const part = (type: string) => parts.find(value => value.type === type)!.value; return `${part('year')}-${part('month')}-${part('day')}`; };
const currentBsPeriod = () => formatNepaliDate(today()).bsDateString.slice(0, 7);

async function request(path = '', method = 'GET', payload?: Record<string, string>) {
  const response = await fetch(`/api/accounting/payroll${path}`, { method, ...(payload ? { body: JSON.stringify(payload) } : {}) });
  const result = await response.json();
  if (!response.ok || !result.success) {
    const details = result.details ? Object.entries(result.details).map(([field, errors]) => `${field.replaceAll('_', ' ')}: ${Array.isArray(errors) ? errors.join(', ') : String(errors)}`).join('; ') : '';
    throw new Error(details || result.error || 'Unable to save payroll.');
  }
  return result;
}

export default function PayrollPage() {
  const [period, setPeriod] = useState(currentBsPeriod);
  const [calendar, setCalendar] = useState<'BS' | 'AD'>('BS');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [staffId, setStaffId] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [showSalarySetup, setShowSalarySetup] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const sequence = useRef(0);

  async function load() {
    const current = ++sequence.current;
    setLoading(true);
    try { const result = await request(`?calendar=${calendar}&period=${encodeURIComponent(period)}`); if (current === sequence.current) setData(result); }
    catch (reason) { if (current === sequence.current) { setData(null); setError(reason instanceof Error ? reason.message : 'Unable to load payroll.'); } }
    finally { if (current === sequence.current) setLoading(false); }
  }
  useEffect(() => { setError(''); setStaffId(''); void load(); return () => { sequence.current++; }; }, [period, calendar]);

  async function mutate(path: string, method: string, payload: Record<string, string>, success: string) {
    setSaving(true); setError(''); setMessage('');
    try { await request(path, method, payload); setDialog(null); setMessage(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save payroll.'); }
    finally { setSaving(false); }
  }

  function approvalBlockReason(entry: Entry) {
    if (today() <= entry.period_end_ad) return `This payroll month is still open. You can approve it after ${formatNepaliDate(entry.period_end_ad).bsDateString} BS (${entry.period_end_ad} AD).`;
    if (!data?.configuration) return 'Configure payroll ledger accounts before approving salaries.';
    if (entry.tds_review_required) return 'Review TDS in Edit before approving this payroll.';
    return '';
  }

  function approve(entry: Entry) {
    setMessage('');
    setError('');
    const reason = approvalBlockReason(entry);
    if (reason) {
      if (today() <= entry.period_end_ad) window.alert(reason);
      else setError(reason);
      return;
    }
    if (window.confirm(`Approve ${entry.employee_name}'s payroll for ${data!.payroll_period.label}? This posts to the ledger and locks the salary amounts.`)) {
      void mutate(`/${entry.id}/approve`, 'POST', {}, 'Payroll approved and posted to the ledger.');
    }
  }

  function open(next: Dialog) {
    setError(''); setDialog(next);
    if (next.kind === 'configuration') setForm(Object.fromEntries(mappings.map(mapping => [`${mapping.key}_account_id`, data?.configuration?.[`${mapping.key}_account_id`] || ''])));
    else if (next.kind === 'salary') setForm({ monthly_salary: next.staff?.monthly_salary || '' });
    else if (next.kind === 'edit' && next.entry) setForm({ base_salary: next.entry.base_salary, monthly_allowance: next.entry.monthly_allowance, tds_rate: next.entry.tds_rate ?? '1', notes: next.entry.notes || '' });
    else setForm({ paid_on: today(), payment_method: 'CASH', payment_account_id: '', payment_reference: '', ...(next.kind === 'advance' ? { amount: '', request_key: crypto.randomUUID() } : {}) });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!dialog) return;
    const { kind, entry, staff } = dialog;
    if (kind === 'configuration') void mutate('/configuration', 'PUT', form, 'Payroll ledger accounts saved.');
    else if (kind === 'salary') void mutate(`/staff/${staff!.id}`, 'PATCH', form, 'Monthly salary saved. Existing payroll drafts retain their salary snapshot.');
    else void mutate(`/${entry!.id}${kind === 'edit' ? '' : `/${kind}`}`, kind === 'edit' ? 'PATCH' : 'POST', kind === 'edit' ? form : { ...form, bs_paid_on: formatNepaliDate(form.paid_on).bsDateString }, kind === 'edit' ? 'Payroll draft saved.' : kind === 'advance' ? 'Salary advance recorded.' : 'Salary payment recorded.');
  }

  function payslip(entry: Entry) {
    const doc = new jsPDF(); let y = 20;
    const line = (text: string) => { const rows = doc.splitTextToSize(text, 175); if (y + rows.length * 7 > 280) { doc.addPage(); y = 20; } doc.text(rows, 18, y); y += rows.length * 7 + 2; };
    doc.setFontSize(17); line(`${data?.property || 'Hotel'} - Payslip`); doc.setFontSize(11);
    line(`Employee: ${entry.employee_name} | Department: ${entry.department}`);
    line(`Payroll month: ${entry.period_label} | Status: ${entry.status}`);
    line(`AD date range: ${entry.period_start_ad} to ${entry.period_end_ad}`);
    line(`Basic salary: NPR ${amount(entry.base_salary)}`); line(`Monthly allowance: NPR ${amount(entry.monthly_allowance)}`); line(`Gross salary: NPR ${amount(entry.gross_salary)}`); if (Number(entry.earnings) > 0) line(`Additional earnings: NPR ${amount(entry.earnings)}`);
    line(entry.tds_rate === null ? 'TDS: Not separately recorded on this earlier payroll' : `TDS (${Number(entry.tds_rate)}%): NPR ${amount(entry.tds_amount)}`);
    if (Number(entry.deductions) > 0) line(`Other deductions: NPR ${amount(entry.deductions)}`); line(`Advance recovery: NPR ${amount(entry.advance_amount)}`);
    line(`Net salary payable: NPR ${amount(entry.net_pay)}`);
    line(entry.status === 'PAID' ? `Settled on: ${entry.paid_on_bs || "-"} BS (${entry.paid_on} AD) | Method: ${entry.payment_method?.replace('_', ' ')} | Reference: ${entry.payment_reference || '-'}` : 'Salary payment outstanding.');
    line(`Approval voucher: ${entry.approval_voucher || '-'} | Payment voucher: ${entry.payment_voucher || '-'}`);
    entry.advances.forEach(advance => line(`Advance: NPR ${amount(advance.amount)} | ${advance.paid_on_bs || "-"} BS (${advance.paid_on} AD) | ${advance.payment_method} | ${advance.payment_reference || '-'}`));
    if (entry.tds_reason) line(`TDS review: ${entry.tds_reason}`);
    if (entry.notes) line(`Notes: ${entry.notes}`);
    doc.save(`Payslip-${entry.employee_name.replace(/[^a-z0-9]/gi, '-')}-${entry.period_key}-${entry.period_calendar}.pdf`);
  }

  const available = data?.staff.filter(staff => staff.active && staff.monthly_salary !== null && !data.entries.some(entry => entry.staff_member_id === staff.id)) || [];
  const totals = data?.entries.reduce((sum, entry) => ({ gross: sum.gross + Number(entry.gross_salary), tds: sum.tds + Number(entry.tds_amount), advances: sum.advances + Number(entry.advance_amount), paid: sum.paid + (entry.status === 'PAID' ? Number(entry.net_pay) : 0) }), { gross: 0, tds: 0, advances: 0, paid: 0 });
  const advanceEntries = data?.entries.filter(entry => entry.status === 'DRAFT' && Number(entry.net_pay) > 0 && today() >= entry.period_start_ad) || [];
  const salaryPreview = dialog?.kind === 'salary' ? calculateSalaryBreakdown(form.monthly_salary || '0') : null;
  const calculatedField = (label: string, value?: number) => <label className="hne-form-group"><span className="hne-label">{label}</span><input className="hne-input" type="text" readOnly value={value === undefined ? '' : value.toFixed(2)} /></label>;
  const field = (key: string, label: string, type = 'number') => <label className="hne-form-group"><span className="hne-label">{label}</span><input className="hne-input" type={type} required value={form[key] || ''} {...(type === 'number' ? { min: key === 'amount' ? '0.01' : '0', step: '0.01', ...(key === 'tds_rate' ? { max: '100' } : {}) } : type === 'date' ? { max: today() } : {})} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>;
  return <div className="staff-payroll-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {/* <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}><div><h1 style={{ fontSize: 24 }}>Staff Payroll</h1><p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Complete the month, have the all-rounder/admin approve monthly payroll, then record salary payments.</p></div><button className="hne-btn hne-btn-secondary" disabled={loading || saving || !data} onClick={() => open({ kind: 'configuration' })}>Ledger accounts</button></div> */}
    {error && !dialog && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}{message && <p role="status">{message}</p>}
    <div className="payroll-toolbar">
    {calendar === 'BS' ? <BsMonthPicker value={period} onChange={setPeriod} disabled={saving || Boolean(dialog)} /> : <div><p>Earlier payroll month: {data?.payroll_period.label || `${period} AD`}</p><button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={saving || Boolean(dialog)} onClick={() => { setCalendar('BS'); setPeriod(data?.current_bs_period || currentBsPeriod()); }}>Return to BS payroll</button></div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={loading || saving || !data?.configuration || advanceEntries.length === 0} onClick={() => open({ kind: 'advance', entry: advanceEntries[0] })}>Record advance</button>
        <button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={loading || saving || !data} aria-expanded={showSalarySetup} aria-controls="payroll-salary-setup" onClick={() => setShowSalarySetup(!showSalarySetup)}>Salary setup</button>
        <button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={loading || saving || !data} onClick={() => open({ kind: 'configuration' })}>Ledger accounts</button>
      </div>
    </div>
    {/* {!loading && data && <p style={{ color: 'var(--text-secondary)', marginTop: -12 }}>{data.payroll_period.label} · AD equivalent: {data.payroll_period.start_ad} to {data.payroll_period.end_ad}</p>} */}
    {Boolean(data?.legacy_ad_periods.length) && <label className="hne-form-group" style={{ maxWidth: 300 }}><span className="hne-label">Earlier payroll records (AD)</span><select className="hne-select" aria-label="Earlier AD payroll" value={calendar === 'AD' ? period : ''} disabled={saving || Boolean(dialog)} onChange={event => { if (event.target.value) { setCalendar('AD'); setPeriod(event.target.value); } }}><option value="">View earlier AD payroll</option>{data?.legacy_ad_periods.map(month => <option key={month} value={month}>{month} AD</option>)}</select></label>}
    {loading ? <p>Loading payroll…</p> : data && <>
      {!data.configuration && <p role="status">Choose payroll ledger accounts before approving salaries. Add any missing accounts in Chart of Accounts.</p>}
      {/* {today() <= data.payroll_period.end_ad && <p role="status">This payroll month is still open. Approval and salary release are available after {data.payroll_period.end_ad} AD.</p>} */}
      {totals && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{[['Gross payroll', totals.gross], ['TDS deductions', totals.tds], ['Advances issued', totals.advances], ['Salaries paid', totals.paid]].map(([label, value]) => <div className="hne-card" style={{ padding: 16, flex: '1 1 180px' }} key={label}><p>{label}</p><strong>NPR {amount(value)}</strong></div>)}</div>}
      <div className="hne-card" style={{ padding: 16 }}><h2 style={{ fontSize: 18, marginBottom: 12 }}>Monthly payroll</h2>{calendar === 'BS' && <form style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }} onSubmit={event => { event.preventDefault(); void mutate('', 'POST', { staff_member_id: staffId, period, calendar }, 'Payroll draft created.'); }}><select aria-label="Employee for payroll" className="hne-select" style={{ flex: '1 1 240px' }} value={staffId} required disabled={saving} onChange={event => setStaffId(event.target.value)}><option value="">Select an employee with salary setup</option>{available.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select><button className="hne-btn hne-btn-primary" disabled={saving || !staffId || !available.some(staff => staff.id === staffId)}>Create draft</button></form>}
        <div className="hne-table-container"><table className="hne-table payroll-table"><thead><tr><th>Employee</th><th>Gross salary</th><th>TDS</th><th>Advances</th><th>Net payable</th><th>Status / Payment</th><th>Actions</th></tr></thead><tbody>{data.entries.length === 0 ? <tr><td colSpan={7}>No payroll entries for this month. Set monthly salaries below, then create a draft.</td></tr> : data.entries.map(entry => <tr key={entry.id}><td>{entry.employee_name}<small style={{ display: 'block' }}>{entry.department}</small></td><td>{amount(Number(entry.gross_salary))}{Number(entry.monthly_allowance) > 0 && <small style={{ display: 'block' }}>Basic: {amount(entry.base_salary)}<br />Allowance: {amount(entry.monthly_allowance)}</small>}</td><td>{amount(entry.tds_amount)}<small style={{ display: 'block' }}>{entry.tds_rate === null ? entry.status === 'DRAFT' ? 'Not reviewed' : 'Earlier payroll' : `${Number(entry.tds_rate)}%`}</small></td><td>{amount(entry.advance_amount)}{entry.advances.length > 0 && <details><summary>History</summary>{entry.advances.map(advance => <small key={advance.id} style={{ display: 'block' }}>{amount(advance.amount)} | {advance.paid_on_bs || advance.paid_on} | {advance.payment_method.replace('_', ' ')}{advance.payment_reference ? ` | ${advance.payment_reference}` : ''}</small>)}</details>}</td><td>{amount(entry.net_pay)}</td><td>{entry.status === 'APPROVED' ? 'Approved / Unpaid' : entry.status === 'PAID' ? 'Paid' : 'Draft'}{entry.tds_review_required && <small style={{ display: 'block', color: 'var(--danger-red)' }}>Review TDS in Edit</small>}{entry.paid_on && <small style={{ display: 'block' }}>{entry.paid_on_bs || "-"} BS ({entry.paid_on} AD) · {entry.payment_method?.replace('_', ' ')}{entry.payment_reference ? ` · ${entry.payment_reference}` : ''}</small>}</td><td><div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 }}>{entry.status === 'DRAFT' && <><button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={saving} onClick={() => open({ kind: 'edit', entry })}>Edit</button><button className="hne-btn hne-btn-primary hne-btn-sm" disabled={saving} title={approvalBlockReason(entry) || 'Approve monthly payroll'} onClick={() => approve(entry)}>Approve</button></>}{entry.status === 'APPROVED' && <button className="hne-btn hne-btn-primary hne-btn-sm" disabled={saving || today() <= entry.period_end_ad} onClick={() => open({ kind: 'pay', entry })}>{Number(entry.net_pay) > 0 ? 'Record payment' : 'Settle payroll'}</button>}{entry.status !== 'DRAFT' && <button className="hne-btn hne-btn-secondary hne-btn-sm" onClick={() => payslip(entry)}>Payslip</button>}</div></td></tr>)}</tbody></table></div>
      </div>
      {showSalarySetup && <div id="payroll-salary-setup" className="hne-card" style={{ padding: 16 }}><h2 style={{ fontSize: 18, marginBottom: 8 }}>Staff salary setup</h2><div className="hne-table-container"><table className="hne-table payroll-table payroll-salary-table"><thead><tr><th>Employee</th><th>Department</th><th>Basic salary (60%)</th><th>Monthly allowance (40%)</th><th>Gross salary (NPR)</th><th>Action</th></tr></thead><tbody>{data.staff.filter(staff => staff.active).map(staff => <tr key={staff.id}><td>{staff.name}</td><td>{staff.department}</td><td>{staff.basic_salary === null ? '—' : amount(staff.basic_salary)}</td><td>{staff.monthly_allowance === null ? '—' : amount(staff.monthly_allowance)}</td><td>{staff.monthly_salary === null ? 'Not configured' : amount(staff.monthly_salary)}</td><td><button className="hne-btn hne-btn-secondary hne-btn-sm" disabled={saving} onClick={() => open({ kind: 'salary', staff })}>Set salary</button></td></tr>)}{!data.staff.some(staff => staff.active) && <tr><td colSpan={6}>Add active employees in System Settings → Staff Directory.</td></tr>}</tbody></table></div></div>}
    </>}
    {dialog && <FormDialog title={dialog.kind === 'configuration' ? 'Payroll ledger accounts' : dialog.kind === 'salary' ? `Salary: ${dialog.staff?.name}` : dialog.kind === 'edit' ? `Edit payroll: ${dialog.entry?.employee_name}` : dialog.kind === 'advance' ? 'Record salary advance' : `Record salary payment: ${dialog.entry?.employee_name}`} saving={saving} onClose={() => { setDialog(null); setError(''); }}><form onSubmit={submit}>
      {error && <p role="alert" style={{ color: 'var(--danger-red)', marginBottom: 12 }}>{error}</p>}
      {dialog.kind === 'configuration' ? <>{mappings.map(mapping => <label key={mapping.key} className="hne-form-group"><span className="hne-label">{mapping.label}</span><select className="hne-select" required value={form[`${mapping.key}_account_id`] || ''} onChange={event => setForm({ ...form, [`${mapping.key}_account_id`]: event.target.value })}><option value="">Select account</option>{data?.accounts.filter(account => account.category === mapping.category).map(account => <option key={account.id} value={account.id}>{account.account_code} — {account.name}</option>)}</select></label>)}<p style={{ marginBottom: 16 }}>Settle unpaid salaries and advances before changing accounts.</p></> : dialog.kind === 'salary' ? <>{field('monthly_salary', 'Gross salary (NPR)')}{calculatedField('Basic salary (60%) (NPR)', salaryPreview?.basic)}{calculatedField('Monthly allowance (40%) (NPR)', salaryPreview?.allowance)}</> : dialog.kind === 'edit' ? <>{field('base_salary', 'Basic salary (NPR)')}{field('monthly_allowance', 'Monthly allowance (NPR)')}{field('tds_rate', 'TDS rate (%)')}
        <label className="hne-form-group"><span className="hne-label">Notes (optional)</span><textarea className="hne-input" maxLength={2000} value={form.notes || ''} onChange={event => setForm({ ...form, notes: event.target.value })} /></label></> : <>
        {dialog.kind === 'advance' && <label className="hne-form-group"><span className="hne-label">Employee</span><select className="hne-select" required disabled={saving} value={dialog.entry!.id} onChange={event => { const entry = advanceEntries.find(item => item.id === event.target.value); if (entry) open({ kind: 'advance', entry }); }}>{advanceEntries.map(entry => <option key={entry.id} value={entry.id}>{entry.employee_name}</option>)}</select></label>}
        <label className="hne-form-group"><span className="hne-label">Remaining salary (NPR)</span><input className="hne-input" readOnly value={amount(dialog.entry!.net_pay)} /></label>
        {dialog.kind === 'advance' && <label className="hne-form-group"><span className="hne-label">Advance amount (NPR)</span><input className="hne-input" type="number" required min="0.01" max={dialog.entry!.net_pay} step="0.01" value={form.amount || ''} onChange={event => setForm({ ...form, amount: event.target.value })} /></label>}
        <BsDatePicker value={form.paid_on} onChange={value => setForm({ ...form, paid_on: value })} maxDate={today()} disabled={saving} />
        <label className="hne-form-group"><span className="hne-label">Payment method</span><select className="hne-select" value={form.payment_method} onChange={event => setForm({ ...form, payment_method: event.target.value })}><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank Transfer</option></select></label>
        <label className="hne-form-group"><span className="hne-label">Cash / bank ledger account</span><select className="hne-select" required value={form.payment_account_id} onChange={event => setForm({ ...form, payment_account_id: event.target.value })}><option value="">Select cash or bank account</option>{data?.accounts.filter(account => account.cash_or_bank && account.id !== data.configuration?.advances_account_id).map(account => <option key={account.id} value={account.id}>{account.account_code} — {account.name}</option>)}</select></label>
        <label className="hne-form-group"><span className="hne-label">Payment reference {form.payment_method === 'BANK_TRANSFER' ? '(required)' : '(optional)'}</span><input className="hne-input" maxLength={200} required={form.payment_method === 'BANK_TRANSFER'} value={form.payment_reference || ''} onChange={event => setForm({ ...form, payment_reference: event.target.value })} /></label>
      </>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="hne-btn hne-btn-secondary" disabled={saving} onClick={() => { setDialog(null); setError(''); }}>Cancel</button><button className="hne-btn hne-btn-primary" disabled={saving}>{saving ? 'Saving…' : dialog.kind === 'pay' ? 'Record payment' : dialog.kind === 'advance' ? 'Record advance' : 'Save'}</button></div>
    </form></FormDialog>}
  </div>;
}
