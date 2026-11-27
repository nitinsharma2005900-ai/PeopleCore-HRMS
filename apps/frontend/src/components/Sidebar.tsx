'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  Award,
  FileText,
  BarChart3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS, Role } from '../lib/authContext';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const pathname = usePathname();
  const { user, role, switchDemoRole, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'PAYROLL_SPECIALIST', 'ADMINISTRATOR'] },
    { label: 'Employee Directory', href: '/employees', icon: Users, roles: ['MANAGER', 'HR_OFFICER', 'PAYROLL_SPECIALIST', 'ADMINISTRATOR'] },
    { label: 'Attendance & Shifts', href: '/attendance', icon: Clock, roles: ['EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'ADMINISTRATOR'] },
    { label: 'Leave Management', href: '/leave', icon: CalendarDays, roles: ['EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'ADMINISTRATOR'] },
    { label: 'Payroll & Payslips', href: '/payroll', icon: CreditCard, roles: ['EMPLOYEE', 'PAYROLL_SPECIALIST', 'ADMINISTRATOR'] },
    { label: 'Performance', href: '/performance', icon: Award, roles: ['EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'ADMINISTRATOR'] },
    { label: 'Documents', href: '/documents', icon: FileText, roles: ['EMPLOYEE', 'HR_OFFICER', 'ADMINISTRATOR'] },
    { label: 'Workforce Analytics', href: '/analytics', icon: BarChart3, roles: ['MANAGER', 'HR_OFFICER', 'PAYROLL_SPECIALIST', 'ADMINISTRATOR'] },
    { label: 'Administration', href: '/admin', icon: ShieldCheck, roles: ['ADMINISTRATOR'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#0F172A] text-slate-300 border-r border-slate-800 flex flex-col justify-between ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/30 shrink-0">
              P
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-white text-base tracking-tight leading-none">
                  PeopleCore
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                  HRMS & Payroll
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Role Quick Switcher and Profile Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 space-y-3">
        {!collapsed && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span className="flex items-center gap-1">
                <Sparkles size={12} className="text-teal-400" />
                Demo Persona
              </span>
              <span className="text-indigo-400 font-bold">{role}</span>
            </div>
            <select
              value={role}
              onChange={(e) => switchDemoRole(e.target.value as Role)}
              className="w-full text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              {DEMO_ACCOUNTS.map(acc => (
                <option key={acc.role} value={acc.role}>
                  {acc.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow">
              {user?.firstName?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'Guest Evaluator'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.employeeId || user?.email}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
