import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Search, MapPin, Filter } from 'lucide-react';
import { useIssues } from '../hooks/useIssues';
import IssueDrawer from './IssueDrawer';
import { api } from '../api/client';
import { DEFAULT_CENTER, DEFAULT_ZOOM, INDORE_AREAS } from '../config/location';

const PRIORITY_COLORS = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#10B981',
};

function getPriorityColor(priority) {
  return PRIORITY_COLORS[priority] || '#64748B';
}

function MapPanController({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
  return null;
}

function HeatmapLayer({ issues }) {
  const map = useMap();

  React.useEffect(() => {
    if (!map || !issues || issues.length === 0) return;

    const points = issues.map((issue) => [
      issue.lat,
      issue.lng,
      (issue.duplicate_count || 1) * (issue.priority === 'High' ? 1.0 : issue.priority === 'Medium' ? 0.6 : 0.3)
    ]);

    let heatLayer;
    try {
      if (L.heatLayer) {
        heatLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 15 });
        heatLayer.addTo(map);
      }
    } catch (e) {
      console.warn('Heatmap layer error:', e);
    }

    return () => {
      if (heatLayer && map) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, issues]);

  return null;
}

export default function IssueMap() {
  const [viewMode, setViewMode] = useState('markers'); // 'markers' | 'heatmap'
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [jumpArea, setJumpArea] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  const { issues, loading, refetch } = useIssues({
    type: filterType,
    priority: filterPriority,
    status: filterStatus,
  });

  const handleJumpToArea = (e) => {
    const areaName = e.target.value;
    setJumpArea(areaName);
    if (!areaName) return;
    const area = INDORE_AREAS.find((a) => a.name === areaName);
    if (area) {
      setMapCenter([area.lat, area.lng]);
    }
  };

  // Client-side text search filter
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues;
    const q = searchQuery.toLowerCase().trim();
    return issues.filter((issue) => {
      const matchId = `#${issue.id}`.includes(q) || issue.id.toString() === q;
      const matchType = issue.type?.toLowerCase().includes(q);
      const matchDesc = issue.description?.toLowerCase().includes(q);
      const matchDept = issue.department?.toLowerCase().includes(q);
      return matchId || matchType || matchDesc || matchDept;
    });
  }, [issues, searchQuery]);

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);
    if (issue.lat && issue.lng) {
      setMapCenter([issue.lat, issue.lng]);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Infrastructure Map</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Geographic view of reported defects in Indore. Circle markers are color-coded by priority and sized by report count.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Jump to Area Dropdown */}
        <select
          value={jumpArea}
          onChange={handleJumpToArea}
          className="bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0F766E]"
        >
          <option value="">Jump to area</option>
          {INDORE_AREAS.map((area) => (
            <option key={area.name} value={area.name}>
              {area.name}
            </option>
          ))}
        </select>

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

        {/* View Mode Toggle: Markers / Heatmap */}
        <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-slate-50 text-xs">
          <button
            onClick={() => setViewMode('markers')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              viewMode === 'markers'
                ? 'bg-[#0F766E] text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Markers
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              viewMode === 'heatmap'
                ? 'bg-[#0F766E] text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Heatmap
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium ml-auto">
          Showing {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      {/* Map Container */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden h-[600px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center text-xs font-semibold text-slate-600">
            Loading map data...
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapPanController center={mapCenter} />

          {viewMode === 'heatmap' ? (
            <HeatmapLayer issues={filteredIssues} />
          ) : (
            filteredIssues.map((issue) => {
              const color = getPriorityColor(issue.priority);
              const radius = 8 + Math.min((issue.duplicate_count - 1) * 3, 16);

              return (
                <CircleMarker
                  key={issue.id}
                  center={[issue.lat, issue.lng]}
                  radius={radius}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.75,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => handleSelectIssue(issue),
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-1.5 text-xs min-w-[160px]">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="font-mono font-bold text-slate-700">#{issue.id}</span>
                        <span
                          className="px-1.5 py-0.5 text-[10px] font-semibold rounded"
                          style={{ backgroundColor: `${color}20`, color: color }}
                        >
                          {issue.priority}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 capitalize">{issue.type}</div>
                      <div className="text-slate-600 text-[11px]">
                        Status: <span className="font-semibold">{issue.status}</span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Reports: <span className="font-semibold">{issue.duplicate_count}</span>
                      </div>
                      <button
                        onClick={() => handleSelectIssue(issue)}
                        className="w-full mt-2 py-1 bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold rounded text-[11px] transition-colors"
                      >
                        View details
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
          )}
        </MapContainer>

        {filteredIssues.length === 0 && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white border border-slate-300 rounded-md px-4 py-2 shadow-sm z-[400] text-xs text-slate-700 font-medium">
            No infrastructure defects match the selected filters.
          </div>
        )}
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
