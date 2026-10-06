import { useCallback, useEffect, useState } from 'react';

// Los tres códigos de GeolocationPositionError, con nombre.
const ERROR_STATUS = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };

// Una posición de hace un minuto sirve para marcar un lugar, y sin `timeout`
// getCurrentPosition puede no responder nunca (el valor por omisión es
// Infinity). Es el mismo hook de la aplicación de ejemplo de la clase 10.
const OPTIONS = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 };

// Estados: unsupported | idle | locating | located | denied | unavailable | timeout
export default function useGeolocation() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [state, setState] = useState({ status: supported ? 'idle' : 'unsupported' });

  const locate = useCallback(() => {
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setState({
        status: 'located',
        position: { lat: coords.latitude, lng: coords.longitude },
        accuracy: coords.accuracy, // metros, radio con 95 % de confianza
      }),
      (error) => setState({ status: ERROR_STATUS[error.code] ?? 'unavailable' }),
      OPTIONS,
    );
  }, []);

  // La Permissions API dice el estado del permiso sin mostrar el diálogo: si
  // ya se concedió, se ubica solo; si se denegó, no se ofrece un botón inútil.
  useEffect(() => {
    if (!supported || !navigator.permissions) return undefined;
    let active = true;
    let permission;
    const apply = () => {
      if (permission.state === 'granted') locate();
      else if (permission.state === 'denied') setState({ status: 'denied' });
      else setState({ status: 'idle' });
    };
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (!active) return;
      permission = result;
      apply();
      permission.onchange = apply; // el usuario lo cambió en la configuración
    }).catch(() => {});
    return () => {
      active = false;
      if (permission) permission.onchange = null;
    };
  }, [supported, locate]);

  return { ...state, locate };
}
