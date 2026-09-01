'use client';

import React, { useState, useEffect } from 'react';
import { ReceiptText, Plus, Search, Filter, FolderTree, ArrowRight, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ChartOfAccountsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ASSET');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/accounting/chart-of-accounts');
      const json = await res.json();
      if (json.success) {
        setAccounts(json.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load chart of accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/accounting/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: code,
          name,
          category,
          description
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('General Ledger account created successfully!');
        setShowAddModal(false);
        setCode('');
        setName('');
        setDescription('');
        fetchAccounts();
      } else {
        alert(json.error || 'Failed to create account');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesCategory = selectedCategory === 'ALL' || acc.category === selectedCategory;
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.accountCode.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'ASSET': return <Badge variant="primary">Asset (1xxx)</Badge>;
      case 'LIABILITY': return <Badge variant="warning">Liability (2xxx)</Badge>;
      case 'EQUITY': return <Badge variant="outline">Equity (3xxx)</Badge>;
      case 'REVENUE': return <Badge variant="success">Revenue (4xxx)</Badge>;
      case 'COST_OF_SALES': return <Badge variant="danger">COGS (5xxx)</Badge>;
      case 'EXPENSE': return <Badge variant="danger">Expense (6xxx)</Badge>;
      default: return <Badge variant="outline">{cat}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Chart of Accounts (General Ledger)</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Enterprise double-entry ledger hierarchy with automated PMS, POS & Banquet posting rules
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchAccounts} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Create GL Account</span>
          </Button>
        </div>
      </div>

      {/* Categories Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'All Accounts' },
          { key: 'ASSET', label: '1xxx Assets' },
          { key: 'LIABILITY', label: '2xxx Liabilities' },
          { key: 'EQUITY', label: '3xxx Equity' },
          { key: 'REVENUE', label: '4xxx Revenue' },
          { key: 'COST_OF_SALES', label: '5xxx COGS' },
          { key: 'EXPENSE', label: '6xxx Expenses' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedCategory(tab.key)}
            className={`hne-btn ${selectedCategory === tab.key ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Accounts List Table */}
      <Card title={`Ledger Accounts (${filteredAccounts.length})`} subtitle="Double-entry general ledger chart compliant with Nepal Accounting Standards (NAS)">
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by Account Code or Name..."
            className="hne-input"
            style={{ paddingLeft: 36 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading chart of accounts from PostgreSQL...
          </div>
        ) : (
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>Account Code</th>
                  <th>Account Title</th>
                  <th>Classification</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 14, color: 'var(--brand-crimson)' }}>
                        {acc.accountCode}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{acc.name}</div>
                    </td>
                    <td>{getCategoryBadge(acc.category)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {acc.description || 'System standard account'}
                    </td>
                    <td>
                      <Badge variant="success">ACTIVE</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="hne-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="hne-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="hne-modal-header">
              <h3 className="hne-modal-title">Create General Ledger Account</h3>
              <button className="hne-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="hne-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="hne-form-group">
                  <label className="hne-label">Account Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6005"
                    className="hne-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Account Title / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laundry Detergent & Chemicals"
                    className="hne-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Category</label>
                  <select
                    className="hne-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="ASSET">ASSET (1xxx)</option>
                    <option value="LIABILITY">LIABILITY (2xxx)</option>
                    <option value="EQUITY">EQUITY (3xxx)</option>
                    <option value="REVENUE">REVENUE (4xxx)</option>
                    <option value="COST_OF_SALES">COST OF SALES (5xxx)</option>
                    <option value="EXPENSE">EXPENSE (6xxx)</option>
                  </select>
                </div>

                <div className="hne-form-group">
                  <label className="hne-label">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Brief description for audit purposes"
                    className="hne-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="hne-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>Create Account</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
