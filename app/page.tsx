'use client';

import React, { useState } from 'react';
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
import { LoginForm } from '@/components/auth/LoginForm';
import { INITIAL_HOLDINGS, PORTFOLIO_SUMMARY, RECENT_TRANSACTIONS, LIQUID_CASH_RESERVES } from '@/lib/data/holdings';

function DashboardContent() {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');

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
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 60px)' }}>
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          holdingsCount={INITIAL_HOLDINGS.length}
        />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: '24px 28px',
            overflowY: 'auto',
            maxWidth: '1240px',
          }}
        >
          {currentTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Title (Matches "Overview" in Image 1) */}
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
              </div>

              {/* 4 Stat Cards Row */}
              <StatCards summary={PORTFOLIO_SUMMARY} />

              {/* 3 Middle Visualization Cards Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.9fr 0.9fr',
                  gap: '16px',
                }}
              >
                <RevenueChart currencySymbol="€" />
                <WeeklyUsersChart />
                <TrafficSourcesChart />
              </div>

              {/* Bottom Table: Recent Transactions / Portfolio Shares */}
              <HoldingsTable
                holdings={INITIAL_HOLDINGS}
                searchFilter={searchQuery}
              />
            </div>
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView holdings={INITIAL_HOLDINGS} />
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
                holdings={INITIAL_HOLDINGS}
                searchFilter={searchQuery}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                      <strong style={{ color: '#0f172a' }}>$115,920,850.00</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Cash Reserves:</span>
                      <strong style={{ color: '#0f172a' }}>$4,649,150.00</strong>
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
        </main>
      </div>
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
