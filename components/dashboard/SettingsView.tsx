'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Bell,
  Shield,
  Sliders,
  CheckCircle2,
  Laptop,
  Smartphone,
  Globe,
  KeyRound,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { AuthSessionInfo } from '@/types';

export function SettingsView() {
  const {
    user,
    isMaster,
    updateProfile,
    fetchSessions,
    revokeSession,
    revokeAllOtherSessions,
    changePassword,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('security');

  // Profile Form States
  const [name, setName] = useState(user?.name || 'Declan Salo');
  const [email, setEmail] = useState(user?.email || 'declansalo@gmail.com');
  const [location, setLocation] = useState(user?.location || 'Nashville Tennessee, United States');
  const [phone, setPhone] = useState('+1 (555) 392-8104');
  const [currency, setCurrency] = useState('USD');
  const [refreshRate, setRefreshRate] = useState('Real-time');
  const [dailyDigest, setDailyDigest] = useState(true);
  const [volatilityAlert, setVolatilityAlert] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security & Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOthersOnPasswordChange, setRevokeOthersOnPasswordChange] = useState(true);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Active Sessions States
  const [sessions, setSessions] = useState<AuthSessionInfo[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionActionStatus, setSessionActionStatus] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const res = await fetchSessions();
    if (res.success && res.sessions) {
      setSessions(res.sessions);
    }
    setIsLoadingSessions(false);
  }, [fetchSessions]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 8000); // Poll active sessions list every 8s
    return () => clearInterval(interval);
  }, [loadSessions]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (!isMaster) {
      setProfileError('Only Declan Salo (Master Account) can update profile and login details.');
      return;
    }
    setProfileSaving(true);
    const res = await updateProfile({ name, email, location });
    setProfileSaving(false);
    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      setProfileError(res.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setIsChangingPassword(true);
    const res = await changePassword(currentPassword, newPassword, revokeOthersOnPasswordChange);
    setIsChangingPassword(false);

    if (res.success) {
      setPasswordStatus({
        type: 'success',
        message: `Password updated successfully! ${
          res.revokedCount ? `${res.revokedCount} other session(s) were kicked out.` : ''
        }`,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadSessions();
    } else {
      setPasswordStatus({ type: 'error', message: res.error || 'Failed to update password.' });
    }
  };

  const handleRevokeSingle = async (sessionId: string, deviceName: string) => {
    setSessionActionStatus(null);
    const res = await revokeSession(sessionId);
    if (res.success) {
      setSessionActionStatus(`Successfully kicked out ${deviceName}. Their session was terminated immediately.`);
      loadSessions();
    } else {
      setSessionActionStatus(`Error: ${res.error || 'Could not revoke session'}`);
    }
    setTimeout(() => setSessionActionStatus(null), 5000);
  };

  const handleRevokeAllOthers = async () => {
    setSessionActionStatus(null);
    const res = await revokeAllOtherSessions();
    if (res.success) {
      setSessionActionStatus(`Kicked out ${res.count || 0} other active device(s). Only your current session remains active.`);
      loadSessions();
    } else {
      setSessionActionStatus(`Error: ${res.error || 'Could not revoke sessions'}`);
    }
    setTimeout(() => setSessionActionStatus(null), 5000);
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            Account & Security Control
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Manage Declan Salo&apos;s investor credentials, remote device sessions, and guest access
          </p>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#e2e8f0',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'security' ? '#ffffff' : 'transparent',
              color: activeTab === 'security' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'security' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🔒 Security & Active Sessions
          </button>
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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECURITY & ACTIVE SESSIONS TAB (Primary focus for brother/guest control) */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Action Status Notification Banner */}
          {sessionActionStatus && (
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
              <span>{sessionActionStatus}</span>
            </div>
          )}

          {/* Master vs Guest Notice Banner */}
          {!isMaster ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '14px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                color: '#334155',
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Shield style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>
                  Viewer / Guest Session
                </strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  You are logged into Declan Salo&apos;s portfolio in authorized viewer mode. Administrative privileges (terminating sessions, kicking out devices, and changing account passwords) are strictly managed by the account owner.
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '14px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                color: '#1e3a8a',
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#dbeafe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <strong style={{ color: '#1e40af', display: 'block', fontSize: '13px' }}>
                  👑 Master Account Device (Declan Salo)
                </strong>
                <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                  You have full administrative authority. You can monitor active guest sessions (such as your brother), kick them out immediately on demand, and update account credentials.
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE DEVICES & SESSIONS CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e9edf3',
              padding: '22px 24px',
              boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid #f1f4f9',
                paddingBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Globe style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                      Active Devices & Guest Sessions
                    </h3>
                    <span
                      style={{
                        backgroundColor: '#e6f9f0',
                        color: '#065f46',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}
                    >
                      {sessions.length} Online
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                    {isMaster
                      ? 'Monitor who is currently viewing your portfolio and revoke access on demand'
                      : 'Live view of connected devices on this account'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={loadSessions}
                  disabled={isLoadingSessions}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                  title="Refresh active sessions"
                >
                  <RefreshCw style={{ width: '13px', height: '13px', animation: isLoadingSessions ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Refresh</span>
                </button>

                {isMaster && otherSessionsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRevokeAllOthers}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #fee2e2',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <LogOut style={{ width: '13px', height: '13px' }} />
                    <span>Kick Out All Other Devices ({otherSessionsCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Explanation Note */}
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                color: '#475569',
                lineHeight: '1.5',
              }}
            >
              {isMaster ? (
                <>
                  <strong style={{ color: '#0f172a' }}>💡 How guest access control works:</strong> When you share your logins with your brother or a family member, their phone or laptop will appear in this list below in real time. You can click <strong style={{ color: '#dc2626' }}>&ldquo;Kick Out&rdquo;</strong> next to their device at any moment. Their browser will be terminated and redirected to the login screen within seconds.
                </>
              ) : (
                <>
                  <strong style={{ color: '#0f172a' }}>🔒 Read-only device view:</strong> You are viewing in guest access mode. Remote kick-out and device termination controls are exclusively held by Declan Salo&apos;s primary device.
                </>
              )}
            </div>

            {/* Sessions List */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sessions.map((sess) => {
                const isMobile = /iphone|android|ipad/i.test(sess.deviceName);
                const IconComponent = isMobile ? Smartphone : Laptop;

                return (
                  <div
                    key={sess.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: sess.isCurrent ? '1px solid #bfdbfe' : '1px solid #f1f4f9',
                      backgroundColor: sess.isCurrent ? '#f8faff' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: sess.isCurrent ? '#eff6ff' : '#f1f5f9',
                          color: sess.isCurrent ? '#2563eb' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent style={{ width: '18px', height: '18px' }} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                            {sess.deviceName}
                          </strong>
                          {sess.isCurrent ? (
                            <span
                              style={{
                                backgroundColor: isMaster ? '#dbeafe' : '#f1f5f9',
                                color: isMaster ? '#1e40af' : '#475569',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '9999px',
                              }}
                            >
                              {isMaster ? 'This Device (You / Declan Salo - Master)' : 'This Device (Guest Viewer)'}
                            </span>
                          ) : sess.isMaster ? (
                            <span
                              style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              👑 Master Account (Declan Salo)
                            </span>
                          ) : (
                            <span
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '9999px', backgroundColor: '#d97706' }} />
                              Guest Device (e.g. Brother)
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '11px', color: '#64748b' }}>
                          <span>📍 {sess.location}</span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock style={{ width: '11px', height: '11px' }} />
                            Logged in {new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span style={{ color: '#10b981', fontWeight: 500 }}>Active now</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Column */}
                    <div>
                      {sess.isCurrent ? (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', paddingRight: '8px' }}>
                          Current Session
                        </span>
                      ) : isMaster ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeSingle(sess.id, sess.deviceName)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <ShieldAlert style={{ width: '13px', height: '13px' }} />
                          <span>Kick Out</span>
                        </button>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            fontWeight: 500,
                            padding: '4px 10px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Shield style={{ width: '11px', height: '11px', color: '#94a3b8' }} />
                          {sess.isMaster ? 'Master Device (Protected)' : 'Active'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {sessions.length === 0 && !isLoadingSessions && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No active sessions found.
                </div>
              )}
            </div>
          </div>

          {/* CHANGE PASSWORD CARD */}
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
              <KeyRound style={{ width: '18px', height: '18px', color: isMaster ? '#2563eb' : '#64748b' }} />
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  Change Account Password
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                  {isMaster
                    ? 'Update your dashboard login password whenever you want to cut off shared access'
                    : 'Restricted to Primary Master Account (Declan Salo)'}
                </p>
              </div>
            </div>

            {!isMaster ? (
              <div
                style={{
                  marginTop: '16px',
                  padding: '20px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                <KeyRound style={{ width: '22px', height: '22px', color: '#94a3b8', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>
                  Password Management Restricted
                </p>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                  Only Declan Salo can change credentials from the primary Master account device.
                </p>
              </div>
            ) : (
              <>
                {passwordStatus && (
                  <div
                    style={{
                      marginTop: '16px',
                      borderRadius: '10px',
                      backgroundColor: passwordStatus.type === 'success' ? '#e6f9f0' : '#fee2e2',
                      border: passwordStatus.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      color: passwordStatus.type === 'success' ? '#065f46' : '#991b1b',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {passwordStatus.message}
                  </div>
                )}

                <form onSubmit={handleChangePassword} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
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

                  <div className="settings-two-col">
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
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
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        required
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

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer', marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      checked={revokeOthersOnPasswordChange}
                      onChange={(e) => setRevokeOthersOnPasswordChange(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#2563eb' }}
                    />
                    <span>Automatically terminate and kick out all other devices after changing password</span>
                  </label>

                  <div style={{ paddingTop: '6px' }}>
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        padding: '8px 20px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {isChangingPassword ? 'Updating...' : 'Update Password & Protect Dashboard'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROFILE & PREFERENCES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              Profile preferences saved successfully!
            </div>
          )}

          {profileError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626', flexShrink: 0 }} />
              {profileError}
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
                <p style={{ fontSize: '11px', color: '#64748b' }}>Account ID: #MO-88429 • Declan Salo Portfolio</p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    placeholder="Nashville Tennessee, United States"
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
                  disabled={profileSaving || !isMaster}
                  style={{
                    backgroundColor: isMaster ? '#2563eb' : '#94a3b8',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: isMaster ? 'pointer' : 'not-allowed',
                  }}
                >
                  {profileSaving ? 'Saving Changes...' : isMaster ? 'Update Profile & Login Email' : 'Restricted to Declan Salo (Master)'}
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
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="CHF">CHF (Fr) - Swiss Franc</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Quote Refresh Rate</label>
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
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Real-time">Live Alpaca / Finnhub Stream (Active)</option>
                  <option value="15-sec">15 Seconds</option>
                  <option value="30-sec">30 Seconds</option>
                  <option value="1-min">1 Minute</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
