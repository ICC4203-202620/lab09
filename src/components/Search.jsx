import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import PropTypes from 'prop-types';
import SearchText from './SearchText';
import SearchMap from './SearchMap';

// Dos maneras de buscar una ciudad: escribiendo su nombre (la de los
// laboratorios anteriores, en SearchText) o tocando un punto del mapa
// (SearchMap). Este componente solo reparte: las pestañas y nada más.
function Search({ isFavorite, onAddFavorite }) {
  const [mode, setMode] = useState('text');

  // El mapa se monta la primera vez que el usuario entra a su pestaña y
  // después queda montado, aunque oculto. Cada <Map> que se monta es una
  // carga de mapa que Google cobra: mejor una sola por visita a la pantalla.
  const [mapMounted, setMapMounted] = useState(false);

  const handleChange = (_, value) => {
    setMode(value);
    if (value === 'map') setMapMounted(true);
  };

  return (
    <>
      <Box sx={{ m: 2, maxWidth: 900, mx: 'auto' }}>
        <Tabs value={mode} onChange={handleChange} variant="fullWidth" aria-label="Modos de búsqueda">
          <Tab value="text" label="Por texto" id="tab-text" aria-controls="panel-text" />
          <Tab value="map" label="En el mapa" id="tab-map" aria-controls="panel-map" />
        </Tabs>
      </Box>

      <Box role="tabpanel" id="panel-text" aria-labelledby="tab-text" hidden={mode !== 'text'}>
        <SearchText isFavorite={isFavorite} onAddFavorite={onAddFavorite} />
      </Box>

      <Box role="tabpanel" id="panel-map" aria-labelledby="tab-map" hidden={mode !== 'map'}>
        {mapMounted && <SearchMap isFavorite={isFavorite} onAddFavorite={onAddFavorite} />}
      </Box>
    </>
  );
}

Search.propTypes = {
  isFavorite: PropTypes.func.isRequired,
  onAddFavorite: PropTypes.func.isRequired,
};

export default Search;
