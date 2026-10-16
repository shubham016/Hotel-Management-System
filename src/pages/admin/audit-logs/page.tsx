import { showNepaliDates } from '@/lib/display-preferences';
import React, { useState, useEffect, useRef } from 'react';
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
  const [error, setError] = useState('');
  const [modules, setModules] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const sequence = useRef(0);

  const fetchLogs = async () => {
    const current = ++sequence.current;
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`/api/audit-logs?page=${page}&module=${encodeURIComponent(moduleFilter)}&q=${encodeURIComponent(searchTerm)}`);
      const json = await res.json();
      if (current !== sequence.current) return;
      if (res.ok && json.success) {
        setLogs(json.logs || []);
        setModules(json.modules || []);
        setTotal(json.total || 0);
        setHasNext(Boolean(json.hasNext));
      } else throw new Error(json.error || 'Unable to load audit logs.');
    } catch (err) {
      if (current === sequence.current) { setLogs([]); setError(err instanceof Error ? err.message : 'Unable to load audit logs.'); }
    } finally {
      if (current === sequence.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    return () => { sequence.current++; };
  }, [page, moduleFilter, searchTerm]);

  const filteredLogs = logs;

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
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Audit Logs</h1>

        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Logs
          </Button>
        </div>
      </div>

      {/* Module Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['ALL', ...modules].map((mod) => (
          <button
            key={mod}
            onClick={() => { setModuleFilter(mod); setPage(1); }}
            className={`hne-btn ${moduleFilter === mod ? 'hne-btn-primary' : 'hne-btn-secondary'} hne-btn-sm`}
          >
            {mod.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      {error && <p role="alert" style={{ color: 'var(--danger-red)' }}>{error}</p>}
      <Card title={`Audit Trail (${total})`} >
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by action, module, or record ID..."
            className="hne-input"
            style={{ paddingLeft: 36 }}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading system audit logs…
          </div>
        ) : (
          <div className="hne-table-container">
            <table className="hne-table">
              <thead>
                <tr>
                  <th>Timestamp (Dual AD/BS)</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>User</th>
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
                        {showNepaliDates() && <div style={{ color: 'var(--brand-gold)', fontSize: 11 }}>BS: {dual.bsFormatted}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: 'var(--bg-subtle)' }}>
                          {log.module}
                        </span>
                      </td>
                      <td>{getActionBadge(log.action)}</td>
                      <td>{log.actor || '—'}</td>
                      <td style={{ fontWeight: 700, fontSize: 12.5 }}>{log.entityName}</td>
                      <td style={{ fontSize: 12.5 }}>{log.description}</td>
                      <td style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  );
                })}
                {!filteredLogs.length && <tr><td colSpan={7}>No audit records found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Button variant="secondary" size="sm" disabled={page === 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>Page {page}</span>
        <Button variant="secondary" size="sm" disabled={!hasNext || isLoading || Boolean(error)} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
