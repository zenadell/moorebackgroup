'use client';

import React, { useState } from 'react';
import { User, Bell, Shield, Sliders, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

export function SettingsView() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || 'Declan Salo');
  const [email, setEmail] = useState(user?.email || 'declansalo@gmail.com');
  const [location, setLocation] = useState(user?.location || 'Nashville Tennessee, United States');
  const [phone, setPhone] = useState('+1 (555) 392-8104');
  const [currency, setCurrency] = useState('USD');
  const [refreshRate, setRefreshRate] = useState('Real-time');
  const [dailyDigest, setDailyDigest] = useState(true);
  const [volatilityAlert, setVolatilityAlert] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = {
        ...(user || {}),
        name,
        email,
        location,
      };
      localStorage.setItem('moback_auth_user', JSON.stringify(updatedUser));
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Account & Portfolio Settings</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
          Manage your personal investor profile, notification alerts, and portfolio preferences
        </p>
      </div>

      {savedSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#e6f9f0',
            color: '#065f46',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981' }} />
          Preferences saved successfully!
        </div>
      )}

      {/* Profile Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e9edf3',
          padding: '22px 24px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f4f9', paddingBottom: '14px' }}>
          <User style={{ width: '18px', height: '18px', color: '#2563eb' }} />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Investor Profile</h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Account ID: #MO-88429 • Tier 1 Managed Portfolio</p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="settings-two-col">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div className="settings-two-col">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State, Country"
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ paddingTop: '8px' }}>
            <button
              type="submit"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Update Profile
            </button>
          </div>
        </form>
      </div>

      {/* Portfolio Preferences Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e9edf3',
          padding: '22px 24px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f4f9', paddingBottom: '14px' }}>
          <Sliders style={{ width: '18px', height: '18px', color: '#2563eb' }} />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Portfolio Preferences</h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Configure valuation displays and market intervals</p>
          </div>
        </div>

        <div className="settings-two-col" style={{ marginTop: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Display Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Valuation Sync</label>
            <select
              value={refreshRate}
              onChange={(e) => setRefreshRate(e.target.value)}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="Real-time">Real-time Streaming</option>
              <option value="60s">Every 60 Seconds</option>
              <option value="Daily">Daily Close Snapshot</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications & Security Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e9edf3',
          padding: '22px 24px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f4f9', paddingBottom: '14px' }}>
          <Bell style={{ width: '18px', height: '18px', color: '#2563eb' }} />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Alerts & Security</h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Customized price and portfolio notifications</p>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dailyDigest}
              onChange={(e) => setDailyDigest(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
            />
            <span>Receive daily portfolio summary & performance report via email</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={volatilityAlert}
              onChange={(e) => setVolatilityAlert(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
            />
            <span>Notify me of significant price movements (&gt; 3% intraday) across my 17 holdings</span>
          </label>
        </div>

        <div
          style={{
            marginTop: '18px',
            paddingTop: '14px',
            borderTop: '1px solid #f1f4f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Two-Factor Authentication: Enabled
            </span>
          </div>
          <button
            type="button"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Manage Security
          </button>
        </div>
      </div>
    </div>
  );
}
