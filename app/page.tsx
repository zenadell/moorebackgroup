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
import { AdminView } from '@/components/dashboard/AdminView';
import { LoginForm } from '@/components/auth/LoginForm';
import { DepositModal } from '@/components/dashboard/DepositModal';
import { WithdrawModal } from '@/components/dashboard/WithdrawModal';
import { INITIAL_HOLDINGS, PORTFOLIO_SUMMARY, RECENT_TRANSACTIONS, LIQUID_CASH_RESERVES } from '@/lib/data/holdings';
import { StockHolding } from '@/types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

function DashboardContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [holdings, setHoldings] = useState<StockHolding[]>(INITIAL_HOLDINGS);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Sync live stock quotes from Alpaca & Finnhub via /api/stocks/quotes
  useEffect(() => {
    let isMounted = true;

    async function syncQuotes() {
      try {
        const res = await fetch('/api/stocks/quotes');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.quotes && Object.keys(data.quotes).length > 0 && isMounted) {
          setHoldings((prev) =>
            prev.map((h) => {
              const live = data.quotes[h.ticker];
              if (!live) return h;
              const livePrice = Number(live.price);
              const shares = Math.max(1, Math.round(h.totalValue / livePrice));
              const recalculatedValue = Number((shares * livePrice).toFixed(2));

              return {
                ...h,
                price: livePrice,
                change: Number(live.change),
                changePercent: Number(live.changePercent),
                prePostPrice: live.prePostPrice ?? h.prePostPrice,
                prePostChange: live.prePostChange ?? h.prePostChange,
                shares: shares,
                totalValue: recalculatedValue,
              };
            })
          );
          setIsLiveActive(true);
          setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.error('Failed to sync live quotes:', err);
      }
    }

    syncQuotes();
    const interval = setInterval(syncQuotes, 30_000); // 30-sec refresh interval
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f4f9' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9999px', border: '3px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Securing session...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, show user login
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div
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
        onNavigateAdmin={() => setCurrentTab('admin')}
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
                    Declan Salo Private Portfolio • Total Balance $120.57M
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
                    <span>Deposit (Crypto)</span>
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
              <StatCards summary={PORTFOLIO_SUMMARY} />

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
              />
            </div>
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView holdings={holdings} />
          )}

          {currentTab === 'customers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  Portfolio Holdings & Customers
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Complete list of the 17 allocated equities and cash reserves
                </p>
              </div>
              <HoldingsTable
                holdings={holdings}
                searchFilter={searchQuery}
                isLiveActive={isLiveActive}
                lastSynced={lastSynced}
              />
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
                      <span style={{ color: '#64748b' }}>Cash Reserves:</span>
                      <strong style={{ color: '#0f172a' }}>
                        ${Math.max(0, 120570000 - holdings.reduce((sum, h) => sum + h.totalValue, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f4f9', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>Total Portfolio Balance:</span>
                      <strong style={{ color: '#2563eb' }}>$120,570,000.00</strong>
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

          {currentTab === 'settings' && (
            <SettingsView />
          )}

          {currentTab === 'admin' && (
            <AdminView />
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
        onClose={() => setIsWithdrawModalOpen(false)}
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
