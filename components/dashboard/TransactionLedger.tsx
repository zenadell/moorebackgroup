'use client';

import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, CheckCircle2, Clock, Copy, Check, RefreshCw } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface TransactionRecord {
  id: string;
  timestamp: number;
  type: 'deposit' | 'withdrawal' | 'buyback';
  asset: string;
  network?: string;
  amount: number;
  txId?: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmations?: number;
  vaultAddress?: string;
  credited: boolean;
  note?: string;
}

interface TransactionLedgerProps {
  className?: string;
}

function formatAmount(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncateTxId(txId: string): string {
  if (txId.length <= 16) return txId;
  return txId.slice(0, 8) + '…' + txId.slice(-6);
}

export function TransactionLedger({ className }: TransactionLedgerProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetch(`/api/transactions?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(() => fetchTransactions(), 8000);

    let bc: BroadcastChannel | null = null;
    const relevantTypes = new Set([
      'PAYMENT_TRANSFERRED',
      'LIQUIDATION_SUCCESS',
      'BUYBACK_SUCCESS',
      'PORTFOLIO_RESET',
      'PORTFOLIO_SHARES_UPDATED',
      'ADMIN_CONFIG_UPDATED',
    ]);
    try {
      bc = new BroadcastChannel('moback_realtime_sync');
      bc.onmessage = (event) => {
        if (relevantTypes.has(event.data?.type)) {
          fetchTransactions();
        }
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'moback_realtime_ping' || e.key === 'moback_last_transfer') {
        fetchTransactions();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      bc?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleCopy = (txId: string, id: string) => {
    copyToClipboard(txId);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Styles ────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e9edf3',
    borderRadius: '14px',
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box',
    overflowX: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.3,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#64748b',
    margin: '3px 0 0 0',
  };

  const refreshBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 0',
    borderBottom: '1px solid #f1f5f9',
    flexWrap: 'wrap',
  };

  const iconContainerBase: React.CSSProperties = {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const assetBadgeStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '9999px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    flexShrink: 0,
  };

  const statusBadgeConfirmed: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '9999px',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    flexShrink: 0,
  };

  const statusBadgePending: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '9999px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    flexShrink: 0,
  };

  const statusBadgeFailed: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '9999px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    flexShrink: 0,
  };

  const txIdStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid #f1f5f9',
    flexShrink: 0,
  };

  const copyBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    color: '#94a3b8',
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    color: '#94a3b8',
    fontSize: '13px',
    gap: '8px',
  };

  // ─── Render ────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    if (status === 'confirmed') return statusBadgeConfirmed;
    if (status === 'pending') return statusBadgePending;
    return statusBadgeFailed;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'pending') return 'Pending';
    return 'Failed';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'confirmed') return <CheckCircle2 style={{ width: '12px', height: '12px' }} />;
    return <Clock style={{ width: '12px', height: '12px' }} />;
  };

  return (
    <div style={cardStyle} className={className}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Transaction History</h3>
          <p style={subtitleStyle}>Recent Activity</p>
        </div>
        <button
          onClick={() => fetchTransactions(true)}
          style={refreshBtnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <RefreshCw
            style={{
              width: '13px',
              height: '13px',
              transition: 'transform 0.4s',
              transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)',
            }}
          />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={loadingStyle}>
          <RefreshCw
            style={{
              width: '16px',
              height: '16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          Loading transactions…
        </div>
      )}

      {/* Empty State */}
      {!loading && transactions.length === 0 && (
        <div style={emptyStateStyle}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <Clock style={{ width: '22px', height: '22px', color: '#cbd5e1' }} />
          </div>
          <span style={{ fontWeight: 600, color: '#64748b' }}>No transactions yet</span>
          <span style={{ fontSize: '12px', marginTop: '4px', color: '#94a3b8' }}>
            Transaction activity will appear here once recorded.
          </span>
        </div>
      )}

      {/* Transaction List */}
      {!loading && transactions.length > 0 && (
        <div>
          {transactions.map((tx, idx) => {
            const isDeposit = tx.type === 'deposit';
            const isBuyback = tx.type === 'buyback';
            const iconBg = isDeposit ? '#ecfdf5' : isBuyback ? '#eff6ff' : '#fef2f2';
            const iconColor = isDeposit ? '#10b981' : isBuyback ? '#2563eb' : '#ef4444';
            const typeLabel = isDeposit
              ? 'Asset Liquidation'
              : isBuyback
                ? 'Share Buyback'
                : 'Withdrawal';

            return (
              <div
                key={tx.id}
                style={{
                  ...rowStyle,
                  borderBottom: idx === transactions.length - 1 ? 'none' : '1px solid #f1f5f9',
                }}
              >
                {/* Icon */}
                <div style={{ ...iconContainerBase, backgroundColor: iconBg }}>
                  {isDeposit ? (
                    <ArrowDownLeft style={{ width: '18px', height: '18px', color: iconColor }} />
                  ) : isBuyback ? (
                    <TrendingUp style={{ width: '18px', height: '18px', color: iconColor }} />
                  ) : (
                    <ArrowUpRight style={{ width: '18px', height: '18px', color: iconColor }} />
                  )}
                </div>

                {/* Type + Note */}
                <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      lineHeight: 1.3,
                    }}
                  >
                    {typeLabel}
                  </div>
                  {tx.note && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        marginTop: '2px',
                        lineHeight: 1.4,
                        maxWidth: '320px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={tx.note}
                    >
                      {tx.note}
                    </div>
                  )}
                </div>

                {/* Asset Badge */}
                <span style={assetBadgeStyle}>{tx.asset}</span>

                {/* Amount */}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: isDeposit ? '#059669' : isBuyback ? '#2563eb' : '#0f172a',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                    minWidth: '90px',
                    textAlign: 'right',
                  }}
                >
                  {isDeposit || isBuyback ? '+' : '−'}{formatAmount(tx.amount)}
                </span>

                {/* TxID */}
                {tx.txId && (
                  <div style={txIdStyle}>
                    <span title={tx.txId}>{truncateTxId(tx.txId)}</span>
                    <button
                      onClick={() => handleCopy(tx.txId!, tx.id)}
                      style={copyBtnStyle}
                      title="Copy Transaction ID"
                    >
                      {copiedId === tx.id ? (
                        <Check style={{ width: '12px', height: '12px', color: '#10b981' }} />
                      ) : (
                        <Copy style={{ width: '12px', height: '12px' }} />
                      )}
                    </button>
                  </div>
                )}

                {/* Status Badge */}
                <span style={getStatusBadge(tx.status)}>
                  {getStatusIcon(tx.status)}
                  {getStatusLabel(tx.status)}
                </span>

                {/* Date */}
                <span
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    fontWeight: 500,
                    flexShrink: 0,
                    minWidth: '85px',
                    textAlign: 'right',
                  }}
                >
                  {formatDate(tx.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline keyframes for loading spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
