'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AuthSessionInfo } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  revocationNotice: string | null;
  clearRevocationNotice: () => void;
  login: (email: string, pass: string, deviceName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setSessionId(data.sessionId);
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
    }, 3500);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const login = async (
    email: string,
    pass: string,
    deviceName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, deviceName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        return { success: false, error: data.error || 'Authentication failed' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      clearRevocationNotice();

      setUser(data.user);
      setSessionId(data.sessionId);
      setIsAuthenticated(true);
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Login request failed';
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
    setIsAuthenticated(false);
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
        headers: { Authorization: `Bearer ${token}` },
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
        body: JSON.stringify({ allOthers: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to revoke sessions' };
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
        revocationNotice,
        clearRevocationNotice,
        login,
        logout,
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
