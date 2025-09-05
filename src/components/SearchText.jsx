import { useEffect, useReducer } from 'react';
import {
  Autocomplete,
  Box,
  TextField,
  Button,
  Typography,
  Stack
} from '@mui/material';
import useLocalStorageState from 'use-local-storage-state';
import SearchIcon from '@mui/icons-material/Search';
import PropTypes from 'prop-types';

import { fetchWeatherMulti } from '../api/weatherApi';
import SearchResult from './SearchResult';

const initialState = {
  inputValue: '',
  query: '',
  results: [],     // [{ location, temps }]
  loading: false,
  error: '',
};

const ACTIONS = {
  SET_INPUT: 'SET_INPUT',
  START_SEARCH: 'START_SEARCH',
  SEARCH_SUCCESS: 'SEARCH_SUCCESS',
  SEARCH_ERROR: 'SEARCH_ERROR',
  RESET: 'RESET',
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_INPUT:
      return { ...state, inputValue: action.payload };
    case ACTIONS.START_SEARCH:
      return {
        ...state,
        query: action.payload, // normalized query to trigger effect
        loading: true,
        error: '',
        results: [],
      };
    case ACTIONS.SEARCH_SUCCESS:
      return {
        ...state,
        loading: false,
        error: '',
        results: action.payload,
      };
    case ACTIONS.SEARCH_ERROR:
      return {
        ...state,
        loading: false,
        results: [],
        error: action.payload || 'Search failed.',
      };
    case ACTIONS.RESET:
      return {
        ...state,
        query: '',
        results: [],
        loading: false,
        error: '',
      };
    default:
      return state;
  }
}

export default function SearchText({ isFavorite, onAddFavorite }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Search history persisted in localStorage
  const [keywordList, setKeywordList] = useLocalStorageState('WeatherApp/Search/KeywordList', {
    defaultValue: [],
  });

  // Effect triggered when "query" changes
  useEffect(() => {
    const run = async () => {
      try {
        const arr = await fetchWeatherMulti(state.query);
        if (arr.length) {
          dispatch({ type: ACTIONS.SEARCH_SUCCESS, payload: arr });
          // Add to history if not present
          if (state.query && !keywordList.includes(state.query)) {
            setKeywordList([...keywordList, state.query]);
          }
        } else {
          dispatch({
            type: ACTIONS.SEARCH_ERROR,
            payload: 'No se encontraron ubicaciones para tu búsqueda.',
          });
        }
      } catch {
        dispatch({
          type: ACTIONS.SEARCH_ERROR,
          payload: 'Ocurrió un error realizando la búsqueda.',
        });
      }
    };

    if (state.query) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query]);

  // Handlers
  const handleSearch = () => {
    const trimmed = state.inputValue.trim();
    if (!trimmed) {
      dispatch({
        type: ACTIONS.SEARCH_ERROR,
        payload: 'Ingresa una ciudad para buscar.',
      });
      return;
    }
    dispatch({ type: ACTIONS.START_SEARCH, payload: trimmed });
  };

  const handleClearHistory = () => {
    setKeywordList([]);
  };

  return (
    <>
      <Box sx={{ m: 2, maxWidth: 900, mx: 'auto', bgcolor: 'white', p: 2 }}>
        <Autocomplete
          freeSolo
          options={keywordList}
          value={null}                       // no option selected by default
          inputValue={state.inputValue}      // control the input text
          onInputChange={(_, newInputValue) =>
            dispatch({ type: ACTIONS.SET_INPUT, payload: newInputValue })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar ciudad (p. ej. 'Santiago, CL' o 'Columbus, OH, US')"
              variant="outlined"
              fullWidth
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          )}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleSearch}
            startIcon={<SearchIcon />}
            disabled={state.loading}
          >
            {state.loading ? 'Buscando...' : 'Buscar'}
          </Button>

          {keywordList.length > 0 && (
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              onClick={handleClearHistory}
              disabled={state.loading}
            >
              Limpiar historial
            </Button>
          )}
        </Stack>

        {state.error && (
          <Box sx={{ mt: 1, color: 'error.main', fontSize: 14 }}>
            {state.error}
          </Box>
        )}
      </Box>

      {/* Results grid */}
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
        {state.results.map(({ location, temps }) => {
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

      {!!state.results.length && (
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mb: 3 }}>
          Ordenado por población (descendente).
        </Typography>
      )}
    </>
  );
}

SearchText.propTypes = {
  isFavorite: PropTypes.func.isRequired,
  onAddFavorite: PropTypes.func.isRequired,
};
