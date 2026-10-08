# Laboratorio 9: Mapas, geolocalización y cámara

En este laboratorio continuaremos desarrollando la aplicación de clima con React y MUI de los laboratorios 6, 7 y 8. La aplicación sigue usando la API de [Open-Meteo](https://open-meteo.com/) para el clima, conserva su condición de PWA, y mantiene el perfil con Formik y el horóscopo traducido con Google.

Lo nuevo es el mapa. La pantalla Buscar tiene ahora una segunda pestaña, *En el mapa*, donde se toca un punto y la aplicación encuentra la ciudad más cercana, muestra su clima y puede listar los hoteles de los alrededores. Y hay una pantalla nueva, Lugares, donde el usuario guarda puntos del mapa con un nombre, una nota, la dirección y una fotografía tomada con la cámara del teléfono. Los lugares viven en un backend nuevo, escrito en Python con FastAPI y SQLite, que reemplaza al servidor Express del laboratorio 8 y conserva sus endpoints de geocodificación, traducción y horóscopo.

## Pasos iniciales

### Node.js y Python

Verifica tu versión de Node.js con `node -v`. Vite 8 requiere Node 20.19 o superior, o bien 22.12 o superior. Si tienes una versión anterior, actualízala con [nvm](https://github.com/nvm-sh/nvm) o con el instalador de [nodejs.org](https://nodejs.org/).

El backend necesita Python 3.12 o superior: `python3 --version`. En macOS viene con Xcode Command Line Tools o con Homebrew (`brew install python`); en Windows, desde [python.org](https://www.python.org/downloads/) marcando *Add python.exe to PATH*; en Linux, con el gestor de paquetes de la distribución.

### Créditos de Google Cloud

Google entregó al curso créditos para usar las APIs de Google Cloud Platform: 50 USD por estudiante. El aviso con las instrucciones para obtener el cupón está publicado en Canvas. Si lo canjeaste para el laboratorio 8, el mismo proyecto y la misma cuenta de facturación sirven aquí; sin facturación activa las APIs de Google responden `REQUEST_DENIED`.

Los créditos alcanzan de sobra para el laboratorio y para el proyecto del curso, siempre que las keys no se filtren y la aplicación no cargue mapas de más. Este laboratorio agrega la Maps JavaScript API, cuya carga de mapa es el SKU más caro de los que usamos, así que conviene entender desde ya qué cuesta qué (ver *La key, la cuota y el costo* más abajo).

### Proyecto y API keys

En [Google Cloud Console](https://console.cloud.google.com/) ingresa con tus credenciales de `miuandes` y abre el proyecto del laboratorio 8, o crea uno llamado `icc4203-lab09` asociado a la cuenta de facturación donde canjeaste el cupón. En *APIs & Services*, *Library*, habilita estas cuatro APIs:

* Maps JavaScript API
* Places API (New)
* Geocoding API
* Cloud Translation API

Ojo con Places: en la biblioteca aparecen dos productos, "Places API" y "Places API (New)". El primero es la versión *legacy*, congelada desde marzo de 2025, que los proyectos nuevos de Google Cloud ya no pueden habilitar. Este laboratorio usa la nueva.

Habilitar una API en el proyecto no basta: cada key tiene que estar autorizada para usarla. Necesitas **dos keys**, porque viven en lugares distintos y se protegen de manera distinta:

* **Key del backend**, para `GOOGLE_GEOCODING_API_KEY` y `GOOGLE_TRANSLATE_API_KEY`. Nunca sale del servidor. En *Credentials*, ábrela y en *API restrictions* elige *Restrict key* y marca Geocoding API y Cloud Translation API. Si tienes la del laboratorio 8, es esta.
* **Key del frontend**, para `VITE_GOOGLE_MAPS_API_KEY`. Vite la incluye en el bundle, así que cualquiera que abra la aplicación puede leerla con las herramientas de desarrollo. Lo que la protege no es el secreto sino dos restricciones: en *API restrictions*, solo Maps JavaScript API y Places API (New); y en *Application restrictions*, *Websites*, con `http://localhost:5173/*` y `http://localhost:4173/*`. Una key restringida por sitio no le sirve a nadie que la copie.

Los cambios en una key pueden tardar unos minutos en aplicarse.

Opcionalmente, crea un **Map ID** en *Google Maps Platform*, *Map Management*, y ponlo en `VITE_GOOGLE_MAPS_MAP_ID`. Los marcadores avanzados (`AdvancedMarkerElement`) exigen que el mapa tenga un Map ID; para desarrollo sirve `DEMO_MAP_ID`, que es el valor del archivo de ejemplo.

### Variables de entorno

Copia el archivo de ejemplo y completa las tres keys:

```sh
cp .env.example .env
```

Un solo archivo `.env` sirve a los dos procesos. Vite lee de él las variables con prefijo `VITE_`, y solo esas llegan al navegador; el backend lo lee completo con la opción `--env-file` de uvicorn. El archivo está en `.gitignore` y nunca debe subirse al repositorio.

### Dependencias y ejecución

Instala las dependencias del frontend y crea el entorno virtual de Python con las del backend:

```sh
yarn install        # o npm install
yarn setup:api      # python3 -m venv backend/.venv && pip install -r backend/requirements-dev.txt
```

Preferimos Yarn para gestionar las dependencias de Javascript, pero npm sirve igual. La equivalencia es directa:

| Yarn | npm |
| --- | --- |
| `yarn install` | `npm install` |
| `yarn add <paquete>` | `npm install <paquete>` |
| `yarn dev` | `npm run dev` |

La última fila vale para cualquier script declarado en `package.json`, anteponiendo `npm run`. Como el repositorio no tiene `package-lock.json`, npm lee `yarn.lock` e instala las mismas versiones que resolvió Yarn. Elige uno de los dos y quédate con él.

Con esto, la aplicación está lista para ejecutar:

```sh
yarn dev
```

El comando levanta el frontend en [http://localhost:5173/](http://localhost:5173/) y el backend en el puerto 8000, en paralelo. También puedes levantarlos en dos terminales, con `yarn dev:web` y `yarn dev:api`. En Windows, `yarn dev:api` no funciona tal cual porque el entorno virtual queda en `backend\.venv\Scripts` y no en `backend/.venv/bin`; en ese caso, en una segunda terminal:

```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --env-file ../.env
```

Si el puerto 8000 está ocupado por otro proyecto, levanta uvicorn con `--port 8010` y Vite con `API_TARGET=http://localhost:8010 yarn dev:web`.

La documentación interactiva del backend queda en [http://localhost:8000/docs](http://localhost:8000/docs), generada por FastAPI a partir del código. Desde ahí puedes probar cada endpoint sin el frontend. Las pruebas del backend corren con `yarn test:api` y no necesitan keys ni red. En la rama `main` tres de ellas fallan a propósito: las arregla el ejercicio 7.

## Marco teórico

### Google Maps en React

La Maps JavaScript API es la biblioteca con la que se incrusta un mapa interactivo de Google en una página web: dibuja el mapa, los marcadores y las ventanas de información, y expone eventos como el click o el arrastre. Es una API imperativa, pensada para llamarse con `new google.maps.Map(...)` y `marker.addListener(...)`, y encaja mal con React, donde la interfaz se describe en vez de construirse paso a paso.

[`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) es la biblioteca de componentes de React para Maps JS, desarrollada con el patrocinio de Google, y la misma que usa la aplicación de ejemplo de la clase 10. Sus piezas:

* `<APIProvider apiKey language region>` carga el script de Google una sola vez y lo comparte con todos los mapas de la aplicación. Va en la raíz, en `App`.
* `<Map mapId defaultCenter defaultZoom onClick>` es el mapa. Con `defaultCenter` y `defaultZoom` la cámara es *no controlada*: el usuario la mueve y React no se entera, que es lo que se quiere para explorar. Para moverla desde el código se usa `useMap()`, que entrega la instancia de `google.maps.Map`, y se llama a `map.panTo(...)`.
* `<AdvancedMarker position title draggable onClick>` es un marcador avanzado. Puede llevar dentro un `<Pin background borderColor glyphColor>` con los colores del tema, o cualquier HTML.
* `<InfoWindow anchor position headerContent onCloseClick>` es la ventana que se abre sobre un marcador. Se declara condicionalmente: si está en el JSX, está abierta.
* `useMapsLibrary('geocoding')` y `useMapsLibrary('places')` cargan una biblioteca adicional de Maps JS y la entregan cuando está lista (`undefined` mientras tanto).

`google.maps.Marker`, el marcador clásico que aparece en la mayoría de los tutoriales, está *deprecated* desde febrero de 2024. Sigue funcionando, pero el código nuevo usa marcadores avanzados, y por eso el mapa necesita un Map ID.

### La key, la cuota y el costo

La key del frontend viaja dentro del bundle. No se protege escondiéndola, porque no se puede; se protege con las dos restricciones de la consola: por sitio (referente HTTP) y por API. Con ellas, una key copiada desde `localhost:5173` no funciona en ningún otro sitio ni para ninguna otra API.

Cada carga de un `<Map>` es una petición cobrada, y es el SKU más caro de los que usa esta aplicación. Tres medidas lo reducen: un solo `APIProvider` en la raíz, para que el script se cargue una vez; `reuseMaps` en cada `<Map>`, para que al salir y volver a una pantalla se reutilice la instancia; y mover la cámara con `useMap().panTo(...)` en lugar de desmontar y montar el mapa con una `key` distinta. Arrastrar un marcador, en cambio, no cuesta nada: es un elemento del mapa que ya está cargado.

Además de las restricciones, en la consola conviene fijar una **cuota** diaria para la Maps JavaScript API (*APIs & Services*, *Quotas*) y una **alerta de presupuesto** (*Billing*, *Budgets & alerts*). La alerta avisa; la cuota detiene.

### Geocodificación: en el navegador y en el servidor

La geocodificación convierte una dirección en coordenadas (*forward*) o unas coordenadas en una dirección (*reverse*). En esta aplicación se hace de dos maneras, y vale la pena ver por qué.

En la pestaña *En el mapa*, el punto que el usuario toca se convierte en la ciudad más cercana con la clase `google.maps.Geocoder` de Maps JS, en el navegador, con la key del frontend. Es lo natural cuando el mapa ya está cargado: el resultado es inmediato y la key ya está autorizada para el sitio. El Geocoder devuelve varios resultados, del más específico al más general (la dirección exacta, la calle, el barrio, la comuna, la región), y `snapToNearestLocality` en `src/geo/locality.js` elige el nivel "ciudad", que es el que entiende la geocodificación de Open-Meteo.

En el perfil y en el formulario de lugares, en cambio, la dirección la obtiene el backend con el Geocoding API REST, igual que en el laboratorio 8. Esa key no viaja al navegador. Es la forma correcta cuando la petición no depende de un mapa cargado, o cuando el resultado se va a guardar en el servidor.

### Places API (New): hoteles cercanos

La Places API da acceso a la base de datos de lugares de Google: negocios, hoteles, parques, estaciones. Desde Maps JS se usa con la clase `Place` de la biblioteca `places`, y para buscar alrededor de un punto, con el método estático `Place.searchNearby`:

```js
const places = useMapsLibrary('places');
// …
const { places: found } = await places.Place.searchNearby({
  fields: ['id', 'displayName', 'location', 'formattedAddress', 'rating', 'userRatingCount', 'googleMapsURI'],
  locationRestriction: { center: point.position, radius: 1500 },
  includedTypes: ['lodging'],
  maxResultCount: 20,
  rankPreference: places.SearchNearbyRankPreference.DISTANCE,
  language: 'es',
  region: 'cl',
});
```

Tres cosas que importan. `fields` es obligatorio y determina cuánto se paga: cada campo pertenece a un nivel de precio, y pedir solo lo que se muestra es la forma de controlar el costo. Una búsqueda devuelve a lo más 20 resultados y no tiene paginación; para cubrir más terreno se amplía el radio, hasta 50 km. Y cada elemento de `places` es un objeto `Place` con solo los campos pedidos: `location` es un `LatLng` de Google, y para pasarlo a un `<AdvancedMarker>` se usa `location.toJSON()`.

Hasta 2025 esto se hacía con `PlacesService.nearbySearch(request, callback)`, que todavía aparece en muchos tutoriales. Google lo reclasificó como *legacy* el 1 de marzo de 2025: sigue funcionando en los proyectos que ya lo usaban, pero un proyecto nuevo no puede habilitar la Places API antigua y la llamada falla con `LegacyApiNotActivatedMapError`. La [guía de migración](https://developers.google.com/maps/documentation/javascript/places-migration-overview) resume las equivalencias: `nearbySearch` → `Place.searchNearby`, `textSearch` → `Place.searchByText`, `getDetails` → `place.fetchFields`, `Autocomplete` → `PlaceAutocompleteElement`.

### La Geolocation API

La pantalla Lugares puede partir de la ubicación del usuario con `navigator.geolocation.getCurrentPosition`, a través del hook `useGeolocation` de la clase 10. Lo que ese hook resuelve, y que el código ingenuo olvida: un `timeout`, porque sin él la llamada puede no responder nunca; `maximumAge`, para aceptar una posición de hace un minuto en vez de encender el GPS; los tres códigos de error con nombre (`denied`, `unavailable`, `timeout`); y la Permissions API, que dice si el permiso ya fue concedido o denegado sin mostrar el diálogo, para no ofrecer un botón inútil. El permiso se pide con un botón, nunca al cargar la página.

### La cámara en una aplicación web

Hay dos maneras de obtener una fotografía en una PWA, y las dos están en `src/components/CameraCapture.jsx`.

**La entrada de archivos.** `<input type="file" accept="image/*" capture="environment">` es el mecanismo más antiguo y el más robusto. En un teléfono abre la cámara nativa (o la galería), y en un computador el selector de archivos. No requiere permisos propios ni HTTPS, y funciona también en las PWA instaladas en iOS. El atributo `capture` sugiere la cámara trasera; los computadores lo ignoran.

**getUserMedia.** `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })` entrega un `MediaStream` con el video de la cámara, que se muestra en un `<video>` dentro de la aplicación, con la experiencia de una app nativa. Para capturar un cuadro se dibuja el video en un `<canvas>` con `drawImage` y se codifica con `canvas.toBlob('image/jpeg', 0.85)`. Requiere un contexto seguro (HTTPS, o `localhost`) y el permiso de cámara, que el navegador pide al llamar. Y hay que detener el stream al cerrar, con `track.stop()` sobre cada pista: mientras siga vivo, la luz de la cámara queda encendida. `CameraDialog` hace todo esto en un efecto cuya limpieza detiene las pistas.

Una advertencia práctica: en las PWA instaladas en la pantalla de inicio de iOS, `getUserMedia` ha fallado en varias versiones del sistema (la cámara se abre y se cierra sin entregar el stream), y Apple lo ha arreglado y vuelto a romper más de una vez. Por eso la aplicación ofrece el visor cuando el navegador lo soporta, pero la entrada de archivos siempre.

**Reducir antes de subir.** La cámara de un teléfono entrega fotos de 12 megapíxeles y varios MB. `src/utils/image.js` las dibuja en un canvas de a lo más 1280 píxeles de lado y las recodifica como JPEG, lo que las deja en unos 150 KB. `createImageBitmap(blob, { imageOrientation: 'from-image' })` aplica la rotación que la cámara anotó en los metadatos EXIF; sin ella, las fotos tomadas en vertical aparecen acostadas en algunos navegadores.

### Subir archivos: multipart y validación

Una foto son bytes, y los bytes no caben en JSON. La creación de un lugar viaja como `multipart/form-data`, que en JavaScript se arma con `FormData`:

```js
const body = new FormData();
body.append('name', name);
body.append('latitude', latitude.toFixed(6));
body.append('photo', blob, 'foto.jpg');
await fetch('/api/placemarks', { method: 'POST', body });
```

No se define `Content-Type` a mano: el navegador lo agrega con el `boundary` que separa las partes. Es el mismo contrato que usa `project-base` para las fotografías de platos (`POST /api/v1/photos`).

Del lado del servidor, `backend/app/placemarks.py` valida antes de guardar nada. Lee el archivo de a trozos y corta en cuanto supera 5 MiB, con `413 Content Too Large`, para que un archivo enorme nunca llegue a ocupar memoria. Reconoce el formato por sus primeros bytes (las *magic bytes*: un JPEG empieza con `FF D8 FF`, un PNG con `89 50 4E 47`) y no por el `Content-Type` que declara el cliente, que cualquiera puede falsear; si el contenido no es JPEG, PNG o WebP, o no coincide con lo declarado, responde `422`. Los metadatos van a SQLite y los bytes al disco, en `backend/data/photos/`, y si la inserción falla el archivo se borra: nunca queda una foto huérfana ni una fila que apunte a un archivo inexistente.

La foto se sirve en `GET /api/placemarks/{id}/photo` con `Cache-Control: public, max-age=31536000, immutable`. La foto de un lugar no cambia nunca (para cambiarla se crea otro lugar), así que el navegador y el service worker pueden guardarla sin preguntar.

### El backend en FastAPI

El laboratorio 8 encapsuló las llamadas a las APIs de Google en un backend Express. Este laboratorio lo reescribe en Python con [FastAPI](https://fastapi.tiangolo.com/), el mismo stack de la aplicación de ejemplo de la clase 10 y de `project-base`. La idea es la misma, una fachada que guarda las keys y valida lo que reenvía; lo que cambia es el lenguaje, y conviene comparar:

| Express (lab 8) | FastAPI (lab 9) |
| --- | --- |
| `app.get('/api/horoscope', async (req, res) => …)` | `@router.get("/api/horoscope")` sobre una función `async def` |
| `req.query.sign`, validado a mano | parámetros con tipo: `sign: str = Query()`, y FastAPI valida y documenta |
| `res.status(400).json({ error })` | `raise HTTPException(400, detail=…)` |
| `fetch` nativo de Node | `httpx.AsyncClient`, con `timeout` |
| `node --env-file=.env` | `uvicorn --env-file ../.env` |
| sin documentación | `/docs`, generada a partir de los tipos |

La base de datos es SQLite con el módulo `sqlite3` de la biblioteca estándar: una tabla, creada al arrancar si no existe, y SQL a la vista. `backend/data/` está en `.gitignore`; borrarlo deja el backend como recién instalado.

Las pruebas, en `backend/tests/`, usan el `TestClient` de FastAPI contra una carpeta temporal, y no necesitan red: construyen un PNG mínimo a mano y verifican la creación, el servicio de la foto, el `422` por tipo falso, el `413` por tamaño y el borrado.

## Descripción de la aplicación

La aplicación permite buscar ciudades, guardar favoritas y ver su clima en la pantalla de inicio, con el funcionamiento sin conexión del laboratorio 7 y el perfil y el horóscopo del laboratorio 8. A eso se suman la búsqueda tocando el mapa, con hoteles cercanos, y la pantalla Lugares con fotografías.

## Componentes de la aplicación

`index.html`, `main.jsx`, el tema, `Home`, `Weather`, `SearchResult`, `ConnectionStatus`, `UserProfile`, `Horoscope`, los hooks `useWeather`, `useNow` y `useConnectionStatus`, los cachés de clima y horóscopo y el service worker son los del laboratorio 8 con sus ejercicios resueltos. El `Search` del laboratorio 8 pasó a llamarse `SearchText`, sin otros cambios.

Las novedades son las siguientes.

### App

`App` envuelve toda la aplicación en un `APIProvider` con la key del frontend, agrega la ruta `/places` a `SECTIONS` y a `TITLES`, y nada más. Si falta la key, el `APIProvider` no se monta y las pantallas con mapa muestran `MissingMapsKey`, un aviso con las instrucciones.

`src/config.js` reúne lo que viene del entorno: `MAPS_API_KEY`, `MAP_ID` (con `DEMO_MAP_ID` por omisión) y `SANTIAGO`, el centro inicial de los mapas.

### Search, SearchText y SearchMap

`Search` solo reparte: dos pestañas de MUI, *Por texto* y *En el mapa*. El mapa se monta la primera vez que el usuario entra a su pestaña y después queda montado aunque oculto, porque cada `<Map>` que se monta es una carga cobrada.

`SearchMap` es el corazón de la pestaña nueva. Al tocar el mapa: muestra un marcador en el punto de inmediato; llama a `snapToNearestLocality` con el `Geocoder` de Maps JS y mueve el marcador al centro de la localidad encontrada; consulta el clima de esa localidad a Open-Meteo con `fetchWeatherMulti`, con un segundo intento por la región si la ciudad no existe allá; y muestra los resultados abajo como tarjetas `SearchResult`, las mismas de la búsqueda por texto, desde donde se agregan favoritos. Si el usuario toca dos puntos seguidos, un contador en un `useRef` descarta la respuesta del primero cuando llega tarde.

La `InfoWindow` del marcador ofrece *Buscar hoteles cerca*, que llama a `Place.searchNearby` y entrega los resultados a `HotelMarkers`: un marcador por hotel, con un `Pin` del color secundario del tema, y una sola `InfoWindow`, la del seleccionado, con dirección, calificación y un enlace a Google Maps.

En la rama `main` tres piezas de esta pestaña están sin implementar, con comentarios numerados que guían el trabajo: `snapToNearestLocality` devuelve `null` (ejercicio 1), `searchHotels` no llama a Places (ejercicio 2) y `HotelMarkers` no dibuja nada (ejercicio 3). Por eso, hasta resolverlos, tocar el mapa responde "No se encontró una ciudad cerca de ese punto".

### PlacesPage y los lugares

`src/pages/PlacesPage.jsx` es la pantalla Lugares. El mapa muestra los lugares guardados con `PlacemarkMarkers` (un marcador por lugar, una `InfoWindow` con la foto, la dirección, la nota y el botón *Eliminar*). Tocar el mapa, o el botón *Usar mi ubicación*, deja un marcador borrador de otro color, arrastrable; *Guardar este lugar* abre `PlacemarkForm`, un diálogo con nombre, dirección (propuesta por el backend con reverse geocoding, y editable), nota y `CameraCapture`. Debajo del mapa, `PlacemarkList` muestra las tarjetas con sus fotos, con *Ver en el mapa* y *Eliminar*.

El estado vive en `usePlacemarks`, un hook con el modelo de `useWeather`: carga la lista del backend, la respalda en `localStorage` (`placemarksCache.js`) con la hora, y sin conexión muestra el respaldo con su fecha y deshabilita crear y eliminar. Expone `create` y `remove`, que llaman a `placemarksClient.js` y actualizan la lista sin volver a pedirla.

`CameraCapture` ofrece los dos caminos para obtener la foto, y `CameraDialog` es el visor con `getUserMedia`. Los dos diálogos se montan solo mientras están abiertos, de modo que cada apertura parte con el estado inicial: es lo que evita reiniciar estado dentro de un efecto, cosa que la regla `react-hooks/set-state-in-effect` del linter ahora prohíbe.

En la rama `main`, `PanTo` no mueve la cámara (ejercicio 4), tocar o arrastrar en el mapa de Lugares no hace nada (ejercicio 5), de modo que un lugar solo se puede crear desde *Usar mi ubicación*, y el visor de `CameraDialog` muestra un aviso en lugar de pedir la cámara (ejercicio 6). La entrada de archivos sí funciona desde el principio.

### Clientes de API (`src/api`)

| módulo | función | endpoint del backend |
| --- | --- | --- |
| `request.js` | `request(path, { method, body, signal })` | cualquiera; distingue `ApiError`, `NetworkError` y cancelación |
| `placemarksClient.js` | `listPlacemarks`, `createPlacemark`, `deletePlacemark` | `/api/placemarks` |
| `geocodeClient.js` | `reverseGeocodeServer`, `forwardGeocodeServer` | `/api/geocode/reverse`, `/api/geocode/forward` |
| `horoscopeClient.js` | `fetchHoroscope(sign, period)` | `GET /api/horoscope` |
| `translateClient.js` | `translateToEs(text)` | `POST /api/translate` |
| `weatherApi.js` | `fetchWeather`, `fetchWeatherMulti` | ninguno, llama a Open-Meteo |

`request.js` es el cliente de la clase 10. Los clientes del laboratorio 8 siguen usando `fetch` a mano; los dos estilos conviven a propósito, para que compares.

### Backend (`backend/app`)

| archivo | endpoints |
| --- | --- |
| `main.py` | crea la aplicación, el CORS y la base de datos al arrancar; `GET /healthz` |
| `google.py` | `GET /api/geocode/reverse`, `GET /api/geocode/forward`, `POST /api/translate` |
| `horoscope.py` | `GET /api/horoscope?sign=…&period=…` |
| `placemarks.py` | `GET`, `POST /api/placemarks`; `GET`, `DELETE /api/placemarks/{id}`; `GET /api/placemarks/{id}/photo` |
| `db.py` | la conexión a SQLite y la creación de la tabla |

Los endpoints del laboratorio 8 conservan sus rutas y la forma de sus respuestas, de modo que los clientes del frontend no cambiaron. Cada llamada a Google se registra en la terminal con la key enmascarada (`mask_url`).

En la rama `main`, `sniff_image` devuelve siempre `None`, así que toda foto se rechaza con `422` hasta resolver el ejercicio 7. Los lugares sin foto se crean igual.

### Service worker (`public/sw.js`)

Dos cambios. Las fotos de los lugares, `/api/placemarks/<id>/photo`, son la excepción dentro de `/api/`: su URL es estable y el backend las declara inmutables, así que se guardan con la estrategia caché primero, igual que los archivos del bundle, y los lugares se ven con sus fotos sin conexión. Y las peticiones a Google Maps (`googleapis.com`, `gstatic.com`) no se interceptan, salvo las tipografías: el script, las teselas y las consultas a Places tienen su propia política de caché. La constante `CACHE` pasó a `weather-app-v3`.

En la rama `main` la regla de las fotos está marcada como `TODO` (ejercicio 8): sin ella, la lista de lugares aparece sin conexión pero las imágenes no cargan.

### Proxy de Vite (`vite.config.js`)

`server.proxy` y `preview.proxy` reenvían `/api` al backend, ahora en el puerto 8000 de uvicorn. La variable `API_TARGET` permite apuntar a otro puerto.

## Cómo probar lo nuevo

**Geolocalización sin moverse de la silla.** En Chrome y Edge, herramientas de desarrollo, menú de tres puntos, *More tools*, *Sensors*, y en *Location* elige una ciudad o escribe coordenadas.

**Cámara sin cámara.** Chrome puede simular una cámara con un patrón de prueba. Ciérralo y ábrelo desde la terminal:

```sh
# macOS
open -na "Google Chrome" --args --use-fake-device-for-media-stream --use-fake-ui-for-media-stream
# Windows (y Linux, cambiando 'chrome.exe' por el ejecutable correspondiente y manteniendo los argumentos)
chrome.exe --use-fake-device-for-media-stream --use-fake-ui-for-media-stream
```

El primer flag entrega un video sintético; el segundo concede el permiso sin preguntar. *Tomar foto* mostrará el patrón, y *Capturar* lo convertirá en una foto de unos pocos KB.

**El backend solo.** Con `yarn dev:api` corriendo, en [http://localhost:8000/docs](http://localhost:8000/docs) puedes crear un lugar con una foto desde el formulario de Swagger. O con `curl`:

```sh
curl -F name="Plaza de Armas" -F latitude=-33.4378 -F longitude=-70.6505 -F photo=@foto.jpg http://localhost:8000/api/placemarks
curl http://localhost:8000/api/placemarks
curl -F name="x" -F latitude=-33.4 -F longitude=-70.6 -F "photo=@README.md;type=image/png" http://localhost:8000/api/placemarks   # 422
```

**Lo que ve el navegador.** En el panel *Network*, al guardar un lugar verás una petición `POST /api/placemarks` con *Content-Type: multipart/form-data; boundary=…*, y en su *Payload* las partes del formulario. Al cargar la pestaña *En el mapa* verás peticiones a `maps.googleapis.com` con la key del frontend, y al usar el perfil ninguna: esas las hace el backend.

**Sin conexión.** `yarn build && yarn preview`, abre [http://localhost:4173/](http://localhost:4173/), entra a Lugares para que las fotos se guarden, y en *Network* marca *Offline*. La lista aparece con su fecha, con las fotos, y los botones de crear y eliminar quedan deshabilitados. El mapa, en cambio, no: las teselas de Google no se precachean.

**Desde el teléfono.** `yarn dev:web --host` publica Vite en tu IP de la red local, pero sobre HTTP, y `getUserMedia`, la geolocalización y el service worker exigen un contexto seguro. La entrada de archivos sí funciona, y es una buena demostración de por qué existe. Para HTTPS en la red local, la guía `backend/docs/https-local.md` de `project-base` explica cómo emitir un certificado con `mkcert` y confiarlo en el teléfono; con el certificado, Vite lo usa con la opción `server.https` de `vite.config.js`.

**Los errores de Google.** Si *En el mapa* no carga, abre la consola del navegador: Google explica el problema con un mensaje y un enlace (`RefererNotAllowedMapError`, `ApiNotActivatedMapError`, `BillingNotEnabledMapError`). Si la búsqueda de hoteles falla, el mensaje de la excepción aparece en la pantalla y en la consola; `LegacyApiNotActivatedMapError` o un error de permisos apuntan a que falta habilitar Places API (New) o autorizarla en la key. Los errores del backend se siguen igual que en el laboratorio 8, desde la terminal.

## Experimenta con el código

Los ejercicios 1 a 8 completan partes que la rama `main` trae marcadas con `TODO` y comentarios numerados. Cada una es pequeña, y en cada una hay que leer la documentación de una API, que es la idea: las APIs de Google cambian, y saber leer su documentación vale más que recordar una llamada. Cuando termines un archivo, borra su línea `eslint-disable` y verifica que `yarn lint` no reclame nada.

1. **La localidad más cercana.** Implementa `snapToNearestLocality` en `src/geo/locality.js`. El Geocoder de Maps JS (`geocoder.geocode({ location })`) devuelve una lista de resultados ordenados del más específico al más general; hay que filtrar los que corresponden a una localidad, elegir el mejor y armar el texto "Ciudad, Región, CC" que entiende Open-Meteo. Lee la [referencia del Geocoder](https://developers.google.com/maps/documentation/javascript/geocoding) y fíjate en la estructura de `address_components` y `types`. Prueba tocando el mar, el desierto y el centro de Santiago.

2. **Hoteles con Places API (New).** Completa `searchHotels` en `SearchMap` con `Place.searchNearby`. La [documentación de Nearby Search](https://developers.google.com/maps/documentation/javascript/nearby-search) describe la request; los campos que necesita `HotelMarkers` están en el comentario. Antes de probar, revisa que la key del frontend tenga autorizada Places API (New) y no la *legacy*: el error, si aparece, se ve en la pantalla y en la consola.

3. **Marcadores y ventana de los hoteles.** Implementa el JSX de `HotelMarkers`: un `AdvancedMarker` con `Pin` por hotel y una sola `InfoWindow`, la del seleccionado. Compara con `PlacemarkMarkers`, que hace lo mismo para los lugares, y con la [referencia de la biblioteca](https://visgl.github.io/react-google-maps/docs/api-reference/components/info-window). Nota que `location` es un `LatLng` de Google y no un literal.

4. **Mover la cámara.** Completa `PanTo` con `useMap()`: la instancia de `google.maps.Map` tiene `panTo`, `getZoom` y `setZoom`. Con esto, la búsqueda en el mapa centra la localidad encontrada y *Ver en el mapa* lleva al lugar. Explica, con lo que dice la sección *La key, la cuota y el costo*, por qué se mueve la cámara así y no cambiando `center` o la `key` del `<Map>`.

5. **Tocar y arrastrar.** En `PlacesPage`, haz que tocar el mapa cree el borrador (`handleMapClick`, con `event.detail.latLng`) y que el marcador borrador sea arrastrable, actualizando `draft` en `onDragEnd`. Los dos eventos entregan las coordenadas en formas distintas, un literal y un `LatLng`; averigua cuál es cuál en la [referencia de `Map`](https://visgl.github.io/react-google-maps/docs/api-reference/components/map) y la de [`AdvancedMarker`](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker).

6. **El visor de la cámara.** Implementa el efecto de `CameraDialog` con [`getUserMedia`](https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia): pedir el stream, mostrarlo en el `<video>`, traducir los errores y, sobre todo, detener las pistas en la limpieza del efecto. Prueba con la cámara simulada de Chrome (ver *Cómo probar lo nuevo*) y con la real; en este último caso, cierra el diálogo y comprueba que la luz de la cámara se apaga. Luego cambia de cámara con el botón del encabezado y explica qué hace el efecto en ese momento.

7. **Validar la imagen en el servidor.** Implementa `sniff_image` en `backend/app/placemarks.py`, que reconoce JPEG, PNG y WebP por sus primeros bytes. Tres pruebas de `backend/tests/test_placemarks.py` fallan hasta entonces: córrelas con `yarn test:api` y hazlas pasar. Después, con `curl`, sube un archivo de texto declarado como `image/png` y un PNG declarado como `image/jpeg`, y explica por qué el servidor no puede confiar en el `Content-Type`.

8. **Fotos sin conexión.** Agrega al service worker la regla que guarda las fotos de los lugares con la estrategia caché primero, antes de la línea que deja pasar el resto de `/api/`. Pruébalo con `yarn build && yarn preview` y el modo *Offline* del panel *Network*: las imágenes deben verse. Explica por qué esta regla es correcta para las fotos y sería un error para `GET /api/placemarks`.

### Para seguir

Si terminaste, tres ideas más grandes, sin guía:

* **Favoritos en el mapa.** Los favoritos son nombres de ciudad, sin coordenadas. Obtén las coordenadas con la geocodificación de Open-Meteo que ya usa `weatherApi.js`, guárdalas en `localStorage` con la estructura de `weatherCache.js`, y dibújalos en `SearchMap` como marcadores de otro color, con una `InfoWindow` que muestre el clima con el componente `Weather`.
* **Radio ajustable.** Reemplaza el radio fijo de los hoteles por un `Slider` con las marcas de la pantalla *Cerca de mí* de la clase 10, dibuja el radio con el componente `Circle`, y consulta solo en `onChangeCommitted`.
* **Lugares pendientes.** Sin conexión no se pueden crear lugares, y perder la foto que acabas de tomar en la cordillera es un mal negocio. Guarda los lugares creados sin conexión en una cola en `localStorage` (la foto, como texto con `FileReader.readAsDataURL`), muéstralos marcados como pendientes, y envíalos al backend cuando `useConnectionStatus` indique que la red volvió.

## Anexo: lo básico de Vite

Usamos [Vite](https://vite.dev/) como andamiaje para crear y construir la aplicación con React 19. Vite provee herramientas parecidas a los generadores de Rails para crear una aplicación de frontend desde cero, un servidor de desarrollo con recarga en caliente y el empaquetado para producción.

El objeto `"scripts"` de `package.json` declara las tareas disponibles:

* `dev`: levanta el frontend y el backend en modo desarrollo, en paralelo, con [concurrently](https://www.npmjs.com/package/concurrently). El backend corre con `uvicorn --reload`, que lo reinicia al guardar cambios en `backend/app`.
* `dev:web` y `dev:api`: levantan cada uno por separado, por si prefieres tenerlos en terminales distintas.
* `setup:api`: crea el entorno virtual de Python e instala las dependencias del backend. Se corre una vez.
* `test:api`: ejecuta las pruebas del backend con pytest.
* `build`: prepara la aplicación para producción, en `dist/`.
* `lint`: ejecuta ESLint sobre el frontend. La configuración declara dos entornos: el navegador para `src/` y el service worker para `public/sw.js`. El backend queda fuera; su linter sería `ruff`, de Python.
* `preview`: sirve la aplicación construida, junto con el backend, para probarla como se vería en producción.

En `vite.config.js` hay dos agregados respecto de la configuración por defecto: el proxy hacia el backend, descrito más arriba, y `build.manifest`, que deja en `dist/assets-manifest.json` la lista de archivos que el service worker precachea al instalarse.
