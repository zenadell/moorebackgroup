'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth/context';
import { Header } from '@/components/layout/Header';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { StatCards } from '@/components/dashboard/StatCards';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { WeeklyUsersChart } from '@/components/dashboard/WeeklyUsersChart';
import { TrafficSourcesChart } from '@/components/dashboard/TrafficSourcesChart';
import { HoldingsTable } from '@/components/dashboard/HoldingsTable';
import { AnalyticsView } from '@/components/dashboard/AnalyticsView';
import { SettingsView } from '@/components/dashboard/SettingsView';
import { BeneficiaryView } from '@/components/dashboard/BeneficiaryView';
import { LoginForm } from '@/components/auth/LoginForm';
import { DepositModal } from '@/components/dashboard/DepositModal';
import { WithdrawModal } from '@/components/dashboard/WithdrawModal';
import { BuyBackModal } from '@/components/dashboard/BuyBackModal';
import { PaymentReceivedModal } from '@/components/dashboard/PaymentReceivedModal';
import { TransactionLedger } from '@/components/dashboard/TransactionLedger';
import { INITIAL_HOLDINGS, PORTFOLIO_SUMMARY, RECENT_TRANSACTIONS } from '@/lib/data/holdings';
import { StockHolding } from '@/types';
import { ArrowDownLeft, ArrowUpRight, Coins, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { ModernTopBar, OrbitalLoader } from '@/components/ui/ModernLoader';

function DashboardContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, any>>({});
  const [shareAdjustments, setShareAdjustments] = useState<Record<string, number>>({});
  const [buybacks, setBuybacks] = useState<any[]>([]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [marketStatus, setMarketStatus] = useState<{ status: string; label: string; lastTradeDate: string } | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isBuyBackModalOpen, setIsBuyBackModalOpen] = useState(false);
  const [buyBackInitialTicker, setBuyBackInitialTicker] = useState<string | null>(null);
  const [liquidatedBalance, setLiquidatedBalance] = useState<number>(0);
  const [liquidatedPositions, setLiquidatedPositions] = useState<any[]>([]);
  const [unacknowledgedReceipt, setUnacknowledgedReceipt] = useState<any | null>(null);

  const holdings = React.useMemo<StockHolding[]>(() => {
    const updated = INITIAL_HOLDINGS.map((base) => {
      const delta = shareAdjustments[base.ticker] || 0;
      const shares = Number(Math.max(0, base.shares + delta).toFixed(4));
      const live = liveQuotes[base.ticker];
      const price = live ? Number(live.price) : base.price;
      const totalValue = Number((shares * price).toFixed(2));
      return {
        ...base,
        shares,
        price,
        change: live ? Number(live.change) : base.change,
        changePercent: live ? Number(live.changePercent) : base.changePercent,
        prePostPrice: live ? (live.prePostPrice ?? base.prePostPrice) : base.prePostPrice,
        prePostChange: live ? (live.prePostChange ?? base.prePostChange) : base.prePostChange,
        totalValue,
      };
    });

    const currentTotal = updated.reduce((sum, h) => sum + h.totalValue, 0);
    return updated.map((h) => ({
      ...h,
      weight: currentTotal > 0 ? Number(((h.totalValue / currentTotal) * 100).toFixed(2)) : 0,
    }));
  }, [liveQuotes, shareAdjustments]);

  const portfolioTotal = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);

  const openBuyBackModal = (ticker?: string | null) => {
    setBuyBackInitialTicker(ticker || null);
    setIsBuyBackModalOpen(true);
  };

  // Sync withdrawal state, liquidated balance & live payment receipts
  const fetchWithdrawalData = async () => {
    try {
      const res = await fetch(`/api/withdrawals?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (typeof data.liquidatedBalance === 'number') {
            setLiquidatedBalance(data.liquidatedBalance);
          }
          if (data.unacknowledgedReceipt) {
            const alreadyAcked =
              typeof window !== 'undefined' &&
              localStorage.getItem(`mb_ack_${data.unacknowledgedReceipt.id}`);
            if (alreadyAcked) {
              // Silently sync backend so it stops returning unacknowledged
              fetch('/api/withdrawals/acknowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: data.unacknowledgedReceipt.id }),
              }).catch(() => {});
            } else {
              setUnacknowledgedReceipt(data.unacknowledgedReceipt);
            }
          }
        }
      }

      // Also fetch liquidated positions history, share adjustments, and buybacks
      const posRes = await fetch(`/api/holdings/liquidate?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (posRes.ok) {
        const posData = await posRes.json();
        if (posData.success) {
          if (Array.isArray(posData.positions)) {
            setLiquidatedPositions(posData.positions);
          }
          if (posData.adjustments && typeof posData.adjustments === 'object') {
            setShareAdjustments(posData.adjustments);
          }
          if (Array.isArray(posData.buybacks)) {
            setBuybacks(posData.buybacks);
          }
          if (typeof posData.liquidatedBalance === 'number') {
            setLiquidatedBalance(posData.liquidatedBalance);
          }
        }
      }
    } catch {
      // non-blocking background poll
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWithdrawalData();
    const interval = setInterval(fetchWithdrawalData, 2000); // 2-sec fast responsive live poll

    // Cross-tab real-time sync via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('moback_realtime_sync');
      bc.onmessage = (event) => {
        if (
          event.data?.type === 'PAYMENT_TRANSFERRED' ||
          event.data?.type === 'LIQUIDATION_SUCCESS' ||
          event.data?.type === 'BUYBACK_SUCCESS'
        ) {
          fetchWithdrawalData();
        }
      };
    } catch {}

    // Fallback cross-tab sync via localStorage storage event
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'moback_realtime_ping' || e.key === 'moback_last_transfer') {
        fetchWithdrawalData();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Fast sync when user switches tabs/focus back to this window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWithdrawalData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  const handleAcknowledgeReceipt = async (id: string) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`mb_ack_${id}`, 'true');
      }
      setUnacknowledgedReceipt(null);
      await fetch('/api/withdrawals/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchWithdrawalData();
    } catch {
      setUnacknowledgedReceipt(null);
    }
  };

  // Sync live stock quotes from Alpaca & Finnhub via /api/stocks/quotes
  useEffect(() => {
    let isMounted = true;

    async function syncQuotes() {
      try {
        const res = await fetch('/api/stocks/quotes', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.quotes && Object.keys(data.quotes).length > 0 && isMounted) {
          setLiveQuotes(data.quotes);
          setIsLiveActive(true);
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          if (data.marketStatus) {
            setMarketStatus(data.marketStatus);
          }
        }
      } catch (err) {
        console.error('Failed to sync live quotes:', err);
      }
    }

    syncQuotes();
    const interval = setInterval(syncQuotes, 20_000); // 20-sec refresh interval (>15s server cache TTL)
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <ModernTopBar active />
        <OrbitalLoader
          size="lg"
          dark
          label="Synchronizing MoBack Vaults"
          sublabel="Verifying cryptographic clearance & session integrity..."
        />
      </div>
    );
  }

  // If not authenticated, show user login
  if (!isAuthenticated) {
    return (
      <LoginForm />
    );
  }

  return (
    <div
      className="secure-financial-vault"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f1f4f9',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigateSettings={() => setCurrentTab('settings')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
        onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 60px)', width: '100%' }}>
        {/* Left Navigation Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileMenuOpen(false);
          }}
          holdingsCount={holdings.length}
          portfolioTotal={portfolioTotal}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isLiveActive={isLiveActive}
          onOpenDeposit={() => setIsDepositModalOpen(true)}
          onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
        />

        {/* Main Content Area - Expands full width without dead space on right */}
        <main className="dashboard-main">
          {currentTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Title & Actions Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#0f172a',
                      letterSpacing: '-0.02em',
                      margin: 0,
                    }}
                  >
                    Overview
                  </h1>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                    Declan Salo Private Portfolio • Total Balance ${(portfolioTotal / 1_000_000).toFixed(2)}M
                  </p>
                </div>

                {/* Quick Action Buttons: Deposit & Withdraw */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setIsDepositModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ArrowDownLeft style={{ width: '15px', height: '15px' }} />
                    <span>Deposit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                    <span>Withdraw</span>
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards Row */}
              <StatCards
                summary={{ ...PORTFOLIO_SUMMARY, totalBalance: portfolioTotal }}
                liquidatedBalance={liquidatedBalance}
                onOpenBuyBack={liquidatedBalance > 0 ? () => openBuyBackModal(null) : undefined}
              />

              {/* 3 Middle Visualization Cards Row */}
              <div className="charts-grid">
                <RevenueChart currencySymbol="€" />
                <WeeklyUsersChart />
                <TrafficSourcesChart />
              </div>

              {/* Bottom Table: Recent Transactions / Portfolio Shares */}
              <HoldingsTable
                holdings={holdings}
                searchFilter={searchQuery}
                isLiveActive={isLiveActive}
                lastSynced={lastSynced}
                marketStatus={marketStatus}
                liquidatedBalance={liquidatedBalance}
                onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
                onOpenBuyBack={(ticker) => openBuyBackModal(ticker)}
                onLiquidationSuccess={fetchWithdrawalData}
              />

              {/* Real-time Institutional Transaction Ledger */}
              <TransactionLedger />
            </div>
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView holdings={holdings} />
          )}

          {currentTab === 'customers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Liquidated Shares & Cash Reserves
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
                    Positions converted to liquid USDT settlements available for disbursement
                  </p>
                </div>

                {liquidatedBalance > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => openBuyBackModal(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.2)',
                      }}
                    >
                      <TrendingUp style={{ width: '15px', height: '15px' }} />
                      <span>Buy Back Shares</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWithdrawModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                      <span>Withdraw Funds</span>
                    </button>
                  </div>
                )}
              </div>

              {liquidatedPositions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Summary Card */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e9edf3',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                        Total Available Liquid Reserves
                      </span>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                        ${liquidatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                        Liquidated Positions Count
                      </span>
                      <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                        {liquidatedPositions.length} Executed Settlements
                      </strong>
                    </div>
                  </div>

                  {/* Positions History Table */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e9edf3',
                      padding: '16px 20px',
                      overflowX: 'auto',
                    }}
                  >
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
                      Settlement Execution Log
                    </h3>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ color: '#94a3b8', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', fontSize: '10px' }}>
                          <th style={{ padding: '8px 6px' }}>Asset / Ticker</th>
                          <th style={{ padding: '8px 6px' }}>Company</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Shares Liquidated</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Execution Price</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Settlement Payout</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Execution Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liquidatedPositions.map((pos) => (
                          <tr key={pos.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '10px 6px', fontWeight: 700, color: '#0f172a' }}>
                              {pos.ticker}
                            </td>
                            <td style={{ padding: '10px 6px', color: '#475569' }}>
                              {pos.companyName}
                            </td>
                            <td style={{ padding: '10px 6px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                              {pos.sharesLiquidated.toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                              ${pos.sharePrice.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                              +${pos.payoutAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                            </td>
                            <td style={{ padding: '10px 6px', textAlign: 'right', color: '#64748b' }}>
                              {new Date(pos.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e9edf3',
                    padding: '70px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    <Coins style={{ width: '26px', height: '26px' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                      No Liquidated Shares
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                      There are currently no liquidated positions in this portfolio. Go to Overview and click &ldquo;Liquidate&rdquo; on any company holding to liquidate shares into available cash reserves.
                    </p>
                  </div>
                </div>
              )}

              {/* Share Buybacks Log (if any) */}
              {buybacks.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e9edf3',
                    padding: '16px 20px',
                    overflowX: 'auto',
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
                    Share Buyback Reinvestment Log
                  </h3>
                  <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#94a3b8', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', fontSize: '10px' }}>
                        <th style={{ padding: '8px 6px' }}>Asset / Ticker</th>
                        <th style={{ padding: '8px 6px' }}>Company</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Shares Added</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Purchase Price</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Capital Deployed</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Execution Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buybacks.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 6px', fontWeight: 700, color: '#0f172a' }}>
                            {b.ticker}
                          </td>
                          <td style={{ padding: '10px 6px', color: '#475569' }}>
                            {b.companyName}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', color: '#2563eb', fontWeight: 600 }}>
                            +{Number(b.sharesPurchased).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                            ${Number(b.sharePrice).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            ${Number(b.amountSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', color: '#64748b' }}>
                            {new Date(b.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Comprehensive Transaction Ledger & Audit Trail */}
              <TransactionLedger />
            </div>
          )}

          {currentTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Portfolio Reports</h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    Audited portfolio valuation and statements
                  </p>
                </div>
                <button
                  onClick={() => alert('Generating statement...')}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Download Statement
                </button>
              </div>

              <div className="reports-grid">
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e9edf3',
                    padding: '22px 24px',
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Valuation Summary</h3>
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Equity Positions:</span>
                      <strong style={{ color: '#0f172a' }}>
                        ${holdings.reduce((sum, h) => sum + h.totalValue, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Liquid Cash Reserves:</span>
                      <strong style={{ color: '#0f172a' }}>
                        ${liquidatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f4f9', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>Total Portfolio Balance:</span>
                      <strong style={{ color: '#2563eb' }}>
                        ${(portfolioTotal + liquidatedBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e9edf3',
                    padding: '22px 24px',
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Status & Account Verification</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: '1.5' }}>
                    Verified investment portfolio holding 17 selected securities across Defense, Semiconductors, Enterprise AI, Clean Energy, and Cloud Hardware.
                  </p>
                  <div style={{ marginTop: '14px', backgroundColor: '#e6f9f0', color: '#065f46', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                    ✓ Portfolio Verified & Reconciled
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'beneficiary' && (
            <BeneficiaryView totalBalance={portfolioTotal} />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Crypto Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      {/* Institutional Withdrawal Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => {
          setIsWithdrawModalOpen(false);
          fetchWithdrawalData();
        }}
      />

      {/* Share Buyback Modal (Convert Liquidated Cash Back Into Equity Shares) */}
      <BuyBackModal
        isOpen={isBuyBackModalOpen}
        onClose={() => {
          setIsBuyBackModalOpen(false);
          setBuyBackInitialTicker(null);
        }}
        holdings={holdings}
        liquidatedBalance={liquidatedBalance}
        portfolioTotal={portfolioTotal}
        initialTicker={buyBackInitialTicker}
        onBuyBackSuccess={fetchWithdrawalData}
      />

      {/* Payment Received & Confirmed Pop-up Receipt */}
      <PaymentReceivedModal
        receipt={unacknowledgedReceipt}
        isOpen={!!unacknowledgedReceipt}
        onClose={() => {
          if (unacknowledgedReceipt?.id) {
            handleAcknowledgeReceipt(unacknowledgedReceipt.id);
          } else {
            setUnacknowledgedReceipt(null);
          }
        }}
        onAcknowledge={handleAcknowledgeReceipt}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
