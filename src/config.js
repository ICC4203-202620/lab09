// Valores de compilación. Vite reemplaza import.meta.env.VITE_* durante el
// build, así que terminan dentro del bundle: aquí no va nada secreto. Las keys
// del backend (Geocoding, Translation) viven en el servidor y nunca pasan por
// este archivo.
export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

// Los Advanced Markers necesitan un Map ID. DEMO_MAP_ID sirve para desarrollo.
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// Plaza de Armas de Santiago: centro por omisión cuando no hay otra posición.
export const SANTIAGO = { lat: -33.4378, lng: -70.6505 };
