'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AuthSessionInfo } from '@/types';

interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  otpId?: string;
  maskedEmail?: string;
  error?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  isMaster: boolean;
  revocationNotice: string | null;
  clearRevocationNotice: () => void;
  login: (email: string, pass: string, deviceName?: string) => Promise<LoginResult>;
  verifyOtp: (otpId: string, code: string, deviceName?: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (otpId: string, deviceName?: string) => Promise<{ success: boolean; newOtpId?: string; error?: string }>;
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
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (300,000ms)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [revocationNotice, setRevocationNotice] = useState<string | null>(null);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    checkSession(token).finally(() => {
      setIsLoading(false);
    });
  }, [checkSession]);

  // Real-time Heartbeat: checks session status every 4 seconds to immediately detect remote kick-outs
  useEffect(() => {
    if (!isAuthenticated) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    heartbeatRef.current = setInterval(async () => {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (!currentToken) return;

      try {
        const res = await fetch('/api/auth/session', {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.authenticated) {
          // Session was revoked on server!
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
    }, 4000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // -------------------------------------------------------------
  // 5-Minute Inactivity Auto-Logout Tracker
  // Automatically logs user out and locks account if idle for 5 minutes
  // -------------------------------------------------------------
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (!isAuthenticated) return;

    inactivityTimerRef.current = setTimeout(async () => {
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
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    resetInactivityTimer();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleActivity, { passive: true });
    });

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleActivity);
      });
    };
  }, [isAuthenticated, resetInactivityTimer]);

  const login = async (
    email: string,
    pass: string,
    deviceName?: string
  ): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, deviceName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      // Check if 2-Factor Authentication (OTP) is required
      if (data.requires2FA) {
        return {
          success: true,
          requires2FA: true,
          otpId: data.otpId,
          maskedEmail: data.maskedEmail,
        };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      clearRevocationNotice();

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
    deviceName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId, code, deviceName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Verification code failed' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      clearRevocationNotice();

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
    deviceName?: string
  ): Promise<{ success: boolean; newOtpId?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId, deviceName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to resend code' };
      }

      return { success: true, newOtpId: data.otpId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request new code';
      return { success: false, error: message };
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
        revocationNotice,
        clearRevocationNotice,
        login,
        verifyOtp,
        resendOtp,
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
