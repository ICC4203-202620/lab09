// src/components/MapView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  resolvedAddress,

  // === NUEVO: integración con Places (hoteles) ===
  hotels = [],                       // resultados de nearbySearch
  onSearchHotelsNear,                // (latLng) => void
  onClearHotels,                     // () => void
}) {
  const mapOptions = useMemo(
    () => ({
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false
    }),
    []
  );

  // ----- Refs generales
  const mapRef = useRef(null);

  // ----- Marker de selección actual (uno)
  const advancedMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);

  // ----- Colección de marcadores favoritos
  const favMarkersRef = useRef(new Map()); // id -> AdvancedMarkerElement

  // ----- Colección de marcadores de hoteles
  const hotelMarkersRef = useRef(new Map()); // place_id -> AdvancedMarkerElement
  const hotelInfoWindowRef = useRef(null);

  // Helper simple para escapar HTML en strings
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  // ==============================
  // Favoritos: crear/actualizar/eliminar
  // ==============================
  useEffect(() => {
    if (!window.google?.maps?.marker) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;

    // Crear/actualizar favoritos
    const existing = favMarkersRef.current;

    for (const f of favoritePins) {
      if (!f?.lat || !f?.lng) continue; // solo pines con coords
      const id = f.id ?? `${f.name}-${f.lat}-${f.lng}`;
      let inst = existing.get(id);
      if (!inst) {
        inst = new AdvancedMarkerElement({
          position: { lat: Number(f.lat), lng: Number(f.lng) },
          map: mapRef.current || null,
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
        if (inst.map == null && mapRef.current) {
          inst.map = mapRef.current;
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

  // ==============================
  // Marker de selección (el tuyo original) + InfoWindow con botón “Buscar hoteles cerca”
  // ==============================
  useEffect(() => {
    if (!window.google?.maps?.marker || !marker?.position) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;

    // Asegura instancia
    if (!advancedMarkerRef.current) {
      advancedMarkerRef.current = new AdvancedMarkerElement({
        position: marker.position,
        map: mapRef.current || null
      });

      advancedMarkerRef.current.addListener("click", () => {
        if (!infoWindowRef.current)
          infoWindowRef.current = new window.google.maps.InfoWindow();

        // Construimos un contenedor para poder bindear el click al botón
        const el = document.createElement("div");
        el.style.maxWidth = "280px";
        el.innerHTML = `
          <div style="max-width:260px">
            <strong>Dirección</strong>
            <div style="margin-bottom:6px">${escapeHtml(resolvedAddress || "")}</div>
            <strong>Coordenadas</strong>
            <div>${marker.position.lat.toFixed(6)}, ${marker.position.lng.toFixed(6)}</div>
            <div style="margin-top:8px">
              <button type="button" data-action="find-hotels" style="
                cursor:pointer; padding:6px 10px; border-radius:6px; border:1px solid #ccc;
                background:#1976d2; color:white; font-size:12px;">
                Buscar hoteles cerca
              </button>
              ${onClearHotels ? `
                <button type="button" data-action="clear-hotels" style="
                  cursor:pointer; padding:6px 10px; border-radius:6px; border:1px solid #ccc;
                  background:white; color:#333; font-size:12px; margin-left:6px;">
                  Limpiar
                </button>` : ``}
            </div>
          </div>
        `;

        // Bind de botones
        el.querySelector('[data-action="find-hotels"]')?.addEventListener('click', () => {
          onClearHotels?.();
          onSearchHotelsNear?.(marker.position);
        });
        el.querySelector('[data-action="clear-hotels"]')?.addEventListener('click', () => {
          onClearHotels?.();
        });

        infoWindowRef.current.setContent(el);
        infoWindowRef.current.open({ anchor: advancedMarkerRef.current });
      });
    }

    // Actualiza posición cuando cambie
    advancedMarkerRef.current.position = marker.position;

    // Abre automáticamente nuestro InfoWindow con el botón
    if (marker?.position && mapRef.current) {
      if (!infoWindowRef.current)
        infoWindowRef.current = new window.google.maps.InfoWindow();

      const el = document.createElement("div");
      el.style.maxWidth = "280px";
      el.innerHTML = `
        <div style="max-width:260px">
          <strong>Dirección</strong>
          <div style="margin-bottom:6px">${escapeHtml(resolvedAddress || "")}</div>
          <strong>Coordenadas</strong>
          <div>${marker.position.lat.toFixed(6)}, ${marker.position.lng.toFixed(6)}</div>
          <div style="margin-top:8px">
            <button type="button" data-action="find-hotels" style="
              cursor:pointer; padding:6px 10px; border-radius:6px; border:1px solid #ccc;
              background:#1976d2; color:white; font-size:12px;">
              Buscar hoteles cerca
            </button>
            <button type="button" data-action="clear-hotels" style="
              cursor:pointer; padding:6px 10px; border-radius:6px; border:1px solid #ccc;
              background:white; color:#333; font-size:12px; margin-left:6px;">
              Limpiar
            </button>
          </div>
        </div>
      `;
      el.querySelector('[data-action="find-hotels"]')?.addEventListener('click', () => {
        onClearHotels?.();
        onSearchHotelsNear?.(marker.position);
      });
      el.querySelector('[data-action="clear-hotels"]')?.addEventListener('click', () => {
        onClearHotels?.();
      });

      infoWindowRef.current.setContent(el);
      infoWindowRef.current.open({ anchor: advancedMarkerRef.current });
    }

  }, [marker?.position, resolvedAddress, onSearchHotelsNear, onClearHotels]);

  // ==============================
  // Hoteles: crear/actualizar/eliminar
  // ==============================
  useEffect(() => {
    if (!window.google?.maps?.marker) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;
    const map = mapRef.current;
    const existing = hotelMarkersRef.current;

    // Crear/actualizar
    for (const p of hotels) {
      const id = p.place_id;
      const locObj = p.geometry?.location;
      if (!id || !locObj) continue;

      // geometry.location puede ser LatLng o literal
      const loc = typeof locObj.toJSON === "function" ? locObj.toJSON() : locObj;

      let inst = existing.get(id);
      if (!inst) {
        inst = new AdvancedMarkerElement({
          position: loc,
          map: map || null,
          title: p.name || "Hotel",
        });

        // Click: InfoWindow con nombre/rating y link a Google Maps
        inst.addListener("click", () => {
          if (!hotelInfoWindowRef.current)
            hotelInfoWindowRef.current = new window.google.maps.InfoWindow();

          const rating = p.rating ? `⭐ ${p.rating} (${p.user_ratings_total || 0})` : "Sin calificación";
          const link = `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(p.place_id)}`;

          hotelInfoWindowRef.current.setContent(
            `<div style="max-width:240px">
               <strong>${escapeHtml(p.name || "Hotel")}</strong>
               <div>${escapeHtml(p.vicinity || "")}</div>
               <div style="margin-top:4px">${rating}</div>
               <div style="margin-top:6px">
                 <a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Ver en Google Maps</a>
               </div>
             </div>`
          );
          hotelInfoWindowRef.current.open({ anchor: inst });
        });

        existing.set(id, inst);
      } else {
        // Actualiza posición/título si cambian
        inst.position = loc;
        inst.title = p.name || "Hotel";
        if (inst.map == null && map) inst.map = map;
      }
    }

    // Eliminar los que ya no están
    for (const [id, inst] of existing.entries()) {
      const still = hotels.some((p) => p.place_id === id);
      if (!still) {
        inst.map = null;
        existing.delete(id);
      }
    }
  }, [hotels]);

  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const useVector = Boolean(mapId);

  return (
    <Box sx={{ position: "relative" }}>
      <GoogleMap
        mapId={useVector ? mapId : undefined}
        onLoad={(m) => {
          mapRef.current = m;
          onMapLoad?.(m);
          window.__activeMapInstance = m;

          if (advancedMarkerRef.current)
            advancedMarkerRef.current.map = m;

          // Monta los favoritos ya creados
          for (const inst of favMarkersRef.current.values()) {
            inst.map = m;
          }
          // Monta los hoteles ya creados
          for (const inst of hotelMarkersRef.current.values()) {
            inst.map = m;
          }
        }}
        onUnmount={() => {
          onMapUnmount?.();
          // des-mapea marcadores
          if (advancedMarkerRef.current)
            advancedMarkerRef.current.map = null;
          for (const inst of favMarkersRef.current.values()) {
            inst.map = null;
          }
          for (const inst of hotelMarkersRef.current.values()) {
            inst.map = null;
          }
          mapRef.current = null;
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
