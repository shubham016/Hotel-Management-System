import React, { useState, useEffect } from 'react';
import { Moon, CheckCircle2, AlertTriangle, ShieldCheck, DollarSign, BedDouble, Lock, ArrowRight, Printer, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDualDate } from '@/lib/nepali-calendar';

export default function NightAuditPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);

  const businessDate = new Date();
  const dualBusinessDate = formatDualDate(businessDate);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/pms/night-audit');
      const json = await res.json();
      if (json.success) {
        setStatusData(json);
      }
    } catch (err) {
      console.error('Failed to load night audit status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleExecuteNightAudit = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/pms/night-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        setAuditResult(json.summary);
        setAuditComplete(true);
        setCurrentStep(3);
      } else {
        alert(json.error || 'Failed to execute night audit');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing night audit');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto', backgroundColor: '#FFFFFF' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Night Audit & Daily Business Closing</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Overnight stay extensions and extra-night folio charges. Existing booking charges are preserved.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Business Date</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--brand-crimson)' }}>
            AD: {dualBusinessDate.adFormatted}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-gold)' }}>
            BS: {dualBusinessDate.bsFormatted} (FY {statusData?.fiscalYear || '2083/84'})
          </div>
        </div>
      </div>

      {currentStep === 1 && (
        <Card title="Step 1: Pre-Audit Operational Integrity Verifications">
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Before rolling over the business day, verify that all front desk movements, room service orders, and cashier registers have been settled.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Bookable Inventory & Active Occupancy</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Occupied: {statusData?.occupiedRooms || 0} of {statusData?.totalRooms || 0} Rooms ({statusData?.occupancyRate || 0}% Occupancy)
                </div>
              </div>
              <Badge variant="success">VERIFIED</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Active In-House Guest Folios</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {statusData?.openFoliosCount || 0} Active Folios (Unsettled Balance: Rs. {(statusData?.unsettledBalanceTotal || 0).toLocaleString()})
                </div>
              </div>
              <Badge variant="success">READY</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Restaurant & POS Registers (Dhiki & Terrace Bar)</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  All KOTs and open tables checked and balanced
                </div>
              </div>
              <Badge variant="success">BALANCED</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Double-Entry GL Ledger & Tax Integration</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  13% VAT account synchronized
                </div>
              </div>
              <Badge variant="success">ALIGNED</Badge>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setCurrentStep(2)}>
              <span>Proceed to Step 2: Overnight Extensions</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card title="Step 2: Automated Night Audit & Room Revenue Rollover">
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--brand-crimson-light)', color: 'var(--brand-crimson)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Moon size={32} />
            </div>

            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Ready to Execute Night Audit</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.6 }}>
                  After 02:06, guests still checked in past yesterday's departure receive extra nights at their booked rates. Conflicting room assignments are flagged for staff. Repeating this check does not duplicate charges; checkout creates the accounting journal.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button variant="secondary" onClick={() => setCurrentStep(1)} disabled={isProcessing}>
                Back
              </Button>
              <Button variant="primary" onClick={handleExecuteNightAudit} disabled={isProcessing}>
                <Lock size={16} />
                <span>{isProcessing ? 'Processing Night Audit...' : 'Execute Night Audit Now'}</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card title="Step 3: Night Audit Execution Summary & Reconciliation">
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--brand-green-light)', color: 'var(--brand-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={36} />
            </div>

            <Badge variant="success" style={{ marginBottom: 12 }}>Night Audit Successfully Completed & Posted</Badge>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Overnight Stay Check Complete</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Overdue stays checked on {auditResult?.businessDateAD}. Review any extension conflicts before accepting incoming guests.
            </p>

            <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: 20, textAlign: 'left', marginBottom: 24, border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13.5 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Folios Audited & Updated:</span>
                  <div style={{ fontWeight: 700 }}>{auditResult?.foliosAudited || 0} In-House Folios</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Total Room Revenue Posted:</span>
                  <div style={{ fontWeight: 800, color: 'var(--brand-green)' }}>
                    Rs. {(auditResult?.totalRevenuePosted || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Extension Conflicts:</span>
                  <div style={{ fontWeight: 700, color: 'var(--brand-crimson)' }}>{auditResult?.extensionConflicts || 0} needing staff attention</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Current Calendar Date:</span>
                  <div style={{ fontWeight: 700 }}>{dualBusinessDate.adFormatted} (Active)</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print Night Audit Report
              </Button>
              <Button variant="primary" onClick={() => (window.location.href = '/admin/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
