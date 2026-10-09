'use client';

import React, { useState } from 'react';
import { StockHolding } from '@/types';
import { X, Plus, DollarSign, Building } from 'lucide-react';

interface AddSymbolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (stock: Omit<StockHolding, 'id' | 'totalValue' | 'weight'>) => void;
}

export function AddSymbolModal({ isOpen, onClose, onAddStock }: AddSymbolModalProps) {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState<StockHolding['sector']>('Enterprise AI');
  const [price, setPrice] = useState('');
  const [shares, setShares] = useState('');
  const [exchange, setExchange] = useState('NASDAQ');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !name.trim() || !price || !shares) {
      setError('Please fill in all required fields');
      return;
    }

    const priceNum = parseFloat(price);
    const sharesNum = parseInt(shares, 10);

    if (isNaN(priceNum) || priceNum <= 0 || isNaN(sharesNum) || sharesNum <= 0) {
      setError('Price and shares must be positive numbers');
      return;
    }

    onAddStock({
      ticker: ticker.toUpperCase().trim(),
      name: name.trim(),
      sector,
      shares: sharesNum,
      price: priceNum,
      change: 0.0,
      changePercent: 0.0,
      currency: 'USD',
      logoLetter: ticker.substring(0, 2).toUpperCase(),
      logoBg: '#1e3a8a',
      exchange,
      dayRange: {
        low: priceNum * 0.98,
        high: priceNum * 1.02,
      },
      marketCap: '$10.0B',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Stock Symbol</h3>
              <p className="text-[11px] text-slate-400">Expand portfolio holdings and live tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Stock Ticker</label>
              <input
                type="text"
                placeholder="e.g. NVDA"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Exchange</label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="NASDAQ">NASDAQ</option>
                <option value="NYSE">NYSE</option>
                <option value="LSE">LSE</option>
                <option value="OTC">OTC</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600">Company Name</label>
            <input
              type="text"
              placeholder="e.g. NVIDIA Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600">Sector</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as StockHolding['sector'])}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Defense & Aerospace">Defense & Aerospace</option>
              <option value="Semiconductors">Semiconductors</option>
              <option value="Enterprise AI">Enterprise AI</option>
              <option value="Hardware & Cloud">Hardware & Cloud</option>
              <option value="Clean Energy">Clean Energy</option>
              <option value="Industrial">Industrial</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Shares Count</label>
              <input
                type="number"
                placeholder="10000"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
            >
              Add to Portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
