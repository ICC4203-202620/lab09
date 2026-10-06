"""Base de datos de la aplicación: SQLite, con el módulo `sqlite3` de Python.

No hay ORM ni migraciones: una tabla, creada al arrancar si no existe. Para un
laboratorio alcanza, y deja a la vista el SQL que un ORM escondería. El archivo
y las fotos viven en `backend/data/`, que está en .gitignore: son datos, no
código. Borrar esa carpeta deja el backend como recién instalado.
"""

import os
import sqlite3
from contextlib import closing
from pathlib import Path

# Las rutas se resuelven en cada llamada y no al importar el módulo, para que
# las pruebas puedan apuntar a una carpeta temporal con la variable de entorno.
DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def data_dir() -> Path:
    return Path(os.environ.get("LAB09_DATA_DIR", DEFAULT_DATA_DIR))


def db_path() -> Path:
    return data_dir() / "placemarks.sqlite3"


def photos_dir() -> Path:
    return data_dir() / "photos"


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(db_path())
    # Las filas se leen por nombre de columna (row["name"]) y no por posición.
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    photos_dir().mkdir(parents=True, exist_ok=True)
    with closing(connect()) as connection, connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS placemarks (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 note TEXT NOT NULL DEFAULT '',
                 address TEXT,
                 latitude REAL NOT NULL,
                 longitude REAL NOT NULL,
                 photo_file TEXT,
                 photo_content_type TEXT,
                 created_at TEXT NOT NULL
               )"""
        )
