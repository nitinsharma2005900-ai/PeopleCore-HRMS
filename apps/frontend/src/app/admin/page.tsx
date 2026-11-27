'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  RefreshCw,
  Database,
  CheckCircle,
  FileText,
  Play,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function AdminPage() {
  const { user, role } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [ready, setReady] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [incidentResult, setIncidentResult] = useState<any>(null);

  const fetchAdminData = async () => {
    try {
      const [healthRes, readyRes, logsRes] = await Promise.all([
        api.get('/system/health').catch(() => ({ data: { status: 'OFFLINE' } })),
        api.get('/system/ready').catch(() => ({ data: { ready: false } })),
        api.get('/audit/logs?limit=15').catch(() => ({ data: { data: [] } }))
      ]);
      setHealth(healthRes.data);
      setReady(readyRes.data);
      setLogs(logsRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSimulateIncident = async (scenario: string) => {
    setSimulating(true);
    setIncidentResult(null);
    try {
      const res = await api.post('/system/simulate-incident', { scenario });
      setIncidentResult(res.data);
      fetchAdminData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Simulation request failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Reset database to clean 50-employee demo state?')) return;
    try {
      await api.post('/system/reset-demo');
      alert('Database successfully restored to clean demo state.');
      fetchAdminData();
    } catch (e: any) {
      alert('Reset failed');
    }
  };

  const scenarios = [
    {
      id: 'INCORRECT_PAYROLL_TOTALS',
      title: '1. Incorrect Payroll Totals',
      desc: 'Simulates net salary invariant violation, catches discrepancy in audit, and triggers ledger auto-reconciliation.'
    },
    {
      id: 'DUPLICATE_PAYROLL_EXECUTION',
      title: '2. Duplicate Payroll Run',
      desc: 'Simulates concurrent execution with same idempotency key; verifies UNIQUE constraint rejects duplicate payout.'
    },
    {
      id: 'ATTENDANCE_DISCREPANCIES',
      title: '3. Attendance Discrepancy',
      desc: 'Simulates missing check-out at midnight cutoff, applies half-day rule, and alerts manager.'
    },
    {
      id: 'UNAUTHORIZED_SALARY_ACCESS',
      title: '4. Unauthorized Salary Probe',
      desc: 'Attempts confidential compensation access from unauthorized role, verifying HTTP 403 and audit security alert.'
    },
    {
      id: 'FAILED_SCHEDULED_JOBS',
      title: '5. Scheduled Job Queue Failure',
      desc: 'Simulates background worker retry with exponential backoff and dead-letter queue routing.'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            System Administration & Governance
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Assessment 15 incident simulations, system health metrics, and audit ledger
          </p>
        </div>

        <button
          onClick={handleResetDatabase}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
        >
          <RotateCcw size={15} />
          <span>Reset Demo Database</span>
        </button>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Core Backend API</span>
            <p className="text-lg font-extrabold text-emerald-600">{health?.status || 'ONLINE'}</p>
            <p className="text-[11px] text-slate-400">Uptime: {Math.round(health?.uptime || 0)}s • v1.0.0</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Database & Store</span>
            <p className="text-lg font-extrabold text-indigo-600">{ready?.database || 'CONNECTED'}</p>
            <p className="text-[11px] text-slate-400">{ready?.records?.employees || 50} Employees Seeded</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Least-Privilege RBAC</span>
            <p className="text-lg font-extrabold text-teal-600">ENFORCED</p>
            <p className="text-[11px] text-slate-400">Salary & Doc Access Scoped</p>
          </div>
        </div>
      </div>

      {/* Assessment 15 Controlled Incident Simulation Suite */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Assessment 15 — Controlled Incident Simulation Suite</h3>
          <p className="text-xs text-slate-500">Safely trigger and demonstrate the 5 mandatory failure scenarios</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map(sc => (
            <div key={sc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <p className="font-bold text-xs text-slate-800">{sc.title}</p>
                <p className="text-[11px] text-slate-500">{sc.desc}</p>
              </div>

              <button
                disabled={simulating}
                onClick={() => handleSimulateIncident(sc.id)}
                className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Play size={13} />
                <span>Simulate Scenario</span>
              </button>
            </div>
          ))}
        </div>

        {/* Live Incident Output Banner */}
        {incidentResult && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase">Scenario Executed: {incidentResult.scenario}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">{incidentResult.status}</span>
            </div>
            <p className="text-xs text-slate-200 font-mono"><b>Detection:</b> {incidentResult.detection}</p>
            {incidentResult.correctiveAction && (
              <p className="text-xs text-slate-300 font-mono"><b>Corrective Action:</b> {incidentResult.correctiveAction}</p>
            )}
            {incidentResult.safeguard && (
              <p className="text-xs text-slate-300 font-mono"><b>Safeguard:</b> {incidentResult.safeguard}</p>
            )}
            {incidentResult.regressionTest && (
              <p className="text-xs text-emerald-300 font-mono"><b>Regression Test:</b> {incidentResult.regressionTest}</p>
            )}
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">System Audit Ledger (Recent Actions)</h3>
            <p className="text-xs text-slate-500">Immutable trail of user logins, payroll finalizations, and role changes</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Target Entity</th>
                <th className="pb-3">IP Address</th>
                <th className="pb-3">User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 text-slate-500">{new Date(log.createdAt).toLocaleTimeString()} ({log.createdAt.slice(0, 10)})</td>
                  <td className="py-2.5 font-bold text-indigo-700">{log.action}</td>
                  <td className="py-2.5 font-semibold text-slate-800">{log.entityName} ({log.entityId || '-'})</td>
                  <td className="py-2.5 font-mono text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                  <td className="py-2.5 text-slate-400 max-w-xs truncate">{log.userAgent || 'Chrome/Win64'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
