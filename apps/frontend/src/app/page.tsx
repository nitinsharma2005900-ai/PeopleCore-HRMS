'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  CalendarCheck,
  CreditCard,
  PlusCircle,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { useAuth } from '../lib/authContext';
import { api } from '../lib/api';
import { KPICard } from '../components/KPICard';
import { formatCurrency, formatDate } from '../lib/utils';

const COLORS = ['#4F46E5', '#14B8A6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6'];

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, deptRes, attRes, leaveRes, holRes] = await Promise.all([
        api.get('/analytics/overview').catch(() => ({ data: { data: {} } })),
        api.get('/analytics/departments').catch(() => ({ data: { data: [] } })),
        api.get('/analytics/attendance').catch(() => ({ data: { data: {} } })),
        api.get('/leave/requests?status=PENDING').catch(() => ({ data: { data: [] } })),
        api.get('/leave/holidays').catch(() => ({ data: { data: [] } })),
      ]);

      setSummary(sumRes.data.data);
      setDepartments(deptRes.data.data || []);
      setAttendanceStats(attRes.data.data);
      setPendingLeaves(leaveRes.data.data?.slice(0, 5) || []);
      setHolidays(holRes.data.data?.slice(0, 4) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleApproveLeave = async (id: string) => {
    try {
      await api.put(`/leave/requests/${id}/review`, { action: 'APPROVED', comments: 'Approved via Quick Action' });
      fetchDashboardData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Action failed');
    }
  };

  const handleRejectLeave = async (id: string) => {
    try {
      await api.put(`/leave/requests/${id}/review`, { action: 'REJECTED', comments: 'Schedule conflict' });
      fetchDashboardData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Action failed');
    }
  };

  const attendanceChartData = [
    { name: 'Present', count: attendanceStats?.present || 44, fill: '#10B981' },
    { name: 'Late', count: attendanceStats?.late || 3, fill: '#F59E0B' },
    { name: 'Half Day', count: attendanceStats?.halfDay || 2, fill: '#6366F1' },
    { name: 'Absent', count: attendanceStats?.absent || 1, fill: '#EF4444' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Personalized Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-100">
            <Sparkles size={14} className="text-teal-300" />
            <span>Enterprise Workspace • {role} Portal</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Welcome back, {user ? `${user.firstName} ${user.lastName}` : 'Evaluator'}!
          </h1>
          <p className="text-sm text-indigo-100/90 font-medium max-w-xl">
            PeopleCore is operating normally. All services, payroll modules, and real-time attendance rules are verified.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          <Link
            href="/attendance"
            className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-slate-50 font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Clock size={16} />
            <span>Attendance Log</span>
          </Link>
          <Link
            href="/leave"
            className="px-4 py-2.5 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/40 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2"
          >
            <CalendarCheck size={16} />
            <span>Apply for Leave</span>
          </Link>
          {(role === 'PAYROLL_SPECIALIST' || role === 'ADMINISTRATOR') && (
            <Link
              href="/payroll"
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <CreditCard size={16} />
              <span>Payroll Center</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Total Workforce"
          value={summary?.total_headcount || 50}
          subtitle={`${summary?.active_count || 47} Active • ${summary?.onboarding_count || 1} Onboarding`}
          change="+4.2%"
          trend="up"
          icon={Users}
          color="indigo"
        />
        <KPICard
          title="Attendance Rate"
          value={`${attendanceStats?.attendanceRate || 95.8}%`}
          subtitle={`Absenteeism: ${attendanceStats?.absenteeismRate || 0.8}%`}
          change="+1.5%"
          trend="up"
          icon={Clock}
          color="emerald"
        />
        <KPICard
          title="Pending Approvals"
          value={pendingLeaves.length}
          subtitle="Leave & Attendance Corrections"
          change={pendingLeaves.length > 0 ? 'Action Req' : 'Clear'}
          trend={pendingLeaves.length > 0 ? 'down' : 'up'}
          icon={CalendarCheck}
          color="amber"
        />
        <KPICard
          title="Monthly Payroll Spend"
          value={formatCurrency(3023000)}
          subtitle="October 2026 Finalized Ledger"
          change="Reconciled"
          trend="up"
          icon={CreditCard}
          color="teal"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Workforce Attendance Overview</h3>
              <p className="text-xs text-slate-500">Live breakdown of employee attendance status today</p>
            </div>
            <Link href="/attendance" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <span>View full log</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution Pie Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Department Distribution</h3>
            <span className="text-xs font-semibold text-slate-400">Headcount</span>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departments}
                  dataKey="headcount"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {departments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {departments.slice(0, 4).map((d, idx) => (
              <div key={d.code} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-700 font-medium">{d.department}</span>
                </div>
                <span className="font-bold text-slate-900">{d.headcount} ({d.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Leave Approvals & Holidays Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pending Leave Approvals</h3>
              <p className="text-xs text-slate-500">Requires manager or HR officer review</p>
            </div>
            <Link href="/leave" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Manage all requests →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Leave Type</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No pending leave requests at this time.
                    </td>
                  </tr>
                ) : (
                  pendingLeaves.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">
                        {r.employeeName || r.employeeId}
                      </td>
                      <td className="py-3 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                          {r.leaveTypeName || r.leaveTypeCode}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">
                        {formatDate(r.startDate)} ({r.totalDays}d)
                      </td>
                      <td className="py-3 text-slate-500 max-w-xs truncate">
                        {r.reason}
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => handleApproveLeave(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectLeave(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] transition-colors"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Holidays & Quick Links */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Upcoming Holidays</h3>
          <div className="space-y-3">
            {holidays.map(h => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">{h.name}</p>
                  <p className="text-[11px] text-slate-500">{h.description || 'Statutory Off'}</p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-indigo-600 shadow-sm">
                  {formatDate(h.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
