// Del punto tocado a la ciudad más cercana, con el Geocoder de Maps JS.
//
// Un reverse geocoding de unas coordenadas devuelve varios resultados, del más
// específico al más general: la dirección exacta, la calle, el barrio, la
// comuna, la región, el país. Para buscar el clima nos sirve el nivel
// "ciudad", de modo que el texto que armamos ("Valparaíso, Región de
// Valparaíso, CL") lo entienda la geocodificación de Open-Meteo.

// Tipos que aceptamos como "localidad", en orden de preferencia.
const PRIORITY = ['locality', 'postal_town', 'administrative_area_level_1', 'administrative_area_level_2'];
const ALLOWED = new Set(PRIORITY);

// Tipos demasiado finos (una calle, un barrio) o que no son lugares habitados.
const BLOCKED = new Set([
  'route', 'street_address', 'intersection', 'premise', 'subpremise',
  'sublocality', 'sublocality_level_1', 'neighborhood',
  'administrative_area_level_3', 'administrative_area_level_4',
  'colloquial_area', 'ward', 'park', 'point_of_interest', 'plus_code',
]);

const rank = (result) =>
  (result.types ?? []).reduce((best, type) => {
    const index = PRIORITY.indexOf(type);
    return index === -1 ? best : Math.min(best, index);
  }, Infinity);

export const formatCoords = ({ lat, lng }) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

// Devuelve { position, label, parts } o null si no hay nada parecido a una
// localidad cerca (en medio del mar, por ejemplo). `geocoder` es una instancia
// de google.maps.Geocoder; `latLng`, un { lat, lng }.
export async function snapToNearestLocality(geocoder, latLng) {
  const { results } = await geocoder.geocode({ location: latLng });
  if (!results?.length) return null;

  const coarse = results.filter((r) => {
    const types = r.types ?? [];
    return !types.some((t) => BLOCKED.has(t)) && types.some((t) => ALLOWED.has(t));
  });
  if (!coarse.length) return null;

  const best = [...coarse].sort((a, b) => rank(a) - rank(b))[0];

  const components = best.address_components ?? [];
  const get = (type) => components.find((c) => c.types.includes(type));
  const city = get('locality')?.long_name ?? get('postal_town')?.long_name ?? null;
  const admin1 = get('administrative_area_level_1')?.short_name ?? null;
  const admin2 = get('administrative_area_level_2')?.long_name ?? null;
  const country = get('country')?.short_name ?? '';

  let label;
  if (city) label = admin1 ? `${city}, ${admin1}, ${country}` : `${city}, ${country}`;
  else if (admin1) label = `${admin1}, ${country}`;
  else if (admin2) label = `${admin2}, ${country}`;
  else label = best.formatted_address ?? formatCoords(latLng);

  return {
    // El centroide de la localidad, no el punto exacto que se tocó.
    position: best.geometry?.location?.toJSON?.() ?? latLng,
    label,
    parts: { city, admin1, admin2, country },
  };
}
