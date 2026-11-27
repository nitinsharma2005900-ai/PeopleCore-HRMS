'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Shield,
  Lock,
  Plus,
  X,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function DocumentsPage() {
  const { user, role } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('OTHER');
  const [file, setFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      setDocuments(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    formData.append('category', category);
    formData.append('employeeId', user?.employeeId || 'EMP005');
    formData.append('isConfidential', 'true');

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Document uploaded securely with SHA-256 verification hash!');
      setShowUploadModal(false);
      setTitle('');
      setFile(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchDocuments();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Deletion failed');
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const result = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(result.data);
      const link = document.createElement('a'); link.href = url; link.download = doc.fileName; link.click(); URL.revokeObjectURL(url);
    } catch { alert('Document attachment unavailable or access denied'); }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Employee Document Center
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Confidential records, verified SHA-256 integrity checksums, and RBAC storage access
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2"
        >
          <Upload size={15} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-extrabold text-[10px] uppercase">
                  {doc.category}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">{doc.title}</h3>
                <p className="text-xs text-slate-500 font-medium">{doc.fileName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Uploaded by: {doc.uploadedBy}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Lock size={11} />
                  Confidential
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleDownload(doc)}
                className="flex-1 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-xs border border-slate-200/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>View / Download</span>
              </button>
              {(role === 'HR_OFFICER' || role === 'ADMINISTRATOR') && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                  title="Delete Document"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Upload Employee Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Document Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Identity Proof / PAN Card"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                >
                  <option value="ID_PROOF">ID Proof</option>
                  <option value="OFFER_LETTER">Offer Letter</option>
                  <option value="EDUCATIONAL">Educational Degree</option>
                  <option value="TAX_RECORD">Tax Record</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="MEDICAL">Medical Record</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Select File (PDF, PNG, JPG)</label>
                <input
                  required
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Upload & Encrypt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
