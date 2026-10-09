'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  demoLogin: () => void;
  logout: () => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr_orion_01',
  name: 'Declan Salo',
  email: 'declansalo@gmail.com',
  location: 'Nashville Tennessee, United States',
  role: 'Private Portfolio #MO-88429',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('moback_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email === 'alex.morgan@client.com' || parsed.name === 'Alex Morgan' || !parsed.location) {
          setUser(DEFAULT_USER);
          localStorage.setItem('moback_auth_user', JSON.stringify(DEFAULT_USER));
        } else {
          setUser(parsed);
        }
      } else {
        setUser(DEFAULT_USER);
        localStorage.setItem('moback_auth_user', JSON.stringify(DEFAULT_USER));
      }
    } catch {
      setUser(DEFAULT_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    if (!email || !pass) {
      setIsLoading(false);
      return { success: false, error: 'Email and password are required' };
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: email === DEFAULT_USER.email ? DEFAULT_USER.name : email.split('@')[0],
      email: email,
      location: DEFAULT_USER.location,
      role: 'Private Portfolio #MO-88429',
      avatarUrl: DEFAULT_USER.avatarUrl,
    };

    setUser(newUser);
    try {
      localStorage.setItem('moback_auth_user', JSON.stringify(newUser));
    } catch {
      // ignore
    }
    setIsLoading(false);
    return { success: true };
  };

  const demoLogin = () => {
    setUser(DEFAULT_USER);
    try {
      localStorage.setItem('moback_auth_user', JSON.stringify(DEFAULT_USER));
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('moback_auth_user');
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        demoLogin,
        logout,
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
