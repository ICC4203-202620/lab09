// Caché de la lista de lugares, en localStorage, con la estructura de
// weatherCache.js: lo último que respondió el backend y la hora en que llegó.
// Sin conexión, la pantalla de lugares muestra esa lista con su fecha. Las
// fotos las guarda el service worker (ver public/sw.js), porque son archivos.

const KEY = 'WeatherApp/Placemarks';

export function savePlacemarks(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ items, savedAt: Date.now() }));
  } catch (err) {
    console.warn('No se pudo guardar la lista de lugares en caché:', err);
  }
}

export function loadPlacemarks() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!Array.isArray(entry?.items) || typeof entry.savedAt !== 'number') return null;
    return entry;
  } catch (err) {
    console.warn('No se pudo leer la lista de lugares en caché:', err);
    return null;
  }
}
