import { AdvancedMarker, InfoWindow, Pin } from '@vis.gl/react-google-maps';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import PropTypes from 'prop-types';

const dateFormat = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

// Un marcador por lugar y una sola InfoWindow, la del seleccionado. La
// selección vive en el padre (PlacesPage) porque la lista de abajo también la
// cambia: "Ver en el mapa" selecciona el mismo lugar.
export default function PlacemarkMarkers({ items, selectedId, onSelect, onDelete, disconnected }) {
  const theme = useTheme();
  const selected = items.find((item) => item.id === selectedId);

  return (
    <>
      {items.map((item) => (
        <AdvancedMarker
          key={item.id}
          position={{ lat: item.latitude, lng: item.longitude }}
          title={item.name}
          onClick={() => onSelect(item.id)}
        >
          <Pin
            background={theme.palette.primary.main}
            borderColor={theme.palette.primary.dark}
            glyphColor={theme.palette.primary.contrastText}
          />
        </AdvancedMarker>
      ))}
      {selected && (
        <InfoWindow
          position={{ lat: selected.latitude, lng: selected.longitude }}
          pixelOffset={[0, -40]}
          maxWidth={280}
          headerContent={<Typography variant="subtitle2">{selected.name}</Typography>}
          onCloseClick={() => onSelect(null)}
        >
          {selected.photo_url && (
            <Box
              component="img"
              src={selected.photo_url}
              alt={`Foto de ${selected.name}`}
              loading="lazy"
              sx={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 1, mb: 1 }}
            />
          )}
          {selected.address && <Typography variant="body2">{selected.address}</Typography>}
          {selected.note && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selected.note}</Typography>
          )}
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            {dateFormat.format(new Date(selected.created_at))}
          </Typography>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onDelete(selected.id)}
            disabled={disconnected}
            sx={{ mt: 1 }}
          >
            Eliminar
          </Button>
        </InfoWindow>
      )}
    </>
  );
}

PlacemarkMarkers.propTypes = {
  items: PropTypes.array.isRequired,
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  disconnected: PropTypes.bool,
};
