# Laboratorio 5: Mapas y georeferenciación

En este laboratorio continuaremos desarrollando la aplicación de clima con React y MUI. La aplicación utiliza la API de [Open-Meteo](https://open-meteo.com/) para acceder a información climática.

## Pasos iniciales

En Google Cloud Platform (https://cloud.google.com) activa tu cuenta de desarrollador utilizando tus credenciales de `miuandes`. Una vez dentro de la plataforma, crea un proyecto, ponle nombre "icc4203-lab5". Luego, en el proyecto debes buscar y habilitar las siguientes APIs:

* Geocoding API
* Cloud Translation API

En la sección "Credentials" de la navegación podrás crear tus propias API keys para usar las dos APIs. Incluso podrías crear una sola API key y utilizarla con ambos servicios.

Una vez que cuentes con las APIs de Google necesarias, puedes instalar todas las dependencias del proyecto actual (asegúrate de contar con [NVM](https://github.com/nvm-sh/nvm) y Node 24, activando Yarn con el comando `corepack enable`):

```sh
yarn install
```

Esto instalará todos los paquetes o módulos especificados en el archivo `package.json` que requiere la aplicación. Preferimos utilizar Yarn para gestión de módulos y dependencias de Javascript.

Con esto, la aplicación estará lista para ejecutar:

```sh
yarn dev
```

El comando anterior ejecuta la aplicación en modo de desarrollo. Puedes abrir el navegador web en [http://localhost:5173/](http://localhost:5173/) para ver el funcionamiento.

## Marco Teórico

### API JavaScript de Google Maps

La Google Maps JavaScript API es la librería que nos permite incrustar un mapa interactivo de Google en una aplicación web. A diferencia de la Geocoding API o la Places API, que son servicios HTTP “puros”, esta API está pensada para ejecutarse en el navegador y entregar controles gráficos, eventos, y objetos de alto nivel para que el usuario pueda interactuar directamente con el mapa.

¿Qué ofrece?

* Renderizar mapas (en distintos estilos o map IDs).
* Dibujar elementos gráficos (markers, polígonos, líneas).
* Manejar eventos (ejemplo: click en el mapa o en un marcador).
* Integrar librerías adicionales:
  * `places`: autocompletado, búsqueda de negocios, hoteles, restaurantes, etc.
  * `marker`: marcadores avanzados con HTML y estilos personalizados.
  * `geometry`: utilidades para distancias, áreas, coordenadas.

**Markers**

Un marker es un objeto gráfico que representa una posición geográfica en el mapa, indicado por sus coordenadas de latitud y longitud.

* El marcador más básico es un ícono (generalmente un pin rojo).
* Se puede personalizar con otros íconos o incluso con HTML/CSS (usando `AdvancedMarkerElement`).
* Permite asociar eventos: por ejemplo, escuchar un click en un marker para abrir más información.

Ejemplo básico en la API clásica:

```js
const marker = new google.maps.Marker({
  position: { lat: -33.4489, lng: -70.6693 },
  map: map,
  title: "Santiago de Chile"
});
```

Ejemplo con marcadores avanzados (lab):

```js
const { AdvancedMarkerElement } = google.maps.marker;
new AdvancedMarkerElement({
  map,
  position: { lat, lng },
  content: document.createElement("div") // puedes insertar HTML aquí
});
```

**InfoWindows**

Un InfoWindow es una pequeña ventana emergente que aparece asociada a un marcador o a una posición en el mapa. Sirve para mostrar información contextual, como dirección, coordenadas, o botones de acción (por ejemplo, “Buscar hoteles cerca”).

Ejemplo:

```js
const infoWindow = new google.maps.InfoWindow({
  content: "<strong>Dirección:</strong> Av. ... 123"
});
infoWindow.open({
  anchor: marker,
  map
});
```

En el laboratorio, se crea un InfoWindow dinámicamente cuando haces click en el mapa: allí se despliega la dirección obtenida por reverse geocoding y botones que disparan llamadas a la Places API.

**Eventos**

Tanto el mapa como los markers pueden disparar eventos: `click`, `mouseover`, `drag`, etc.
Esto hace posible construir interacciones ricas. Ejemplo:

```js
map.addListener("click", (e) => {
  console.log("Clicked at", e.latLng.toJSON());
});
```

**Control de estilo: Map IDs**

Google ahora recomienda usar un Map ID, que es un estilo de mapa configurado en la consola de Cloud. Con él puedes definir si el mapa se ve en tonos claros, oscuros, minimalistas, etc., y reutilizar ese mismo ID en todas tus instancias del mapa.

### API de Geocodificación

La Geocoding API es un servicio de Google que traduce entre coordenadas geográficas (latitud/longitud) y direcciones legibles por humanos.

Es una API HTTP REST, no tiene interfaz visual propia (a diferencia de Maps JavaScript). Normalmente se usa desde el backend para evitar exponer la clave, controlar cuotas y manejar CORS.

¿Qué significa “geocoding”?

Forward geocoding: de una dirección en texto → obtener coordenadas.
Ejemplo: `"Av. Libertador Bernardo O'Higgins 1234, Santiago"` → `lat: -33.45, lng: -70.66`

Reverse geocoding: de unas coordenadas → obtener una dirección legible.
Ejemplo: `lat: -33.45, lng: -70.66` → `"Av. Libertador Bernardo O'Higgins 1234, Santiago, Chile"`

**Endpoints principales**

La API expone un único endpoint con distintas query params:

_Forward Geocoding_
```js
GET https://maps.googleapis.com/maps/api/geocode/json
    ?address={texto_direccion}
    &language={es|en|...}
    &key=YOUR_API_KEY
```

_Reverse Geocoding_

```js
GET https://maps.googleapis.com/maps/api/geocode/json
    ?latlng={lat},{lng}
    &language={es|en|...}
    &key=YOUR_API_KEY
```

**Opcionales comunes:**

* `language`: fuerza el idioma de la dirección (ej. es para español).
* `region`: sesgo de país (cl para Chile, us para Estados Unidos).
* `result_type`: filtra por tipo de resultado (ej. solo street_address)

Estructura de la respuesta: La respuesta es un JSON con metadatos y un arreglo de resultados.

```json
{
  "results": [
    {
      "formatted_address": "Av. Libertador Bernardo O'Higgins 1234, Santiago, Región Metropolitana, Chile",
      "place_id": "ChIJxxxxxx",
      "geometry": {
        "location": { "lat": -33.4489, "lng": -70.6693 },
        "location_type": "ROOFTOP"
      },
      "address_components": [
        {
          "long_name": "1234",
          "types": ["street_number"]
        },
        {
          "long_name": "Av. Libertador Bernardo O'Higgins",
          "types": ["route"]
        },
        {
          "long_name": "Santiago",
          "types": ["locality", "political"]
        },
        {
          "short_name": "CL",
          "types": ["country", "political"]
        }
      ],
      "types": ["street_address"]
    }
  ],
  "status": "OK"
}
```

**Campos clave:**

* `formatted_address`: dirección lista para mostrar al usuario.
* `place_id`: identificador único y estable del lugar, reutilizable en otras APIs (ej. Places).
* `geometry.location`: coordenadas precisas.
* `geometry.location_type`: precisión (ej. `ROOFTOP`, `RANGE_INTERPOLATED`).
* `address_components`: desglose jerárquico (calle, número, ciudad, región, país, código postal).
* `types`: tipo de lugar devuelto (ej. `street_address`, `locality`).

Usos típicos en aplicaciones

* Mostrar la dirección de un punto en el mapa (reverse).
* Calcular coordenadas de una dirección ingresada por un usuario (forward).
* Guardar place_id para integraciones con Places API o Directions API.
* Autocompletar formularios de direcciones (cuando se combina con Places Autocomplete).

**Integración en el laboratorio**

En este lab, no llamamos directamente a la Geocoding API desde el navegador, sino a través de un backend Express (ver `server/index.js`) que expone rutas `/api/geocode/reverse` y `/api/geocode/forward`.

Esto tiene tres ventajas:

1. No exponer la clave de servidor en el front.
2. Manejar CORS (la API de Google no acepta cualquier origen).
3. Normalizar la respuesta a un formato simplificado para la app React.

Ejemplo desde el front (lab):

```js
const info = await reverseGeocodeServer(lat, lng, "es");
console.log(info.formatted); // Dirección en texto
```

**Consideraciones de cuotas y facturación**

* Geocoding API tiene un costo por cada request (después de un pequeño crédito mensual gratuito en GCP).
* Cada request cuenta por resultado * devuelto, no solo por llamada.
* El uso indebido (ej. llamar desde el front con clave visible) puede agotar rápidamente la cuota.

### Google Places API: búsqueda de puntos de interés (POIs)

La Places API permite acceder a la enorme base de datos de Google sobre lugares del mundo real: negocios, hoteles, restaurantes, parques, estaciones de transporte, etc.
Se puede usar de dos formas principales:

1. Desde el navegador (librería places de la Google Maps JavaScript API).
2. Vía HTTP REST (Places API clásico o la nueva versión “Places API (New)”).

**¿Qué es un “place” en Google?**

Un _place_ es cualquier punto de interés que Google indexa y que cuenta con un `place_id` único. Un lugar puede tener:

* Nombre (ej. “Hotel Plaza San Francisco”).
* Dirección formateada.
* Ubicación geográfica (lat, lng).
* Categorías / tipos (ej. lodging, restaurant, bank).
* Rating y cantidad de reseñas.
* Horarios de apertura.
* Fotos asociadas.
* Datos de contacto (teléfono, sitio web).

**Funcionalidades principales**

La API ofrece distintos endpoints o métodos para obtener datos:

1. Nearby Search

Busca lugares cercanos a una coordenada, filtrando por tipo o keyword.
Ejemplo: hoteles cerca de un marcador en el mapa.

REST clásico (legacy):

```js
GET https://maps.googleapis.com/maps/api/place/nearbysearch/json
    ?location=-33.4489,-70.6693
    &radius=1000
    &type=lodging
    &key=YOUR_KEY
```

Places API (New):

```js
POST https://places.googleapis.com/v1/places:searchNearby
Headers:
  X-Goog-Api-Key: YOUR_KEY
  X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating
Body:
{
  "includedTypes": ["lodging"],
  "maxResultCount": 10,
  "locationRestriction": {
    "circle": {
      "center": { "latitude": -33.4489, "longitude": -70.6693 },
      "radius": 1000.0
    }
  }
}
```

Respuesta (simplificada):

```json
POST https://places.googleapis.com/v1/places:searchNearby
Headers:
  X-Goog-Api-Key: YOUR_KEY
  X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating
Body:
{
  "includedTypes": ["lodging"],
  "maxResultCount": 10,
  "locationRestriction": {
    "circle": {
      "center": { "latitude": -33.4489, "longitude": -70.6693 },
      "radius": 1000.0
    }
  }
}
```

2. Place Details

Entrega información completa de un lugar específico, a partir de su `place_id`.

REST (New):

```
GET https://places.googleapis.com/v1/places/{PLACE_ID}
Headers:
  X-Goog-Api-Key: YOUR_KEY
  X-Goog-FieldMask: id,displayName,formattedAddress,location,websiteUri,internationalPhoneNumber,regularOpeningHours
```

Devuelve datos enriquecidos: teléfono, sitio web, fotos, horarios.

3. Place Photos

Permite obtener imágenes de un lugar. Se necesita un photo resource name obtenido de un Place Detail.

Ejemplo:

```
GET https://places.googleapis.com/v1/{name=places/*/photos/*}/media
    ?maxHeightPx=400
    &key=YOUR_KEY
```

4. Autocomplete

Sugiere posibles lugares mientras el usuario escribe en un input de búsqueda.

```
POST https://places.googleapis.com/v1/places:autocomplete
Headers:
  X-Goog-Api-Key: YOUR_KEY
  X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text
Body:
{
  "input": "Hotel Plaza",
  "locationBias": {
    "circle": {
      "center": { "latitude": -33.45, "longitude": -70.66 },
      "radius": 5000
    }
  }
}
```

**Uso desde la Google Maps JavaScript API**

Si cargas la librería places en `useJsApiLoader`, puedes crear un servicio directamente desde el objeto `map`:

```js
const service = new google.maps.places.PlacesService(map);

service.nearbySearch(
  {
    location: { lat: -33.4489, lng: -70.6693 },
    radius: 1000,
    type: "lodging"
  },
  (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      results.forEach((place) => {
        console.log(place.name, place.geometry.location.toJSON());
      });
    }
  }
);
```

Esto evita tener que hacer llamadas HTTP manuales, ya que el SDK maneja los requests y parsea la respuesta automáticamente.

**Datos que devuelve un lugar**

Campos más útiles:

* `place_id` o `id` (identificador estable).
* `displayName` / `name`.
* `formattedAddress`.
* `geometry.location` (`lat`/`lng`).
* `types` (ej. `lodging`, `restaurant`).
* `rating` y `user_ratings_total`.
* `photos[]` (con `photo_reference`).
* `opening_hours`.
* `website` y `international_phone_number` (solo en Details).

**Consideraciones de cuotas y facturación**

* Cada request consume cuota (hay crédito gratuito mensual).
* Las búsquedas amplias (`nearbySearch` con radius grande) consumen más rápido.
* Usar field masks en la versión nueva permite pedir solo los campos necesarios y reducir costos.
* Restringe la API key por referrer (si se usa en front) o por IP (si se usa en backend).

**Integración en el laboratorio**

En este lab:

* Cuando haces click en el mapa, se abre un `InfoWindow` con la dirección (obtenida de Geocoding).
* Dentro del `InfoWindow` hay un botón “Buscar hoteles cerca”.
* Ese botón activa una llamada a Places Nearby Search (con `type=lodging`) para listar hoteles en un radio de 1 km.
* Los resultados se muestran en el mapa como markers adicionales.

## Descripción de la Aplicación React

Nuestra aplicación React en su tercera iteración ha crecido en funcionalidad. Permite crear un perfil de usuario (formulario con validaciones), iuncluyendo la funcionalidad básica de georeferenciación para buscar la dirección actual del usuario. Además, en la solución (rama `solution`) podrás ver la implementación de un componente de horóscopo.

### ¿Dónde se usan las APIs de Google en este laboratorio?

* `src/components/SearchMap.jsx`
Carga Maps JS con libraries: ["places","marker"], configura `mapId`, maneja el click en el mapa y llama a:
* `reverseGeocodeServer(lat, lng, 'es')` → `/api/geocode/reverse`.
* Luego muestra el InfoWindow con dirección + botón “Buscar hoteles cerca”.
* src/components/MapView.jsx
Dibuja mapa y marcadores (incluye `AdvancedMarkerElement`). Integra la capa de Places para desplegar hoteles cercanos (tipo lodging) y limpiar resultados.
* `src/api/geocodeClient.js`
Pequeño cliente de front para pegarle a nuestro backend (`/api/geocode/reverse`, `/api/geocode/forward`).
* `server/index.js`
Implementa los endpoints `/api/geocode/*` (y `/api/translate`, /`api/horoscope` del ejemplo). Usa `node-fetch` + `dotenv`.

## Componentes de la Aplicación

Los componentes relevantes de la aplicación en este laboratorio son los siguientes:

* **Componente `Search`** (`src/components/Search.jsx`) que actúa como contenedor principal de la funcionalidad de búsqueda. Integra tres subcomponentes:  
  - `SearchText` para ingresar direcciones o términos de búsqueda en texto.  
  - `SearchMap` para seleccionar ubicaciones directamente en el mapa y obtener direcciones mediante geocoding.  
  - `SearchResultsList` para mostrar los resultados obtenidos de la búsqueda (por ejemplo, hoteles cercanos).  
  `Search` coordina el estado compartido entre estos subcomponentes y conecta la lógica de favoritos.

* **Componente `SearchText`** (`src/components/SearchText.jsx`) que implementa el campo de texto para búsqueda de direcciones. Permite al usuario ingresar manualmente una dirección, que luego se resuelve a coordenadas a través del cliente `geocodeClient`. Al encontrar la dirección, se actualiza el mapa y la lista de resultados.

* **Componente `SearchMap`** (`src/components/SearchMap.jsx`) que implementa la vista del mapa de Google con soporte para clicks. Usa `@react-google-maps/api` con las librerías `places` y `marker`. Al hacer click sobre el mapa, llama a `reverseGeocodeServer` para obtener la dirección asociada y despliega un `InfoWindow` con opciones, incluyendo el botón **“Buscar hoteles cerca”**, que invoca la Places API para listar alojamientos en la zona.

* **Componente `SearchResultsList`** (`src/components/SearchResultsList.jsx`) que muestra en forma de lista los resultados obtenidos desde la búsqueda de lugares (ej. hoteles). Cada ítem de la lista puede incluir datos como nombre, dirección y rating, y se sincroniza con los marcadores desplegados en el mapa.

* **Componente `MapView`** (`src/components/MapView.jsx`) que encapsula el renderizado del mapa y la lógica de markers. Recibe como props la información de los resultados de búsqueda y se encarga de dibujarlos con `AdvancedMarkerElement`. Además, gestiona `InfoWindows` cuando se selecciona un lugar en el mapa.

* **Cliente de API de geocoding** (`src/api/geocodeClient.js`) que provee funciones para `/api/geocode/reverse` y `/api/geocode/forward`. Permite obtener coordenadas desde direcciones y viceversa. Es usado tanto en `SearchText` como en `SearchMap`.

* **Servidor de backend** (`server/index.js`) implementado en Express. Expone endpoints que encapsulan las llamadas a servicios externos:  
  - `/api/geocode/reverse` y `/api/geocode/forward` (Google Geocoding).  
  - `/api/translate` (Google Translate).  
  - `/api/horoscope` (API pública de horóscopo).  
  El backend lee claves desde `.env` con `dotenv`.

* **Archivo `package.json`** con scripts convenientes para desarrollo:  
  - `dev:web`: levanta el frontend en `:5173`.  
  - `dev:api`: levanta el backend en `:5174`.  
  - `dev`: levanta ambos con `concurrently`.

* **Archivo `vite.config.js`** con la configuración de proxy: redirige todas las llamadas a `/api` desde el frontend hacia el backend en el puerto 5174, evitando problemas de CORS en desarrollo.

## Estudia el código

1. Estudia cómo están implementados los favoritos; cómo se crean, cómo se guardan, y cómo se despliegan múltiples placemarks en el mapa de búsqueda, mostrando todos los favoritos.
2. Estudia cómo está implementada la funcionalidad de búsqueda de hoteles que aparece en el InfoWindow de `MapView`.
3. El mapa permite pinchar en cualquier punto, y muestra información de la ciudad más cercana. Estudia cómo se implementa esto, especialmente, `snapToNearestLocality` en el componente `SearchMap`.

## Anexo: Lo básico de Vite

Usamos Vite (https://vitejs.dev/) como andamiaje para crear nuestra aplicación utilizando React 18. Vite provee una serie de herramientas, por ejemplo, generadores parecidos a los que tiene una aplicación Rails, que permiten crear una aplicación de frontend a partir de cero, y preparar una aplicación para producción.

Si abres el archivo `package.json` verás que hay un objeto con clave `"scripts"` declarado. Este objeto define varias tareas posibles de realizar utilizando Vite, invocándolas con Yarn según nuestras preferencias de ambiente de desarrollo.

Los scripts relevantes son:

* `dev`: Permite levantar la aplicación en modo desarrollo como hemos visto arriba.
* `build`: Prepara la aplicación para ponerla en ambiente de producción.
* `lint`: Ejecuta linters para validar que el código cumpla estándares de codificación, y normas de calidad.
* `preview`: Permite previsualizar la aplicación después que ha sido construida con `build`.

