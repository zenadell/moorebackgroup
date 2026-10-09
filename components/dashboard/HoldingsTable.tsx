'use client';

import React, { useState } from 'react';
import { StockHolding, Transaction } from '@/types';
import { ArrowUpRight, ArrowDownRight, Plus, Search, Filter, ExternalLink, ShieldCheck } from 'lucide-react';

interface HoldingsTableProps {
  holdings: StockHolding[];
  transactions: Transaction[];
  onOpenAddSymbol: () => void;
  searchFilter: string;
}

export function HoldingsTable({
  holdings,
  transactions,
  onOpenAddSymbol,
  searchFilter,
}: HoldingsTableProps) {
  const [activeView, setActiveView] = useState<'holdings' | 'transactions'>('holdings');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  // Filter holdings
  const filteredHoldings = holdings.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.ticker.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.sector.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesSector =
      selectedSector === 'ALL' || h.sector === selectedSector;

    return matchesSearch && matchesSector;
  });

  const sectors = ['ALL', ...Array.from(new Set(holdings.map((h) => h.sector)))];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      {/* Table Header and View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900">
              {activeView === 'holdings' ? 'Company Shares & Watchlist' : 'Recent Transactions'}
            </h3>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {activeView === 'holdings' ? `${filteredHoldings.length} Companies` : `${transactions.length} Records`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {activeView === 'holdings'
              ? 'Real-time equity valuations contributing to the $120.57M balance'
              : 'Audit trail of recent equity rebalancing and dividend deposits'}
          </p>
        </div>

        {/* View Toggle & Add Symbol CTA */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveView('holdings')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                activeView === 'holdings'
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stock Watchlist (17)
            </button>
            <button
              onClick={() => setActiveView('transactions')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                activeView === 'transactions'
                  ? 'bg-white font-semibold text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recent Transactions
            </button>
          </div>

          <button
            onClick={onOpenAddSymbol}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Symbol</span>
          </button>
        </div>
      </div>

      {/* Sector Filters for Holdings View */}
      {activeView === 'holdings' && (
        <div className="flex flex-wrap items-center gap-1.5 py-3">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter Sector:
          </span>
          {sectors.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                selectedSector === sector
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      )}

      {/* Table Content */}
      <div className="mt-2 overflow-x-auto">
        {activeView === 'holdings' ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                <th className="py-3 pr-4 pl-1">Company / Ticker</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4 text-right">Share Price</th>
                <th className="py-3 px-4 text-right">24h Change</th>
                <th className="py-3 px-4 text-right">Pre / Post Mkt</th>
                <th className="py-3 px-4 text-right">Position Shares</th>
                <th className="py-3 px-4 text-right">Total Value</th>
                <th className="py-3 pl-4 pr-1 text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHoldings.map((h) => {
                const isPositive = h.change >= 0;
                return (
                  <tr
                    key={h.id}
                    className="group transition-colors hover:bg-slate-50/70"
                  >
                    {/* Company Ticker & Name */}
                    <td className="py-3.5 pr-4 pl-1">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: h.logoBg }}
                        >
                          {h.logoLetter}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {h.ticker}
                          </span>
                          <span className="text-[11px] text-slate-500 max-w-[190px] truncate">
                            {h.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700">
                        {h.sector}
                      </span>
                    </td>

                    {/* Share Price */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ${h.price.toFixed(2)}
                    </td>

                    {/* 24h Change */}
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {isPositive ? '+' : ''}
                        {h.change.toFixed(2)} ({isPositive ? '+' : ''}
                        {h.changePercent.toFixed(2)}%)
                      </span>
                    </td>

                    {/* Pre/Post Market (as seen in TradingView) */}
                    <td className="py-3.5 px-4 text-right text-[11px] text-slate-500">
                      {h.prePostPrice !== undefined ? (
                        <div className="flex flex-col items-end">
                          <span>${h.prePostPrice.toFixed(2)}</span>
                          <span
                            className={
                              (h.prePostChange || 0) >= 0
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }
                          >
                            {(h.prePostChange || 0) >= 0 ? '+' : ''}
                            {(h.prePostChange || 0).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No trades</span>
                      )}
                    </td>

                    {/* Shares Held */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {h.shares.toLocaleString()}
                    </td>

                    {/* Total Value */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ${h.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Portfolio Weight */}
                    <td className="py-3.5 pl-4 pr-1 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 rounded-full bg-slate-100 h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(h.weight * 5, 100)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700 text-[11px]">
                          {h.weight}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Exact Match to Image 1: Recent transactions */
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                <th className="py-3 pr-4 pl-1">User</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 pl-4 pr-1 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="transition-colors hover:bg-slate-50/70"
                >
                  <td className="py-3.5 pr-4 pl-1 font-semibold text-slate-800">
                    {tx.userOrEntity}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {tx.planOrAction}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {tx.formattedAmount}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3.5 pl-4 pr-1 text-right text-slate-500">
                    {tx.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredHoldings.length === 0 && activeView === 'holdings' && (
        <div className="py-8 text-center text-xs text-slate-400">
          No companies found matching &ldquo;{searchFilter}&rdquo;
        </div>
      )}
    </div>
  );
}
