import { request } from './request';

// Cliente del recurso /api/placemarks del backend. Como los demás clientes de
// esta carpeta, los componentes importan funciones con nombre y no arman URLs.

export function listPlacemarks({ signal } = {}) {
  return request('/api/placemarks', { signal });
}

// `photo` es un Blob (o null). La creación viaja como multipart/form-data y no
// como JSON, porque la foto son bytes. FormData se encarga del formato, y el
// navegador agrega el Content-Type con su boundary.
export function createPlacemark({ name, note, address, latitude, longitude, photo }) {
  const body = new FormData();
  body.append('name', name);
  body.append('note', note ?? '');
  if (address) body.append('address', address);
  body.append('latitude', latitude.toFixed(6));
  body.append('longitude', longitude.toFixed(6));
  if (photo) body.append('photo', photo, 'foto.jpg');
  return request('/api/placemarks', { method: 'POST', body });
}

export function deletePlacemark(id) {
  return request(`/api/placemarks/${id}`, { method: 'DELETE' });
}
