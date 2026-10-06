import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import CameraCapture from './CameraCapture';
import { reverseGeocodeServer } from '../api/geocodeClient';
import { formatCoords } from '../geo/locality';

// Formulario para guardar un lugar: nombre, nota, dirección y foto. Las
// coordenadas ya vienen decididas (el punto tocado o arrastrado en el mapa);
// la dirección se propone con reverse geocoding a través del backend, y el
// usuario puede corregirla.
//
// El padre monta este componente solo mientras el formulario está abierto, de
// modo que cada apertura arranca con el estado inicial: `addressStatus` parte
// en 'loading' porque lo primero que ocurre es pedir la dirección.
export default function PlacemarkForm({ position, onClose, onSubmit }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [address, setAddress] = useState('');
  const [addressStatus, setAddressStatus] = useState('loading'); // loading | done | failed
  const [photo, setPhoto] = useState(null);
  const [tried, setTried] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState(null);

  // Al abrir, se propone la dirección del punto. El backend responde
  // `formatted: null` cuando no hay dirección (en medio del mar, por ejemplo),
  // y eso no es un error: simplemente el campo queda vacío.
  useEffect(() => {
    let current = true;
    reverseGeocodeServer(position.lat, position.lng)
      .then((result) => {
        if (!current) return;
        if (result?.formatted) setAddress(result.formatted);
        setAddressStatus('done');
      })
      .catch(() => { if (current) setAddressStatus('failed'); });
    return () => { current = false; };
  }, [position]);

  const nameError = !name.trim() && 'Ponle un nombre al lugar.';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTried(true);
    if (nameError || submitting) return;
    setSubmitting(true);
    setProblem(null);
    try {
      await onSubmit({
        name: name.trim(),
        note: note.trim(),
        address: address.trim() || null,
        latitude: position.lat,
        longitude: position.lng,
        photo,
      });
      onClose();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>Nuevo lugar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Coordenadas: {formatCoords(position)}
            </Typography>
            <TextField
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={tried && Boolean(nameError)}
              helperText={(tried && nameError) || ' '}
              required
              autoFocus
              fullWidth
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              helperText={
                addressStatus === 'loading' ? 'Buscando la dirección…'
                  : addressStatus === 'failed' ? 'No se pudo consultar la dirección; puedes escribirla.'
                    : 'Propuesta por Google a partir del punto. Puedes corregirla.'
              }
              fullWidth
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              label="Nota"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <CameraCapture value={photo} onChange={setPhoto} />
            {problem && <Alert severity="error">{problem}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" variant="contained" loading={submitting}>Guardar</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

PlacemarkForm.propTypes = {
  position: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
