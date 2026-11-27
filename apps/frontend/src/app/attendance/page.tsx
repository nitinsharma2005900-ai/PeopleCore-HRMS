'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Shield,
  ArrowRight,
  X,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function AttendancePage() {
  const { user, role } = useAuth();
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM'>('MY');
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [correctionForm, setCorrectionForm] = useState<any>({
    date: new Date().toISOString().slice(0, 10),
    proposedCheckIn: '2026-11-26T09:00:00Z',
    proposedCheckOut: '2026-11-26T18:00:00Z',
    reason: 'Biometric fingerprint scanner reader was offline.'
  });

  const empId = user?.employeeId || 'EMP005';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [myRes, teamRes, corrRes] = await Promise.all([
        api.get(`/attendance/my?employeeId=${empId}&month=11&year=2026`),
        (role === 'MANAGER' || role === 'HR_OFFICER' || role === 'ADMINISTRATOR')
          ? api.get('/attendance/team')
          : Promise.resolve({ data: { data: null } }),
        api.get('/attendance/corrections').catch(() => ({ data: { data: [] } }))
      ]);
      setAttendanceData(myRes.data.data);
      setTeamData(teamRes.data?.data);
      setCorrections(corrRes.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handlePunch = async (action: 'check-in' | 'check-out') => {
    try {
      await api.post(`/attendance/${action}`, { employeeId: empId });
      alert(`Attendance ${action} recorded successfully!`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || `Failed to record ${action}`);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/attendance/correction', {
        employeeId: empId,
        ...correctionForm
      });
      alert('Correction request submitted to reporting manager for approval.');
      setShowCorrectionModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit correction');
    }
  };

  const handleReviewCorrection = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/attendance/correction/${id}/review`, {
        action,
        comments: 'Reviewed and updated by manager'
      });
      alert(`Correction ${action.toLowerCase()} successfully`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Review failed');
    }
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'PRESENT':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">PRESENT</span>;
      case 'LATE':
        return <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px]">LATE</span>;
      case 'HALF_DAY':
        return <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">HALF DAY</span>;
      case 'ON_LEAVE':
        return <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">LEAVE</span>;
      case 'WEEKLY_OFF':
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold text-[10px]">WEEKLY OFF</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px]">ABSENT</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance & Shifts
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Time tracking, shift assignments, and manager correction workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCorrectionModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm flex items-center gap-2"
          >
            <FileEdit size={15} />
            <span>Request Correction</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePunch('check-in')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              Punch In
            </button>
            <button
              onClick={() => handlePunch('check-out')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md"
            >
              Punch Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {(role === 'MANAGER' || role === 'HR_OFFICER' || role === 'ADMINISTRATOR') && (
        <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('MY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'MY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Monthly Timesheet
          </button>
          <button
            onClick={() => setActiveTab('TEAM')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'TEAM' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Team Attendance & Approvals
          </button>
        </div>
      )}

      {/* Summary Stats Cards */}
      {attendanceData?.summary && activeTab === 'MY' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Working Days</span>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{attendanceData.summary.totalDays}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Present</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{attendanceData.summary.presentCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold text-amber-600 uppercase">Late Days</span>
            <p className="text-xl font-extrabold text-amber-600 mt-0.5">{attendanceData.summary.lateCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold text-purple-600 uppercase">Paid Leaves</span>
            <p className="text-xl font-extrabold text-purple-600 mt-0.5">{attendanceData.summary.leaveCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold text-rose-600 uppercase">Absent</span>
            <p className="text-xl font-extrabold text-rose-600 mt-0.5">{attendanceData.summary.absentCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold text-indigo-600 uppercase">Overtime (Hrs)</span>
            <p className="text-xl font-extrabold text-indigo-600 mt-0.5">{attendanceData.summary.overtimeHours}h</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'MY' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">November 2026 Monthly Calendar</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">General Shift (09:00 - 18:00)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Check In</th>
                  <th className="pb-3">Check Out</th>
                  <th className="pb-3">Total Worked</th>
                  <th className="pb-3">Late Mins</th>
                  <th className="pb-3">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceData?.events?.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 font-bold text-slate-800">{formatDate(ev.date)}</td>
                    <td className="py-2.5">{statusBadge(ev.status)}</td>
                    <td className="py-2.5 text-slate-600">{ev.checkInTime ? ev.checkInTime.slice(11, 16) : '-'}</td>
                    <td className="py-2.5 text-slate-600">{ev.checkOutTime ? ev.checkOutTime.slice(11, 16) : '-'}</td>
                    <td className="py-2.5 font-medium text-slate-800">
                      {ev.totalWorkMinutes > 0 ? `${Math.floor(ev.totalWorkMinutes / 60)}h ${ev.totalWorkMinutes % 60}m` : '-'}
                    </td>
                    <td className="py-2.5 text-slate-600">{ev.lateMinutes > 0 ? `${ev.lateMinutes}m` : '-'}</td>
                    <td className="py-2.5 text-slate-600">{ev.overtimeMinutes > 0 ? `${ev.overtimeMinutes}m` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Attendance Correction Requests */}
          {corrections.filter(c => c.status === 'PENDING').length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Pending Attendance Correction Requests
                </h4>
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                  {corrections.filter(c => c.status === 'PENDING').length} Action Required
                </span>
              </div>
              <div className="space-y-2">
                {corrections.filter(c => c.status === 'PENDING').map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.employeeId}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-slate-700">{formatDate(c.date)}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Proposed: {c.proposedCheckIn ? c.proposedCheckIn.slice(11, 16) : '09:00'} to {c.proposedCheckOut ? c.proposedCheckOut.slice(11, 16) : '18:00'} • "{c.reason}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewCorrection(c.id, 'APPROVED')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewCorrection(c.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Team Attendance View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Direct Reports Attendance Log</h3>
              <p className="text-xs text-slate-500">Live roster for {teamData?.date || 'Today'}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              {teamData?.presentToday || 0} / {teamData?.teamSize || 0} Present Today
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-3">Subordinate</th>
                  <th className="pb-3">Designation</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Check In</th>
                  <th className="pb-3">Check Out</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamData?.team?.map((member: any) => (
                  <tr key={member.employeeId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-bold text-slate-800">
                      {member.name} ({member.employeeId})
                    </td>
                    <td className="py-3 text-slate-600">{member.designation}</td>
                    <td className="py-3">{statusBadge(member.status)}</td>
                    <td className="py-3 text-slate-600">{member.checkInTime ? member.checkInTime.slice(11, 16) : '-'}</td>
                    <td className="py-3 text-slate-600">{member.checkOutTime ? member.checkOutTime.slice(11, 16) : '-'}</td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] text-slate-400 font-medium">Verified Roster</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Attendance Correction Requests */}
          {corrections.filter(c => c.status === 'PENDING').length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Pending Attendance Correction Requests
                </h4>
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                  {corrections.filter(c => c.status === 'PENDING').length} Action Required
                </span>
              </div>
              <div className="space-y-2">
                {corrections.filter(c => c.status === 'PENDING').map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.employeeId}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-slate-700">{formatDate(c.date)}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Proposed: {c.proposedCheckIn ? c.proposedCheckIn.slice(11, 16) : '09:00'} to {c.proposedCheckOut ? c.proposedCheckOut.slice(11, 16) : '18:00'} • "{c.reason}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewCorrection(c.id, 'APPROVED')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewCorrection(c.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Attendance Correction Request</h3>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Date</label>
                <input
                  required
                  type="date"
                  value={correctionForm.date}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Proposed Check-In</label>
                  <input
                    type="time"
                    defaultValue="09:00"
                    onChange={(e) => setCorrectionForm({ ...correctionForm, proposedCheckIn: `${correctionForm.date}T${e.target.value}:00Z` })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Proposed Check-Out</label>
                  <input
                    type="time"
                    defaultValue="18:00"
                    onChange={(e) => setCorrectionForm({ ...correctionForm, proposedCheckOut: `${correctionForm.date}T${e.target.value}:00Z` })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Explanation Reason</label>
                <textarea
                  required
                  rows={3}
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
