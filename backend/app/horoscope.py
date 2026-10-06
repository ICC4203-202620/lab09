"""Proxy del horóscopo.

La API de freehoroscopeapi.com no necesita key y podría llamarse desde el
navegador. Pasa por el backend por otra razón: el servidor valida lo que
reenvía (solo los doce signos y tres períodos), y el frontend queda
independiente del proveedor. Cuando la API que usaba el laboratorio en 2025
cambió de dominio, bastó con corregir una línea aquí.
"""

import httpx
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api", tags=["horoscope"])

HOROSCOPE_URL = "https://freehoroscopeapi.com/api/v1/get-horoscope/{period}"
TIMEOUT = httpx.Timeout(10.0)

# Listas blancas: el servidor no reenvía cualquier cosa que le llegue.
SIGNS = {
    "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra",
    "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
}
PERIODS = {"daily", "weekly", "monthly"}


@router.get("/horoscope")
async def horoscope(sign: str = Query(), period: str = Query("daily")) -> JSONResponse:
    sign = sign.lower()
    period = period.lower()
    if sign not in SIGNS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid sign")
    if period not in PERIODS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid period")

    url = HOROSCOPE_URL.format(period=period)
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers={"user-agent": "WeatherApp-Server/1.0"}) as client:
            response = await client.get(url, params={"sign": sign})
    except httpx.HTTPError as error:
        print(f"[horoscope] fetch failed: {type(error).__name__}")
        return JSONResponse({"error": "horoscope-proxy-failed"}, status_code=502)

    print(f"[horoscope] {response.status_code} {response.url}")
    try:
        content = response.json()
    except ValueError:
        return JSONResponse({"error": "horoscope-bad-response"}, status_code=502)
    return JSONResponse(content, status_code=response.status_code)
