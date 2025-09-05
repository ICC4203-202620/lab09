import React, { createContext, useContext } from "react";
import { useGeoReducer } from "./useGeoReducer.js";

const GeoContext = createContext(null);

export function GeoProvider({ children }) {
  const value = useGeoReducer();
  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error("useGeo debe usarse dentro de <GeoProvider>");
  return ctx;
}