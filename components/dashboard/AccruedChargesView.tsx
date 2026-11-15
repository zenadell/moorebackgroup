'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ACCRUED_CHARGES_LEDGER,
  AccruedChargesSummary,
  CONTRACT_END_DATE,
  CONTRACT_START_DATE,
  TOTAL_ACCRUED_TAX_AND_CHARGES,
  TOTAL_CONTRACT_MONTHS,
  TOTAL_CUSTODY_CHARGES,
  TOTAL_STATUTORY_TAX,
} from '@/lib/charges/schedule';
import { PayOffChargesModal } from './PayOffChargesModal';

const EMPTY_SUMMARY: AccruedChargesSummary = {
  totalAccrued: TOTAL_ACCRUED_TAX_AND_CHARGES,
  totalApprovedPaid: 0,
  totalPendingVerification: 0,
  remainingBalance: TOTAL_ACCRUED_TAX_AND_CHARGES,
  progressPercent: 0,
  isFullySettled: false,
  wallets: [],
  payments: [],
};

export function AccruedChargesView() {
  const [summary, setSummary] = useState<AccruedChargesSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<'ALL' | 2026 | 2025 | 2024>('ALL');
  const [showAllRows, setShowAllRows] = useState(false);
  const [isPayOffOpen, setIsPayOffOpen] = useState(false);
  const [recentSubmission, setRecentSubmission] = useState<{
    id: string;
    amount: number;
    asset: string;
    network: string;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/charges', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setSummary({
          totalAccrued: data.totalAccrued ?? TOTAL_ACCRUED_TAX_AND_CHARGES,
          totalApprovedPaid: data.totalApprovedPaid ?? 0,
          totalPendingVerification: data.totalPendingVerification ?? 0,
          remainingBalance: data.remainingBalance ?? TOTAL_ACCRUED_TAX_AND_CHARGES,
          progressPercent: data.progressPercent ?? 0,
          isFullySettled: Boolean(data.isFullySettled),
          wallets: Array.isArray(data.wallets) ? data.wallets : [],
          payments: Array.isArray(data.payments) ? data.payments : [],
        });
      }
    } catch {
      // keep existing state cleanly
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const filteredRows = useMemo(() => {
    const base =
      selectedYear === 'ALL'
        ? ACCRUED_CHARGES_LEDGER
        : ACCRUED_CHARGES_LEDGER.filter((r) => r.year === selectedYear);

    if (selectedYear === 'ALL' && !showAllRows) {
      // Compact default: latest rows at top + Contract Start anchor row at bottom
      return [...base.slice(0, 6), base[base.length - 1]];
    }
    return base;
  }, [selectedYear, showAllRows]);

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Timestamp',
      'Reference ID',
      'Period',
      'Description',
      'Statutory Tax (USD)',
      'Custody Servicing (USD)',
      'Cycle Total (USD)',
      'Cumulative Running Total (USD)',
    ];
    const rows = ACCRUED_CHARGES_LEDGER.map((r) => [
      `"${r.dateLabel}"`,
      `"${r.timeLabel}"`,
      r.id,
      `"${r.periodWindow}"`,
      `"${r.description}"`,
      r.statutoryTax.toFixed(2),
      r.custodyCharge.toFixed(2),
      r.monthlyTotal.toFixed(2),
      r.cumulativeTotal.toFixed(2),
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MooreBach_Contract_Charges_2026_2024.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Compact Header Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Contract Charges &amp; Tax Schedule
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
            24-Month Custody Statement • {CONTRACT_END_DATE} down to {CONTRACT_START_DATE}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadSummary}
            disabled={isLoading}
            title="Refresh settlement status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 11px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw
              style={{
                width: '13px',
                height: '13px',
                animation: isLoading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 11px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download style={{ width: '13px', height: '13px' }} />
            <span>CSV</span>
          </button>

          {!summary.isFullySettled && (
            <button
              type="button"
              onClick={() => setIsPayOffOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
              }}
            >
              <CreditCard style={{ width: '13px', height: '13px' }} />
              <span>Pay Off</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Friendly Summary Strip (No Red Warnings) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '10px',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: summary.isFullySettled ? '#ecfdf5' : '#eff6ff',
            border: `1px solid ${summary.isFullySettled ? '#a7f3d0' : '#dbeafe'}`,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: summary.isFullySettled ? '#065f46' : '#1e40af',
              display: 'block',
            }}
          >
            {summary.isFullySettled ? 'Balance Cleared' : 'Remaining Balance'}
          </span>
          <strong
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: summary.isFullySettled ? '#065f46' : '#0f172a',
              fontFamily: 'ui-monospace, monospace',
              display: 'block',
              marginTop: '3px',
            }}
          >
            $
            {summary.remainingBalance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
            of $
            {summary.totalAccrued.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            24-mo total
          </span>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', display: 'block' }}>
            Approved Payments
          </span>
          <strong
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: '#059669',
              fontFamily: 'ui-monospace, monospace',
              display: 'block',
              marginTop: '3px',
            }}
          >
            $
            {summary.totalApprovedPaid.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
          <div
            style={{
              marginTop: '6px',
              height: '5px',
              borderRadius: '9999px',
              backgroundColor: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${summary.progressPercent}%`,
                height: '100%',
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', display: 'block' }}>
            24-Month Composition
          </span>
          <strong
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#0f172a',
              fontFamily: 'ui-monospace, monospace',
              display: 'block',
              marginTop: '4px',
            }}
          >
            ${TOTAL_STATUTORY_TAX.toLocaleString('en-US', { minimumFractionDigits: 2 })} Tax • $
            {TOTAL_CUSTODY_CHARGES.toLocaleString('en-US', { minimumFractionDigits: 2 })} Fee
          </strong>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>
            ~$
            {(TOTAL_ACCRUED_TAX_AND_CHARGES / TOTAL_CONTRACT_MONTHS).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            monthly allocation
          </span>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Calendar style={{ width: '12px', height: '12px' }} />
            <span>Contract Window</span>
          </span>
          <strong style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', display: 'block', marginTop: '4px' }}>
            {CONTRACT_START_DATE} – {CONTRACT_END_DATE}
          </strong>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>
            24 Monthly Assessment Periods
          </span>
        </div>
      </div>

      {/* Pending Verification Subtle Notice */}
      {summary.totalPendingVerification > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '10px 13px',
            borderRadius: '9px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            fontSize: '12px',
            color: '#1e40af',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Clock style={{ width: '14px', height: '14px' }} />
            <span>
              Pending verification:{' '}
              <strong>
                $
                {summary.totalPendingVerification.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>{' '}
              awaiting treasury settlement confirmation.
            </span>
          </span>
        </div>
      )}

      {/* Sequential Payment Submissions Log (only shown once user starts paying) */}
      {summary.payments.length > 0 && (
        <div
          style={{
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Recent Pay Off Submissions</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>
              {summary.payments.length} recorded
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {summary.payments.map((p) => {
              const isApproved = p.status === 'approved';
              const isRejected = p.status === 'rejected';
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px 11px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      $
                      {p.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span style={{ fontWeight: 500, color: '#64748b' }}>
                        via {p.asset} ({p.network})
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(p.submittedAt).toLocaleString()} • Ref #{p.id}
                      {p.adminNote ? ` • Note: ${p.adminNote}` : ''}
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      backgroundColor: isApproved
                        ? '#dcfce7'
                        : isRejected
                        ? '#f1f5f9'
                        : '#dbeafe',
                      color: isApproved ? '#166534' : isRejected ? '#475569' : '#1e40af',
                    }}
                  >
                    {isApproved ? (
                      <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                    ) : (
                      <Clock style={{ width: '12px', height: '12px' }} />
                    )}
                    <span>
                      {isApproved
                        ? 'Approved & Deducted'
                        : isRejected
                        ? 'Not Confirmed'
                        : 'Pending Verification'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Year Filter & Collapse Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {(['ALL', 2026, 2025, 2024] as const).map((yr) => {
            const active = selectedYear === yr;
            return (
              <button
                key={String(yr)}
                type="button"
                onClick={() => {
                  setSelectedYear(yr);
                  if (yr !== 'ALL') setShowAllRows(true);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: active ? '#eff6ff' : '#ffffff',
                  color: active ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                }}
              >
                {yr === 'ALL' ? 'All Periods' : String(yr)}
              </button>
            );
          })}
        </div>

        {selectedYear === 'ALL' && (
          <button
            type="button"
            onClick={() => setShowAllRows(!showAllRows)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showAllRows ? (
              <>
                <ChevronUp style={{ width: '14px', height: '14px' }} />
                <span>Show Compact View</span>
              </>
            ) : (
              <>
                <ChevronDown style={{ width: '14px', height: '14px' }} />
                <span>Show All 24 Months ({ACCRUED_CHARGES_LEDGER.length} entries)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Compact Friendly Schedule Table (Nov 16, 2026 at Top -> Nov 16, 2024 at Bottom) */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <table
          style={{
            width: '100%',
            minWidth: '640px',
            borderCollapse: 'collapse',
            fontSize: '12px',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                color: '#64748b',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <th style={{ padding: '8px 10px' }}>Date &amp; Timestamp</th>
              <th style={{ padding: '8px 10px' }}>Period</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tax</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Custody Fee</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cycle Amount</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const isCleared =
                !row.isInception && summary.totalApprovedPaid >= row.cumulativeTotal;
              const isPartiallyCovered =
                !row.isInception &&
                !isCleared &&
                summary.totalApprovedPaid > row.cumulativeTotal - row.monthlyTotal;
              const isCollapsedBoundary =
                selectedYear === 'ALL' && !showAllRows && idx === filteredRows.length - 1;

              return (
                <React.Fragment key={row.id}>
                  {isCollapsedBoundary && (
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <td colSpan={6} style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowAllRows(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Show 18 intermediate monthly cycles ({ACCRUED_CHARGES_LEDGER.length - 7} periods) ↓
                        </button>
                      </td>
                    </tr>
                  )}
                  <tr
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.dateLabel}</div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: '#64748b',
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {row.timeLabel}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ color: '#334155', fontWeight: 500 }}>{row.description}</div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                        {row.periodWindow} • #{row.id}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace',
                        color: '#475569',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${row.statutoryTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace',
                        color: '#475569',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${row.custodyCharge.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 600,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${row.monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {row.isInception ? (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          Initiated
                        </span>
                      ) : isCleared ? (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                          }}
                        >
                          Settled
                        </span>
                      ) : isPartiallyCovered ? (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                          }}
                        >
                          Partial
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          Recorded
                        </span>
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {recentSubmission && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 70,
            maxWidth: '380px',
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.24)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '9999px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              flexShrink: 0,
              marginTop: '1px',
            }}
          >
            ✓
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>
              Payment Submitted for Review
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '3px', lineHeight: 1.45 }}>
              ${recentSubmission.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} via{' '}
              {recentSubmission.asset} ({recentSubmission.network}) •{' '}
              <code style={{ color: '#e2e8f0', fontFamily: 'ui-monospace, monospace' }}>#{recentSubmission.id}</code>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setRecentSubmission(null)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              fontSize: '14px',
              lineHeight: 1,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Sequential Pay Off Modal */}
      <PayOffChargesModal
        isOpen={isPayOffOpen}
        onClose={() => setIsPayOffOpen(false)}
        summary={summary}
        onPaymentSubmitted={(next, payment) => {
          setSummary(next);
          if (payment) {
            setRecentSubmission({
              id: payment.id,
              amount: payment.amount,
              asset: payment.asset,
              network: payment.network,
            });
            window.setTimeout(() => {
              setRecentSubmission((curr) => (curr?.id === payment.id ? null : curr));
            }, 8500);
          }
        }}
      />
    </div>
  );
}
