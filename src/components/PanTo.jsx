import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import PropTypes from 'prop-types';

// Mueve la cámara cuando cambia la posición, sin volver a montar el mapa:
// montar otro <Map> sería otra carga cobrada. useMap() entrega la instancia de
// google.maps.Map del <Map> que contiene a este componente, para llamar a los
// métodos que no tienen una prop equivalente.
export default function PanTo({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!map || lat == null || lng == null) return;
    map.panTo({ lat, lng });
    if (zoom != null && map.getZoom() < zoom) map.setZoom(zoom);
  }, [map, lat, lng, zoom]);
  return null;
}

PanTo.propTypes = {
  lat: PropTypes.number,
  lng: PropTypes.number,
  zoom: PropTypes.number,
};
