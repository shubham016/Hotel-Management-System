import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, ShieldCheck, User, Calendar, Lock, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/audit-logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.module?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === 'ALL' || l.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return <Badge variant="success">CREATE</Badge>;
      case 'UPDATE': return <Badge variant="warning">UPDATE</Badge>;
      case 'CHECKIN': return <Badge variant="primary">CHECK-IN</Badge>;
      case 'CHECKOUT': return <Badge variant="danger">CHECK-OUT</Badge>;
      case 'POST': return <Badge variant="primary">GL POST</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>System Security & Audit Trail</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Immutable logging of all PMS check-ins, folios, room status changes, POS bills, and GL postings
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Logs
          </Button>
        </div>
      </div>

      {/* Module Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['ALL', 'FRONT_DESK', 'PMS_ROOMS', 'GUEST_FOLIO', 'POS', 'BANQUET', 'HOUSEKEEPING', 'INVENTORY', 'PROCUREMENT', 'GENERAL_LEDGER', 'NIGHT_AUDIT'].map((mod) => (
          <button
            key={mod}
            onClick={() => setModuleFilter(mod)}
            className={`hne-btn ${moduleFilter === mod ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
          >
            {mod.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <Card title={`System Audit Trail (${filteredLogs.length})`} subtitle="Enterprise security log tracking user actions and entity state mutations">
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by action, module, or description..."
            className="hne-input"
            style={{ paddingLeft: 36 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading system audit logs from PostgreSQL...
          </div>
        ) : (
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>Timestamp (Dual AD/BS)</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Audit Description</th>
                  <th>Client IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const dual = formatDualDate(log.createdAt);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: 12 }}>
                        <div>{dual.adFormatted} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        <div style={{ color: 'var(--brand-gold)', fontSize: 11 }}>BS: {dual.bsFormatted}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: 'var(--bg-subtle)' }}>
                          {log.module}
                        </span>
                      </td>
                      <td>{getActionBadge(log.action)}</td>
                      <td style={{ fontWeight: 700, fontSize: 12.5 }}>{log.entityName}</td>
                      <td style={{ fontSize: 12.5 }}>{log.description}</td>
                      <td style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
