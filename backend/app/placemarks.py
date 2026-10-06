"""Lugares del usuario (placemarks): un punto en el mapa con nombre, nota,
dirección y, opcionalmente, una fotografía tomada con la cámara.

- `GET    /api/placemarks`             la lista, del más nuevo al más antiguo.
- `POST   /api/placemarks`             crea uno; `201` con `Location`.
- `GET    /api/placemarks/{id}`        la ficha, o `404`.
- `DELETE /api/placemarks/{id}`        lo elimina junto con su foto; `204`.
- `GET    /api/placemarks/{id}/photo`  los bytes de la foto, o `404`.

La creación recibe `multipart/form-data` y no JSON, porque la foto son bytes:
en JavaScript se arma con `FormData`, y el navegador agrega el `Content-Type`
con su `boundary`. Es la misma forma en que `project-base` recibe las
fotografías de platos (`POST /api/v1/photos`).

Los metadatos van a SQLite y los bytes al disco, en `data/photos/`. Guardar la
imagen dentro de la base de datos es posible, pero servirla desde un archivo
es más simple y más barato, y es lo que después hace un bucket de S3.
"""

import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse

from app import db

router = APIRouter(prefix="/api/placemarks", tags=["placemarks"])

# 5 MiB. Una foto de teléfono sin reducir pesa entre 2 y 6 MiB; el frontend la
# reduce a 1280 px antes de subirla, con lo que queda muy por debajo.
MAX_PHOTO_BYTES = 5 * 1024 * 1024

# Firmas ("magic bytes") de los formatos que aceptamos. No confiamos en el
# Content-Type que declara el cliente: cualquiera puede escribir image/jpeg en
# una petición, pero los primeros bytes de un JPEG son siempre FF D8 FF.
SIGNATURES = (
    (b"\xff\xd8\xff", "image/jpeg", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", "png"),
    (b"RIFF", "image/webp", "webp"),  # y "WEBP" en los bytes 8 a 12, ver abajo
)
CONTENT_TYPE_ALIASES = {"image/jpg": "image/jpeg"}


def sniff_image(head: bytes) -> tuple[str, str] | None:
    """Devuelve (content_type, extensión) según los primeros bytes, o None.

    Ejercicio 7. Recorrer SIGNATURES y, si `head` empieza con la firma
    (`bytes.startswith`), devolver su content_type y extensión. WebP tiene una
    trampa: su firma "RIFF" es la de cualquier archivo RIFF (un .wav, un .avi),
    y recién los bytes 8 a 12 dicen "WEBP"; si no dicen eso, no es una imagen.
    Mientras devuelva None, toda foto se rechaza con 422, y tres pruebas de
    tests/test_placemarks.py fallan: hazlas pasar.
    """
    return None  # TODO


def to_dict(row: sqlite3.Row) -> dict:
    """La representación que ve el frontend. La foto no viaja incrustada: se
    entrega una URL relativa, estable, que el navegador pide cuando la muestra."""
    return {
        "id": row["id"],
        "name": row["name"],
        "note": row["note"],
        "address": row["address"],
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        "created_at": row["created_at"],
        "photo_url": f"/api/placemarks/{row['id']}/photo" if row["photo_file"] else None,
    }


def fetch(placemark_id: str) -> sqlite3.Row:
    with closing(db.connect()) as connection:
        row = connection.execute("SELECT * FROM placemarks WHERE id = ?", (placemark_id,)).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Placemark not found")
    return row


async def read_photo(photo: UploadFile) -> tuple[bytes, str, str]:
    """Lee el archivo subido validando tamaño y formato ANTES de guardar nada.
    Devuelve (bytes, content_type, extensión)."""
    # Se lee de a trozos y se corta apenas se pasa del máximo: así un archivo
    # de 2 GB no llega a ocupar memoria.
    chunks, total = [], 0
    while chunk := await photo.read(64 * 1024):
        total += len(chunk)
        if total > MAX_PHOTO_BYTES:
            raise HTTPException(
                status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"photo exceeds {MAX_PHOTO_BYTES} bytes",
            )
        chunks.append(chunk)
    content = b"".join(chunks)
    if not content:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="photo is empty")

    sniffed = sniff_image(content[:16])
    if sniffed is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="photo must be a JPEG, PNG or WebP image",
        )
    content_type, extension = sniffed

    declared = CONTENT_TYPE_ALIASES.get(photo.content_type or "", photo.content_type)
    if declared and declared != content_type:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"declared {declared} but the content is {content_type}",
        )
    return content, content_type, extension


@router.get("")
def index() -> dict:
    with closing(db.connect()) as connection:
        rows = connection.execute("SELECT * FROM placemarks ORDER BY created_at DESC, id").fetchall()
    return {"items": [to_dict(row) for row in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create(
    response: Response,
    name: Annotated[str, Form(min_length=1, max_length=80)],
    latitude: Annotated[float, Form(ge=-90, le=90)],
    longitude: Annotated[float, Form(ge=-180, le=180)],
    note: Annotated[str, Form(max_length=500)] = "",
    address: Annotated[str | None, Form(max_length=200)] = None,
    photo: Annotated[UploadFile | None, File()] = None,
) -> dict:
    name = name.strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="name must not be blank")

    placemark_id = str(uuid.uuid4())
    photo_file = photo_content_type = None

    # Primero se valida y se escribe la foto; si la inserción falla después, el
    # archivo se borra. Nunca debe quedar una foto huérfana ni una fila que
    # apunte a un archivo inexistente.
    if photo is not None and photo.filename:
        content, photo_content_type, extension = await read_photo(photo)
        photo_file = f"{placemark_id}.{extension}"
        (db.photos_dir() / photo_file).write_bytes(content)

    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    try:
        with closing(db.connect()) as connection, connection:
            connection.execute(
                "INSERT INTO placemarks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (placemark_id, name, note.strip(), (address or "").strip() or None,
                 latitude, longitude, photo_file, photo_content_type, created_at),
            )
    except sqlite3.Error:
        if photo_file:
            (db.photos_dir() / photo_file).unlink(missing_ok=True)
        raise

    response.headers["Location"] = f"/api/placemarks/{placemark_id}"
    return to_dict(fetch(placemark_id))


@router.get("/{placemark_id}")
def show(placemark_id: str) -> dict:
    return to_dict(fetch(placemark_id))


@router.delete("/{placemark_id}", status_code=status.HTTP_204_NO_CONTENT)
def destroy(placemark_id: str) -> Response:
    row = fetch(placemark_id)
    with closing(db.connect()) as connection, connection:
        connection.execute("DELETE FROM placemarks WHERE id = ?", (placemark_id,))
    if row["photo_file"]:
        (db.photos_dir() / row["photo_file"]).unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{placemark_id}/photo")
def photo(placemark_id: str) -> FileResponse:
    row = fetch(placemark_id)
    if not row["photo_file"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This placemark has no photo")
    path = db.photos_dir() / row["photo_file"]
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Photo file is missing")
    # La foto de un lugar no cambia nunca (para cambiarla se crea otro lugar),
    # así que el navegador y el service worker pueden guardarla sin preguntar.
    return FileResponse(
        path,
        media_type=row["photo_content_type"],
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
