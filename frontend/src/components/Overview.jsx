import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

function PriorityBadge({ priority }) {
  const styles = {
    High: 'bg-red-100 text-red-800 border-red-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold border rounded-md ${styles[priority] || styles.Low}`}>
      {priority}
    </span>
  );
}

export default function Overview() {
  const [stats, setStats] = useState({
    total_issues: 0,
    open_issues: 0,
    resolved_issues: 0,
    overdue_issues: 0,
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [s, i] = await Promise.all([api.getStats(), api.getIssues()]);
      if (s) setStats(s);
      if (i) {
        // Filter open issues (Reported or In progress) and sort by score desc
        const openList = i
          .filter((item) => item.status !== 'Resolved' && item.status !== 'Rejected')
          .sort((a, b) => b.score - a.score);
        setRecentIssues(openList.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-600 mt-1">
            Summary of public infrastructure defect reports, priority ratings, and resolution progress.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/report"
            className="px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-medium rounded-md transition-colors"
          >
            Report a problem
          </Link>
          <Link
            to="/map"
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-medium rounded-md transition-colors"
          >
            View map
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards: Total issues, Open, Resolved, Overdue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-md">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total issues</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_issues || 0}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-md">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Open</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.open_issues || 0}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-md">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolved</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.resolved_issues || 0}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-md">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue</div>
          <div className={`text-2xl font-bold mt-1 ${stats.overdue_issues > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {stats.overdue_issues || 0}
          </div>
        </div>
      </div>

      {/* Top 5 Priority Open Issues Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-900">Highest Priority Open Issues</h2>
          <Link to="/issues" className="text-xs text-[#0F766E] hover:underline font-medium">
            View all issues
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {recentIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono">#{issue.id}</td>
                  <td className="px-4 py-3 capitalize font-medium">{issue.type}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                  <td className="px-4 py-3 font-bold">{issue.score} / 100</td>
                  <td className="px-4 py-3">{issue.department}</td>
                  <td className="px-4 py-3 font-medium">{issue.status}</td>
                </tr>
              ))}
              {recentIssues.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-500">
                    No open issues reported.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
