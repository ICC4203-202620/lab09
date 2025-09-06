import PropTypes from 'prop-types';
import { Box, Typography, Alert, LinearProgress } from '@mui/material';
import { useSearchResults } from '../state/searchResultsContext.jsx';
import SearchResult from './SearchResult';

export default function SearchResultsList({ isFavorite, onAddFavorite }) {
  const { state } = useSearchResults();
  const { results, loading, error } = state;

  return (
    <>
      {loading && <LinearProgress sx={{ my: 1 }} />}

      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          m: 2,
          maxWidth: 1200,
          mx: 'auto',
          display: 'grid',
          gap: 2,
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        }}
      >
        {results.map(({ location, temps }) => {
          const label = `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}, ${location.country_code}`;
          return (
            <SearchResult
              key={`${location.id}-${location.latitude}-${location.longitude}`}
              label={label}
              location={location}
              temps={temps}
              isFavorite={isFavorite}
              onAddFavorite={onAddFavorite}
            />
          );
        })}
      </Box>

      {!!results.length && (
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mb: 3 }}>
          Ordenado por población (descendente).
        </Typography>
      )}
    </>
  );
}

SearchResultsList.propTypes = {
  isFavorite: PropTypes.func.isRequired,
  onAddFavorite: PropTypes.func.isRequired,
};
