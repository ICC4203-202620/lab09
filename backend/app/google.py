"""Fachada sobre las APIs de Google que necesitan key: Geocoding y Translation.

El frontend le pide al backend, y el backend le pide a Google agregando la key,
que nunca sale de aquí. Las keys llegan como variables de entorno: `yarn dev`
arranca uvicorn con `--env-file ../.env` (ver .env.example).

Los endpoints y la forma de sus respuestas son los mismos que tenía el backend
en Express del laboratorio 8, de modo que los clientes del frontend
(src/api/geocodeClient.js, translateClient.js) no cambiaron.
"""

import os
import re

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["google"])

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
TIMEOUT = httpx.Timeout(10.0)
USER_AGENT = {"user-agent": "WeatherApp-Server/1.0"}


def geocoding_key() -> str | None:
    return os.environ.get("GOOGLE_GEOCODING_API_KEY")


def translate_key() -> str | None:
    return os.environ.get("GOOGLE_TRANSLATE_API_KEY")


def mask_url(url: str) -> str:
    """Oculta la key al escribir una URL en el log. Un log se copia en mensajes,
    se pega en foros y se sube a servicios de monitoreo: una key en un log es
    una key filtrada."""
    return re.sub(r"([?&]key=)[^&]+", r"\1***", url)


# Google ordena los resultados por cercanía y no por utilidad: cerca de unas
# coordenadas, el primero puede ser un paradero o un local comercial, y en
# medio del mar solo hay un "plus code" (69GG2222+22), que no es una dirección.
# Preferimos una dirección de calle; si no la hay, cualquier resultado que no
# sea un plus code; y si solo quedan plus codes, no hay dirección que mostrar.
ADDRESS_TYPES = {"street_address", "premise", "subpremise", "route"}


def pick_best_result(results: list[dict]) -> dict | None:
    usable = [r for r in results if "plus_code" not in r.get("types", [])]
    for r in usable:
        if ADDRESS_TYPES & set(r.get("types", [])):
            return r
    return usable[0] if usable else None


async def geocode(tag: str, params: dict) -> JSONResponse:
    """Llama al Geocoding API y reduce la respuesta a lo que usa el frontend.
    `params` lleva `latlng` (reverse) o `address` (forward)."""
    key = geocoding_key()
    if not key:
        return JSONResponse({"error": "Missing GOOGLE_GEOCODING_API_KEY"}, status_code=500)

    query = {**params, "key": key}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=USER_AGENT) as client:
            response = await client.get(GEOCODING_URL, params=query)
    except httpx.HTTPError as error:
        print(f"[{tag}] fetch failed: {type(error).__name__}")
        message = "timeout" if isinstance(error, httpx.TimeoutException) else "network"
        return JSONResponse({"error": "geocode-proxy-failed", "message": message}, status_code=502)

    url = mask_url(str(response.url))
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    print(f"[{tag}] {response.status_code} {payload.get('status')} {url}")

    if response.status_code != 200:
        return JSONResponse(
            {"error": "google-http", "httpStatus": response.status_code, "url": url},
            status_code=502,
        )

    # ZERO_RESULTS no es una falla: la consulta funcionó y no hubo nada que
    # devolver (coordenadas en medio del mar, una dirección inexistente). El
    # frontend lo distingue porque `formatted` viene en null.
    if payload.get("status") == "ZERO_RESULTS":
        return JSONResponse({"status": "ZERO_RESULTS", "formatted": None})

    # Cualquier otro estado distinto de OK sí es un problema, y casi siempre de
    # configuración: REQUEST_DENIED significa que la key no existe, no tiene
    # habilitado el Geocoding API, o el proyecto no tiene facturación activa.
    if payload.get("status") != "OK":
        return JSONResponse(
            {
                "error": "google-status",
                "googleStatus": payload.get("status"),
                "errorMessage": payload.get("error_message"),
                "url": url,
            },
            status_code=502,
        )

    best = pick_best_result(payload.get("results", []))
    if best is None:
        return JSONResponse({"status": "ZERO_RESULTS", "formatted": None})

    location = best.get("geometry", {}).get("location", {})
    return JSONResponse(
        {
            "status": payload["status"],
            "formatted": best.get("formatted_address"),
            "placeId": best.get("place_id"),
            "lat": location.get("lat"),
            "lng": location.get("lng"),
            "types": best.get("types"),
            "components": best.get("address_components"),
        }
    )


@router.get("/geocode/reverse")
async def reverse(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    lang: str = Query("es", min_length=2, max_length=10),
) -> JSONResponse:
    """Coordenadas → dirección."""
    return await geocode("rev", {"latlng": f"{lat},{lng}", "language": lang})


@router.get("/geocode/forward")
async def forward(
    address: str = Query(min_length=1, max_length=200),
    lang: str = Query("es", min_length=2, max_length=10),
) -> JSONResponse:
    """Dirección → coordenadas."""
    return await geocode("fwd", {"address": address.strip(), "language": lang})


class TranslateRequest(BaseModel):
    q: str = Field(min_length=1, max_length=5000)
    target: str = Field("es", min_length=2, max_length=10)
    source: str | None = Field(None, min_length=2, max_length=10)


@router.post("/translate")
async def translate(body: TranslateRequest, request: Request) -> JSONResponse:
    """Reenvía el texto a Cloud Translation (edición básica, v2) y devuelve la
    respuesta de Google tal cual, con su mismo código de estado."""
    key = translate_key()
    if not key:
        return JSONResponse({"error": "Missing GOOGLE_TRANSLATE_API_KEY"}, status_code=500)

    payload = {"q": body.q, "target": body.target, "format": "text"}
    if body.source:
        payload["source"] = body.source

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(TRANSLATE_URL, params={"key": key}, json=payload)
    except httpx.HTTPError as error:
        print(f"[translate] fetch failed: {type(error).__name__}")
        return JSONResponse({"error": "translate-proxy-failed"}, status_code=502)

    print(f"[translate] {response.status_code} {mask_url(str(response.url))}")
    try:
        content = response.json()
    except ValueError:
        content = {"error": "translate-bad-response"}
    return JSONResponse(content, status_code=response.status_code)
