'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddSymbol?: () => void;
}

export function Header({ searchQuery, onSearchChange, onOpenAddSymbol }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPresentationMenu, setShowPresentationMenu] = useState(false);
  const [presentationMode, setPresentationMode] = useState<'Presented' | 'Investor View' | 'Live Terminal'>('Presented');
  const [notificationsRead, setNotificationsRead] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
      {/* Left Branding / Mobile title */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-slate-900">Orion Dashboard</span>
            <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 sm:inline-block">
              MoBack Portfolio
            </span>
          </div>
        </div>
      </div>

      {/* Center Search Input (Matching Image 1's pill search) */}
      <div className="relative mx-4 flex max-w-md flex-1 items-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search stocks, companies, reports..."
          className="w-full rounded-full border border-slate-200 bg-slate-50/70 py-1.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Presentation Mode Pill (Matches "Presented ▾" in Image 1) */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowPresentationMenu(!showPresentationMenu)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{presentationMode}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </button>

          {showPresentationMenu && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 z-50">
              {(['Presented', 'Investor View', 'Live Terminal'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setPresentationMode(mode);
                    setShowPresentationMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                    presentationMode === mode
                      ? 'bg-blue-50 font-semibold text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                  {presentationMode === mode && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsRead(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {!notificationsRead && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <div
              className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100"
              style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-100 text-xs font-semibold text-blue-700">
                  {user?.name?.[0] || 'A'}
                </div>
              )}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-900">{user?.name || 'Administrator'}</p>
                <p className="truncate text-[11px] text-slate-500">{user?.email || 'admin@moback.com'}</p>
                <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                  {user?.role || 'Executive'}
                </span>
              </div>

              <div className="pt-1">
                {onOpenAddSymbol && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAddSymbol();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    Add Stock Position
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
