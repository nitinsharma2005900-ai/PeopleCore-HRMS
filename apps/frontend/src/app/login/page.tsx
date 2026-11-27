'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS, Role } from '../../lib/authContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchDemoRole } = useAuth();
  const [email, setEmail] = useState<string>('admin@peoplecore.local');
  const [password, setPassword] = useState<string>('Admin@12345');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = async (acc: any) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setLoading(true);
    try {
      await switchDemoRole(acc.role);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-600 items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-600/30">
            P
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign in to PeopleCore
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Enterprise Workforce & Automated Payroll Platform
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* 1-Click Demo Accounts Selector */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase">
            <Sparkles size={14} className="text-teal-500" />
            <span>Select 1-Click Demo Persona</span>
          </div>

          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200/70 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                    {acc.label}
                  </p>
                  <p className="text-[11px] text-slate-500">{acc.email}</p>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                  {acc.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
