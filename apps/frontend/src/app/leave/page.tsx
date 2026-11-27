'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Check,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  CalendarCheck,
  Download
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function LeavePage() {
  const { user, role } = useAuth();
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [applyForm, setApplyForm] = useState<any>({
    leaveTypeCode: 'CASUAL',
    startDate: '2026-12-01',
    endDate: '2026-12-02',
    reason: 'Personal urgent errand'
  });

  const empId = user?.employeeId || 'EMP005';

  const fetchLeaveData = async () => {
    try {
      const [balRes, reqRes, typesRes] = await Promise.all([
        api.get(`/leave/balances?employeeId=${empId}`),
        api.get('/leave/requests'),
        api.get('/leave/types')
      ]);
      setBalances(balRes.data.data);
      setRequests(reqRes.data.data);
      setLeaveTypes(typesRes.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leave/apply', {
        employeeId: empId,
        ...applyForm
      });
      alert('Leave request submitted successfully!');
      setShowApplyModal(false);
      fetchLeaveData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit leave application');
    }
  };

  const handleReview = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/leave/requests/${id}/review`, {
        action,
        comments: `Leave ${action.toLowerCase()} by reviewer`
      });
      alert(`Leave request ${action.toLowerCase()} successfully`);
      fetchLeaveData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await api.post(`/leave/requests/${id}/cancel`, { employeeId: empId });
      alert('Leave request cancelled');
      fetchLeaveData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancellation failed');
    }
  };

  const handleDownloadCalendarIcs = async () => {
    try {
      const res = await api.get('/leave/calendar/ics', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'peoplecore_holidays_leaves.ics';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Calendar download failed');
    }
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px]">APPROVED</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-extrabold text-[10px]">PENDING</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-extrabold text-[10px]">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-extrabold text-[10px]">CANCELLED</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Leave Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Entitlement balances, holiday exclusion policies & multi-tier approval chains
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCalendarIcs}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm flex items-center gap-2"
            title="Download Outlook/Google Calendar iCal"
          >
            <Download size={15} />
            <span>Download Calendar (.ics)</span>
          </button>
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {balances.map(b => (
          <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {b.leaveTypeCode}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {b.isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">{b.remaining} <span className="text-xs font-semibold text-slate-400">days left</span></p>
              <p className="text-xs font-semibold text-slate-700">{b.name}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Quota: <b>{b.allocated}</b></span>
              <span>Used: <b>{b.used}</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Leave History & Review Pipeline</h3>
            <p className="text-xs text-slate-500">Includes transactional balance updates and holiday exclusions</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="pb-3">Employee</th>
                <th className="pb-3">Leave Type</th>
                <th className="pb-3">Start Date</th>
                <th className="pb-3">End Date</th>
                <th className="pb-3">Working Days</th>
                <th className="pb-3">Reason</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const canReview = (role === 'MANAGER' || role === 'HR_OFFICER' || role === 'ADMINISTRATOR') && req.status === 'PENDING';
                  const canCancel = req.employeeId === empId && req.status !== 'CANCELLED';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 font-bold text-slate-800">
                        {req.employeeName || req.employeeId}
                      </td>
                      <td className="py-3 font-semibold text-indigo-700">
                        {req.leaveTypeName || req.leaveTypeCode}
                      </td>
                      <td className="py-3 text-slate-600">{formatDate(req.startDate)}</td>
                      <td className="py-3 text-slate-600">{formatDate(req.endDate)}</td>
                      <td className="py-3 font-extrabold text-slate-900">{req.totalDays}d</td>
                      <td className="py-3 text-slate-500 max-w-xs truncate">{req.reason}</td>
                      <td className="py-3">{statusBadge(req.status)}</td>
                      <td className="py-3 text-right space-x-2">
                        {canReview && (
                          <>
                            <button
                              onClick={() => handleReview(req.id, 'APPROVED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(req.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-[11px]"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Apply for Leave</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Leave Type</label>
                <select
                  value={applyForm.leaveTypeCode}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveTypeCode: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                >
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.code}>{lt.name} ({lt.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">End Date</label>
                  <input
                    required
                    type="date"
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Reason for Absence</label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
