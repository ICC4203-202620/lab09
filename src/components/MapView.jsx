// src/components/MapView.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { Box, Typography, CircularProgress } from "@mui/material";

export default function MapView({
  center,
  marker,               // { position }
  favoritePins = [],    // [{ id, name, lat, lng }]
  loading,
  onMapLoad,
  onMapUnmount,
  onClick,
  resolvedAddress
}) {
  const mapOptions = useMemo(
    () => ({
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: true
    }),
    []
  );

  // ----- Marker de selección actual (uno)
  const advancedMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);

  // ----- Colección de marcadores favoritos
  const favMarkersRef = useRef(new Map()); // id -> AdvancedMarkerElement

  useEffect(() => {
    if (!window.google?.maps?.marker) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;

    // Crear/actualizar favoritos
    const existing = favMarkersRef.current;

    // Crea/actualiza
    for (const f of favoritePins) {
      if (!f?.lat || !f?.lng) continue; // solo pines con coords
      const id = f.id ?? `${f.name}-${f.lat}-${f.lng}`;
      let inst = existing.get(id);
      if (!inst) {
        inst = new AdvancedMarkerElement({
          position: { lat: Number(f.lat), lng: Number(f.lng) },
          map: window.__activeMapInstance || null,
          title: f.name, // tooltip nativo
        });
        // Click: abre InfoWindow con nombre + coords
        inst.addListener("click", () => {
          if (!infoWindowRef.current)
            infoWindowRef.current = new window.google.maps.InfoWindow();
          infoWindowRef.current.setContent(
            `<div style="max-width:240px">
               <strong>${escapeHtml(f.name || 'Favorito')}</strong>
               <div>${Number(f.lat).toFixed(6)}, ${Number(f.lng).toFixed(6)}</div>
             </div>`
          );
          infoWindowRef.current.open({ anchor: inst });
        });
        existing.set(id, inst);
      } else {
        // actualizar posición por si cambió
        inst.position = { lat: Number(f.lat), lng: Number(f.lng) };
        if (inst.map == null && window.__activeMapInstance) {
          inst.map = window.__activeMapInstance;
        }
      }
    }

    // Eliminar los que ya no están
    for (const [id, inst] of existing.entries()) {
      const still = favoritePins.some(f => (f.id ?? `${f.name}-${f.lat}-${f.lng}`) === id);
      if (!still) {
        inst.map = null;
        existing.delete(id);
      }
    }
  }, [favoritePins]);

  // Helper simple para escapar HTML en strings
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  // Marker “actual” (como lo tenías)
  useEffect(() => {
    if (!window.google?.maps?.marker || !marker?.position) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;

    if (!advancedMarkerRef.current) {
      advancedMarkerRef.current = new AdvancedMarkerElement({
        position: marker.position,
        map: window.__activeMapInstance || null
      });

      advancedMarkerRef.current.addListener("click", () => {
        if (!infoWindowRef.current)
          infoWindowRef.current = new window.google.maps.InfoWindow();

        infoWindowRef.current.setContent(
          `<div style="max-width:260px">
             <strong>Dirección</strong><div style="margin-bottom:6px">${escapeHtml(resolvedAddress || "")}</div>
             <strong>Coordenadas</strong><div>${marker.position.lat.toFixed(6)}, ${marker.position.lng.toFixed(6)}</div>
           </div>`
        );
        infoWindowRef.current.open({ anchor: advancedMarkerRef.current });
      });
    }

    advancedMarkerRef.current.position = marker.position;
  }, [marker?.position, resolvedAddress]);

  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const useVector = Boolean(mapId);

  return (
    <Box sx={{ position: "relative" }}>
      <GoogleMap
        mapId={useVector ? mapId : undefined}
        onLoad={(m) => {
          onMapLoad(m);
          window.__activeMapInstance = m;

          if (advancedMarkerRef.current)
            advancedMarkerRef.current.map = m;

          // Monta los favoritos ya creados
          for (const inst of favMarkersRef.current.values()) {
            inst.map = m;
          }
        }}
        onUnmount={() => {
          onMapUnmount();
          if (advancedMarkerRef.current)
            advancedMarkerRef.current.map = null;
          for (const inst of favMarkersRef.current.values()) {
            inst.map = null;
          }
          window.__activeMapInstance = null;
        }}
        mapContainerStyle={{
          width: "100%",
          height: "60vh",
          minHeight: 360,
          borderRadius: "16px"
        }}
        center={center}
        zoom={14}
        options={{
          ...mapOptions,
          ...(useVector ? { mapId } : {})
        }}
        onClick={onClick}
      />

      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            bgcolor: "rgba(255,255,255,0.6)",
            borderRadius: "16px"
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Cargando mapa…
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
