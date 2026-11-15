'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Layers,
  Mail,
  ArrowUpRight,
  Wallet,
  KeyRound,
  Activity,
  MonitorSmartphone,
  UserCheck,
  Award,
  ShieldCheck,
  ExternalLink,
  LogOut,
  X,
  Receipt,
} from 'lucide-react';
import { AdminTabId, PrincipalProfile } from './types';

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLockTerminal: () => void;
  principalProfile: PrincipalProfile;
  badges: {
    pendingWithdrawals: number;
    pendingChargePayments?: number;
    activeOtps: number;
    activeSessions: number;
    sentEmails: number;
  };
}

interface NavGroup {
  groupLabel: string;
  items: Array<{
    id: AdminTabId;
    label: string;
    icon: React.ComponentType<{ style?: React.CSSProperties }>;
    badge?: number;
  }>;
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onLockTerminal,
  principalProfile,
  badges,
}: AdminSidebarProps) {
  const navGroups: NavGroup[] = [
    {
      groupLabel: 'Operations',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'portfolio', label: 'Portfolio & Shares', icon: Layers },
        {
          id: 'email',
          label: 'Email Studio',
          icon: Mail,
          badge: badges.sentEmails > 0 ? badges.sentEmails : undefined,
        },
        {
          id: 'withdrawals',
          label: 'Withdrawals',
          icon: ArrowUpRight,
          badge: badges.pendingWithdrawals > 0 ? badges.pendingWithdrawals : undefined,
        },
      ],
    },
    {
      groupLabel: 'Treasury & Telemetry',
      items: [
        { id: 'vaults', label: 'Vault Wallets', icon: Wallet },
        {
          id: 'charges',
          label: 'Tax Settlement',
          icon: Receipt,
          badge:
            badges.pendingChargePayments && badges.pendingChargePayments > 0
              ? badges.pendingChargePayments
              : undefined,
        },
        {
          id: 'two-factor',
          label: '2FA & OTP Radar',
          icon: KeyRound,
          badge: badges.activeOtps > 0 ? badges.activeOtps : undefined,
        },
        { id: 'scanner', label: 'Chain Scanner', icon: Activity },
      ],
    },
    {
      groupLabel: 'Governance',
      items: [
        {
          id: 'sessions',
          label: 'Sessions',
          icon: MonitorSmartphone,
          badge: badges.activeSessions > 0 ? badges.activeSessions : undefined,
        },
        { id: 'profile', label: 'Principal', icon: UserCheck },
        { id: 'beneficiary', label: 'Beneficiary', icon: Award },
        { id: 'security', label: 'Security', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <>
      <div
        className={`salo-mobile-backdrop ${isOpenMobile ? 'open' : ''}`}
        onClick={onCloseMobile}
      />

      <aside className={`salo-sidebar ${isOpenMobile ? 'open' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            padding: '15px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: '#111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Georgia, serif',
                fontWeight: 700,
                fontSize: '14px',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              M
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                MooreBach Group
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Admin Console</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="salo-mobile-menu-trigger"
            aria-label="Close navigation menu"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              color: '#4b5563',
              width: '28px',
              height: '28px',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {navGroups.map((group) => (
            <div key={group.groupLabel}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9ca3af',
                  padding: '0 8px 6px',
                  letterSpacing: '0.02em',
                }}
              >
                {group.groupLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                        color: isActive ? '#111827' : '#4b5563',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                        <Icon
                          style={{
                            width: '15px',
                            height: '15px',
                            color: isActive ? '#111827' : '#6b7280',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.label}
                        </span>
                      </span>

                      {typeof item.badge === 'number' && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            backgroundColor: isActive ? '#e5e7eb' : '#f3f4f6',
                            color: '#374151',
                            flexShrink: 0,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Identity & Links */}
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9999px',
                overflow: 'hidden',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              {principalProfile.avatarUrl ? (
                <img
                  src={principalProfile.avatarUrl}
                  alt={principalProfile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (principalProfile.name?.[0] || 'D').toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {principalProfile.name || 'Declan Salo'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {principalProfile.email || 'declansalo1@gmail.com'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                color: '#374151',
                fontSize: '11px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <ExternalLink style={{ width: '12px', height: '12px' }} />
              <span>Dashboard</span>
            </Link>
            <button
              type="button"
              onClick={onLockTerminal}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                color: '#b91c1c',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <LogOut style={{ width: '12px', height: '12px' }} />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
