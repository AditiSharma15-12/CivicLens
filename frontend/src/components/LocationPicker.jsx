import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DEFAULT_ZOOM, INDORE_AREAS, isWithinCityBounds } from '../config/location';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapClickHandler({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export default function LocationPicker({ lat, lng, onChange }) {
  const markerRef = useRef(null);
  const [selectedArea, setSelectedArea] = useState('');
  const [targetZoom, setTargetZoom] = useState(DEFAULT_ZOOM);

  // Editable local inputs for direct typing
  const [inputLat, setInputLat] = useState(lat.toString());
  const [inputLng, setInputLng] = useState(lng.toString());

  useEffect(() => {
    setInputLat(lat.toFixed(6));
    setInputLng(lng.toFixed(6));
  }, [lat, lng]);

  const handleAreaChange = (e) => {
    const areaName = e.target.value;
    setSelectedArea(areaName);
    if (!areaName) return;

    const area = INDORE_AREAS.find((a) => a.name === areaName);
    if (area) {
      setTargetZoom(15);
      onChange(area.lat, area.lng);
    }
  };

  const handleLatInputChange = (e) => {
    const val = e.target.value;
    setInputLat(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
      onChange(parsed, lng);
    }
  };

  const handleLngInputChange = (e) => {
    const val = e.target.value;
    setInputLng(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
      onChange(lat, parsed);
    }
  };

  const preventEnterSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onChange(latLng.lat, latLng.lng);
        }
      },
    }),
    [onChange]
  );

  const isInsideBounds = isWithinCityBounds(lat, lng);

  return (
    <div className="space-y-3">
      {/* Area Selection Dropdown above the map */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          Choose an area in Indore
        </label>
        <select
          value={selectedArea}
          onChange={handleAreaChange}
          onKeyDown={preventEnterSubmit}
          className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0F766E]"
        >
          <option value="">Select an area</option>
          {INDORE_AREAS.map((area) => (
            <option key={area.name} value={area.name}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      {/* Map Container */}
      <div className="h-44 w-full border border-slate-300 rounded-md overflow-hidden bg-slate-100 relative">
        <MapContainer
          center={[lat, lng]}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterController center={[lat, lng]} zoom={targetZoom} />
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[lat, lng]}
            ref={markerRef}
          />
          <MapClickHandler onChange={onChange} />
        </MapContainer>
      </div>

      {/* Warning if location is outside CITY_BOUNDS */}
      {!isInsideBounds && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
          Warning: Selected coordinates are outside the standard Indore municipal boundary limits.
        </div>
      )}

      {/* Editable Latitude and Longitude Fields */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 border border-slate-300 rounded-md p-2">
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={inputLat}
            onChange={handleLatInputChange}
            onKeyDown={preventEnterSubmit}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F766E]"
          />
        </div>
        <div className="bg-slate-50 border border-slate-300 rounded-md p-2">
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={inputLng}
            onChange={handleLngInputChange}
            onKeyDown={preventEnterSubmit}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F766E]"
          />
        </div>
      </div>
    </div>
  );
}
