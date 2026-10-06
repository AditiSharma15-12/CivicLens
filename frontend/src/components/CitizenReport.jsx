import React, { useState } from 'react';
import { api } from '../api/client';
import ScoreBreakdown from './ScoreBreakdown';
import { Upload, MapPin, AlertTriangle, FileText } from 'lucide-react';
import { DEFAULT_LAT, DEFAULT_LNG } from '../config/location';


export default function CitizenReport() {
  const [formData, setFormData] = useState({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    description: ''
  });

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }));
        },
        () => {}
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an infrastructure photo.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('lat', formData.lat);
      data.append('lng', formData.lng);
      data.append('description', formData.description);
      data.append('image', file);

      const res = await api.submitReport(data);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Report a problem</h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit photos of potholes, road cracks, clogged drains, garbage, or broken streetlights for automatic detection.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Photo Upload
              </label>
              <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-md p-4 text-center bg-slate-50 cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded object-cover" />
                ) : (
                  <div className="py-4 space-y-1">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <span className="text-xs text-slate-600 block font-medium">Select photo file</span>
                    <span className="text-[10px] text-slate-400 block">JPG or PNG</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Location Coordinates
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-xs text-[#0F766E] hover:underline flex items-center space-x-1"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Use current location</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  placeholder="Latitude"
                  className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F766E]"
                  required
                />
                <input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                  placeholder="Longitude"
                  className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F766E]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional notes about the defect..."
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F766E]"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Running automatic detection...' : 'Submit Report'}
            </button>
          </form>
        </div>

        {/* Detection Output Result */}
        <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-col">
          <h2 className="text-xs font-semibold uppercase text-slate-600 mb-3 border-b border-slate-200 pb-2">
            Automatic Detection & Priority Evaluation
          </h2>

          {result ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {result.merged_duplicate && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium">
                  This issue was already reported. We added your report as +1 (now {result.issue?.duplicate_count} reports).
                </div>
              )}

              {result.detected && result.issue ? (
                <div className="space-y-3">
                  <ScoreBreakdown
                    score={result.issue.score}
                    priority={result.issue.priority}
                    breakdown={result.issue.score_breakdown}
                  />
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-xs">
                  No defect detected in the uploaded photo above confidence threshold.
                </div>
              )}

              <button
                onClick={() => setResult(null)}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors mt-auto"
              >
                Submit another report
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-md text-slate-400 space-y-2">
              <FileText className="w-8 h-8 stroke-1" />
              <p className="text-xs">Submit an infrastructure photo to view automatic detection results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
