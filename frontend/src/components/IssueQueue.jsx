import React, { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { useIssues } from '../hooks/useIssues';
import { api, UPLOADS_BASE_URL } from '../api/client';
import IssueDrawer from './IssueDrawer';

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

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const created = new Date(dateStr);
  const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const PRIORITY_WEIGHT = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export default function IssueQueue() {
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);

  const { issues, loading, refetch } = useIssues({
    type: filterType,
    priority: filterPriority,
    status: filterStatus,
  });

  // Client-side text search & sorting (High > Medium > Low, then oldest first)
  const sortedAndFilteredIssues = useMemo(() => {
    let list = [...issues];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((issue) => {
        const matchId = `#${issue.id}`.includes(q) || issue.id.toString() === q;
        const matchType = issue.type?.toLowerCase().includes(q);
        const matchDesc = issue.description?.toLowerCase().includes(q);
        const matchDept = issue.department?.toLowerCase().includes(q);
        return matchId || matchType || matchDesc || matchDept;
      });
    }

    // Default sort: priority (High > Medium > Low) then oldest first (created_at asc)
    list.sort((a, b) => {
      const weightA = PRIORITY_WEIGHT[a.priority] || 0;
      const weightB = PRIORITY_WEIGHT[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;

      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    });

    return list;
  }, [issues, searchQuery]);

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      const updated = await api.updateIssueStatus(issueId, { status: newStatus });
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(updated);
      }
      refetch(true);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Issues Management</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Filter, monitor status, inspect details, and track accountability for infrastructure defects.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticket ID, type, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-[#0F766E]"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0F766E]"
        >
          <option value="">All Types</option>
          <option value="pothole">Pothole</option>
          <option value="crack">Crack</option>
          <option value="drain">Drain</option>
          <option value="garbage">Garbage</option>
          <option value="streetlight">Streetlight</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0F766E]"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0F766E]"
        >
          <option value="">All Statuses</option>
          <option value="Reported">Reported</option>
          <option value="In progress">In progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <span className="text-xs text-slate-500 font-medium ml-auto">
          Showing {sortedAndFilteredIssues.length} {sortedAndFilteredIssues.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      {/* Issues Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Type & Badges</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Reports</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {loading && issues.length === 0 ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="w-14 h-14 bg-slate-200 rounded-md" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-24 mb-1" />
                      <div className="h-3 bg-slate-200 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded w-12" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-8" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-12" />
                    </td>
                  </tr>
                ))
              ) : (
                sortedAndFilteredIssues.map((issue) => {
                  const thumbUrl = issue.image_path.startsWith('http')
                    ? issue.image_path
                    : `${UPLOADS_BASE_URL}${issue.image_path}`;

                  return (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* Photo Thumbnail */}
                      <td className="px-4 py-3">
                        <img
                          src={thumbUrl}
                          alt={`Thumbnail for issue #${issue.id}`}
                          className="w-14 h-14 object-cover rounded-md border border-slate-200 bg-slate-100"
                        />
                      </td>

                      {/* Type & Badges */}
                      <td className="px-4 py-3 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-400 text-[11px]">#{issue.id}</span>
                          <span className="font-bold text-slate-900 capitalize">{issue.type}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          {issue.is_overdue && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200 rounded-md">
                              Overdue, {issue.days_overdue} {issue.days_overdue === 1 ? 'day' : 'days'}
                            </span>
                          )}
                          {issue.repeat_issue && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 rounded-md">
                              Repeat issue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <PriorityBadge priority={issue.priority} />
                      </td>

                      {/* Reports count */}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {issue.duplicate_count}
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={issue.status}
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0F766E]"
                        >
                          <option value="Reported">Reported</option>
                          <option value="In progress">In progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                      {/* Due Date */}
                      <td className={`px-4 py-3 font-medium ${issue.is_overdue ? 'text-red-700 font-semibold' : 'text-slate-700'}`}>
                        {formatDate(issue.due_at)}
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3 text-slate-500 font-medium">
                        {getRelativeTime(issue.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}

              {sortedAndFilteredIssues.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-slate-500 text-xs font-medium">
                    No infrastructure defects match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
