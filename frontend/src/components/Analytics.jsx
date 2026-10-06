import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

const PRIORITY_COLORS = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#10B981',
};

const TYPE_COLOR = '#0F766E';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [areaStats, setAreaStats] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [s, a, i] = await Promise.all([
        api.getStats(),
        api.getAreaStats(),
        api.getIssues(),
      ]);
      if (s) setStats(s);
      if (a) setAreaStats(a);
      if (i) setIssues(i);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading analytics data...</div>;
  }

  // Type Chart Data
  const typeData = Object.entries(stats.by_type || {}).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
  }));

  // Priority Chart Data
  const priorityData = Object.entries(stats.by_priority || {}).map(([name, value]) => ({
    name,
    value,
    color: PRIORITY_COLORS[name] || '#64748B',
  }));

  // Issues Over Time (grouped by date over the past 30 days)
  const dateCounts = {};
  issues.forEach((issue) => {
    if (issue.created_at) {
      const dateStr = new Date(issue.created_at).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    }
  });

  const timelineData = Object.entries(dateCounts)
    .slice(-14)
    .map(([date, count]) => ({
      date,
      issues: count,
    }));

  // Calculate overall average resolution time in days from areaStats
  const resolvedAreas = areaStats.filter((a) => a.resolved_issues > 0);
  const avgFixDays =
    resolvedAreas.length > 0
      ? (
          resolvedAreas.reduce((sum, a) => sum + a.average_fix_days, 0) /
          resolvedAreas.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Performance Metrics</h1>
        <p className="text-xs text-slate-600 mt-1">
          Defect metrics grouped by type, priority tier, timeline trends, and hotspot areas in Indore.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Issues
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.total_issues}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Open Defects
          </span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">{stats.open_issues}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Overdue Count
          </span>
          <span className="text-2xl font-bold text-red-700 mt-1 block">{stats.overdue_issues}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avg Resolution Time
          </span>
          <span className="text-2xl font-bold text-teal-800 mt-1 block">{avgFixDays} <span className="text-xs font-normal text-slate-600">days</span></span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues by Type */}
        <div className="bg-white border border-slate-200 p-5 rounded-md">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
            Issues by Defect Type
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', fontSize: '12px' }} />
                <Bar dataKey="value" fill={TYPE_COLOR} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues by Priority */}
        <div className="bg-white border border-slate-200 p-5 rounded-md">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
            Issues by Priority Level
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Issues Over Time Chart */}
      <div className="bg-white border border-slate-200 p-5 rounded-md">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
          Report Activity Over Time
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', fontSize: '12px' }} />
              <Line type="monotone" dataKey="issues" stroke="#0F766E" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Hotspot Areas Grid Cell Grouping Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Top Hotspot Areas (Grid-Cell Grouping)
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Grouped by geographic clusters</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
              <tr>
                <th className="px-4 py-2.5">Hotspot Area</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Total Issues</th>
                <th className="px-4 py-2.5">Resolved Issues</th>
                <th className="px-4 py-2.5">Overdue Issues</th>
                <th className="px-4 py-2.5">Avg Resolution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {areaStats.map((area, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-slate-900">{area.area}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-600">{area.department}</td>
                  <td className="px-4 py-2.5 font-semibold">{area.total_issues}</td>
                  <td className="px-4 py-2.5 text-emerald-700 font-semibold">{area.resolved_issues}</td>
                  <td className="px-4 py-2.5 text-red-700 font-semibold">{area.overdue_issues}</td>
                  <td className="px-4 py-2.5 font-mono">{area.average_fix_days} days</td>
                </tr>
              ))}
              {areaStats.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-500">
                    No area data available.
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
