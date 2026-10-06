import { useCallback, useEffect, useState } from 'react';
import { createPlacemark, deletePlacemark, listPlacemarks } from '../api/placemarksClient';
import { loadPlacemarks, savePlacemarks } from '../api/placemarksCache';
import { isAbort, NetworkError } from '../api/request';
import useConnectionStatus from './useConnectionStatus';

/*
 * La lista de lugares del usuario: la consulta al backend, el respaldo en
 * localStorage, y las operaciones de crear y eliminar.
 *
 * Sigue el modelo de useWeather: el efecto depende también del estado de la
 * conexión, de modo que al volver la red la lista guardada se reemplaza sola
 * por una consulta nueva. `savedAt` es null cuando lo que se muestra acaba de
 * llegar del servidor, y la hora del respaldo cuando no hubo conexión.
 */
export default function usePlacemarks() {
  const [state, setState] = useState({ status: 'loading', items: [], savedAt: null, error: null });
  const [status] = useConnectionStatus();
  const disconnected = status === 'offline';

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await listPlacemarks({ signal: controller.signal });
        savePlacemarks(data.items);
        setState({ status: 'success', items: data.items, savedAt: null, error: null });
      } catch (error) {
        if (isAbort(error)) return;
        const cached = error instanceof NetworkError ? loadPlacemarks() : null;
        if (cached) {
          setState({ status: 'success', items: cached.items, savedAt: cached.savedAt, error: null });
        } else {
          setState((s) => ({ ...s, status: 'error', error }));
        }
      }
    })();
    // La limpieza cancela la petición en vuelo si la conexión cambia o la
    // pantalla se cierra: su respuesta ya no le interesa a nadie.
    return () => controller.abort();
  }, [disconnected]);

  const create = useCallback(async (fields) => {
    const created = await createPlacemark(fields);
    setState((s) => {
      const items = [created, ...s.items];
      savePlacemarks(items);
      return { ...s, items, savedAt: null };
    });
    return created;
  }, []);

  const remove = useCallback(async (id) => {
    await deletePlacemark(id);
    setState((s) => {
      const items = s.items.filter((item) => item.id !== id);
      savePlacemarks(items);
      return { ...s, items };
    });
  }, []);

  return { ...state, disconnected, create, remove };
}
