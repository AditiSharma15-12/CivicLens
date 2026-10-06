// Central location config. All maps and location pickers read from here.
// Indore, Madhya Pradesh, India.
export const DEFAULT_LAT = 22.7196;
export const DEFAULT_LNG = 75.8577;

// Leaflet-style [lat, lng] tuple for MapContainer center prop.
export const DEFAULT_CENTER = [DEFAULT_LAT, DEFAULT_LNG];

// Default zoom level for city-scale view.
export const DEFAULT_ZOOM = 13;

// City boundary limits for Indore (lat 22.60 to 22.85, lng 75.70 to 76.00)
export const CITY_BOUNDS = {
  minLat: 22.60,
  maxLat: 22.85,
  minLng: 75.70,
  maxLng: 76.00,
};

export const isWithinCityBounds = (lat, lng) => {
  return (
    lat >= CITY_BOUNDS.minLat &&
    lat <= CITY_BOUNDS.maxLat &&
    lng >= CITY_BOUNDS.minLng &&
    lng <= CITY_BOUNDS.maxLng
  );
};

export const INDORE_AREAS = [
  { name: 'Rajwada', lat: 22.7185, lng: 75.8553 },
  { name: 'Sarafa Bazaar', lat: 22.7176, lng: 75.8547 },
  { name: 'Palasia', lat: 22.7244, lng: 75.8839 },
  { name: 'Vijay Nagar', lat: 22.7533, lng: 75.8937 },
  { name: 'Bhawarkua', lat: 22.6908, lng: 75.8573 },
  { name: 'Geeta Bhawan', lat: 22.7193, lng: 75.8710 },
  { name: 'Indore Junction Railway Station', lat: 22.7188, lng: 75.8680 },
  { name: 'Sapna Sangeeta', lat: 22.7216, lng: 75.8730 },
  { name: 'Khajrana', lat: 22.7412, lng: 75.9021 },
  { name: 'Annapurna', lat: 22.6990, lng: 75.8330 },
  { name: 'Rau', lat: 22.6350, lng: 75.8000 },
  { name: 'Devi Ahilya Bai Holkar Airport', lat: 22.7218, lng: 75.8011 },
];
