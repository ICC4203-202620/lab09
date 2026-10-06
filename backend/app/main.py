"""Backend de la Weather App, laboratorio 9.

Es una fachada: el frontend le pide datos a estos endpoints, y el servidor
los reenvía a las APIs de Google y a la de horóscopo agregando las API keys,
que nunca salen de aquí. Además guarda los lugares del usuario, con sus
fotografías, en SQLite y en disco.

Stack: Python 3.12+, FastAPI y el módulo `sqlite3` de la biblioteca estándar,
igual que la aplicación de ejemplo de la clase 10. Se levanta con uvicorn en
el puerto 8000:

    cd backend
    .venv/bin/uvicorn app.main:app --reload --env-file ../.env

o, desde la raíz del proyecto, con `yarn dev`, que lo lanza junto con Vite.
La documentación interactiva queda en http://localhost:8000/docs.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db, google, horoscope, placemarks


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    if not google.geocoding_key():
        print("[WARN] Falta GOOGLE_GEOCODING_API_KEY en .env")
    if not google.translate_key():
        print("[WARN] Falta GOOGLE_TRANSLATE_API_KEY en .env")
    yield


app = FastAPI(title="Weather App · Laboratorio 9", lifespan=lifespan)

# CORS. Mientras desarrollamos, el navegador no le habla directamente a este
# servidor sino al proxy de Vite (ver vite.config.js), pero las peticiones POST
# llevan igual el encabezado Origin de la página. Por eso la lista incluye los
# dos puertos de Vite: 5173 para `yarn dev` y 4173 para `yarn preview`.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(google.router)
app.include_router(horoscope.router)
app.include_router(placemarks.router)


@app.get("/healthz", include_in_schema=False)
def healthz() -> dict:
    return {"status": "ok"}
