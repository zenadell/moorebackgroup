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
import { AddSymbolModal } from '@/components/dashboard/AddSymbolModal';
import { AnalyticsView } from '@/components/dashboard/AnalyticsView';
import { SettingsView } from '@/components/dashboard/SettingsView';
import { LoginForm } from '@/components/auth/LoginForm';
import { INITIAL_HOLDINGS, PORTFOLIO_SUMMARY, RECENT_TRANSACTIONS, LIQUID_CASH_RESERVES } from '@/lib/data/holdings';
import { StockHolding } from '@/types';

function DashboardContent() {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [holdings, setHoldings] = useState<StockHolding[]>(INITIAL_HOLDINGS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // If not logged in, display the Orion Login experience
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Handle adding a new stock position
  const handleAddStock = (newStock: Omit<StockHolding, 'id' | 'totalValue' | 'weight'>) => {
    const totalVal = newStock.shares * newStock.price;
    const currentStockTotal = holdings.reduce((sum, h) => sum + h.totalValue, 0) + LIQUID_CASH_RESERVES + totalVal;
    
    const holding: StockHolding = {
      ...newStock,
      id: `stock-${Date.now()}-${newStock.ticker.toLowerCase()}`,
      totalValue: totalVal,
      weight: Number(((totalVal / currentStockTotal) * 100).toFixed(2)),
    };

    setHoldings([holding, ...holdings]);
  };

  // Recalculate summary if holdings change
  const currentTotalStockValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const currentTotalBalance = currentTotalStockValue + LIQUID_CASH_RESERVES;
  const dynamicSummary = {
    ...PORTFOLIO_SUMMARY,
    totalBalance: currentTotalBalance,
    activeHoldingsCount: holdings.length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddSymbol={() => setIsAddModalOpen(true)}
      />

      <div className="flex flex-1">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          holdingsCount={holdings.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl">
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Header Title (Matches "Overview" in Image 1) */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Overview
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    MoBack Executive Portfolio & Corporate Holdings Terminal
                  </p>
                </div>
              </div>

              {/* 4 KPI Metric Cards */}
              <StatCards summary={dynamicSummary} />

              {/* 3 Middle Visualization Cards (Revenue Area, Weekly Users Bar, Traffic Donut) */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <RevenueChart currencySymbol="$" />
                <WeeklyUsersChart />
                <TrafficSourcesChart />
              </div>

              {/* Bottom Table: Stock Holdings & Recent Transactions */}
              <HoldingsTable
                holdings={holdings}
                transactions={RECENT_TRANSACTIONS}
                onOpenAddSymbol={() => setIsAddModalOpen(true)}
                searchFilter={searchQuery}
              />
            </div>
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView holdings={holdings} />
          )}

          {currentTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Corporate Assets & Customer Holdings</h2>
                  <p className="text-xs text-slate-500">Directory of the 17 listed portfolio companies</p>
                </div>
              </div>
              <HoldingsTable
                holdings={holdings}
                transactions={RECENT_TRANSACTIONS}
                onOpenAddSymbol={() => setIsAddModalOpen(true)}
                searchFilter={searchQuery}
              />
            </div>
          )}

          {currentTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Portfolio Reports</h2>
                  <p className="text-xs text-slate-500">Audited financial statements and asset allocation summaries</p>
                </div>
                <button
                  onClick={() => alert('Exporting full portfolio audit report as PDF...')}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  Download Executive PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Consolidated Holdings Audit</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Total balance reconciled at exactly <strong>$120,570,000.00</strong> across 17 equities and liquid cash reserves.
                  </p>
                  <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Equities Market Value:</span>
                      <span className="font-bold text-slate-900">${currentTotalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Liquid Treasury Reserves:</span>
                      <span className="font-bold text-slate-900">${LIQUID_CASH_RESERVES.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                      <span>Total Portfolio Balance:</span>
                      <span className="text-blue-600">${currentTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Compliance & Regulatory Stamp</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Holding classifications verified for Defense, Semiconductors, Enterprise AI, Clean Energy, and Hardware.
                  </p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    Status: <span className="font-semibold text-emerald-700">100% In Compliance</span>
                    <br />
                    Next Scheduled Audit: Q2 2026
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

      {/* Add Symbol Modal */}
      <AddSymbolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStock={handleAddStock}
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
