"""Pruebas de los lugares. No necesitan red ni keys: solo SQLite y el disco,
en una carpeta temporal que pytest crea para cada prueba.

    cd backend && .venv/bin/pytest -q
"""

import struct
import zlib

import pytest
from fastapi.testclient import TestClient

from app import placemarks
from app.main import app


def png_bytes(width: int = 1, height: int = 1) -> bytes:
    """Un PNG válido y mínimo, armado a mano: firma + IHDR + IDAT + IEND."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8 bits, RGB
    raw = b"".join(b"\x00" + b"\x00\x00\x00" * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("LAB09_DATA_DIR", str(tmp_path))
    # El `with` ejecuta el lifespan: crea la base de datos y la carpeta de fotos.
    with TestClient(app) as test_client:
        yield test_client


SANTIAGO = {"name": "Plaza de Armas", "latitude": "-33.4378", "longitude": "-70.6505"}


def test_create_without_photo(client):
    response = client.post("/api/placemarks", data={**SANTIAGO, "note": "Centro"})
    assert response.status_code == 201
    body = response.json()
    assert response.headers["Location"] == f"/api/placemarks/{body['id']}"
    assert body["name"] == "Plaza de Armas"
    assert body["note"] == "Centro"
    assert body["address"] is None
    assert body["photo_url"] is None
    assert body["latitude"] == pytest.approx(-33.4378)

    assert client.get("/api/placemarks").json()["items"] == [body]
    assert client.get(f"/api/placemarks/{body['id']}").json() == body


def test_create_with_photo_and_serve_it(client):
    files = {"photo": ("foto.png", png_bytes(), "image/png")}
    response = client.post("/api/placemarks", data=SANTIAGO, files=files)
    assert response.status_code == 201
    body = response.json()
    assert body["photo_url"] == f"/api/placemarks/{body['id']}/photo"

    photo = client.get(body["photo_url"])
    assert photo.status_code == 200
    assert photo.headers["content-type"] == "image/png"
    assert "immutable" in photo.headers["cache-control"]
    assert photo.content == png_bytes()


def test_declared_type_must_match_content(client):
    files = {"photo": ("foto.jpg", png_bytes(), "image/jpeg")}
    response = client.post("/api/placemarks", data=SANTIAGO, files=files)
    assert response.status_code == 422
    assert "image/png" in response.json()["detail"]
    # Nada quedó guardado: ni la fila ni el archivo.
    assert client.get("/api/placemarks").json()["items"] == []


def test_rejects_non_images(client):
    files = {"photo": ("nota.txt", b"hola, esto no es una imagen", "image/png")}
    response = client.post("/api/placemarks", data=SANTIAGO, files=files)
    assert response.status_code == 422


def test_rejects_photos_over_the_limit(client, monkeypatch):
    monkeypatch.setattr(placemarks, "MAX_PHOTO_BYTES", 64)
    files = {"photo": ("foto.png", png_bytes(8, 8), "image/png")}
    response = client.post("/api/placemarks", data=SANTIAGO, files=files)
    assert response.status_code == 413


def test_validates_fields(client):
    assert client.post("/api/placemarks", data={**SANTIAGO, "name": "   "}).status_code == 422
    assert client.post("/api/placemarks", data={**SANTIAGO, "latitude": "100"}).status_code == 422
    assert client.post("/api/placemarks", data={"name": "Sin coordenadas"}).status_code == 422


def test_delete_removes_row_and_photo(client, tmp_path):
    files = {"photo": ("foto.png", png_bytes(), "image/png")}
    created = client.post("/api/placemarks", data=SANTIAGO, files=files).json()
    assert len(list((tmp_path / "photos").iterdir())) == 1

    assert client.delete(f"/api/placemarks/{created['id']}").status_code == 204
    assert client.get(f"/api/placemarks/{created['id']}").status_code == 404
    assert client.get(created["photo_url"]).status_code == 404
    assert list((tmp_path / "photos").iterdir()) == []


def test_unknown_placemark_is_404(client):
    assert client.get("/api/placemarks/no-existe").status_code == 404
    assert client.delete("/api/placemarks/no-existe").status_code == 404


def test_proxies_report_missing_keys(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_GEOCODING_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_TRANSLATE_API_KEY", raising=False)
    assert client.get("/api/geocode/reverse", params={"lat": -33.4, "lng": -70.6}).status_code == 500
    assert client.post("/api/translate", json={"q": "hello"}).status_code == 500


def test_horoscope_whitelists(client):
    assert client.get("/api/horoscope", params={"sign": "ofiuco"}).status_code == 400
    assert client.get("/api/horoscope", params={"sign": "leo", "period": "yearly"}).status_code == 400
