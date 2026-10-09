'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, Settings as SettingsIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateSettings?: () => void;
}

export function Header({ searchQuery, onSearchChange, onNavigateSettings }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPresentationMenu, setShowPresentationMenu] = useState(false);
  const [presentationMode, setPresentationMode] = useState<'Presented' | 'Personal' | 'Detailed'>('Presented');
  const [notificationsRead, setNotificationsRead] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8"
      style={{
        height: '60px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e9edf3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      {/* Left Branding (Matching Image 1: Blue circle icon + Orion Dashboard) */}
      <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
        <span
          className="text-base font-bold tracking-tight text-slate-900"
          style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}
        >
          Orion Dashboard
        </span>
      </div>

      {/* Center Search Input (Matching Image 1's pill search) */}
      <div
        className="relative mx-4 flex max-w-md flex-1 items-center"
        style={{ maxWidth: '420px', flex: 1, position: 'relative' }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
        >
          <Search className="h-4 w-4" style={{ width: '15px', height: '15px' }} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full rounded-full border border-slate-200 bg-slate-50/80 py-1.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          style={{
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: '#f1f4f9',
            border: '1px solid #e2e8f0',
            paddingTop: '7px',
            paddingBottom: '7px',
            paddingLeft: '36px',
            paddingRight: '16px',
            fontSize: '13px',
            color: '#0f172a',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 text-xs text-slate-400 hover:text-slate-600"
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-3.5" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Presentation Mode Pill (Matches "Presented ▾" in Image 1) */}
        <div className="relative hidden sm:block" style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPresentationMenu(!showPresentationMenu)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <span>{presentationMode}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" style={{ width: '12px', height: '12px' }} />
          </button>

          {showPresentationMenu && (
            <div
              className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-50"
              style={{
                position: 'absolute',
                right: 0,
                marginTop: '8px',
                width: '160px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '4px',
                zIndex: 50,
              }}
            >
              {(['Presented', 'Personal', 'Detailed'] as const).map((mode) => (
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
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    fontSize: '12px',
                    border: 'none',
                    background: presentationMode === mode ? '#eff6ff' : 'transparent',
                    color: presentationMode === mode ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    borderRadius: '8px',
                  }}
                >
                  {mode}
                  {presentationMode === mode && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" style={{ width: '14px', height: '14px' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative" style={{ position: 'relative' }}>
          <button
            onClick={() => setNotificationsRead(true)}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            title="Notifications"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Bell className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
            {!notificationsRead && (
              <span
                className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '9999px',
                  backgroundColor: '#ef4444',
                }}
              />
            )}
          </button>
        </div>

        {/* User Profile Menu with Fixed Dimensions */}
        <div className="relative" style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center rounded-full focus:outline-none"
            style={{
              display: 'flex',
              alignItems: 'center',
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <div
              className="relative overflow-hidden rounded-full border border-slate-200"
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                minHeight: '32px',
                maxWidth: '32px',
                maxHeight: '32px',
                borderRadius: '9999px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  width={32}
                  height={32}
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {user?.name?.[0] || 'A'}
                </div>
              )}
            </div>
          </button>

          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50"
              style={{
                position: 'absolute',
                right: 0,
                marginTop: '8px',
                width: '210px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '8px',
                zIndex: 50,
              }}
            >
              <div className="border-b border-slate-100 px-3 py-2" style={{ borderBottom: '1px solid #f1f5f9', padding: '8px 12px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{user?.name || 'Alex Morgan'}</p>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{user?.email || 'alex.morgan@client.com'}</p>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    borderRadius: '4px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                  }}
                >
                  {user?.role || 'Private Portfolio'}
                </span>
              </div>

              <div style={{ paddingTop: '4px' }}>
                {onNavigateSettings && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigateSettings();
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#334155',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: '8px',
                    }}
                  >
                    <SettingsIcon style={{ width: '14px', height: '14px', color: '#64748b' }} />
                    Portfolio Settings
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#dc2626',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '8px',
                  }}
                >
                  <LogOut style={{ width: '14px', height: '14px' }} />
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
