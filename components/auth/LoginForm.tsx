'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, demoLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@moback.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'Authentication failed');
    }
  };

  const handleDemo = () => {
    demoLogin();
    if (onSuccess) onSuccess();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xl">
        {/* Brand header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            Sign in to Orion Dashboard
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            MoBack Portfolio Management & Market Intelligence
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Sign In'}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* 1-Click Demo Login */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <span className="relative bg-white px-3 text-[11px] text-slate-400">
            or quick access
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 py-2.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100/70"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          Instant Demo Access (Executive CIO)
        </button>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Encrypted Session • MoBack Dashboard v1.0</span>
        </div>
      </div>
    </div>
  );
}
