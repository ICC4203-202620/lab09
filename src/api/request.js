// Cliente HTTP mínimo para el backend, el mismo de la aplicación de ejemplo de
// la clase 10. Distingue los tres desenlaces que la interfaz muestra de forma
// distinta: el servidor respondió con un error (ApiError), la red falló
// (NetworkError), o la vista canceló la solicitud porque ya no la necesita
// (AbortError, que no se muestra).
//
// Es la contraparte de los clientes de src/api que usan `fetch` a mano
// (geocodeClient, translateClient…): cuando hay más de dos endpoints, repetir
// `if (!res.ok) throw …` en cada uno deja de tener gracia.
export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : (detail?.message ?? `HTTP ${status}`));
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export class NetworkError extends Error {
  constructor() {
    super('No hay conexión con el servidor.');
    this.name = 'NetworkError';
  }
}

export const isAbort = (error) => error?.name === 'AbortError';

// `body` puede ser un objeto (se envía como JSON) o un FormData (se envía tal
// cual, y el navegador pone el Content-Type con su boundary: no hay que
// definirlo a mano).
export async function request(path, { method = 'GET', body, signal } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let response;
  try {
    response = await fetch(path, {
      method,
      signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new NetworkError();
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.detail);
  return data;
}
