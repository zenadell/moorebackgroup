'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AuthSessionInfo } from '@/types';

export interface PendingOtpChallenge {
  otpId: string;
  challengeId: string;
  maskedEmail: string;
  resendCooldownSeconds: number;
  expiresAt?: number;
}

interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  otpId?: string;
  challengeId?: string;
  maskedEmail?: string;
  resendAfterSeconds?: number;
  error?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  isMaster: boolean;
  pendingChallenge: PendingOtpChallenge | null;
  revocationNotice: string | null;
  clearRevocationNotice: () => void;
  login: (email: string, pass: string, deviceName?: string) => Promise<LoginResult>;
  verifyOtp: (
    otpId: string,
    code: string,
    deviceName?: string,
    challengeId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (
    otpId: string,
    deviceName?: string,
    challengeId?: string
  ) => Promise<{
    success: boolean;
    newOtpId?: string;
    challengeId?: string;
    maskedEmail?: string;
    resendAfterSeconds?: number;
    retryAfterSeconds?: number;
    error?: string;
  }>;
  cancelOtpChallenge: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: {
    name?: string;
    email?: string;
    location?: string;
  }) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  fetchSessions: () => Promise<{ success: boolean; sessions?: AuthSessionInfo[]; error?: string }>;
  revokeSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  revokeAllOtherSessions: () => Promise<{ success: boolean; count?: number; error?: string }>;
  changePassword: (
    currentPass: string,
    newPass: string,
    revokeOthers?: boolean
  ) => Promise<{ success: boolean; error?: string; revokedCount?: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'moback_session_token';
const NOTICE_KEY = 'moback_revocation_notice';
const LAST_ACTIVITY_KEY = 'moback_last_activity';
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (300,000ms) of zero user interaction

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingChallenge, setPendingChallenge] = useState<PendingOtpChallenge | null>(null);
  const [revocationNotice, setRevocationNotice] = useState<string | null>(null);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const clearRevocationNotice = () => {
    setRevocationNotice(null);
    try {
      sessionStorage.removeItem(NOTICE_KEY);
    } catch {
      // ignore
    }
  };

  // Helper to validate current session with server
  const checkSession = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setSessionId(data.sessionId);
          setIsMaster(!!data.isMaster);
          setIsAuthenticated(true);
          return true;
        }
      }

      // If response is not ok or not authenticated (e.g. revoked)
      const data = await res.json().catch(() => ({}));
      const reason = data.reason || 'Your session has been terminated by the account owner (Declan Salo).';

      // Terminate local session
      localStorage.removeItem(TOKEN_KEY);
      try {
        sessionStorage.setItem(NOTICE_KEY, reason);
      } catch {
        // ignore
      }

      setUser(null);
      setSessionId(null);
      setIsMaster(false);
      setIsAuthenticated(false);
      setRevocationNotice(reason);
      return false;
    } catch {
      // Network hiccup - don't immediately revoke unless persistent
      return false;
    }
  }, []);

  // Initial load: check for token and existing notice
  useEffect(() => {
    try {
      const savedNotice = sessionStorage.getItem(NOTICE_KEY);
      if (savedNotice) {
        setRevocationNotice(savedNotice);
      }
    } catch {
      // ignore
    }

    const restorePendingChallenge = async () => {
      try {
        const res = await fetch('/api/auth/otp-challenge', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (res.ok && data.active && data.otpId) {
          setPendingChallenge({
            otpId: data.otpId,
            challengeId: data.challengeId || '',
            maskedEmail: data.maskedEmail || 'authorized security email',
            resendCooldownSeconds: Number(data.resendCooldownSeconds ?? 0),
            expiresAt: data.expiresAt,
          });
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    };

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      restorePendingChallenge();
      return;
    }

    // Check if 5-minute inactivity expired while the tab was closed or away
    const lastActiveStr = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (!isNaN(lastActive) && Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS) {
        const lockNotice =
          'Account Locked: You have been automatically logged out due to 5 minutes of inactivity for portfolio security.';
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        try {
          sessionStorage.setItem(NOTICE_KEY, lockNotice);
        } catch {
          // ignore
        }
        setRevocationNotice(lockNotice);
        restorePendingChallenge();
        return;
      }
    }

    checkSession(token).finally(() => {
      setIsLoading(false);
    });
  }, [checkSession]);

  // Real-time Heartbeat: checks session status every 8 seconds to detect remote kick-outs
  const consecutiveHeartbeatFailuresRef = useRef<number>(0);
  const lastActivityTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isAuthenticated) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      consecutiveHeartbeatFailuresRef.current = 0;
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    heartbeatRef.current = setInterval(async () => {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (!currentToken) return;

      try {
        const res = await fetch('/api/auth/session', {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.authenticated) {
          consecutiveHeartbeatFailuresRef.current = 0;
          return;
        }

        // Detect explicit revocation from admin
        const isExplicitRevocation =
          res.status === 401 &&
          (data.reason?.toLowerCase().includes('terminated') ||
            data.reason?.toLowerCase().includes('revoked'));

        consecutiveHeartbeatFailuresRef.current += 1;

        if (isExplicitRevocation || consecutiveHeartbeatFailuresRef.current >= 3) {
          const reason =
            data.reason || 'This session has been terminated by account owner (Declan Salo).';
          localStorage.removeItem(TOKEN_KEY);
          try {
            sessionStorage.setItem(NOTICE_KEY, reason);
          } catch {
            // ignore
          }
          setUser(null);
          setSessionId(null);
          setIsAuthenticated(false);
          setRevocationNotice(reason);
        }
      } catch {
        // network error, ignore single poll
      }
    }, 8000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // -------------------------------------------------------------
  // 5-Minute Inactivity Auto-Logout Tracker (Activity Timestamp Architecture)
  // Automatically logs user out and locks account after 5 minutes of uninterrupted zero interaction
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset interaction timestamp in memory and localStorage immediately upon authentication
    const now = Date.now();
    lastActivityTimestampRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // ignore
    }

    const triggerInactivityLogout = async () => {
      const lockNotice =
        'Account Locked: You have been automatically logged out due to 5 minutes of inactivity for portfolio security.';

      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (currentToken) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${currentToken}` },
          });
        } catch {
          // ignore
        }
      }

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      try {
        sessionStorage.setItem(NOTICE_KEY, lockNotice);
      } catch {
        // ignore
      }

      setUser(null);
      setSessionId(null);
      setIsMaster(false);
      setIsAuthenticated(false);
      setRevocationNotice(lockNotice);
    };

    const checkInactivity = () => {
      const savedStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      const lastActive = savedStr ? parseInt(savedStr, 10) : lastActivityTimestampRef.current;
      const effectiveLastActive = isNaN(lastActive) ? lastActivityTimestampRef.current : lastActive;
      const elapsed = Date.now() - effectiveLastActive;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        triggerInactivityLogout();
        return true;
      }
      return false;
    };

    // User interaction updates the last activity timestamp
    let lastWriteTime = 0;
    const onUserActivity = () => {
      // CRITICAL: First check if inactivity had already expired BEFORE this event was received!
      // This prevents a click/touch that wakes up the device or tab from wiping the idle time.
      const savedStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      const lastActive = savedStr ? parseInt(savedStr, 10) : lastActivityTimestampRef.current;
      const effectiveLastActive = isNaN(lastActive) ? lastActivityTimestampRef.current : lastActive;
      if (Date.now() - effectiveLastActive >= INACTIVITY_TIMEOUT_MS) {
        triggerInactivityLogout();
        return;
      }

      const current = Date.now();
      lastActivityTimestampRef.current = current;
      // Throttle localStorage writes to once every 2 seconds
      if (current - lastWriteTime > 2000) {
        lastWriteTime = current;
        try {
          localStorage.setItem(LAST_ACTIVITY_KEY, String(current));
        } catch {
          // ignore
        }
      }
    };

    // Actual user inputs (captured at the window level with capture to catch sub-container scrolls)
    const userEvents = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll', 'pointerdown'];
    userEvents.forEach((ev) => {
      window.addEventListener(ev, onUserActivity, { passive: true, capture: true });
    });

    // Check every 2 seconds
    const intervalId = setInterval(checkInactivity, 2000);

    // When tab becomes visible or gains focus again, IMMEDIATELY check if 5 minutes elapsed while away
    const onVisibilityOrFocus = () => {
      checkInactivity();
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      userEvents.forEach((ev) => {
        window.removeEventListener(ev, onUserActivity, { capture: true });
      });
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [isAuthenticated]);

  const login = async (
    email: string,
    pass: string,
    deviceName?: string
  ): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, deviceName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      // Check if 2-Factor Authentication (OTP) is required
      if (data.requires2FA) {
        const challenge: PendingOtpChallenge = {
          otpId: data.otpId,
          challengeId: data.challengeId || '',
          maskedEmail: data.maskedEmail || 'authorized security email',
          resendCooldownSeconds: Number(data.resendAfterSeconds ?? 30),
          expiresAt: data.expiresAt,
        };
        setPendingChallenge(challenge);
        return {
          success: true,
          requires2FA: true,
          otpId: data.otpId,
          challengeId: data.challengeId,
          maskedEmail: data.maskedEmail,
          resendAfterSeconds: challenge.resendCooldownSeconds,
        };
      }

      setPendingChallenge(null);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      clearRevocationNotice();

      lastActivityTimestampRef.current = Date.now();
      consecutiveHeartbeatFailuresRef.current = 0;

      setUser(data.user);
      setSessionId(data.sessionId);
      setIsMaster(!!data.isMaster);
      setIsAuthenticated(true);
      return { success: true, requires2FA: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login request failed';
      return { success: false, error: message };
    }
  };

  const verifyOtp = async (
    otpId: string,
    code: string,
    deviceName?: string,
    challengeId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const resolvedChallengeId = challengeId || pendingChallenge?.challengeId || undefined;
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId, challengeId: resolvedChallengeId, code, deviceName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Verification code failed' };
      }

      setPendingChallenge(null);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      clearRevocationNotice();

      lastActivityTimestampRef.current = Date.now();
      consecutiveHeartbeatFailuresRef.current = 0;

      setUser(data.user);
      setSessionId(data.sessionId);
      setIsMaster(!!data.isMaster);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      return { success: false, error: message };
    }
  };

  const resendOtp = async (
    otpId: string,
    deviceName?: string,
    challengeId?: string
  ): Promise<{
    success: boolean;
    newOtpId?: string;
    challengeId?: string;
    maskedEmail?: string;
    resendAfterSeconds?: number;
    retryAfterSeconds?: number;
    error?: string;
  }> => {
    try {
      const resolvedChallengeId = challengeId || pendingChallenge?.challengeId || undefined;
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId, challengeId: resolvedChallengeId, deviceName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to resend code',
          retryAfterSeconds:
            typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined,
        };
      }

      const nextCooldown = Number(data.resendAfterSeconds ?? 30);
      setPendingChallenge((prev) => ({
        otpId: data.otpId,
        challengeId: data.challengeId || resolvedChallengeId || prev?.challengeId || '',
        maskedEmail: data.maskedEmail || prev?.maskedEmail || 'authorized security email',
        resendCooldownSeconds: nextCooldown,
        expiresAt: data.expiresAt,
      }));

      return {
        success: true,
        newOtpId: data.otpId,
        challengeId: data.challengeId || resolvedChallengeId,
        maskedEmail: data.maskedEmail,
        resendAfterSeconds: nextCooldown,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request new code';
      return { success: false, error: message };
    }
  };

  const cancelOtpChallenge = async (): Promise<void> => {
    setPendingChallenge(null);
    try {
      await fetch('/api/auth/otp-challenge', {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'same-origin',
      });
    } catch {
      // ignore
    }
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    setSessionId(null);
    setIsMaster(false);
    setIsAuthenticated(false);
  };

  const updateProfile = async (profile: {
    name?: string;
    email?: string;
    location?: string;
  }): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update profile' };
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const fetchSessions = async (): Promise<{
    success: boolean;
    sessions?: AuthSessionInfo[];
    error?: string;
  }> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/auth/sessions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to fetch sessions' };
      }

      return { success: true, sessions: data.sessions };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const revokeSession = async (
    targetSessionId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: targetSessionId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to revoke session' };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const revokeAllOtherSessions = async (): Promise<{
    success: boolean;
    count?: number;
    error?: string;
  }> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ revokeAllOthers: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to revoke other sessions' };
      }

      return { success: true, count: data.revokedCount };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  };

  const changePassword = async (
    currentPass: string,
    newPass: string,
    revokeOthers: boolean = true
  ): Promise<{ success: boolean; error?: string; revokedCount?: number }> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
          revokeOtherSessions: revokeOthers,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update password' };
      }
      return { success: true, revokedCount: data.revokedCount };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        sessionId,
        isMaster,
        pendingChallenge,
        revocationNotice,
        clearRevocationNotice,
        login,
        verifyOtp,
        resendOtp,
        cancelOtpChallenge,
        logout,
        updateProfile,
        fetchSessions,
        revokeSession,
        revokeAllOtherSessions,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
