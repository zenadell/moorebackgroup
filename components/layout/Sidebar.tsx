'use client';

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  BarChart3,
  Settings,
  CircleDot
} from 'lucide-react';

export type NavTab = 'overview' | 'analytics' | 'customers' | 'reports' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  holdingsCount?: number;
}

export function Sidebar({ currentTab, onSelectTab, holdingsCount = 17 }: SidebarProps) {
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
    <aside
      style={{
        width: '210px',
        minWidth: '210px',
        maxWidth: '210px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e9edf3',
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
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
            Portfolio Synced
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
          Balance: <strong style={{ color: '#0f172a' }}>$120.57M</strong>
          <br />
          {holdingsCount} Listed Holdings
        </p>
      </div>
    </aside>
  );
}
