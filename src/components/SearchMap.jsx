import { useEffect, useRef } from "react";
import { Box, Stack, Typography, CircularProgress, Alert, Button, Paper } from "@mui/material";
import { useJsApiLoader } from "@react-google-maps/api";
import MapView from "./MapView.jsx";
import { useGeo } from "../state/geoContext.jsx";
import { useSearchResults } from "../state/searchResultsContext.jsx";
import { reverseGeocodeServer } from "../api/geocodeClient.js";
import { fetchWeatherMulti } from "../api/weatherApi";

const GOOGLE_MAPS_LIBRARIES = ["places", "marker"];

export default function SearchMap({ onAddFavorite, favoritePins }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const { state, actions } = useGeo();
  const { actions: results } = useSearchResults();
  const mapRef = useRef(null);

  // ---- NEW: throttle + cache
  const geocodeCooldownRef = useRef(0);
  const geocodeCacheRef = useRef(new Map()); // key: "lat,lng" (rounded) -> { position, label, resolved }

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    mapIds: mapId ? [mapId] : undefined,
    language: "es",
    region: "CL",
  });

  // ⚠️ Quitamos el efecto que llama handleReverse al cambiar el marker.
  // Eso estaba duplicando (o triplicando) consultas.
  // useEffect(() => {
  //   if (isLoaded && state.marker?.position) {
  //     handleReverse(state.marker.position);
  //   }
  // }, [isLoaded, state.marker?.position]);

  if (loadError) return <Alert severity="error">Error cargando Google Maps</Alert>;
  if (!apiKey) return <Alert severity="warning">Agrega VITE_GOOGLE_MAPS_API_KEY a tu .env</Alert>;

  if (!isLoaded) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ height: "60vh" }}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }} variant="body2">Cargando Google Maps…</Typography>
      </Stack>
    );
  }

  // Snap "coarse": fuerza ciudad/región/país; evita sublocalidades/calles.
  // Retorna { position, label, parts } donde:
  //   - label: "Ciudad, Región, CC"  (o "Región, CC", o "Provincia, CC")
  //   - parts: { city, admin1, admin2, country }
  //   - position: centroide del resultado elegido (locality>admin1>admin2)
  const snapToNearestLocality = async (latLng) => {
    const geocoder = new window.google.maps.Geocoder();

    // Tipos que SÍ aceptamos (coarse)
    const ALLOWED = new Set([
      "locality",                     // ciudad
      "postal_town",                  // UK y algunos países
      "administrative_area_level_1",  // región/estado
      "administrative_area_level_2",  // provincia/condado
      // opcional: "country" si quieres permitir hacer snap al país completo
    ]);

    // Tipos que queremos evitar (demasiado granulares)
    const BLOCKED = new Set([
      "route", "street_address", "intersection", "premise", "subpremise",
      "sublocality", "sublocality_level_1", "neighborhood",
      "administrative_area_level_3", "administrative_area_level_4",
      "colloquial_area", "ward", "park", "point_of_interest",
    ]);

    // 1) Geocodifica y filtra resultados a tipos coarse permitidos
    const { results } = await geocoder.geocode({ location: latLng });
    if (!results?.length) return null;

    const coarseResults = results.filter((r) => {
      const types = r.types || [];
      // descarta si tiene algún tipo bloqueado
      if (types.some((t) => BLOCKED.has(t))) return false;
      // acepta si tiene al menos un tipo permitido
      return types.some((t) => ALLOWED.has(t));
    });

    // Si nada pasó el filtro, usa todos pero seguiremos priorizando coarse
    const pool = coarseResults.length ? coarseResults : results;

    // 2) Puntúa priorizando: locality > postal_town > admin1 > admin2
    const PRIORITY = ["locality", "postal_town", "administrative_area_level_1", "administrative_area_level_2"];
    const scored = pool
      .map((r) => ({
        r,
        score: (r.types || []).reduce((best, t) => {
          const idx = PRIORITY.indexOf(t);
          return idx === -1 ? best : Math.min(best, idx);
        }, Infinity),
      }))
      .sort((a, b) => a.score - b.score);

    const best = scored[0]?.r ?? results[0];

    // 3) Extrae componentes relevantes
    const comps = best.address_components || [];
    const get = (type) => comps.find((c) => c.types.includes(type));
    const city =
      get("locality")?.long_name ||
      get("postal_town")?.long_name ||
      null;

    // Usa SHORT name para admin1 (ej: "RM", "OH") si prefieres más corto;
    // cámbialo a .long_name si quieres el nombre completo.
    const admin1 = get("administrative_area_level_1")?.short_name || null;
    const admin2 = get("administrative_area_level_2")?.long_name || null;
    const country = get("country")?.short_name || "";

    // 4) Construye label coarse siempre con país
    let label;
    if (city) {
      label = admin1 ? `${city}, ${admin1}, ${country}` : `${city}, ${country}`;
    } else if (admin1) {
      label = `${admin1}, ${country}`;
    } else if (admin2) {
      label = `${admin2}, ${country}`;
    } else {
      // último recurso: formatted_address (ya debería ser coarse tras filtros)
      label = `${best.formatted_address || `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`}`;
    }

    // 5) Centroide del resultado elegido (no la calle exacta clickeada)
    const position = best.geometry?.location?.toJSON?.() || latLng;

    return {
      position,
      label,
      parts: { city, admin1, admin2, country },
    };
  };


  const handleReverse = async (latLng) => {
    if (!latLng) return;

    // ---- COOL DOWN: evita ráfagas inadvertidas
    const now = Date.now();
    if (now - geocodeCooldownRef.current < 800) {
      return;
    }
    geocodeCooldownRef.current = now;

    // ---- CACHE por coordenadas “cercanas”
    const key = `${latLng.lat.toFixed(5)},${latLng.lng.toFixed(5)}`;
    const cached = geocodeCacheRef.current.get(key);

    actions.setBusy(true);
    results.setLoading(true);
    if (!cached) results.clear();

    try {
      let snapped = cached?.snapped;
      let resolved = cached?.resolved; // guardaremos el label coarse aquí

      // 1) Snap a localidad (coarse)
      if (!snapped) {
        snapped = await snapToNearestLocality(latLng); // { position, label, parts }
      }

      // 2) Actualiza marker/center al centroide de la localidad
      if (snapped?.position) {
        actions.setMarker({ position: snapped.position });
        actions.setCenter(snapped.position);
      }

      // 3) Usa SIEMPRE el label coarse para el overlay
      if (!resolved) {
        resolved = snapped?.label ?? '';
      }
      actions.setResolvedAddress(resolved);

      // 4) Consultar clima con fallback a nivel región y, por último, coords
      const q1 = snapped?.label ?? `${latLng.lat}, ${latLng.lng}`;
      let arr = await fetchWeatherMulti(q1);

      if (!arr.length && snapped?.parts?.admin1 && snapped?.parts?.country) {
        const q2 = `${snapped.parts.admin1}, ${snapped.parts.country}`;
        arr = await fetchWeatherMulti(q2);
      }

      if (!arr.length && snapped?.position) {
        // Último recurso: si tienes fetch por coords, úsalo aquí.
        // Si no lo tienes, mantenemos el error.
        // Ejemplo:
        // arr = await fetchWeatherByCoords(snapped.position.lat, snapped.position.lng);
      }

      if (arr.length) {
        results.setResults(arr);
      } else {
        results.setError('No se encontraron ubicaciones para estas coordenadas.');
      }

      // 5) Guarda en cache (label coarse como "resolved")
      geocodeCacheRef.current.set(key, { snapped, resolved });
    } catch (e) {
      results.setError(`No se pudo obtener localidad/dirección/clima: ${e.message}`);
      actions.setError(`No se pudo obtener localidad/dirección: ${e.message}`);
    } finally {
      actions.setBusy(false);
    }
  };

  const handleMapClick = (e) => {
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    // Feedback inmediato; el snap luego reubica
    actions.setMarker({ position: pos });
    actions.setCenter(pos);
    handleReverse(pos);
  };

  const handleMapLoad = (m) => {
    mapRef.current = m;
    actions.setLoading(false);
  };
  const handleMapUnmount = () => {
    mapRef.current = null;
    actions.setLoading(true);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <MapView
        center={state.center}
        marker={state.marker}               // pin actual (selección)
        favoritePins={favoritePins}         // <-- NUEVO: array de favoritos con coords
        resolvedAddress={state.resolvedAddress}
        loading={state.loading}
        onMapLoad={handleMapLoad}
        onMapUnmount={handleMapUnmount}
        onClick={handleMapClick}
      />

      {state.marker?.position && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            p: 1,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" sx={{ mx: 1 }}>
            {state.resolvedAddress || 'Ubicación seleccionada'}
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={async () => {
              const { lat, lng } = state.marker.position;
              try {
                const snapped = await snapToNearestLocality({ lat, lng });
                const name =
                  snapped?.label ||
                  state.resolvedAddress ||
                  `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                onAddFavorite?.(name, { lat, lng });
              } catch {
                const fallback =
                  state.resolvedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                onAddFavorite?.(fallback, { lat, lng });
              }
            }}
          >
            Agregar a favoritos
          </Button>
        </Paper>
      )}
    </Box>
  );
}
