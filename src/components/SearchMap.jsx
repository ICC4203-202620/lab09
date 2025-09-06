import { useEffect, useRef } from "react";
import { Box, Stack, Typography, CircularProgress, Alert } from "@mui/material";
import { useJsApiLoader } from "@react-google-maps/api";
import MapView from "./MapView.jsx";
import { useGeo } from "../state/geoContext.jsx";
import { useSearchResults } from "../state/searchResultsContext.jsx";
import { reverseGeocodeServer } from "../api/geocodeClient.js";
import { fetchWeatherMulti } from "../api/weatherApi"; // usaremos nombre formateado

const GOOGLE_MAPS_LIBRARIES = ["places", "marker"];

export default function SearchMap() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const { state, actions } = useGeo();
  const { actions: results } = useSearchResults();
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    mapIds: mapId ? [mapId] : undefined,
  });

  useEffect(() => {
    if (isLoaded && state.marker?.position) {
      handleReverse(state.marker.position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, state.marker?.position]);

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

  const handleReverse = async (latLng) => {
    if (!latLng) return;
    actions.setBusy(true);
    results.setLoading(true);
    results.clear();
    try {
      const data = await reverseGeocodeServer(latLng.lat, latLng.lng, "es"); // { formatted, ... }
      actions.setResolvedAddress(data.formatted);

      // Aproximación: usar el nombre formateado para traer clima
      const arr = await fetchWeatherMulti(data.formatted);
      if (arr.length) {
        results.setResults(arr);
      } else {
        results.setError('No se encontraron ubicaciones para estas coordenadas.');
      }
    } catch (e) {
      results.setError(`No se pudo obtener dirección/clima: ${e.message}`);
      actions.setError(`No se pudo obtener dirección para estas coordenadas: ${e.message}`);
    } finally {
      actions.setBusy(false);
    }
  };

  const handleMapClick = (e) => {
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
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
    <Box>
      <MapView
        center={state.center}
        marker={state.marker}
        resolvedAddress={state.resolvedAddress}
        loading={state.loading}
        onMapLoad={handleMapLoad}
        onMapUnmount={handleMapUnmount}
        onClick={handleMapClick}
      />
    </Box>
  );
}
