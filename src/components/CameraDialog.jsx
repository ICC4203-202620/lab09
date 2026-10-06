// TODO: esta línea silencia al linter mientras el archivo esté a medio
// implementar. Bórrala al terminar el ejercicio 6.
/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip,
} from '@mui/material';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PropTypes from 'prop-types';
import { canvasToJpeg } from '../utils/image';

const MAX_SIDE = 1280;

const MESSAGES = {
  NotAllowedError: 'No tenemos permiso para usar la cámara. Puedes concederlo en la configuración del sitio.',
  NotFoundError: 'Este dispositivo no tiene una cámara disponible.',
  NotReadableError: 'La cámara está en uso por otra aplicación.',
  OverconstrainedError: 'No hay una cámara que cumpla lo pedido.',
};

// Visor de cámara dentro de la aplicación, con la API getUserMedia.
//
// El padre lo monta solo mientras está abierto (`{open && <CameraDialog/>}`),
// de modo que cada apertura parte con el estado inicial y el efecto de abajo
// no tiene que reiniciar nada: solo pide el stream y lo suelta al salir.
//
// El flujo es siempre el mismo: pedir un MediaStream, mostrarlo en un <video>,
// y al capturar, dibujar el cuadro actual en un <canvas> para obtener una
// imagen. El stream hay que detenerlo al cerrar (track.stop()): mientras siga
// vivo, la luz de la cámara queda encendida aunque el diálogo ya no se vea.
//
// `facingMode` elige entre la cámara trasera ('environment') y la frontal
// ('user'). Es una preferencia ("ideal"), no una exigencia: en un computador
// con una sola cámara se usa la que haya.
export default function CameraDialog({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  // TODO (ejercicio 6): el mensaje inicial desaparece al implementar el visor;
  // vuelve a partir en null.
  const [error, setError] = useState('Ejercicio 6: el visor todavía no pide la cámara.');
  const [ready, setReady] = useState(false);

  // Cambiar de cámara reinicia el visor: el efecto suelta el stream anterior
  // y pide otro con la nueva preferencia.
  const switchCamera = () => {
    setError(null);
    setReady(false);
    setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    // Ejercicio 6. Pedir la cámara y mostrarla en el <video>:
    //
    // 1. `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false })`
    //    devuelve una promesa de MediaStream. Al resolverse, asignarlo a
    //    `videoRef.current.srcObject`. El <video> tiene autoPlay, y su evento
    //    onLoadedMetadata ya pone `ready` en true.
    //
    // 2. Si la promesa falla, mostrar el mensaje de MESSAGES según `err.name`
    //    (NotAllowedError, NotFoundError…), o uno genérico.
    //
    // 3. En la limpieza del efecto, detener cada pista del stream con
    //    `stream.getTracks().forEach((track) => track.stop())`. Sin esto la luz
    //    de la cámara sigue encendida después de cerrar el diálogo. Ojo con el
    //    caso en que el usuario cierra el diálogo antes de que la promesa
    //    resuelva: el stream llega cuando ya nadie lo quiere, y hay que
    //    detenerlo igual (una bandera `cancelled` sirve).
    //
    // Documentación: https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia
    /* TODO */
  }, [facingMode]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    // El cuadro se reduce al capturarlo, no después: así nunca existe la
    // versión grande.
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(await canvasToJpeg(canvas));
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Tomar una foto
        <Tooltip title="Cambiar de cámara">
          <IconButton aria-label="Cambiar de cámara" onClick={switchCamera}>
            <CameraswitchIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="warning">{error}</Alert>
        ) : (
          <Box
            component="video"
            ref={videoRef}
            autoPlay
            playsInline  // sin esto, iOS abre el video a pantalla completa
            muted
            onLoadedMetadata={() => setReady(true)}
            sx={{ width: '100%', borderRadius: 1, bgcolor: 'black', aspectRatio: '4 / 3', objectFit: 'cover' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<PhotoCameraIcon />} onClick={capture} disabled={!ready || Boolean(error)}>
          Capturar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CameraDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCapture: PropTypes.func.isRequired,
};
