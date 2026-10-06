// TODO: esta línea silencia al linter mientras el archivo esté a medio
// implementar. Bórrala al terminar el ejercicio 1.
/* eslint-disable no-unused-vars */
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
  // Ejercicio 1. Pasos:
  //
  // 1. Pedir el reverse geocoding: `geocoder.geocode({ location: latLng })`
  //    devuelve una promesa de `{ results }`. Si no hay resultados, devolver null.
  //    Documentación: https://developers.google.com/maps/documentation/javascript/geocoding
  //
  // 2. Quedarse con los resultados "gruesos": los que no tienen ningún tipo de
  //    BLOCKED y tienen alguno de ALLOWED (cada resultado trae `types`). Si no
  //    queda ninguno, devolver null.
  //
  // 3. Elegir el mejor con `rank` (menor es mejor).
  //
  // 4. Sacar de `best.address_components` la ciudad (`locality`, o
  //    `postal_town`), la región (`administrative_area_level_1`, en
  //    `short_name`), la provincia (`administrative_area_level_2`) y el país
  //    (`country`, `short_name`), y armar `label` como "Ciudad, Región, CC"
  //    (o "Región, CC", o "Provincia, CC", o `formatted_address` si no hay nada).
  //
  // 5. Devolver { position, label, parts: { city, admin1, admin2, country } },
  //    donde position es `best.geometry.location.toJSON()`: el centroide de la
  //    localidad, no el punto exacto que se tocó.
  //
  // `rank` y `formatCoords` ya están definidos arriba.
  return null; /* TODO */
}
