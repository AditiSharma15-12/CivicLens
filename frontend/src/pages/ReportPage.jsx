import React, { useState, useCallback } from 'react';
import { Camera, MapPin, Upload, Loader } from 'lucide-react';
import { api } from '../api/client';
import LocationPicker from '../components/LocationPicker';
import ScoreBreakdown from '../components/ScoreBreakdown';
import BBoxOverlay from '../components/BBoxOverlay';
import Toast from '../components/Toast';
import { DEFAULT_LAT, DEFAULT_LNG } from '../config/location';



function PriorityBadge({ priority }) {
  const styles = {
    High: 'bg-red-100 text-red-800 border-red-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold border rounded-md ${styles[priority] || styles.Low}`}>
      {priority}
    </span>
  );
}

export default function ReportPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [locationSource, setLocationSource] = useState('manual'); // 'gps' | 'manual'
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      addToast('Please select an image file (JPG or PNG).', 'error');
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      addToast('Photo must be smaller than 20 MB.', 'error');
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser. Pin your location on the map.', 'error');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationSource('gps');
        setGpsLoading(false);
      },
      () => {
        addToast('GPS access denied or failed. Pin your location on the map.', 'error');
        setLocationSource('manual');
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleMapChange = useCallback((newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
    setLocationSource('manual');
  }, []);

  const validate = () => {
    if (!file) {
      addToast('Please attach a photo before submitting.', 'error');
      return false;
    }
    if (lat === null || lng === null) {
      addToast('Please set a location before submitting.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('lat', lat.toString());
      formData.append('lng', lng.toString());
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const res = await api.submitReport(formData);
      setResult(res);

      if (!res.detected) {
        addToast('No defect detected in the photo above the confidence threshold. Check the image quality and try again.', 'error');
      } else if (res.merged_duplicate) {
        addToast(`Report merged into existing ticket #${res.issue?.id}.`, 'success');
      } else {
        addToast(`Ticket #${res.issue?.id} created successfully.`, 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Submission failed. Please check your connection and try again.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setDescription('');
    setLat(DEFAULT_LAT);
    setLng(DEFAULT_LNG);
    setLocationSource('manual');
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Page header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Report a problem</h1>
        <p className="text-sm text-slate-600 mt-1">
          Upload a photo of a defect and set the location. Automatic detection will classify the issue and calculate a priority score.
        </p>
      </div>

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="space-y-2">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => dismissToast(t.id)} />
          ))}
        </div>
      )}

      {!result ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Photo upload */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Photo
            </label>

            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="sr-only"
              />
              {previewUrl ? (
                <div className="relative group">
                  <img
                    src={previewUrl}
                    alt="Selected photo preview"
                    className="w-full max-h-56 object-cover rounded border border-slate-200"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded text-white text-xs font-semibold">
                    <Camera className="w-5 h-5 mr-1.5" /> Change photo
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10 border border-dashed border-slate-300 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors text-slate-500 text-xs">
                  <Upload className="w-7 h-7 text-slate-400" />
                  <span className="font-medium text-slate-700">Tap to upload or capture</span>
                  <span className="text-slate-400">JPG or PNG, max 20 MB</span>
                </div>
              )}
            </label>

            {previewUrl && (
              <p className="text-[11px] text-slate-500 font-medium">
                {file?.name} ({(file?.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {/* Location */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Location
              </label>
              <button
                type="button"
                onClick={handleGPS}
                disabled={gpsLoading}
                className="flex items-center space-x-1.5 text-xs font-medium text-[#0F766E] hover:text-[#115E59] disabled:opacity-50 transition-colors"
              >
                {gpsLoading ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
                <span>{gpsLoading ? 'Getting location...' : 'Use my current location'}</span>
              </button>
            </div>

            <LocationPicker lat={lat} lng={lng} onChange={handleMapChange} />

            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
                <span className="text-[11px] text-slate-500 block font-medium uppercase tracking-wider">Latitude</span>
                <span className="font-mono text-xs text-slate-900">{lat.toFixed(6)}</span>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
                <span className="text-[11px] text-slate-500 block font-medium uppercase tracking-wider">Longitude</span>
                <span className="font-mono text-xs text-slate-900">{lng.toFixed(6)}</span>
              </div>
              <div className="flex-shrink-0 text-[11px] text-slate-500">
                {locationSource === 'gps' ? (
                  <span className="text-emerald-700 font-semibold">GPS</span>
                ) : (
                  <span>Manual pin</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Description (optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Add any useful context about the defect, hazard level, or nearby landmarks..."
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0F766E] resize-none"
            />
            <p className="text-[11px] text-slate-400 text-right">{description.length}/500</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-2.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Running automatic detection...</span>
              </>
            ) : (
              'Submit report'
            )}
          </button>
        </form>
      ) : (
        /* Result card */
        <div className="space-y-4">
          {/* Merge banner */}
          {result.merged_duplicate && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium">
              Already reported here. Reports: {result.duplicate_count || result.issue?.duplicate_count}. Score changed from {(result.previous_score ?? result.issue?.score)?.toFixed(1)} to {(result.new_score ?? result.issue?.score)?.toFixed(1)}.
              {result.previous_priority && result.new_priority && result.previous_priority !== result.new_priority && (
                <span> Priority changed from {result.previous_priority} to {result.new_priority}.</span>
              )}
            </div>
          )}

          {result.detected && result.issue ? (
            <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
              {/* Result header */}
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Ticket #{result.issue.id}
                  </div>
                  <div className="text-lg font-bold text-slate-900 capitalize">
                    {result.issue.type}
                  </div>
                  <div className="text-xs text-slate-600">{result.issue.department}</div>
                </div>
                <div className="text-right space-y-1.5 flex-shrink-0">
                  <PriorityBadge priority={result.issue.priority} />
                  <div className="text-xs text-slate-600">
                    Score: <span className="font-bold text-slate-900">{result.issue.score}/100</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Confidence: <span className="font-semibold">{(result.issue.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Preview with detection bounding boxes */}
              {previewUrl && (
                <div className="p-4">
                  <BBoxOverlay
                    src={previewUrl}
                    alt="Submitted report photo with detections"
                    detections={result.detections || []}
                    imageWidth={result.image_width}
                    imageHeight={result.image_height}
                    className="max-h-64 overflow-hidden rounded border border-slate-200"
                  />
                </div>
              )}

              {/* Score breakdown */}
              <div className="p-4">
                <ScoreBreakdown
                  score={result.issue.score}
                  priority={result.issue.priority}
                  breakdown={result.issue.score_breakdown}
                />
              </div>

              {/* Accountability due date */}
              <div className="p-4 text-xs text-slate-600">
                Response due by:{' '}
                <span className="font-semibold text-slate-900">
                  {new Date(result.issue.due_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-md p-6 text-center text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">No defect detected</p>
              <p>Automatic detection found no known issue type above the confidence threshold. Try a clearer, closer photo.</p>
            </div>
          )}

          <button
            type="button"
            onClick={resetForm}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors border border-slate-200"
          >
            Submit another report
          </button>
        </div>
      )}
    </div>
  );
}
