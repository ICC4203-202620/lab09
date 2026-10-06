// TODO: esta línea silencia al linter mientras el componente esté a medio
// implementar. Bórrala al terminar el ejercicio 3.
/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { AdvancedMarker, InfoWindow, Pin } from '@vis.gl/react-google-maps';
import { Link, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';

// Un marcador por hotel y una sola InfoWindow, la del seleccionado. Cada
// elemento de `hotels` es un google.maps.places.Place, que solo trae los
// campos pedidos en `fields` al llamar a Place.searchNearby (ver SearchMap).
export default function HotelMarkers({ hotels }) {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState(null);
  const selected = hotels.find((h) => h.id === selectedId);

  // Ejercicio 3. Renderizar:
  //
  // 1. Un <AdvancedMarker> por hotel, con `key={hotel.id}`, `position` igual a
  //    `hotel.location.toJSON()` (location es un LatLng de Google, y el
  //    marcador espera un literal { lat, lng }), `title={hotel.displayName}` y
  //    `onClick` que lo seleccione. Dentro, un <Pin> con los colores
  //    `theme.palette.secondary` (main, dark, contrastText) y `scale={0.9}`.
  //
  // 2. Una sola <InfoWindow>, cuando hay `selected`, con `position` del hotel,
  //    `pixelOffset={[0, -36]}` para que no tape el pin, `headerContent` con el
  //    nombre, y `onCloseClick` que deseleccione. Dentro: la dirección
  //    (formattedAddress), la calificación ("★ 4.5 (120 opiniones)" o "Sin
  //    calificación") y, si existe `googleMapsURI`, un <Link> "Ver en Google
  //    Maps" que abra en otra pestaña.
  //
  // Documentación: https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker
  //                https://visgl.github.io/react-google-maps/docs/api-reference/components/info-window
  return null; /* TODO */
}

HotelMarkers.propTypes = {
  hotels: PropTypes.array.isRequired,
};
