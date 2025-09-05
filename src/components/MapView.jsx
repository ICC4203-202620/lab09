// src/components/MapView.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { Box, Typography, CircularProgress } from "@mui/material";

export default function MapView({
  center,
  marker,
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

  const advancedMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);

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
             <strong>Dirección</strong><div style="margin-bottom:6px">${
               resolvedAddress || ""
             }</div>
             <strong>Coordenadas</strong><div>${
               marker.position.lat.toFixed(6)
             }, ${marker.position.lng.toFixed(6)}</div>
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
          if (advancedMarkerRef.current) {
            advancedMarkerRef.current.map = m;
          }
        }}
        onUnmount={() => {
          onMapUnmount();
          if (advancedMarkerRef.current) {
            advancedMarkerRef.current.map = null;
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
