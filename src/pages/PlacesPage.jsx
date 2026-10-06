import { useState } from 'react';
import { AdvancedMarker, Map, Pin } from '@vis.gl/react-google-maps';
import { Alert, Box, Button, LinearProgress, Paper, Snackbar, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import { MAP_ID, MAPS_API_KEY, SANTIAGO } from '../config';
import { formatSavedAt } from '../api/weatherCache';
import useGeolocation from '../hooks/useGeolocation';
import useNow from '../hooks/useNow';
import usePlacemarks from '../hooks/usePlacemarks';
import MissingMapsKey from '../components/MissingMapsKey';
import PanTo from '../components/PanTo';
import PlacemarkForm from '../components/PlacemarkForm';
import PlacemarkList from '../components/PlacemarkList';
import PlacemarkMarkers from '../components/PlacemarkMarkers';

const GEO_MESSAGES = {
  denied: 'No tenemos permiso para usar tu ubicación.',
  unavailable: 'No pudimos determinar tu ubicación.',
  timeout: 'Tu ubicación tardó demasiado en llegar.',
  unsupported: 'Este navegador no entrega la ubicación.',
};

const TICK = 30000;

// Mis lugares: puntos que el usuario guarda en el mapa, con nombre, nota,
// dirección y una foto tomada con la cámara. Viven en el backend (SQLite y
// disco), no en localStorage: una foto no cabe cómodamente ahí, y así los
// lugares sobreviven a un cambio de navegador.
//
// Para crear uno: tocar el mapa (o usar la ubicación actual) deja un marcador
// borrador, arrastrable; "Guardar este lugar" abre el formulario.
export default function PlacesPage() {
  const theme = useTheme();
  const geo = useGeolocation();
  const placemarks = usePlacemarks();
  const now = useNow(placemarks.savedAt === null ? 0 : TICK);

  const [draft, setDraft] = useState(null);         // { lat, lng } del lugar por crear
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);         // adónde mover la cámara
  const [snack, setSnack] = useState(null);

  if (!MAPS_API_KEY) return <MissingMapsKey />;

  const startDraft = (position) => {
    setDraft(position);
    setSelectedId(null);
    setFocus(position);
  };

  // Ejercicio 5a. El evento de click de <Map> trae las coordenadas en
  // `event.detail.latLng`, como literal { lat, lng } (o null si se tocó algo
  // que no es el mapa). Sin conexión no se puede crear nada. Con un punto
  // válido, llamar a `startDraft` con él.
  // Documentación: https://visgl.github.io/react-google-maps/docs/api-reference/components/map#events
  // eslint-disable-next-line no-unused-vars -- TODO: quitar al resolver el ejercicio 5
  const handleMapClick = (event) => {
    /* TODO */
  };

  const handleLocate = () => {
    if (geo.status === 'located') startDraft(geo.position);
    else geo.locate();
  };

  const handleCreate = async (fields) => {
    await placemarks.create(fields);
    setDraft(null);
    setSnack('Lugar guardado.');
  };

  const handleDelete = async (id) => {
    try {
      await placemarks.remove(id);
      if (selectedId === id) setSelectedId(null);
      setSnack('Lugar eliminado.');
    } catch (error) {
      setSnack(error.message);
    }
  };

  const handleShow = (item) => {
    setSelectedId(item.id);
    setFocus({ lat: item.latitude, lng: item.longitude });
  };

  return (
    <Stack spacing={2} sx={{ my: 2 }}>
      <Typography color="text.secondary">
        Toca un punto del mapa para guardarlo con una foto. También puedes partir de tu ubicación.
      </Typography>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={handleLocate}
          loading={geo.status === 'locating'}
          disabled={placemarks.disconnected || Boolean(GEO_MESSAGES[geo.status])}
        >
          {geo.status === 'located' ? 'Marcar mi ubicación' : 'Usar mi ubicación'}
        </Button>
        {geo.status === 'located' && (
          <Typography variant="body2" color="text.secondary">
            Precisión de ±{Math.round(geo.accuracy)} m.
          </Typography>
        )}
      </Stack>
      {GEO_MESSAGES[geo.status] && (
        <Alert severity="info">{GEO_MESSAGES[geo.status]} Toca el mapa para elegir el punto.</Alert>
      )}
      {placemarks.disconnected && (
        <Alert severity="info">
          Sin conexión: no se pueden crear ni eliminar lugares.
          {placemarks.savedAt !== null && ` Se muestra la lista guardada ${formatSavedAt(placemarks.savedAt, now)}.`}
        </Alert>
      )}
      {placemarks.status === 'error' && (
        <Alert severity="error">No se pudieron cargar los lugares: {placemarks.error.message}</Alert>
      )}

      <Box sx={{ position: 'relative', height: { xs: '55vh', md: 460 }, borderRadius: 2, overflow: 'hidden' }}>
        {placemarks.status === 'loading' && (
          <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', zIndex: 1 }} />
        )}
        <Map
          mapId={MAP_ID}
          defaultCenter={SANTIAGO}
          defaultZoom={13}
          gestureHandling="greedy"
          clickableIcons={false}
          reuseMaps
          onClick={handleMapClick}
        >
          <PlacemarkMarkers
            items={placemarks.items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={handleDelete}
            disconnected={placemarks.disconnected}
          />
          {draft && (
            // Arrastrar el marcador no cuesta nada: es un elemento del mapa ya
            // cargado. La dirección se pide una sola vez, al abrir el formulario.
            <AdvancedMarker
              position={draft}
              title="Nuevo lugar"
              zIndex={1000}
              /* Ejercicio 5b. Hacer el marcador arrastrable (`draggable`) y, en
                 `onDragEnd`, actualizar `draft` con la posición final. El evento
                 es un google.maps.MapMouseEvent: `e.latLng` es un LatLng con los
                 métodos lat() y lng(), no un literal. */
            >
              <Pin
                background={theme.palette.secondary.main}
                borderColor={theme.palette.secondary.dark}
                glyphColor={theme.palette.secondary.contrastText}
                scale={1.2}
              />
            </AdvancedMarker>
          )}
          {focus && <PanTo lat={focus.lat} lng={focus.lng} zoom={15} />}
        </Map>

        {draft && (
          <Paper
            elevation={3}
            sx={{ position: 'absolute', left: 12, right: 12, bottom: 12, p: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>
              Arrastra el marcador si el punto no es exacto.
            </Typography>
            <Button size="small" onClick={() => setDraft(null)}>Cancelar</Button>
            <Button size="small" variant="contained" startIcon={<AddLocationAltIcon />} onClick={() => setFormOpen(true)}>
              Guardar este lugar
            </Button>
          </Paper>
        )}
      </Box>

      <Typography role="status" aria-live="polite" variant="body2" color="text.secondary">
        {placemarks.status === 'success' && `${placemarks.items.length} lugares guardados.`}
      </Typography>

      <PlacemarkList
        items={placemarks.items}
        onShow={handleShow}
        onDelete={handleDelete}
        disconnected={placemarks.disconnected}
      />

      {formOpen && draft && (
        <PlacemarkForm position={draft} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />
      )}

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}
