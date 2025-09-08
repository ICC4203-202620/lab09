import { useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Fab,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PropTypes from 'prop-types';
import Weather from './Weather';

/** Hash simple para derivar color desde el nombre */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function placeholderGradient(name) {
  const h1 = hash(name) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1} 65% 55%) 0%, hsl(${h2} 65% 45%) 100%)`;
}

function Home({ favorites, removeFavorite }) {
  const scrollerRef = useRef(null);

  // Si el carrusel reduce ancho (al quitar cards), corrige el scroll para no quedar “fuera”.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (el.scrollLeft > maxScrollLeft) {
      el.scrollTo({ left: Math.max(0, maxScrollLeft), behavior: 'smooth' });
    }
  }, [favorites.length]);

  const getScrollAmount = () => {
    const w = scrollerRef.current?.clientWidth ?? 600;
    return Math.floor(w * 0.9);
    // ~90% del ancho visible para avanzar casi “una pantalla”
  };

  const goLeft = () =>
    scrollerRef.current?.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
  const goRight = () =>
    scrollerRef.current?.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });

  // helper para detectar elementos interactivos
  const isInteractive = (el) =>
    el?.closest?.('button, [role="button"], a, input, textarea, select, [contenteditable="true"]');

  const dragging = useRef(false);
  const isDown = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = scrollerRef.current;
    if (!el) return;

    // Si el click parte sobre un control, no armamos drag
    if (isInteractive(e.target)) return;

    isDown.current = true;
    dragging.current = false; // aún no estamos arrastrando
    startX.current = e.clientX;
    startScrollLeft.current = el.scrollLeft;
  };

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse' || !isDown.current) return;
    const el = scrollerRef.current;
    if (!el) return;

    const dx = e.clientX - startX.current;

    // Umbral pequeño antes de “enganchar” el drag
    if (!dragging.current && Math.abs(dx) > 4) {
      dragging.current = true;
      el.setPointerCapture?.(e.pointerId);
      el.style.cursor = 'grabbing';
    }

    if (dragging.current) {
      el.scrollLeft = startScrollLeft.current - dx;
      e.preventDefault(); // evita que se cree un click “fantasma”
    }
  };

  const onPointerUp = (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = scrollerRef.current;
    if (dragging.current) {
      el?.releasePointerCapture?.(e.pointerId);
    }
    dragging.current = false;
    isDown.current = false;
    if (el) el.style.cursor = '';
  };

  if (favorites.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Aún no tienes ubicaciones en tu Inicio
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Agrega ubicaciones desde <strong>Buscar</strong> para verlas aquí como tarjetas.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        px: { xs: 1, sm: 2 },
        py: 1,
        display: 'flex',
        alignItems: 'center',
        '@media (orientation: portrait)': { minHeight: '72dvh' },
        '@media (orientation: landscape)': { minHeight: '56dvh' },
      }}
    >
      {/* Flechas */}
      <Fab
        size="small"
        onClick={goLeft}
        aria-label="Anterior"
        sx={{
          position: 'absolute',
          top: '50%',
          left: { xs: 6, sm: 12 },
          transform: 'translateY(-50%)',
          zIndex: 2,
          boxShadow: 2,
          '@media (orientation: portrait)': { top: '58%' },
        }}
      >
        <ChevronLeftIcon />
      </Fab>
      <Fab
        size="small"
        onClick={goRight}
        aria-label="Siguiente"
        sx={{
          position: 'absolute',
          top: '50%',
          right: { xs: 6, sm: 12 },
          transform: 'translateY(-50%)',
          zIndex: 2,
          boxShadow: 2,
          '@media (orientation: portrait)': { top: '58%' },
        }}
      >
        <ChevronRightIcon />
      </Fab>

      {/* Carrusel */}
      <Box
        ref={scrollerRef}
        role="list"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        sx={{
          '--gap': '14px',
          display: 'grid',
          gridAutoFlow: 'column',
          gap: 'var(--gap)',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          scrollPadding: '16px',
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          py: 1,
          mx: 'auto',
          width: '100%',
          gridAutoColumns: { xs: '94vw', sm: '520px' },
          '@media (orientation: landscape)': {
            gridAutoColumns: 'calc((100% - var(--gap)) / 2)',
          },
        }}
      >
        {favorites.map((fav) => (
          <Card
            role="listitem"
            key={fav.id}
            sx={{
              scrollSnapAlign: 'center',
              '@media (orientation: landscape)': { scrollSnapAlign: 'start', height: 340 },
              borderRadius: 3,
              boxShadow: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              '@media (orientation: portrait)': { height: 'min(82dvh, 720px)' },
            }}
          >
            {/* Header/imagen */}
            <Box
              sx={{
                position: 'relative',
                background: placeholderGradient(fav.name),
                aspectRatio: { xs: '4 / 5', sm: '16 / 9' },
                '@media (orientation: portrait)': { aspectRatio: '4 / 5' },
                '@media (orientation: landscape)': { aspectRatio: '4 / 1' },
                flex: { xs: '0 0 auto' },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  position: 'absolute',
                  left: 16,
                  bottom: 12,
                  color: 'white',
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  pr: 6,
                }}
              >
                {fav.name}
              </Typography>

              <Tooltip title="Quitar de Inicio">
                <IconButton
                  onClick={() => { removeFavorite(fav.id)}}
                  aria-label={`Quitar ${fav.name}`}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(255,255,255,0.85)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                    boxShadow: 1,
                  }}
                >
                  <DeleteIcon color="error" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Contenido */}
            <CardContent
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                '@media (orientation: portrait)': { flex: 1 },
              }}
            >
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Weather location={fav.name} />
              </Stack>

              {fav.lat != null && fav.lng != null && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Lat: {Number(fav.lat).toFixed(4)}, Long: {Number(fav.lng).toFixed(4)}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

Home.propTypes = {
  favorites: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      lat: PropTypes.number, // opcional
      lng: PropTypes.number, // opcional
    })
  ).isRequired,
  removeFavorite: PropTypes.func.isRequired, // recibe el id del favorito
};

export default Home;
