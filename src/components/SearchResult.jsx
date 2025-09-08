/* eslint-disable react/prop-types */
import { Card, CardContent, Typography, IconButton, Stack, Tooltip } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';

const fmt = (v) => (v == null ? '—' : `${v} °C`);

const SearchResult = ({ label, location, temps, isFavorite, onAddFavorite, onRemoveFavoriteByName }) => {
  if (!temps) return null;

  const maxToday = (temps.tempMaxForecast ?? temps.tempMaxObserved);
  const minToday = (temps.tempMinForecast ?? temps.tempMinObserved);

  const fav = Boolean(isFavorite?.(label));
  const handleToggle = () => {
    if (fav) {
      onRemoveFavoriteByName?.(label);
    } else {
      const lat = Number(location?.latitude ?? NaN);
      const lng = Number(location?.longitude ?? NaN);
      onAddFavorite?.(label, isFinite(lat) && isFinite(lng) ? { lat, lng } : undefined);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={1}>
          <Typography variant="h6" component="h3" gutterBottom>
            {label}
          </Typography>
          <Tooltip title={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
            <IconButton onClick={handleToggle} aria-label="favorite" color={fav ? 'error' : 'default'}>
              {fav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          </Tooltip>
        </Stack>

        <Typography variant="body1"><strong>Actual:</strong> {fmt(temps.temp)}</Typography>
        <Typography variant="body1"><strong>Máxima:</strong> {fmt(maxToday)}</Typography>
        <Typography variant="body1"><strong>Mínima:</strong> {fmt(minToday)}</Typography>
      </CardContent>
    </Card>
  );
};

export default SearchResult;
