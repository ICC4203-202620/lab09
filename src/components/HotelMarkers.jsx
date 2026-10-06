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

  return (
    <>
      {hotels.map((hotel) => (
        <AdvancedMarker
          key={hotel.id}
          position={hotel.location.toJSON()}
          title={hotel.displayName}
          onClick={() => setSelectedId(hotel.id)}
        >
          <Pin
            background={theme.palette.secondary.main}
            borderColor={theme.palette.secondary.dark}
            glyphColor={theme.palette.secondary.contrastText}
            scale={0.9}
          />
        </AdvancedMarker>
      ))}
      {selected && (
        <InfoWindow
          position={selected.location.toJSON()}
          pixelOffset={[0, -36]}
          headerContent={<Typography variant="subtitle2">{selected.displayName}</Typography>}
          onCloseClick={() => setSelectedId(null)}
        >
          <Typography variant="body2" gutterBottom>{selected.formattedAddress}</Typography>
          <Typography variant="body2" gutterBottom>
            {selected.rating
              ? `★ ${selected.rating} (${selected.userRatingCount ?? 0} opiniones)`
              : 'Sin calificación'}
          </Typography>
          {selected.googleMapsURI && (
            <Link href={selected.googleMapsURI} target="_blank" rel="noopener">Ver en Google Maps</Link>
          )}
        </InfoWindow>
      )}
    </>
  );
}

HotelMarkers.propTypes = {
  hotels: PropTypes.array.isRequired,
};
