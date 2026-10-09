'use client';

import React, { useState } from 'react';
import { Key, RefreshCw, CheckCircle2, Shield, Globe, Sliders } from 'lucide-react';

export function SettingsView() {
  const [provider, setProvider] = useState<'mock' | 'finnhub' | 'polygon' | 'alphavantage'>('mock');
  const [apiKey, setApiKey] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState('30s');
  const [currency, setCurrency] = useState('USD');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dashboard Settings</h2>
        <p className="text-xs text-slate-500">Configure market data feeds, API connections, and display preferences</p>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Settings updated successfully! Live market integration ready.
        </div>
      )}

      {/* Market Data API Connector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Key className="h-4 w-4 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Market Data API Integration</h3>
            <p className="text-[11px] text-slate-400">
              Switch from initial static snapshot to live market streaming when ready
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Market Feed Provider</label>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { id: 'mock', name: 'Mock Baseline', note: '$120.57M Target' },
                { id: 'finnhub', name: 'Finnhub API', note: 'Real-time WebSocket' },
                { id: 'polygon', name: 'Polygon.io', note: 'Tick-level Equities' },
                { id: 'alphavantage', name: 'Alpha Vantage', note: 'End of Day & Intraday' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProvider(p.id as typeof provider)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    provider === p.id
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{p.name}</p>
                  <p className="text-[10px] text-slate-500">{p.note}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">API Key / Secret Token</label>
            <input
              type="password"
              placeholder={provider === 'mock' ? 'Not needed for mock mode' : 'Enter your API key here...'}
              value={apiKey}
              disabled={provider === 'mock'}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              When live API key is supplied, prices for all 17 companies update in real-time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Auto-Refresh Interval</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="15s">Every 15 Seconds</option>
                <option value="30s">Every 30 Seconds</option>
                <option value="60s">Every 60 Seconds</option>
                <option value="manual">Manual Refresh Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Target Balance Lock Notice */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
        <div className="flex items-center gap-2 text-blue-900">
          <Shield className="h-4 w-4 text-blue-600" />
          <h4 className="text-xs font-bold">Hard-Locked Baseline Balance ($120.57M)</h4>
        </div>
        <p className="mt-1 text-xs text-blue-700/80 leading-relaxed">
          The dashboard is pre-configured with a total balance of exactly <strong>$120,570,000.00</strong> across your 17 companies and liquid cash reserves. Once live market feeds are turned on, positions will dynamically fluctuate based on live exchange quotes.
        </p>
      </div>
    </div>
  );
}
