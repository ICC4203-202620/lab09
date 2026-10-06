import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PropTypes from 'prop-types';
import CameraDialog from './CameraDialog';
import { resizeImage } from '../utils/image';

// Dos caminos para obtener una foto en una aplicación web, y los dos sirven:
//
// 1. <input type="file" accept="image/*" capture="environment">. Es el más
//    antiguo y el más robusto: en un teléfono abre la cámara nativa (o la
//    galería), y en un computador el selector de archivos. No necesita
//    permisos propios ni HTTPS, y funciona también en las PWA instaladas en
//    iOS, donde getUserMedia ha tenido problemas en varias versiones.
// 2. getUserMedia, en CameraDialog: un visor dentro de la aplicación, con la
//    experiencia de una app nativa. Requiere contexto seguro (HTTPS o
//    localhost) y el permiso de cámara, y no todos los dispositivos lo tienen.
//
// Se ofrece el segundo cuando el navegador lo soporta, y el primero siempre.
// En ambos casos la imagen se reduce antes de guardarla (ver utils/image.js).
export default function CameraCapture({ value, onChange }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const liveCameraAvailable =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;

  // Vista previa: una URL temporal para el Blob, que hay que liberar cuando
  // cambie o al desmontar, o el navegador la retiene en memoria.
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (!value) return undefined;
    const url = URL.createObjectURL(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL existe solo mientras exista el Blob
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [value]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite elegir el mismo archivo otra vez
    if (!file) return;
    setError(null);
    try {
      onChange(await resizeImage(file));
    } catch {
      setError('No se pudo leer esa imagen.');
    }
  };

  return (
    <Stack spacing={1}>
      {value && previewUrl && (
        <Box
          component="img"
          src={previewUrl}
          alt="Foto del lugar"
          sx={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 1 }}
        />
      )}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {liveCameraAvailable && (
          <Button variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => setCameraOpen(true)}>
            Tomar foto
          </Button>
        )}
        <Button variant="outlined" startIcon={<AddPhotoAlternateIcon />} onClick={() => inputRef.current?.click()}>
          {liveCameraAvailable ? 'Elegir imagen' : 'Tomar o elegir foto'}
        </Button>
        {value && (
          <Button color="secondary" startIcon={<DeleteIcon />} onClick={() => onChange(null)}>
            Quitar
          </Button>
        )}
      </Stack>
      {/* Oculto: los botones de arriba lo accionan. `capture` sugiere la cámara
          trasera en teléfonos; los computadores lo ignoran. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
      />
      {value && (
        <Typography variant="caption" color="text.secondary">
          {(value.size / 1024).toFixed(0)} KB, lista para subir.
        </Typography>
      )}
      {error && <Alert severity="warning">{error}</Alert>}

      {liveCameraAvailable && cameraOpen && (
        <CameraDialog onClose={() => setCameraOpen(false)} onCapture={onChange} />
      )}
    </Stack>
  );
}

CameraCapture.propTypes = {
  value: PropTypes.instanceOf(Blob),
  onChange: PropTypes.func.isRequired,
};
