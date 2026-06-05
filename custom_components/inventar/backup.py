"""Verschluesseltes Backup-/Restore-System fuer die Inventar-Integration.

Ein Backup ist ein ZIP-Archiv (Produkte, Einstellungen, Bilder), das mit
AES-256-GCM verschluesselt wird. Der Schluessel wird per PBKDF2-HMAC-SHA256 aus
einem Passwort abgeleitet. Das Dateiformat (.invbak):

    MAGIC(8) | SALT(16) | NONCE(12) | CIPHERTEXT(... inkl. GCM-Tag)

Reine Logik ohne Home-Assistant-Bezug — bewusst synchron gehalten und vom
Aufrufer in einem Executor-Job auszufuehren (CPU-gebunden).
"""

from __future__ import annotations

import io
import json
import logging
import os
import zipfile
from datetime import datetime

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

_LOGGER = logging.getLogger(__name__)

MAGIC = b"INVBAK01"
SALT_LEN = 16
NONCE_LEN = 12
GCM_TAG_LEN = 16
PBKDF2_ITERATIONS = 200_000
BACKUP_FORMAT_VERSION = 1


# ── Krypto ────────────────────────────────────────────────────────────────
def _derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_bytes(plaintext: bytes, password: str) -> bytes:
    """Verschluesselt Daten und gibt den fertigen .invbak-Blob zurueck."""
    salt = os.urandom(SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    key = _derive_key(password, salt)
    # MAGIC als Associated Data -> Header wird mit authentifiziert
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, MAGIC)
    return MAGIC + salt + nonce + ciphertext


def decrypt_bytes(blob: bytes, password: str) -> bytes:
    """Entschluesselt einen .invbak-Blob. Wirft ValueError bei Fehlern."""
    min_len = len(MAGIC) + SALT_LEN + NONCE_LEN + GCM_TAG_LEN
    if len(blob) < min_len:
        raise ValueError("Datei ist zu kurz oder beschaedigt")
    if blob[: len(MAGIC)] != MAGIC:
        raise ValueError("Kein gueltiges Inventar-Backup (Header fehlt)")

    off = len(MAGIC)
    salt = blob[off : off + SALT_LEN]
    off += SALT_LEN
    nonce = blob[off : off + NONCE_LEN]
    off += NONCE_LEN
    ciphertext = blob[off:]

    key = _derive_key(password, salt)
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, MAGIC)
    except Exception as err:  # InvalidTag o.ae.
        raise ValueError("Falsches Passwort oder beschaedigte Datei") from err


# ── ZIP-Aufbau / Wiederherstellung ────────────────────────────────────────
def build_backup_zip(
    produkt_ordner: str,
    image_dir: str,
    settings: dict,
    include_images: bool = True,
) -> tuple[bytes, dict]:
    """Baut das (unverschluesselte) Backup-ZIP im Speicher.

    Rueckgabe: (zip_bytes, manifest_dict)
    """
    counts = {"products": 0, "images": 0}
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Produkte
        if os.path.isdir(produkt_ordner):
            for name in sorted(os.listdir(produkt_ordner)):
                if not name.endswith(".yaml"):
                    continue
                src = os.path.join(produkt_ordner, name)
                if os.path.isfile(src):
                    with open(src, "rb") as fh:
                        zf.writestr(f"products/{name}", fh.read())
                    counts["products"] += 1

        # Einstellungen
        zf.writestr(
            "settings.json",
            json.dumps(settings, ensure_ascii=False, indent=2),
        )

        # Bilder
        if include_images and os.path.isdir(image_dir):
            for name in sorted(os.listdir(image_dir)):
                src = os.path.join(image_dir, name)
                if os.path.isfile(src):
                    with open(src, "rb") as fh:
                        zf.writestr(f"images/{name}", fh.read())
                    counts["images"] += 1

        manifest = {
            "format": BACKUP_FORMAT_VERSION,
            "created": datetime.now().isoformat(timespec="seconds"),
            "counts": counts,
            "include_images": include_images,
        }
        zf.writestr("backup.json", json.dumps(manifest, ensure_ascii=False, indent=2))

    return buf.getvalue(), manifest


def read_backup_manifest(zip_bytes: bytes) -> dict:
    """Liest nur das backup.json-Manifest aus einem entschluesselten ZIP."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        if "backup.json" in zf.namelist():
            return json.loads(zf.read("backup.json").decode("utf-8"))
    return {}


def restore_backup_zip(
    zip_bytes: bytes,
    produkt_ordner: str,
    image_dir: str,
) -> dict:
    """Schreibt Produkte/Bilder aus dem ZIP zurueck und liefert die Settings.

    Bestehende Dateien werden ueberschrieben, nicht im Backup enthaltene
    Dateien bleiben erhalten (nicht-destruktiv). Pfad-Traversal wird durch
    os.path.basename verhindert.
    """
    result = {"products": 0, "images": 0, "settings_data": None}

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()

        os.makedirs(produkt_ordner, exist_ok=True)
        for entry in names:
            if entry.startswith("products/") and entry.endswith(".yaml"):
                base = os.path.basename(entry)
                if not base:
                    continue
                with open(os.path.join(produkt_ordner, base), "wb") as fh:
                    fh.write(zf.read(entry))
                result["products"] += 1

            elif entry.startswith("images/"):
                base = os.path.basename(entry)
                if not base:
                    continue
                os.makedirs(image_dir, exist_ok=True)
                with open(os.path.join(image_dir, base), "wb") as fh:
                    fh.write(zf.read(entry))
                result["images"] += 1

        if "settings.json" in names:
            try:
                result["settings_data"] = json.loads(
                    zf.read("settings.json").decode("utf-8")
                )
            except Exception as err:
                _LOGGER.warning("settings.json im Backup ungueltig: %s", err)

    return result
