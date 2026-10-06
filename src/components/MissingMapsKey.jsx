import { Alert } from '@mui/material';

// Lo que se muestra en lugar de un mapa cuando falta la key de Google Maps.
export default function MissingMapsKey() {
  return (
    <Alert severity="warning" sx={{ m: 2 }}>
      Falta <code>VITE_GOOGLE_MAPS_API_KEY</code>. Copia <code>.env.example</code> como{' '}
      <code>.env</code>, pon tu key y vuelve a iniciar <code>yarn dev</code>.
    </Alert>
  );
}
