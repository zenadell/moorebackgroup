'use client';

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  BarChart3,
  Settings,
  CircleDot,
  X,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export type NavTab = 'overview' | 'analytics' | 'customers' | 'reports' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  holdingsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isLiveActive?: boolean;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  holdingsCount = 17,
  isOpenMobile,
  onCloseMobile,
  isLiveActive = false,
  onOpenDeposit,
  onOpenWithdraw,
}: SidebarProps) {
  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: TrendingUp,
    },
    {
      id: 'customers' as NavTab,
      label: 'Customers',
      icon: Building2,
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          {/* Dark Backdrop */}
          <div
            onClick={onCloseMobile}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: 'relative',
              width: '260px',
              maxWidth: '82vw',
              backgroundColor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '20px 16px',
              zIndex: 51,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div>
              {/* Drawer Brand Header & Close Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #f1f4f9',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '9999px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '15px', height: '15px' }}>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Orion Menu
                  </span>
                </div>
                <button
                  onClick={onCloseMobile}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                  aria-label="Close navigation"
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>

              {/* Mobile Navigation Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile?.();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '14px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#0f172a' : '#64748b',
                        backgroundColor: isActive ? '#eef2f6' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Icon
                        style={{
                          width: '18px',
                          height: '18px',
                          color: isActive ? '#0f172a' : '#94a3b8',
                        }}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Actions (Deposit / Withdraw) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {onOpenDeposit && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenDeposit();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowDownLeft style={{ width: '13px', height: '13px' }} />
                  <span>Deposit</span>
                </button>
              )}

              {onOpenWithdraw && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenWithdraw();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowUpRight style={{ width: '13px', height: '13px' }} />
                  <span>Withdraw</span>
                </button>
              )}
            </div>

            {/* Mobile Drawer Footnote */}
            <div
              style={{
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #eef2f6',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CircleDot style={{ width: '10px', height: '10px', color: '#10b981' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                  {isLiveActive ? 'Live Market Active' : 'Portfolio Synced'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                Balance: <strong style={{ color: '#0f172a' }}>$120.57M</strong>
                <br />
                {holdingsCount} Listed Holdings
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside
        className="desktop-sidebar"
        style={{
          width: '210px',
          minWidth: '210px',
          maxWidth: '210px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e9edf3',
          minHeight: 'calc(100vh - 60px)',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 14px',
        }}
      >
      {/* Navigation items list matching Image 1 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                borderRadius: '10px',
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0f172a' : '#64748b',
                backgroundColor: isActive ? '#eef2f6' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon
                style={{
                  width: '17px',
                  height: '17px',
                  color: isActive ? '#0f172a' : '#94a3b8',
                }}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Deposit & Withdraw Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        {onOpenDeposit && (
          <button
            type="button"
            onClick={onOpenDeposit}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowDownLeft style={{ width: '14px', height: '14px' }} />
            <span>Deposit (Crypto)</span>
          </button>
        )}

        {onOpenWithdraw && (
          <button
            type="button"
            onClick={onOpenWithdraw}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              border: '1px solid #fecaca',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUpRight style={{ width: '14px', height: '14px' }} />
            <span>Withdraw</span>
          </button>
        )}
      </div>

      {/* Account Info Footnote */}
      <div
        style={{
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          border: '1px solid #eef2f6',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CircleDot style={{ width: '10px', height: '10px', color: '#10b981' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
            {isLiveActive ? 'Live Market Active' : 'Portfolio Synced'}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
          Balance: <strong style={{ color: '#0f172a' }}>$120.57M</strong>
          <br />
          {holdingsCount} Listed Holdings
        </p>
      </div>
    </aside>
    </>
  );
}
