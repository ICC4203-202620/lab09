import { useMemo, useReducer } from "react";

export const initialGeoState = {
  center: { lat: -33.447487, lng: -70.673676 }, // Santiago, CL
  marker: null, // { position: {lat, lng} } | null
  addressInput: "",
  resolvedAddress: "",
  loading: true, // app boot (map + geolocation)
  busy: false, // geocoder/places in-flight
  error: "",
  snack: "",
};

export const GeoAction = {
  SET_CENTER: "SET_CENTER",
  SET_MARKER: "SET_MARKER",
  SET_ADDRESS_INPUT: "SET_ADDRESS_INPUT",
  SET_RESOLVED_ADDRESS: "SET_RESOLVED_ADDRESS",
  SET_LOADING: "SET_LOADING",
  SET_BUSY: "SET_BUSY",
  SET_ERROR: "SET_ERROR",
  SET_SNACK: "SET_SNACK",
  CLEAR_MARKER: "CLEAR_MARKER",
};

export function geoReducer(state, action) {
  switch (action.type) {
    case GeoAction.SET_CENTER:
      return { ...state, center: action.payload };
    case GeoAction.SET_MARKER:
      return { ...state, marker: action.payload };
    case GeoAction.SET_ADDRESS_INPUT:
      return { ...state, addressInput: action.payload };
    case GeoAction.SET_RESOLVED_ADDRESS:
      return { ...state, resolvedAddress: action.payload };
    case GeoAction.SET_LOADING:
      return { ...state, loading: action.payload };
    case GeoAction.SET_BUSY:
      return { ...state, busy: action.payload };
    case GeoAction.SET_ERROR:
      return { ...state, error: action.payload };
    case GeoAction.SET_SNACK:
      return { ...state, snack: action.payload };
    case GeoAction.CLEAR_MARKER:
      return { ...state, marker: null, resolvedAddress: "" };
    default:
      return state;
  }
}

export function useGeoReducer() {
  const [state, dispatch] = useReducer(geoReducer, initialGeoState);

  const actions = useMemo(
    () => ({
      setCenter: (c) => dispatch({ type: GeoAction.SET_CENTER, payload: c }),
      setMarker: (m) => dispatch({ type: GeoAction.SET_MARKER, payload: m }),
      setAddressInput: (s) => dispatch({ type: GeoAction.SET_ADDRESS_INPUT, payload: s }),
      setResolvedAddress: (s) => dispatch({ type: GeoAction.SET_RESOLVED_ADDRESS, payload: s }),
      setLoading: (b) => dispatch({ type: GeoAction.SET_LOADING, payload: b }),
      setBusy: (b) => dispatch({ type: GeoAction.SET_BUSY, payload: b }),
      setError: (s) => dispatch({ type: GeoAction.SET_ERROR, payload: s }),
      setSnack: (s) => dispatch({ type: GeoAction.SET_SNACK, payload: s }),
      clearMarker: () => dispatch({ type: GeoAction.CLEAR_MARKER }),
    }),
    []
  );

  return { state, actions };
}
