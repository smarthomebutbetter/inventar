from __future__ import annotations

import base64
import logging
import os
from datetime import datetime

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import DOMAIN, DEFAULT_IMAGE_DIR

_LOGGER = logging.getLogger(__name__)


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/settings/get",
})
@websocket_api.async_response
async def ws_get_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    settings_manager = hass.data[DOMAIN]["settings_manager"]
    connection.send_result(msg["id"], settings_manager.all)


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/settings/save",
    vol.Required("settings"): dict,
})
@websocket_api.async_response
async def ws_save_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    settings_manager = hass.data[DOMAIN]["settings_manager"]
    updated = await settings_manager.async_save(msg["settings"])
    connection.send_result(msg["id"], updated)


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/welcome/dismiss",
})
@websocket_api.async_response
async def ws_dismiss_welcome(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Speichert dass der Willkommens-Dialog dauerhaft dismissed wurde."""
    settings_manager = hass.data[DOMAIN]["settings_manager"]
    current = settings_manager.all
    ui_settings = current.get("ui", {})
    ui_settings["welcome_dismissed"] = True
    await settings_manager.async_save({"ui": ui_settings})
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/bild/upload",
    vol.Required("key"): str,
    vol.Required("data"): str,
})
@websocket_api.async_response
async def ws_upload_bild(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """
    Empfängt ein Base64-kodiertes WebP-Bild und speichert es als
    /config/www/inventar/images/{key}.webp

    Rückgabe: { "url": "/local/inventar/images/{key}.webp" }
    """
    key = msg["key"].strip()
    data_b64 = msg["data"]

    if not key:
        connection.send_error(msg["id"], "invalid_key", "Key darf nicht leer sein")
        return

    if "," in data_b64:
        data_b64 = data_b64.split(",", 1)[1]

    try:
        bild_bytes = base64.b64decode(data_b64)
    except Exception as e:
        _LOGGER.error("Bild-Upload: Base64-Dekodierung fehlgeschlagen: %s", e)
        connection.send_error(msg["id"], "decode_error", "Base64-Dekodierung fehlgeschlagen")
        return

    def _save_image():
        img_dir = DEFAULT_IMAGE_DIR
        os.makedirs(img_dir, exist_ok=True)
        path = os.path.join(img_dir, f"{key}.webp")
        with open(path, "wb") as f:
            f.write(bild_bytes)
        return path

    try:
        await hass.async_add_executor_job(_save_image)
    except Exception as e:
        _LOGGER.error("Bild-Upload: Speichern fehlgeschlagen: %s", e)
        connection.send_error(msg["id"], "save_error", f"Speichern fehlgeschlagen: {e}")
        return

    url = f"/local/inventar/images/{key}.webp"
    _LOGGER.info("Bild gespeichert: %s → %s", key, url)
    connection.send_result(msg["id"], {"url": url, "key": key})


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/bild/loeschen",
    vol.Required("key"): str,
})
@websocket_api.async_response
async def ws_loeschen_bild(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Löscht das Bild eines Produkts."""
    key = msg["key"].strip()

    def _delete_image():
        path = os.path.join(DEFAULT_IMAGE_DIR, f"{key}.webp")
        if os.path.exists(path):
            os.remove(path)
            return True
        return False

    try:
        deleted = await hass.async_add_executor_job(_delete_image)
    except Exception as e:
        _LOGGER.error("Bild-Löschen fehlgeschlagen: %s", e)
        connection.send_error(msg["id"], "delete_error", str(e))
        return

    connection.send_result(msg["id"], {"success": True, "deleted": deleted})


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/produkte/alle",
})
@websocket_api.async_response
async def ws_get_alle_produkte(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Alle Produkte direkt vom Coordinator — kein Limit, kein Filter."""
    coordinator = hass.data[DOMAIN].get("coordinator")
    if not coordinator or not coordinator.data:
        connection.send_result(msg["id"], {"produkte": [], "count": 0})
        return

    produkte = coordinator.data.get("products", [])
    connection.send_result(msg["id"], {"produkte": produkte, "count": len(produkte)})


def _build_qr_payload(settings: dict, key: str) -> tuple[str, str, bool]:
    """
    Gibt zurück:
      qr_text, public_url, is_public_enabled
    """
    app_settings = settings.get("app", {})
    qr_settings = settings.get("qr", {})

    externe_url = (app_settings.get("externe_url") or "").strip().rstrip("/")
    public_base_url = (qr_settings.get("public_base_url") or "").strip().rstrip("/")

    modus = qr_settings.get("modus", "auto")
    public_enabled = bool(qr_settings.get("public_enabled", False))
    hybrid_enabled = bool(qr_settings.get("hybrid_enabled", True))

    public_url = ""
    if public_base_url:
        public_url = f"{public_base_url}/inventar/public/{key}"
    elif externe_url:
        public_url = f"{externe_url}/inventar?key={key}"

    # intern = nur App-intern
    if modus == "intern":
        return f"inventar:{key}", public_url, False

    # public = nur URL
    if modus == "public":
        if public_url:
            return public_url, public_url, True
        return f"inventar:{key}", public_url, False

    # auto / hybrid
    if hybrid_enabled:
        return f"inventar:{key}", public_url, public_enabled and bool(public_url)

    return f"inventar:{key}", public_url, False


def _generate_qr_base64(qr_text: str):
    import io
    import qrcode
    from qrcode.image.pure import PyPNGImage

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    img = qr.make_image(image_factory=PyPNGImage)
    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/qr/generieren",
    vol.Required("key"): str,
})
@websocket_api.async_response
async def ws_qr_generieren(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """
    Generiert QR-Code lokal als Base64-PNG.

    Neu:
    - intern / public / hybrid vorbereitet
    - standard / modern design als Metadaten
    """
    key = msg["key"].strip()
    if not key:
        connection.send_error(msg["id"], "invalid_key", "Key fehlt")
        return

    settings_manager = hass.data[DOMAIN].get("settings_manager")
    settings = settings_manager.all if settings_manager else {}

    qr_settings = settings.get("qr", {})
    qr_design = qr_settings.get("design", "modern")

    qr_text, public_url, public_enabled = _build_qr_payload(settings, key)

    def _generate_qr():
        try:
            data = _generate_qr_base64(qr_text)
            return {"data": data, "local": True}
        except Exception as e:
            _LOGGER.warning("qrcode Library nicht verfügbar, Fallback: %s", e)
            return {"data": None, "local": False}

    try:
        result = await hass.async_add_executor_job(_generate_qr)
    except Exception as e:
        _LOGGER.error("QR-Generierung fehlgeschlagen: %s", e)
        connection.send_error(msg["id"], "qr_error", str(e))
        return

    fallback_url = (
        "https://api.qrserver.com/v1/create-qr-code/"
        f"?size=220x220&data={qr_text.replace('https://', 'https%3A%2F%2F').replace('/', '%2F')}"
    )

    connection.send_result(msg["id"], {
        "data": result.get("data"),
        "local": result.get("local", False),
        "fallback_url": fallback_url,
        "key": key,
        "text": qr_text,
        "design": qr_design,
        "public_enabled": public_enabled,
        "public_url": public_url,
    })


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/qr/regen_all",
})
@websocket_api.async_response
async def ws_qr_regen_all(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """
    Regeneriert logisch alle QR-Metadaten in allen Produkten.
    Die Bilddatei selbst wird on-demand erzeugt.
    """
    coordinator = hass.data[DOMAIN].get("coordinator")
    settings_manager = hass.data[DOMAIN].get("settings_manager")

    if not coordinator or not coordinator.data:
        connection.send_result(msg["id"], {"success": False, "message": "Keine Produktdaten geladen"})
        return

    settings = settings_manager.all if settings_manager else {}
    qr_settings = settings.get("qr", {})
    qr_design = qr_settings.get("design", "modern")
    qr_mode = qr_settings.get("modus", "auto")

    produkte = coordinator.data.get("products", [])

    ok = 0
    failed = 0

    for produkt in produkte:
        try:
            key = str(produkt.get("key") or produkt.get("id") or "").strip()
            if not key:
                failed += 1
                continue

            qr_text, public_url, public_enabled = _build_qr_payload(settings, key)

            updated = dict(produkt)
            updated["tag_id"] = key
            updated["qr_text"] = qr_text
            updated["qr_mode"] = qr_mode
            updated["qr_design"] = qr_design
            updated["qr_public_url"] = public_url if public_enabled else ""
            updated["qr_last_refresh"] = datetime.now().isoformat(timespec="seconds")

            await coordinator.async_write_product(updated)
            ok += 1
        except Exception as e:
            failed += 1
            _LOGGER.error("QR-Regeneration fehlgeschlagen (%s): %s", produkt.get("key"), e)

    if settings_manager:
        current = settings_manager.all
        developer = current.get("developer", {})
        developer["enabled"] = True
        developer["show_dev_tools"] = True
        developer["last_qr_regeneration"] = datetime.now().isoformat(timespec="seconds")

        qr_settings = current.get("qr", {})
        qr_settings["last_regenerated"] = datetime.now().isoformat(timespec="seconds")

        await settings_manager.async_save({
            "developer": developer,
            "qr": qr_settings,
        })

    connection.send_result(msg["id"], {
        "success": True,
        "ok": ok,
        "failed": failed,
        "message": f"{ok} QR-Codes aktualisiert, {failed} Fehler",
    })


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/dev/enable",
})
@websocket_api.async_response
async def ws_dev_enable(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    settings_manager = hass.data[DOMAIN]["settings_manager"]
    current = settings_manager.all
    developer = current.get("developer", {})
    developer["enabled"] = True
    developer["show_dev_tools"] = True
    developer["last_debug_action"] = datetime.now().isoformat(timespec="seconds")

    await settings_manager.async_save({"developer": developer})
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/dev/version_tap",
})
@websocket_api.async_response
async def ws_dev_version_tap(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """
    Für versteckte Entwicklerwerkzeuge:
    Nach 5 Taps -> Dev Tools aktiv.
    """
    settings_manager = hass.data[DOMAIN]["settings_manager"]
    current = settings_manager.all

    ui_settings = current.get("ui", {})
    developer = current.get("developer", {})

    count = int(ui_settings.get("version_tap_count", 0)) + 1
    ui_settings["version_tap_count"] = count
    ui_settings["last_version_tap"] = int(datetime.now().timestamp())

    activated = False
    if count >= 5:
        developer["enabled"] = True
        developer["show_dev_tools"] = True
        developer["last_debug_action"] = datetime.now().isoformat(timespec="seconds")
        ui_settings["version_tap_count"] = 0
        activated = True

    await settings_manager.async_save({
        "ui": ui_settings,
        "developer": developer,
    })

    connection.send_result(msg["id"], {
        "success": True,
        "tap_count": count if not activated else 5,
        "activated": activated,
    })


@websocket_api.websocket_command({
    vol.Required("type"): "inventar/dev/status",
})
@websocket_api.async_response
async def ws_dev_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    settings_manager = hass.data[DOMAIN]["settings_manager"]
    current = settings_manager.all
    developer = current.get("developer", {})
    connection.send_result(msg["id"], {
        "enabled": bool(developer.get("enabled", False)),
        "show_dev_tools": bool(developer.get("show_dev_tools", False)),
        "last_qr_regeneration": developer.get("last_qr_regeneration", ""),
        "last_cache_clear": developer.get("last_cache_clear", ""),
        "last_debug_action": developer.get("last_debug_action", ""),
    })


# Prozess-globaler Guard: WebSocket-Commands lassen sich nicht abmelden und
# duerfen daher pro HA-Prozess nur einmal registriert werden. Die Handler holen
# Coordinator/Settings zur Laufzeit aus hass.data — ein Reload braucht sie nicht
# neu zu binden.
_WEBSOCKETS_REGISTERED = False


def async_register_websockets(hass: HomeAssistant) -> None:
    global _WEBSOCKETS_REGISTERED
    if _WEBSOCKETS_REGISTERED:
        return
    websocket_api.async_register_command(hass, ws_get_settings)
    websocket_api.async_register_command(hass, ws_save_settings)
    websocket_api.async_register_command(hass, ws_dismiss_welcome)

    websocket_api.async_register_command(hass, ws_upload_bild)
    websocket_api.async_register_command(hass, ws_loeschen_bild)

    websocket_api.async_register_command(hass, ws_get_alle_produkte)

    websocket_api.async_register_command(hass, ws_qr_generieren)
    websocket_api.async_register_command(hass, ws_qr_regen_all)

    websocket_api.async_register_command(hass, ws_dev_enable)
    websocket_api.async_register_command(hass, ws_dev_version_tap)
    websocket_api.async_register_command(hass, ws_dev_status)

    _WEBSOCKETS_REGISTERED = True