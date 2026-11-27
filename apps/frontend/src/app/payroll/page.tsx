'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calculator,
  CheckCircle,
  Download,
  Eye,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Plus,
  X,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export default function PayrollPage() {
  const { user, role } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [activePeriod, setActivePeriod] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [showInitModal, setShowInitModal] = useState<boolean>(false);
  const [newPeriodMonth, setNewPeriodMonth] = useState<number>(12);
  const [newPeriodYear, setNewPeriodYear] = useState<number>(2026);

  const isPayrollStaff = role === 'PAYROLL_SPECIALIST';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [periodsRes, payslipsRes] = await Promise.all([
        api.get('/payroll/periods'),
        api.get('/payroll/payslips')
      ]);
      setPeriods(periodsRes.data.data || []);
      setPayslips(payslipsRes.data.data || []);
      if (periodsRes.data.data?.length > 0 && !activePeriod) {
        setActivePeriod(periodsRes.data.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCalculatePayroll = async () => {
    if (!activePeriod) return;
    setCalculating(true);
    try {
      const res = await api.post(`/payroll/periods/${activePeriod.id}/calculate`);
      setCalculationResult(res.data.calculationResult);
      alert(`Payroll calculation completed via Python Decimal Engine for ${res.data.totalEmployees} employees!`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleFinalizePayroll = async () => {
    if (!activePeriod) return;
    if (!confirm(`Finalize ${activePeriod.month}/${activePeriod.year} payroll? This generates immutable ReportLab PDF payslips.`)) return;

    setFinalizing(true);
    try {
      const res = await api.post(`/payroll/periods/${activePeriod.id}/finalize`);
      alert(`Payroll finalized! Generated ${res.data.totalPayslipsGenerated} verified PDF payslips.`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Finalization failed');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPayslip = async (payslipId: string) => {
    try {
      const res = await api.get(`/payroll/payslips/${payslipId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = res.headers['content-disposition']?.match(/filename="([^"\n]+)"/)?.[1] || `Payslip_${payslipId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Payslip download failed');
    }
  };

  const handlePreviewPayslip = async (payslipId: string) => {
    try {
      const res = await api.get(`/payroll/payslips/${payslipId}/preview`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Payslip preview failed');
    }
  };

  const handleExportBankFile = async (format: 'csv' | 'nacha') => {
    try {
      const res = await api.post('/payroll/export-bank-file', {
        periodLabel: `${activePeriod?.month || 11}_${activePeriod?.year || 2026}`,
        format
      }, { responseType: 'blob' });

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Simulated_Bank_Payout_${format.toUpperCase()}.${format === 'nacha' ? 'ach' : 'csv'}`;
      link.click();
    } catch (e: any) {
      alert('Bank file export failed.');
    }
  };

  const handleInitPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payroll/periods', { month: newPeriodMonth, year: newPeriodYear, totalWorkingDays: 22 });
      alert(`Payroll period ${newPeriodMonth}/${newPeriodYear} initialized`);
      setShowInitModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to initialize period');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Payroll & Payslips Engine
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Python Decimal high-precision calculations, idempotent runs, and ReportLab PDF payslip generator
          </p>
        </div>

        {isPayrollStaff && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleExportBankFile('csv')}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm flex items-center gap-2"
              title="Download CSV Bank Transfer file"
            >
              <FileSpreadsheet size={15} />
              <span>Simulated Bank CSV</span>
            </button>
            <button
              onClick={() => handleExportBankFile('nacha')}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm flex items-center gap-2"
              title="Download NACHA ACH file"
            >
              <FileCode size={15} />
              <span>NACHA ACH</span>
            </button>
            <button
              onClick={() => setShowInitModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Plus size={16} />
              <span>New Pay Period</span>
            </button>
          </div>
        )}
      </div>

      {/* Pay Period Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payroll Cycle:</span>
          <div className="flex gap-2">
            {periods.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activePeriod?.id === p.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.month}/{p.year} ({p.status})
              </button>
            ))}
          </div>
        </div>

        {isPayrollStaff && activePeriod && activePeriod.status !== 'FINALIZED' && (
          <div className="flex items-center gap-3">
            <button
              disabled={calculating}
              onClick={handleCalculatePayroll}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Calculator size={15} />
              <span>{calculating ? 'Calculating Decimal...' : 'Run Python Calculation'}</span>
            </button>
            <button
              disabled={finalizing}
              onClick={handleFinalizePayroll}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCircle size={15} />
              <span>{finalizing ? 'Generating PDFs...' : 'Finalize & Generate Payslips'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Calculation Snapshot Banner (if available) */}
      {calculationResult && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-teal-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-teal-400" />
              <h3 className="font-extrabold text-sm text-white">Live Python Decimal Engine Calculation Verified</h3>
            </div>
            <span className="text-xs font-bold text-teal-300">ROUND_HALF_UP (2 Decimals)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl">
              <span className="text-[10px] text-teal-200 font-semibold uppercase">Processed</span>
              <p className="text-2xl font-black">{calculationResult.total_processed} Emps</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl">
              <span className="text-[10px] text-teal-200 font-semibold uppercase">Total Gross</span>
              <p className="text-2xl font-black">{formatCurrency(calculationResult.total_gross)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl">
              <span className="text-[10px] text-teal-200 font-semibold uppercase">Total Deductions</span>
              <p className="text-2xl font-black">{formatCurrency(calculationResult.total_deductions)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl">
              <span className="text-[10px] text-teal-200 font-semibold uppercase">Total Net Disbursed</span>
              <p className="text-2xl font-black text-teal-300">{formatCurrency(calculationResult.total_net)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {role === 'EMPLOYEE' ? 'My Downloadable Payslips' : `Finalized Payslips Registry (${payslips.length} Available)`}
            </h3>
            <p className="text-xs text-slate-500">
              ReportLab A4 layout with SHA-256 cryptographic verification hashes
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="pb-3">Payslip Ref</th>
                <th className="pb-3">Employee</th>
                <th className="pb-3">Month/Year</th>
                <th className="pb-3">Gross Earnings</th>
                <th className="pb-3">Deductions</th>
                <th className="pb-3">Net Payable</th>
                <th className="pb-3">Verification Hash</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No finalized payslips available for this view.
                  </td>
                </tr>
              ) : (
                payslips.map(ps => (
                  <tr key={ps.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-extrabold text-indigo-700">{ps.payslipNumber}</td>
                    <td className="py-3 font-bold text-slate-800">{ps.employeeName} ({ps.employeeId})</td>
                    <td className="py-3 text-slate-600">{ps.month}/{ps.year}</td>
                    <td className="py-3 text-slate-800 font-semibold">{formatCurrency(ps.grossPay)}</td>
                    <td className="py-3 text-rose-600 font-semibold">{formatCurrency(ps.totalDeductions)}</td>
                    <td className="py-3 text-emerald-600 font-extrabold text-sm">{formatCurrency(ps.netPay)}</td>
                    <td className="py-3 font-mono text-[10px] text-slate-400 max-w-[140px] truncate" title={ps.verificationHash}>
                      {ps.verificationHash.slice(0, 16)}...
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => handlePreviewPayslip(ps.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Inline Preview PDF"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDownloadPayslip(ps.id)}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors"
                        title="Download Genuine PDF Payslip"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initialize Period Modal */}
      {showInitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Initialize New Pay Period</h3>
              <button onClick={() => setShowInitModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInitPeriod} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Month (1 - 12)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="12"
                  value={newPeriodMonth}
                  onChange={(e) => setNewPeriodMonth(parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Year</label>
                <input
                  required
                  type="number"
                  min="2025"
                  max="2030"
                  value={newPeriodYear}
                  onChange={(e) => setNewPeriodYear(parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInitModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
