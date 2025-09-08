import { useEffect, useRef, useState } from "react";
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

  // ---- NEW: hoteles (Places Nearby)
  const [hotelPlaces, setHotelPlaces] = useState([]);
  const [hotelNextPage, setHotelNextPage] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    mapIds: mapId ? [mapId] : undefined,
    language: "es",
    region: "CL",
  });

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

    const ALLOWED = new Set([
      "locality",                     // ciudad
      "postal_town",                  // UK y algunos países
      "administrative_area_level_1",  // región/estado
      "administrative_area_level_2",  // provincia/condado
    ]);

    const BLOCKED = new Set([
      "route", "street_address", "intersection", "premise", "subpremise",
      "sublocality", "sublocality_level_1", "neighborhood",
      "administrative_area_level_3", "administrative_area_level_4",
      "colloquial_area", "ward", "park", "point_of_interest",
    ]);

    const { results } = await geocoder.geocode({ location: latLng });
    if (!results?.length) return null;

    const coarseResults = results.filter((r) => {
      const types = r.types || [];
      if (types.some((t) => BLOCKED.has(t))) return false;
      return types.some((t) => ALLOWED.has(t));
    });

    const pool = coarseResults.length ? coarseResults : results;

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

    const comps = best.address_components || [];
    const get = (type) => comps.find((c) => c.types.includes(type));
    const city =
      get("locality")?.long_name ||
      get("postal_town")?.long_name ||
      null;

    const admin1 = get("administrative_area_level_1")?.short_name || null;
    const admin2 = get("administrative_area_level_2")?.long_name || null;
    const country = get("country")?.short_name || "";

    let label;
    if (city) {
      label = admin1 ? `${city}, ${admin1}, ${country}` : `${city}, ${country}`;
    } else if (admin1) {
      label = `${admin1}, ${country}`;
    } else if (admin2) {
      label = `${admin2}, ${country}`;
    } else {
      label = `${best.formatted_address || `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`}`;
    }

    const position = best.geometry?.location?.toJSON?.() || latLng;

    return {
      position,
      label,
      parts: { city, admin1, admin2, country },
    };
  };

  const handleReverse = async (latLng) => {
    if (!latLng) return;

    const now = Date.now();
    if (now - geocodeCooldownRef.current < 800) {
      return;
    }
    geocodeCooldownRef.current = now;

    const key = `${latLng.lat.toFixed(5)},${latLng.lng.toFixed(5)}`;
    const cached = geocodeCacheRef.current.get(key);

    actions.setBusy(true);
    results.setLoading(true);
    if (!cached) results.clear();

    try {
      let snapped = cached?.snapped;
      let resolved = cached?.resolved;

      if (!snapped) {
        snapped = await snapToNearestLocality(latLng); // { position, label, parts }
      }

      if (snapped?.position) {
        actions.setMarker({ position: snapped.position });
        actions.setCenter(snapped.position);
      }

      if (!resolved) {
        resolved = snapped?.label ?? '';
      }
      actions.setResolvedAddress(resolved);

      const q1 = snapped?.label ?? `${latLng.lat}, ${latLng.lng}`;
      let arr = await fetchWeatherMulti(q1);

      if (!arr.length && snapped?.parts?.admin1 && snapped?.parts?.country) {
        const q2 = `${snapped.parts.admin1}, ${snapped.parts.country}`;
        arr = await fetchWeatherMulti(q2);
      }

      if (arr.length) {
        results.setResults(arr);
      } else {
        results.setError('No se encontraron ubicaciones para estas coordenadas.');
      }

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
    // Al cambiar de punto, limpiamos hoteles previos para evitar confusión visual
    clearHotels();
  };

  const handleMapLoad = (m) => {
    mapRef.current = m;
    actions.setLoading(false);
  };
  const handleMapUnmount = () => {
    mapRef.current = null;
    actions.setLoading(true);
  };

  // ==== NEW: Nearby Search (hoteles) ====

  function clearHotels() {
    setHotelPlaces([]);
    setHotelNextPage(null);
  }

  function searchHotelsNear(lat, lng) {
    if (!window.google || !mapRef.current) return;
    const svc = new window.google.maps.places.PlacesService(mapRef.current);
    const location = new window.google.maps.LatLng(lat, lng);

    // Estrategia: rankBy DISTANCE para que sea claro “cerca de este punto”
    const req = {
      location,
      rankBy: window.google.maps.places.RankBy.DISTANCE,
      type: "lodging",
      keyword: "hotel",
    };

    setHotelPlaces([]);
    setHotelNextPage(null);

    svc.nearbySearch(req, (results, status, pagination) => {
      if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) return;
      setHotelPlaces(results);
      if (pagination && pagination.hasNextPage) {
        setHotelNextPage(() => pagination.nextPage);
      }
    });
  }

  function loadMoreHotels() {
    if (hotelNextPage) hotelNextPage();
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <MapView
        center={state.center}
        marker={state.marker}
        favoritePins={favoritePins}
        resolvedAddress={state.resolvedAddress}
        loading={state.loading}
        onMapLoad={handleMapLoad}
        onMapUnmount={handleMapUnmount}
        onClick={handleMapClick}

        /* ==== NEW: props para hoteles/Places ==== */
        hotels={hotelPlaces}
        onSearchHotelsNear={(latLng) => searchHotelsNear(latLng.lat, latLng.lng)}
        onClearHotels={clearHotels}
      />

      {/* Panel flotante con acciones/estado de hoteles */}
      {hotelPlaces?.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            p: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Typography variant="body2">Hoteles: {hotelPlaces.length}</Typography>
          {hotelNextPage && (
            <Button size="small" variant="outlined" onClick={loadMoreHotels}>
              Más resultados
            </Button>
          )}
          <Button size="small" variant="text" onClick={clearHotels}>
            Limpiar
          </Button>
        </Paper>
      )}

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
