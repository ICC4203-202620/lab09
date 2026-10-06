import { useMemo, useRef, useState } from 'react';
import { AdvancedMarker, InfoWindow, Map, useAdvancedMarkerRef, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import HotelIcon from '@mui/icons-material/Hotel';
import PropTypes from 'prop-types';
import { MAP_ID, MAPS_API_KEY, SANTIAGO } from '../config';
import { fetchWeatherMulti, NetworkError } from '../api/weatherApi';
import { formatCoords, snapToNearestLocality } from '../geo/locality';
import HotelMarkers from './HotelMarkers';
import MissingMapsKey from './MissingMapsKey';
import PanTo from './PanTo';
import SearchResult from './SearchResult';

// Radio de la búsqueda de hoteles, en metros. Places API (New) admite hasta
// 50.000, y a lo más 20 resultados por consulta, sin paginación.
const HOTELS_RADIUS_M = 1500;
const HOTELS_MAX_RESULTS = 20;

const IDLE = { status: 'idle', items: [] };

// Buscar una ciudad tocando el mapa. Al tocar un punto:
//
//  1. El Geocoder de Maps JS (en el navegador, con la key del frontend) lo
//     convierte en la localidad más cercana: "Valparaíso, Región de
//     Valparaíso, CL". El marcador se mueve al centro de esa localidad.
//  2. Con ese texto se consulta el clima a Open-Meteo, igual que en la
//     búsqueda por texto, y los resultados aparecen abajo como tarjetas.
//  3. Desde la InfoWindow del marcador se pueden buscar hoteles cercanos con
//     Places API (New), que se dibujan como marcadores de otro color.
export default function SearchMap({ isFavorite, onAddFavorite }) {
  const geocoding = useMapsLibrary('geocoding');
  const places = useMapsLibrary('places');
  const geocoder = useMemo(() => geocoding && new geocoding.Geocoder(), [geocoding]);

  const [point, setPoint] = useState(null);   // { position, label } | null
  const [weather, setWeather] = useState(IDLE);
  const [hotels, setHotels] = useState(IDLE);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(false);

  // Si el usuario toca dos puntos seguidos, la respuesta del primero puede
  // llegar después que la del segundo. Cada click toma un número, y una
  // respuesta solo se aplica si su número sigue siendo el último.
  const clickId = useRef(0);

  if (!MAPS_API_KEY) return <MissingMapsKey />;

  const handleClick = async (event) => {
    const latLng = event.detail.latLng;
    if (!latLng || !geocoder) return;
    const id = ++clickId.current;

    // Feedback inmediato: el marcador aparece donde se tocó, y el snap lo
    // reubica después.
    setPoint({ position: latLng, label: formatCoords(latLng) });
    setInfoOpen(true);
    setHotels(IDLE);
    setWeather({ status: 'loading', items: [] });

    try {
      const snapped = await snapToNearestLocality(geocoder, latLng);
      if (id !== clickId.current) return;

      if (!snapped) {
        setWeather({ status: 'empty', items: [] });
        return;
      }
      setPoint({ position: snapped.position, label: snapped.label });

      let items = await fetchWeatherMulti(snapped.label);
      // Open-Meteo no conoce todas las localidades de Google. Segundo intento
      // con la región, que casi siempre existe como ciudad del mismo nombre.
      if (!items.length && snapped.parts.admin1 && snapped.parts.country) {
        items = await fetchWeatherMulti(`${snapped.parts.admin1}, ${snapped.parts.country}`);
      }
      if (id !== clickId.current) return;
      setWeather(items.length ? { status: 'success', items } : { status: 'empty', items: [] });
    } catch (error) {
      if (id !== clickId.current) return;
      setWeather({
        status: 'error',
        items: [],
        message: error instanceof NetworkError
          ? 'Sin conexión: no es posible consultar el clima de un punto nuevo.'
          : 'No se pudo obtener la localidad o su clima.',
      });
    }
  };

  // Places API (New): Place.searchNearby devuelve una promesa y exige declarar
  // en `fields` qué datos de cada lugar se quieren, porque se paga según esa
  // lista. `PlacesService.nearbySearch`, el método que aparece en la mayoría
  // de los tutoriales, es legacy desde marzo de 2025 y un proyecto nuevo de
  // Google Cloud no puede habilitarlo.
  const searchHotels = async () => {
    if (!places || !point) return;
    setHotels({ status: 'loading', items: [] });
    try {
      const { places: found } = await places.Place.searchNearby({
        fields: ['id', 'displayName', 'location', 'formattedAddress', 'rating', 'userRatingCount', 'googleMapsURI'],
        locationRestriction: { center: point.position, radius: HOTELS_RADIUS_M },
        includedTypes: ['lodging'],
        maxResultCount: HOTELS_MAX_RESULTS,
        rankPreference: places.SearchNearbyRankPreference.DISTANCE,
        language: 'es',
        region: 'cl',
      });
      setHotels({ status: found.length ? 'success' : 'empty', items: found });
    } catch (error) {
      // Casi siempre es configuración: la key no tiene habilitada Places API
      // (New), o el proyecto no tiene facturación activa.
      console.error('[places] searchNearby:', error);
      setHotels({ status: 'error', items: [], message: `No se pudo buscar hoteles: ${error.message}` });
    }
  };

  return (
    <Stack spacing={2} sx={{ m: 2, maxWidth: 900, mx: 'auto' }}>
      <Typography color="text.secondary">
        Toca un punto del mapa para ver el clima de la ciudad más cercana.
      </Typography>

      <Box sx={{ position: 'relative', height: { xs: '55vh', md: 460 }, borderRadius: 2, overflow: 'hidden' }}>
        {(weather.status === 'loading' || hotels.status === 'loading') && (
          <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', zIndex: 1 }} />
        )}
        <Map
          mapId={MAP_ID}
          defaultCenter={SANTIAGO}
          defaultZoom={11}
          gestureHandling="greedy"
          clickableIcons={false}
          reuseMaps
          onClick={handleClick}
        >
          {point && (
            <>
              <AdvancedMarker
                ref={markerRef}
                position={point.position}
                title={point.label}
                zIndex={1000}
                onClick={() => setInfoOpen((open) => !open)}
              />
              {infoOpen && (
                <InfoWindow
                  anchor={marker}
                  headerContent={<Typography variant="subtitle2">{point.label}</Typography>}
                  onCloseClick={() => setInfoOpen(false)}
                >
                  <Typography variant="body2" gutterBottom>{formatCoords(point.position)}</Typography>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<HotelIcon />}
                    onClick={searchHotels}
                    disabled={!places || hotels.status === 'loading'}
                  >
                    Buscar hoteles cerca
                  </Button>
                </InfoWindow>
              )}
              <PanTo lat={point.position.lat} lng={point.position.lng} />
            </>
          )}
          <HotelMarkers hotels={hotels.items} />
        </Map>
      </Box>

      <Typography role="status" aria-live="polite" variant="body2" color="text.secondary">
        {weather.status === 'loading' && 'Buscando la localidad y su clima…'}
        {weather.status === 'empty' && 'No se encontró una ciudad cerca de ese punto. Prueba con otro.'}
        {hotels.status === 'loading' && ' Buscando hoteles…'}
        {hotels.status === 'success' && ` ${hotels.items.length} alojamientos a menos de ${HOTELS_RADIUS_M / 1000} km, del más cercano al más lejano.`}
        {hotels.status === 'empty' && ' No hay alojamientos cerca de este punto.'}
      </Typography>
      {weather.status === 'error' && <Alert severity="warning">{weather.message}</Alert>}
      {hotels.status === 'error' && <Alert severity="error">{hotels.message}</Alert>}
      {hotels.items.length > 0 && (
        <Button size="small" onClick={() => setHotels(IDLE)} sx={{ alignSelf: 'flex-start' }}>
          Quitar hoteles del mapa
        </Button>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {weather.items.map(({ location, temps }) => {
          const label = `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}, ${location.country_code}`;
          return (
            <SearchResult
              key={`${location.id}-${location.latitude}-${location.longitude}`}
              label={label}
              temps={temps}
              isFavorite={isFavorite}
              onAddFavorite={onAddFavorite}
            />
          );
        })}
      </Box>
    </Stack>
  );
}

SearchMap.propTypes = {
  isFavorite: PropTypes.func.isRequired,
  onAddFavorite: PropTypes.func.isRequired,
};
