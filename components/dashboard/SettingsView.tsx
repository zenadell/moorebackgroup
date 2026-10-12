'use client';

import React, { useState } from 'react';
import {
  User,
  Bell,
  Sliders,
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
  Building,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

export function SettingsView() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

  // Profile Form States
  const [name, setName] = useState(user?.name || 'Declan Salo');
  const [email, setEmail] = useState(user?.email || 'declansalo1@gmail.com');
  const [location, setLocation] = useState(user?.location || 'Nashville Tennessee, United States');
  const [accountType, setAccountType] = useState('Private Portfolio / High-Net-Worth');

  // Preferences Form States
  const [currency, setCurrency] = useState('USD');
  const [refreshRate, setRefreshRate] = useState('Real-time (30s)');
  const [dailyDigest, setDailyDigest] = useState(true);
  const [volatilityAlert, setVolatilityAlert] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(false);
  const [themeMode, setThemeMode] = useState('Light (Standard)');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Tab Pill Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Account Settings
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', marginBottom: 0 }}>
            Manage your personal profile and display preferences
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#e2e8f0',
            padding: '3px',
            borderRadius: '10px',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'profile' ? '#ffffff' : 'transparent',
              color: activeTab === 'profile' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'profile' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            👤 Investor Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'preferences' ? '#ffffff' : 'transparent',
              color: activeTab === 'preferences' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'preferences' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⚙️ Preferences & Alerts
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#e6f9f0',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
          <span>Preferences updated and saved successfully.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INVESTOR PROFILE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e9edf3',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Profile Header Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              paddingBottom: '20px',
              borderBottom: '1px solid #f1f4f9',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '9999px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                flexShrink: 0,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                name[0] || 'D'
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                {name}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 6px' }}>
                {email}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#e6f9f0',
                    color: '#065f46',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck style={{ width: '12px', height: '12px' }} />
                  Verified Portfolio Investor
                </span>
                <span
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  ID: #ACC-88429-DS
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <form onSubmit={handleSavePreferences}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Investor Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      backgroundColor: '#f8fafc',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Primary Location / Jurisdiction
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Portfolio Classification
                </label>
                <input
                  type="text"
                  disabled
                  value={accountType}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    cursor: 'not-allowed',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Institutional Custody Rail
                </label>
                <input
                  type="text"
                  disabled
                  value="BNY Mellon / State Street Direct Clearing"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                }}
              >
                <Save style={{ width: '15px', height: '15px' }} />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PREFERENCES & ALERTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'preferences' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e9edf3',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              Display & Notification Preferences
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Customize currency display, quote updates, and security alert intervals
            </p>
          </div>

          <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Portfolio Base Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="USD">USD - United States Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound Sterling (£)</option>
                  <option value="USDT">USDT - Tether USD (Digital Asset)</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Market Quote Polling Frequency
                </label>
                <select
                  value={refreshRate}
                  onChange={(e) => setRefreshRate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="Real-time (30s)">Real-time (Every 30 seconds)</option>
                  <option value="1 minute">1 Minute Interval</option>
                  <option value="5 minutes">5 Minutes Interval</option>
                  <option value="Manual">Manual Refresh Only</option>
                </select>
              </div>
            </div>

            {/* Toggle Switches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                    Daily Portfolio Valuation Digest
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Receive end-of-day NAV summary and performance benchmark reports
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                    Significant Price Volatility Alerts
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Notify when equity positions swing more than ±3.5% in a single trading session
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={volatilityAlert}
                  onChange={(e) => setVolatilityAlert(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                    Corporate Actions & Earnings Notices
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Receive real-time filing disclosures and quarterly earnings calendar notifications
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newsAlerts}
                  onChange={(e) => setNewsAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                }}
              >
                <Save style={{ width: '15px', height: '15px' }} />
                Save Preferences
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
