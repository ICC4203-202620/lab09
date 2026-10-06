import { Box, Button, Card, CardActions, CardContent, CardMedia, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import DeleteIcon from '@mui/icons-material/Delete';
import PropTypes from 'prop-types';

const dateFormat = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' });

// Las tarjetas de los lugares, debajo del mapa. La imagen se pide con
// `loading="lazy"`: el navegador la descarga cuando la tarjeta se acerca a la
// pantalla, no antes.
export default function PlacemarkList({ items, onShow, onDelete, disconnected }) {
  if (items.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
        Aún no has guardado lugares. Toca un punto del mapa para crear el primero.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      }}
    >
      {items.map((item) => (
        <Card key={item.id} sx={{ borderRadius: 3, boxShadow: 2, display: 'flex', flexDirection: 'column' }}>
          {item.photo_url && (
            <CardMedia
              component="img"
              image={item.photo_url}
              alt={`Foto de ${item.name}`}
              loading="lazy"
              sx={{ height: 160, objectFit: 'cover' }}
            />
          )}
          <CardContent sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom>{item.name}</Typography>
            {item.address && <Typography variant="body2">{item.address}</Typography>}
            {item.note && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.note}</Typography>
            )}
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
              {dateFormat.format(new Date(item.created_at))}
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" startIcon={<PlaceIcon />} onClick={() => onShow(item)}>
              Ver en el mapa
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => onDelete(item.id)}
              disabled={disconnected}
            >
              Eliminar
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
}

PlacemarkList.propTypes = {
  items: PropTypes.array.isRequired,
  onShow: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  disconnected: PropTypes.bool,
};
