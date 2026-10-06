import React, { useState, useRef } from 'react';
import { X, FileText, CheckCircle, RefreshCw, AlertCircle, Image as ImageIcon, Upload } from 'lucide-react';
import { api, UPLOADS_BASE_URL } from '../api/client';
import BBoxOverlay from './BBoxOverlay';
import ScoreBreakdown from './ScoreBreakdown';
import ComplaintModal from './ComplaintModal';

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

export default function IssueDrawer({ issue, onClose, onStatusChange }) {
  const [currentIssue, setCurrentIssue] = useState(issue);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  if (!currentIssue) return null;

  const fullImageUrl = currentIssue.image_path.startsWith('http')
    ? currentIssue.image_path
    : `${UPLOADS_BASE_URL}${currentIssue.image_path}`;

  const detections = currentIssue.bbox
    ? [{ type: currentIssue.type, confidence: currentIssue.confidence, bbox: currentIssue.bbox }]
    : [];

  const handleFixFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('after_image', file);

      const updated = await api.resolveIssue(currentIssue.id, formData);
      setCurrentIssue(updated);
      setSuccessMessage('Fix verified successfully! Issue marked as Resolved.');
      if (onStatusChange) {
        onStatusChange(currentIssue.id, 'Resolved');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Verification failed. Defect may still be present in the submitted photo.';
      setErrorMessage(detail);
      // Re-fetch issue status as backend updates it to "In progress"
      try {
        const refreshed = await api.getIssue(currentIssue.id);
        setCurrentIssue(refreshed);
        if (onStatusChange) {
          onStatusChange(currentIssue.id, refreshed.status);
        }
      } catch (fetchErr) {
        console.error(fetchErr);
      }
    } finally {
      setVerifying(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updated = await api.reopenIssue(currentIssue.id);
      setCurrentIssue(updated);
      setSuccessMessage('Ticket reopened successfully. Status updated to Reported.');
      if (onStatusChange) {
        onStatusChange(currentIssue.id, 'Reported');
      }
    } catch (err) {
      setErrorMessage('Failed to reopen ticket.');
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-lg bg-white border-l border-slate-200 shadow-xl h-full flex flex-col z-10 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold text-slate-500">Ticket #{currentIssue.id}</span>
              <PriorityBadge priority={currentIssue.priority} />
              {currentIssue.is_overdue && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 border border-red-200 rounded-md">
                  Overdue, {currentIssue.days_overdue} {currentIssue.days_overdue === 1 ? 'day' : 'days'}
                </span>
              )}
              {currentIssue.repeat_issue && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 rounded-md">
                  Repeat issue
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 capitalize">{currentIssue.type} Defect</h2>
            <div className="text-xs text-slate-600">{currentIssue.department}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Notification Banners */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Main Photo / Before & After Comparison */}
          {currentIssue.resolved_image_path ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Before & After Verification Comparison
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 border border-slate-200 rounded-md p-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase px-1 block mb-1">Before (Report)</span>
                  <BBoxOverlay
                    src={fullImageUrl}
                    alt={`Initial report #${currentIssue.id}`}
                    detections={detections}
                    imageWidth={currentIssue.image_width}
                    imageHeight={currentIssue.image_height}
                    className="max-h-48 object-contain"
                  />
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-md p-1 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase px-1 block mb-1">After (Resolved Proof)</span>
                  <img
                    src={currentIssue.resolved_image_path.startsWith('http') ? currentIssue.resolved_image_path : `${UPLOADS_BASE_URL}${currentIssue.resolved_image_path}`}
                    alt="Resolution proof"
                    className="max-h-48 object-contain rounded border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Report Photo with Detection
              </label>
              <div className="bg-slate-100 border border-slate-200 rounded-md overflow-hidden p-1 flex items-center justify-center min-h-[200px]">
                <BBoxOverlay
                  src={fullImageUrl}
                  alt={`Photo for issue #${currentIssue.id}`}
                  detections={detections}
                  imageWidth={currentIssue.image_width}
                  imageHeight={currentIssue.image_height}
                  className="max-h-72 object-contain"
                />
              </div>
            </div>
          )}

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
              <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Status</span>
              {onStatusChange ? (
                <select
                  value={currentIssue.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      const updated = await api.updateIssueStatus(currentIssue.id, { status: newStatus });
                      setCurrentIssue(updated);
                      onStatusChange(currentIssue.id, newStatus);
                    } catch (err) {
                      setErrorMessage('Failed to update status.');
                    }
                  }}
                  className="mt-1 font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="Reported">Reported</option>
                  <option value="In progress">In progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              ) : (
                <span className="font-semibold text-slate-900 mt-1 block">{currentIssue.status}</span>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
              <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Reports</span>
              <span className="font-semibold text-slate-900 mt-1 block">
                {currentIssue.duplicate_count} {currentIssue.duplicate_count === 1 ? 'report' : 'reports'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
              <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Response Due</span>
              <span className={`font-semibold mt-1 block ${currentIssue.is_overdue ? 'text-red-700 font-bold' : 'text-slate-900'}`}>
                {formatDate(currentIssue.due_at)}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
              <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Reported</span>
              <span className="font-semibold text-slate-900 mt-1 block">
                {getRelativeTime(currentIssue.created_at)} ({formatDate(currentIssue.created_at)})
              </span>
            </div>
          </div>

          {/* Description */}
          {currentIssue.description && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-1">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px] block">Description</span>
              <p className="text-slate-800 leading-relaxed">{currentIssue.description}</p>
            </div>
          )}

          {/* Repeat issue parent link */}
          {currentIssue.repeat_issue && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>Repeat Defect Identified</span>
              </div>
              <p>
                This defect reoccurred near a previously resolved site.
                {currentIssue.linked_parent_id && (
                  <span className="ml-1 font-mono font-medium underline cursor-pointer">
                    Linked to ticket #{currentIssue.linked_parent_id}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Extra photos if present */}
          {currentIssue.extra_images && currentIssue.extra_images.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-600 font-semibold uppercase tracking-wider text-[11px] block flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Additional Photos ({currentIssue.extra_images.length})
              </span>
              <div className="grid grid-cols-3 gap-2">
                {currentIssue.extra_images.map((imgUrl, i) => {
                  const url = imgUrl.startsWith('http') ? imgUrl : `${UPLOADS_BASE_URL}${imgUrl}`;
                  return (
                    <img
                      key={i}
                      src={url}
                      alt={`Extra photo ${i + 1}`}
                      className="w-full h-20 object-cover rounded border border-slate-200"
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Score Breakdown Component */}
          <div className="border border-slate-200 rounded-md p-4 bg-white space-y-3">
            <div className="text-xs text-slate-600 font-medium pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>Reports at this location: <strong className="text-slate-900">{currentIssue.duplicate_count}</strong></span>
            </div>
            <ScoreBreakdown
              score={currentIssue.score}
              priority={currentIssue.priority}
              breakdown={currentIssue.score_breakdown}
            />
          </div>

          {/* Hidden File Input for Fix Verification */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFixFileSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Actions
            </span>

            <button
              onClick={() => setShowComplaintModal(true)}
              className="w-full py-2 px-3 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Municipal Complaint Document</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={verifying}
              className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {verifying ? (
                <span>Running detection check on photo...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Submit Fix Verification Photo</span>
                </>
              )}
            </button>

            {currentIssue.status === 'Resolved' && (
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{reopening ? 'Reopening...' : 'Reopen Ticket'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Complaint Modal */}
        {showComplaintModal && (
          <ComplaintModal
            issue={currentIssue}
            onClose={() => setShowComplaintModal(false)}
          />
        )}
      </div>
    </div>
  );
}

