import { useMemo, useState } from 'react';
import { Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import useLocalStorageState from 'use-local-storage-state';
import {
  AppBar, Toolbar, Typography, Button, Container, IconButton, Drawer,
  List, ListItemButton, ListItemIcon, ListItemText, Divider, Box
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import Home from './components/Home';
import Search from './components/Search';
import UserProfile from './components/UserProfile';
import Horoscope from './components/Horoscope';

function App() {
  // Favorites persisted
  const [favorites, setFavorites] = useLocalStorageState('WeatherApp/Favorites', {
    defaultValue: ['Santiago de Chile'],
  });

  const isFavorite = (name) => favorites.includes(name);

  const onAddFavorite = (name) => {
    if (!name) return;
    if (!favorites.includes(name)) setFavorites([...favorites, name]);
  };

  const removeFavorite = (name) => {
    setFavorites(favorites.filter((c) => c !== name));
  };

  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const title = useMemo(() => {
    switch (location.pathname) {
      case '/search': return 'Buscar ciudad';
      case '/profile': return 'Perfil';
      case '/horoscope': return 'Horóscopo';
      default: return 'Clima';
    }
  }, [location.pathname]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = (open) => () => setDrawerOpen(open);

  const navItems = [
    { to: '/', label: 'Inicio', icon: <HomeIcon /> },
    { to: '/search', label: 'Buscar', icon: <SearchIcon /> },
    { to: '/profile', label: 'Perfil', icon: <PersonIcon /> },
    { to: '/horoscope', label: 'Horóscopo', icon: <AutoAwesomeIcon /> },
  ];

  const DrawerContent = (
    <Box
      role="presentation"
      sx={{ width: 270 }}
      onKeyDown={(e) => {
        // Cerrar con ESC
        if (e.key === 'Escape') setDrawerOpen(false);
      }}
    >
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="h6">{title}</Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map(({ to, label, icon }) => {
          const selected = location.pathname === to;
          return (
            <ListItemButton
              key={to}
              component={NavLink}
              to={to}
              selected={selected}
              onClick={() => setDrawerOpen(false)}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {/* Botón menú para xs/sm */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer(true)}
            sx={{ mr: 1, display: { xs: 'inline-flex', md: 'none' } }}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </Typography>

          {/* Botones visibles en md+ (opcional) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <Button color="inherit" component={Link} to="/" startIcon={<HomeIcon />}>
              Inicio
            </Button>
            <Button color="inherit" component={Link} to="/search" startIcon={<SearchIcon />}>
              Buscar
            </Button>
            <Button color="inherit" component={Link} to="/profile" startIcon={<PersonIcon />}>
              Perfil
            </Button>
            <Button color="inherit" component={Link} to="/horoscope" startIcon={<AutoAwesomeIcon />}>
              Horóscopo
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Offset para que el contenido no quede bajo la AppBar */}
      <Toolbar />

      {/* Drawer lateral */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        ModalProps={{ keepMounted: true }} // mejor rendimiento en móviles
      >
        {DrawerContent}
      </Drawer>

      <Container component="main" maxWidth="md" sx={{ px: 2, py: 2 }}>
        <Routes>
          <Route path="/" element={<Home favorites={favorites} removeFavorite={removeFavorite} />} />
          <Route path="/search" element={<Search isFavorite={isFavorite} onAddFavorite={onAddFavorite} />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/horoscope" element={<Horoscope profileTo="/profile" />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
