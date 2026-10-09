'use client';

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  BarChart3,
  Settings,
  ShieldCheck,
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
      badge: undefined,
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: TrendingUp,
      badge: 'Live',
    },
    {
      id: 'customers' as NavTab,
      label: 'Customers',
      icon: Building2,
      badge: holdingsCount.toString(),
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: BarChart3,
      badge: undefined,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      badge: undefined,
    },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6 px-3">
      {/* Navigation items list */}
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Portfolio Status Footnote */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="flex items-center gap-2">
          <CircleDot className="h-3 w-3 text-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-700">Market Sync Active</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
          17 Assets verified • Total Portfolio: <span className="font-semibold text-slate-800">$120.57M</span>
        </p>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-blue-600 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>MoBack Security Verified</span>
        </div>
      </div>
    </aside>
  );
}
