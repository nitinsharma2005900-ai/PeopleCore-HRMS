'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Star,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  FileCheck,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';

export default function PerformancePage() {
  const { user, role } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [rating, setRating] = useState<number>(4.5);
  const [feedback, setFeedback] = useState<string>('Exceptional ownership, proactive problem solving and leadership.');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/performance/reviews');
      setReviews(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [user]);

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    try {
      await api.put(`/performance/reviews/${selectedReview.id}`, {
        overallRating: rating,
        managerFeedback: feedback,
        status: 'REVIEWED'
      });
      alert('Performance evaluation updated successfully!');
      setSelectedReview(null);
      fetchReviews();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Performance Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Goal setting, weighted KPIs, 360 feedback, and continuous evaluation cycles
          </p>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map(rev => (
          <div
            key={rev.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase">
                    {rev.periodTitle}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {rev.employeeName} ({rev.employeeId})
                  </h3>
                  <p className="text-xs text-slate-500">{rev.designation}</p>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl font-extrabold text-sm border border-amber-200">
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  <span>{rev.overallRating ? rev.overallRating.toFixed(1) : 'Pending'}</span>
                </div>
              </div>

              {/* Goals list */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned KPI Goals</span>
                {rev.goals?.map((g: any) => (
                  <div key={g.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{g.title}</p>
                      <p className="text-[11px] text-slate-500">{g.description || 'Deliver target metrics'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white font-extrabold text-indigo-600 border border-slate-200 shadow-sm">
                      {g.weightage}%
                    </span>
                  </div>
                ))}
              </div>

              {rev.managerFeedback && (
                <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100/60 text-xs text-indigo-900 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 block">Manager Evaluation Feedback:</span>
                  <p className="italic">"{rev.managerFeedback}"</p>
                </div>
              )}
            </div>

            {(role === 'MANAGER' || role === 'HR_OFFICER' || role === 'ADMINISTRATOR') && (
              <button
                onClick={() => {
                  setSelectedReview(rev);
                  setRating(rev.overallRating || 4.5);
                  setFeedback(rev.managerFeedback || '');
                }}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                Submit / Edit Performance Evaluation
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Evaluate {selectedReview.employeeName}</h3>
              <button onClick={() => setSelectedReview(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateReview} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Overall Rating (1.0 to 5.0): <b className="text-indigo-600 text-sm">{rating.toFixed(1)}</b>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Manager Feedback & Appraisal Remarks</label>
                <textarea
                  required
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
