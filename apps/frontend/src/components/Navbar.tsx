'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  User as UserIcon,
  Shield
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS, Role } from '../lib/authContext';
import { api } from '../lib/api';

export const Navbar: React.FC = () => {
  const { user, role, switchDemoRole } = useAuth();
  const [punchState, setPunchState] = useState<'IDLE' | 'CHECKED_IN'>('IDLE');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    // Fetch notifications
    api.get('/notifications')
      .then(res => setNotifications(res.data.data || []))
      .catch(() => {});
  }, [user]);

  const handlePunchToggle = async () => {
    try {
      if (punchState === 'IDLE') {
        await api.post('/attendance/check-in', { shiftId: 'shift-gen' });
        setPunchState('CHECKED_IN');
      } else {
        await api.post('/attendance/check-out', {});
        setPunchState('IDLE');
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Attendance action completed.');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between">
      {/* Search Bar */}
      <div className="relative w-72 md:w-96">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search employees, payroll, policies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) window.location.assign(`/employees?search=${encodeURIComponent(searchQuery.trim())}`); }}
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-3">
        {/* Quick Check-In / Check-Out Button */}
        <button
          onClick={handlePunchToggle}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
            punchState === 'CHECKED_IN'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
          }`}
          title="Record instant attendance event"
        >
          <Clock size={15} />
          <span>{punchState === 'CHECKED_IN' ? 'Check Out' : 'Check In'}</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            title="System notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-800">Notifications</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-indigo-600 font-semibold">{unreadCount} unread</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-slate-500 hover:text-indigo-600 underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all cursor-pointer ${
                        n.isRead ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800">{n.title}</p>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {user?.firstName?.[0] || 'A'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800">
                {user ? `${user.firstName} ${user.lastName}` : 'Evaluator'}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase">
                {role}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-400">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  <Shield size={10} />
                  Role: {role}
                </div>
              </div>

              <div className="pt-2">
                <p className="px-3 text-[10px] font-bold uppercase text-slate-400 mb-1">Switch Demo Role</p>
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.role}
                    onClick={() => {
                      switchDemoRole(acc.role);
                      setShowProfileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      acc.role === role ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{acc.label}</span>
                    {acc.role === role && <CheckCircle2 size={13} className="text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
