import { useMemo, useState, useEffect } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import PropTypes from 'prop-types';

import SearchText from './SearchText.jsx';
import { GeoProvider } from '../state/geoContext.jsx';
import SearchMap from './SearchMap.jsx';
import { SearchResultsProvider } from '../state/searchResultsContext.jsx';
import SearchResultsList from './SearchResultsList.jsx';

function TabPanel({ hidden, labelledBy, children }) {
  return (
    <Box
      role="tabpanel"
      aria-labelledby={labelledBy}
      hidden={hidden}
      sx={{ display: hidden ? 'none' : 'block' }}
    >
      {children}
    </Box>
  );
}

function Search({ isFavorite, onAddFavorite, favorites, onRemoveFavoriteByName }) {
  const [mode, setMode] = useState('text');
  const [mapHasMounted, setMapHasMounted] = useState(false);
  useEffect(() => { if (mode === 'map' && !mapHasMounted) setMapHasMounted(true); }, [mode, mapHasMounted]);

  const tabs = useMemo(
    () => [
      { value: 'text', label: 'Buscar por texto', id: 'tab-text', panelId: 'panel-text' },
      { value: 'map',  label: 'Elegir en mapa',  id: 'tab-map',  panelId: 'panel-map'  },
    ],
    []
  );

  return (
    <SearchResultsProvider>
      {/* Header + Tabs */}
      <Box sx={{ m: 2, maxWidth: 900, mx: 'auto', bgcolor: 'white' }}>
        <Tabs
          value={mode}
          onChange={(_, v) => setMode(v)}
          aria-label="Search modes"
          sx={{ mb: 2 }}
        >
          {tabs.map(t => (
            <Tab
              key={t.value}
              value={t.value}
              label={t.label}
              id={t.id}
              aria-controls={t.panelId}
            />
          ))}
        </Tabs>
      </Box>

      {/* ---- TEXTO (siempre montado) ---- */}
      <TabPanel hidden={mode !== 'text'} labelledBy="tab-text" id="panel-text" aria-labelledby="tab-text">
        <SearchText onAddFavorite={onAddFavorite} isFavorite={isFavorite} />
      </TabPanel>

      {/* ---- MAPA (monta al primer ingreso y queda montado) ---- */}
      <TabPanel hidden={mode !== 'map'} labelledBy="tab-map" id="panel-map" aria-labelledby="tab-map">
        {mapHasMounted && (
          <GeoProvider>
            <SearchMap onAddFavorite={onAddFavorite} favoritePins={favorites} />
          </GeoProvider>
        )}
      </TabPanel>

      {/* ---- LISTA DE RESULTADOS COMPARTIDA ---- */}
      <SearchResultsList
        isFavorite={isFavorite}
        onAddFavorite={onAddFavorite}
        onRemoveFavoriteByName={onRemoveFavoriteByName}
      />
    </SearchResultsProvider>
  );
}

Search.propTypes = {
  isFavorite: PropTypes.func.isRequired,
  onAddFavorite: PropTypes.func.isRequired,
  favorites: PropTypes.func.isRequired,
  onRemoveFavoriteByName: PropTypes.func.isRequired,
};

export default Search;
