'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit2,
  Building,
  Mail,
  Phone,
  Calendar,
  X,
  Check,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function EmployeesPage() {
  const { user, role } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 });
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEmp, setNewEmp] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    departmentId: 'dept-eng',
    designation: 'Software Engineer',
    employmentStatus: 'ACTIVE',
    baseSalaryMonthly: '60000',
    phone: '+91 98765 43210'
  });

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees', {
        params: {
          search,
          departmentId: deptFilter || undefined,
          employmentStatus: statusFilter || undefined,
          page,
          limit: 12
        }
      });
      setEmployees(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, deptFilter, statusFilter, page]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data.data)).catch(() => {});
  }, []);

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/employees/export/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PeopleCore_Employees_Export.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.response?.data?.error || 'CSV Export failed');
    }
  };

  const handleViewProfile = async (id: string) => {
    try {
      const res = await api.get(`/employees/${id}`);
      setSelectedEmp(res.data.data);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Could not fetch employee profile');
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/employees', newEmp);
      setShowAddModal(false);
      setNewEmp({
        firstName: '',
        lastName: '',
        email: '',
        departmentId: 'dept-eng',
        designation: 'Software Engineer',
        employmentStatus: 'ACTIVE',
        baseSalaryMonthly: '60000',
        phone: '+91 98765 43210'
      });
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add employee');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Employee Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage personnel lifecycle, departments, and reporting relationships
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
            title="Export CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          {(role === 'HR_OFFICER' || role === 'ADMINISTRATOR') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              <Plus size={16} />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, EMP ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium outline-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ONBOARDING">Onboarding</option>
            <option value="NOTICE_PERIOD">Notice Period</option>
            <option value="RESIGNED">Resigned</option>
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {employees.map(emp => (
          <div
            key={emp.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow">
                  {emp.firstName?.[0] || 'E'}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    emp.employmentStatus === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : emp.employmentStatus === 'ONBOARDING'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {emp.employmentStatus}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                <p className="text-xs font-semibold text-indigo-600">{emp.designation}</p>
                <p className="text-[11px] text-slate-400 font-medium">{emp.employeeId} • {emp.department}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  <span>{emp.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleViewProfile(emp.employeeId)}
              className="mt-4 w-full py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-xs border border-slate-200/80 transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye size={14} />
              <span>View Profile</span>
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
        <span>Showing {employees.length} of {meta.total} employees</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-bold"
          >
            Previous
          </button>
          <span className="font-bold text-slate-700">Page {page} of {meta.totalPages || 1}</span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-bold"
          >
            Next
          </button>
        </div>
      </div>

      {/* Employee Profile Drawer / Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow">
                  {selectedEmp.firstName?.[0] || 'E'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedEmp.firstName} {selectedEmp.lastName}</h3>
                  <p className="text-xs text-indigo-600 font-semibold">{selectedEmp.designation} • {selectedEmp.employeeId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                <p className="font-bold text-slate-800">{selectedEmp.departmentName}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                <p className="font-bold text-slate-800">{selectedEmp.employmentStatus}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Joining Date</span>
                <p className="font-bold text-slate-800">{formatDate(selectedEmp.joiningDate)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Reporting Manager</span>
                <p className="font-bold text-slate-800">{selectedEmp.reportingManagerName || 'None'}</p>
              </div>
            </div>

            {/* Confidential Salary Section with Least-Privilege Policy */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Compensation Profile</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Least-Privilege RBAC</span>
              </div>

              {selectedEmp.salaryProfile?.restricted ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                  <ShieldAlert size={14} className="shrink-0 text-amber-600" />
                  <span>{selectedEmp.salaryProfile.reason}</span>
                </div>
              ) : selectedEmp.salaryProfile ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400">Base Monthly</span>
                    <p className="font-bold text-slate-900">₹{selectedEmp.salaryProfile.baseSalaryMonthly}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400">HRA Monthly</span>
                    <p className="font-bold text-slate-900">₹{selectedEmp.salaryProfile.hraMonthly}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400">TDS Rate</span>
                    <p className="font-bold text-slate-900">{selectedEmp.salaryProfile.tdsPercentage}%</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No salary profile found.</p>
              )}
            </div>

            <button
              onClick={() => setSelectedEmp(null)}
              className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">First Name</label>
                  <input
                    required
                    type="text"
                    value={newEmp.firstName}
                    onChange={(e) => setNewEmp({ ...newEmp, firstName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Last Name</label>
                  <input
                    required
                    type="text"
                    value={newEmp.lastName}
                    onChange={(e) => setNewEmp({ ...newEmp, lastName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  placeholder="first.last@peoplecore.local"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Department</label>
                  <select
                    value={newEmp.departmentId}
                    onChange={(e) => setNewEmp({ ...newEmp, departmentId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Designation</label>
                  <input
                    required
                    type="text"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({ ...newEmp, designation: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Base Monthly Salary (₹)</label>
                <input
                  required
                  type="number"
                  value={newEmp.baseSalaryMonthly}
                  onChange={(e) => setNewEmp({ ...newEmp, baseSalaryMonthly: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
