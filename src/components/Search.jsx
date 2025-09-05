// src/components/Search.jsx
import { useMemo, useState, useEffect } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import PropTypes from 'prop-types';

import SearchText from './SearchText.jsx';
import { GeoProvider } from '../state/geoContext.jsx';
import SearchMap from './SearchMap.jsx';

function TabPanel({ hidden, labelledBy, children }) {
  // Accesible: mantiene contenido montado, solo oculta visualmente
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

function Search({ isFavorite, onAddFavorite }) {
  const [mode, setMode] = useState('text');

  // Montamos el tab de mapa solo la primera vez que se visita; luego queda montado.
  const [mapHasMounted, setMapHasMounted] = useState(false);
  useEffect(() => {
    if (mode === 'map' && !mapHasMounted) setMapHasMounted(true);
  }, [mode, mapHasMounted]);

  const tabs = useMemo(
    () => [
      { value: 'text', label: 'Buscar por texto', id: 'tab-text', panelId: 'panel-text' },
      { value: 'map',  label: 'Elegir en mapa',  id: 'tab-map',  panelId: 'panel-map'  },
    ],
    []
  );

  return (
    <>
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
        <SearchText isFavorite={isFavorite} onAddFavorite={onAddFavorite} />
      </TabPanel>

      {/* ---- MAPA (monta al primer ingreso y queda montado) ---- */}
      <TabPanel hidden={mode !== 'map'} labelledBy="tab-map" id="panel-map" aria-labelledby="tab-map">
        {mapHasMounted && (
          <GeoProvider>
            <SearchMap />
          </GeoProvider>
        )}
      </TabPanel>
    </>
  );
}

Search.propTypes = {
  isFavorite: PropTypes.func.isRequired,
  onAddFavorite: PropTypes.func.isRequired,
};

export default Search;
