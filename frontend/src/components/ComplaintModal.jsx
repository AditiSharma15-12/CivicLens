import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Mail, Loader, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../api/client';

export default function ComplaintModal({ issue, onClose }) {
  const [complaintText, setComplaintText] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!issue) return;
    fetchComplaint();
  }, [issue]);

  const fetchComplaint = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getIssueComplaint(issue.id);
      setComplaintText(res.complaint_text);
      setDepartment(res.department);
    } catch (err) {
      console.error('Failed to generate complaint:', err);
      setError('Failed to generate complaint document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!complaintText) return;
    navigator.clipboard.writeText(complaintText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!complaintText) return;
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      // Split text to fit within A4 width margins
      const splitLines = doc.splitTextToSize(complaintText, 180);
      
      let y = 15;
      const pageHeight = doc.internal.pageSize.height;
      
      for (let i = 0; i < splitLines.length; i++) {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
        doc.text(splitLines[i], 15, y);
        y += 5;
      }

      doc.save(`CivicLens_Complaint_Ticket_${issue.id}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  const handleSendEmail = () => {
    if (!complaintText) return;
    const subject = encodeURIComponent(`Official Infrastructure Defect Complaint - Ticket #${issue.id}`);
    const body = encodeURIComponent(complaintText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!issue) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-md shadow-xl z-10 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Municipal Complaint Document
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Ticket #{issue.id} &bull; {department || issue.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader className="w-6 h-6 animate-spin text-[#0F766E]" />
              <span className="text-xs font-medium">Generating official complaint document...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {!loading && !error && complaintText && (
            <div className="bg-slate-50 border border-slate-300 rounded-md p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
              {complaintText}
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        {!loading && !error && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Department: <span className="font-semibold text-slate-700">{department || issue.department}</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={handleSendEmail}
                className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send by email</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
