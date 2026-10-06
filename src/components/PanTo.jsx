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
    // Ejercicio 4. Si hay mapa y coordenadas, mover la cámara con
    // `map.panTo({ lat, lng })`. Si se pidió un `zoom` y el actual
    // (`map.getZoom()`) es menor, acercar con `map.setZoom(zoom)`.
    // Documentación: https://visgl.github.io/react-google-maps/docs/api-reference/hooks/use-map
    //                https://developers.google.com/maps/documentation/javascript/reference/map
    /* TODO */
  }, [map, lat, lng, zoom]);
  return null;
}

PanTo.propTypes = {
  lat: PropTypes.number,
  lng: PropTypes.number,
  zoom: PropTypes.number,
};
