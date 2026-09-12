import React, { useState, useEffect } from 'react';
import { ReceiptText, Plus, Search, Filter, CheckCircle2, ShieldCheck, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';

export default function JournalsPage() {
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [journals, setJournals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Manual Journal Form
  const [narration, setNarration] = useState('');
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [lines, setLines] = useState<any[]>([
    { accountId: '', debitAmount: '', creditAmount: '', narration: '' },
    { accountId: '', debitAmount: '', creditAmount: '', narration: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchJournals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/accounting/journals');
      const json = await res.json();
      if (json.success) {
        setJournals(json.vouchers || []);
        setAccounts(json.accounts || []);
        if (json.accounts?.length > 0 && !lines[0].accountId) {
          setLines([
            { accountId: json.accounts[0].id, debitAmount: '', creditAmount: '', narration: '' },
            { accountId: json.accounts[1]?.id || json.accounts[0].id, debitAmount: '', creditAmount: '', narration: '' }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to load journal vouchers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, []);

  const handleAddLine = () => {
    setLines([...lines, { accountId: accounts[0]?.id || '', debitAmount: '', creditAmount: '', narration: '' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      alert('A journal entry requires at least 2 lines (debit & credit).');
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const totalDebit = lines.reduce((acc, l) => acc + (parseFloat(l.debitAmount) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (parseFloat(l.creditAmount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert(`Voucher is not balanced! Total Debit (Rs. ${totalDebit}) must equal Total Credit (Rs. ${totalCredit}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/accounting/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherType,
          narration,
          entries: lines
        })
      });

      const json = await res.json();
      if (json.success) {
        alert('General Ledger Journal Voucher posted successfully!');
        setShowManualModal(false);
        setNarration('');
        setLines([
          { accountId: accounts[0]?.id || '', debitAmount: '', creditAmount: '', narration: '' },
          { accountId: accounts[1]?.id || accounts[0]?.id || '', debitAmount: '', creditAmount: '', narration: '' }
        ]);
        fetchJournals();
      } else {
        alert(json.error || 'Failed to post voucher');
      }
    } catch (err: any) {
      alert(err.message || 'Error posting voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredJournals = journals.filter(
    (j) =>
      j.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.narration.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>General Ledger Journal Vouchers</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Real-time double-entry audit trail from PMS checkouts, POS settlements, Night Audits, and manual entries
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchJournals} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowManualModal(true)}>
            <Plus size={16} />
            <span>Create Journal Voucher</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Journal List + Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedJournal ? '1.1fr 1fr' : '1fr', gap: 24 }}>
        <Card title={`Posted Journal Vouchers (${filteredJournals.length})`} subtitle="Double-entry vouchers with complete line item audit trails">
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Voucher Number or Narration..."
              className="hne-input"
              style={{ paddingLeft: 36 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading general ledger journals from PostgreSQL...
            </div>
          ) : (
            <div className="hne-table-container">
              <table className="hne-table">
                <thead>
                  <tr>
                    <th>Voucher #</th>
                    <th>Type</th>
                    <th>Date (Dual AD/BS)</th>
                    <th>Narration</th>
                    <th>Amount (NPR)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJournals.map((jv) => {
                    const dual = formatDualDate(jv.voucherDate || jv.createdAt);
                    return (
                      <tr
                        key={jv.id}
                        style={{
                          backgroundColor: selectedJournal?.id === jv.id ? 'var(--brand-crimson-light)' : 'transparent',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedJournal(jv)}
                      >
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--brand-crimson)' }}>
                            {jv.voucherNumber}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{jv.sourceModule}</div>
                        </td>
                        <td>
                          <Badge variant="outline">{jv.voucherType}</Badge>
                        </td>
                        <td style={{ fontSize: 11.5 }}>
                          <div>{dual.adFormatted}</div>
                          <div style={{ color: 'var(--brand-gold)', fontWeight: 600 }}>BS: {dual.bsFormatted}</div>
                        </td>
                        <td style={{ fontSize: 12.5, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {jv.narration}
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          Rs. {Number(jv.totalAmount).toLocaleString()}
                        </td>
                        <td>
                          <Badge variant="success">{jv.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Selected Voucher Inspector */}
        {selectedJournal && (
          <Card
            title={`Voucher #${selectedJournal.voucherNumber}`}
            subtitle={`Type: ${selectedJournal.voucherType} • ${selectedJournal.sourceModule}`}
            action={
              <button
                onClick={() => setSelectedJournal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)' }}
              >
                ✕ Close
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ backgroundColor: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 12.5 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Narration:</div>
                <div>{selectedJournal.narration}</div>
              </div>

              {/* Entries Table */}
              <div className="hne-table-container">
                <table className="hne-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Debit (Rs.)</th>
                      <th>Credit (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJournal.entries?.map((e: any) => (
                      <tr key={e.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>
                            [{e.account?.accountCode || 'GL'}] {e.account?.name || 'Account'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.narration}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: Number(e.debitAmount) > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {Number(e.debitAmount) > 0 ? `Rs. ${Number(e.debitAmount).toLocaleString()}` : '-'}
                        </td>
                        <td style={{ fontWeight: 700, color: Number(e.creditAmount) > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {Number(e.creditAmount) > 0 ? `Rs. ${Number(e.creditAmount).toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', fontWeight: 800 }}>
                      <td>Total Balanced</td>
                      <td>Rs. {Number(selectedJournal.totalAmount).toLocaleString()}</td>
                      <td>Rs. {Number(selectedJournal.totalAmount).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Voucher
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Create Manual Voucher Modal */}
      {showManualModal && (
        <div className="hne-modal-backdrop" onClick={() => setShowManualModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Create General Ledger Journal Voucher</h3>
              <button className="hne-modal-close" onClick={() => setShowManualModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePostJournal}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div className="hne-form-group">
                    <label className="hne-label">Voucher Type</label>
                    <select
                      className="hne-select"
                      value={voucherType}
                      onChange={(e) => setVoucherType(e.target.value)}
                    >
                      <option value="JOURNAL">JOURNAL (JV)</option>
                      <option value="PAYMENT">PAYMENT (PV)</option>
                      <option value="RECEIPT">RECEIPT (RV)</option>
                      <option value="CONTRA">CONTRA (CV)</option>
                    </select>
                  </div>
                  <div className="hne-form-group">
                    <label className="hne-label">Narration / Memo</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monthly Electricity Utility bill payment via Bank"
                      className="hne-input"
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Debit & Credit Entries</div>
                    <button type="button" onClick={handleAddLine} style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-crimson)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                      + Add Line
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lines.map((line, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 30px', gap: 8, alignItems: 'center' }}>
                        <select
                          className="hne-select"
                          value={line.accountId}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].accountId = e.target.value;
                            setLines(newLines);
                          }}
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              [{acc.accountCode}] {acc.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          placeholder="Debit (Rs.)"
                          className="hne-input"
                          value={line.debitAmount}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].debitAmount = e.target.value;
                            if (e.target.value) newLines[idx].creditAmount = '';
                            setLines(newLines);
                          }}
                        />

                        <input
                          type="number"
                          placeholder="Credit (Rs.)"
                          className="hne-input"
                          value={line.creditAmount}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].creditAmount = e.target.value;
                            if (e.target.value) newLines[idx].debitAmount = '';
                            setLines(newLines);
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          style={{ border: 'none', background: 'transparent', color: 'var(--danger-red)', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Summary Bar */}
                  <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--radius-sm)', backgroundColor: isBalanced ? 'var(--brand-green-light)' : 'var(--danger-red-light)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                    <div>Total Debit: Rs. {totalDebit.toLocaleString()}</div>
                    <div>Total Credit: Rs. {totalCredit.toLocaleString()}</div>
                    <div>Status: {isBalanced ? '✓ BALANCED' : '✕ UNBALANCED'}</div>
                  </div>
                </div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowManualModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={!isBalanced || isSubmitting}>Post Voucher to GL</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
