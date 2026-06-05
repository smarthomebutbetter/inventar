from __future__ import annotations

import time
import logging
from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.components import websocket_api

_LOGGER = logging.getLogger(__name__)
DOMAIN = "inventar"

# Prozess-globale Guards: Static-Paths und WebSocket-Commands lassen sich in HA
# nicht wieder abmelden, daher duerfen sie pro HA-Prozess nur EINMAL registriert
# werden — sonst schlaegt ein Reload mit "already registered" fehl. Die Guards
# liegen bewusst modul-global (nicht in hass.data, das beim Unload geleert wird).
_STATIC_PATH_REGISTERED = False
_WS_DASHBOARD_REGISTERED = False


def _remove_panel(hass, url_path: str) -> None:
    """Entfernt ein Sidebar-Panel, falls vorhanden (reload-sicher)."""
    from homeassistant.components import frontend
    try:
        frontend.async_remove_panel(hass, url_path, warn_if_unknown=False)
    except Exception as e:  # pragma: no cover - defensiv
        _LOGGER.debug("Panel %s konnte nicht entfernt werden: %s", url_path, e)


async def async_register_panel(hass):
    global _STATIC_PATH_REGISTERED, _WS_DASHBOARD_REGISTERED
    frontend_path = Path(__file__).parent / "frontend"
    ts = int(time.time())

    # Static-Path nur einmal pro HA-Prozess registrieren (nicht abmeldbar)
    if not _STATIC_PATH_REGISTERED:
        try:
            await hass.http.async_register_static_paths([
                StaticPathConfig(
                    url_path="/api/inventar_panel",
                    path=str(frontend_path),
                    cache_headers=False,
                )
            ])
        except (RuntimeError, ValueError) as e:
            _LOGGER.debug("Static-Path bereits registriert: %s", e)
        _STATIC_PATH_REGISTERED = True

    # Settings-Panel: vorhandenes zuerst entfernen, dann sauber neu registrieren
    _remove_panel(hass, "inventar-settings")
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="inventar-panel",
        frontend_url_path="inventar-settings",
        module_url=f"/api/inventar_panel/inventar-panel-settings.js?v={ts}",
        sidebar_title="Inventar Settings",
        sidebar_icon="mdi:cog",
        require_admin=True,
    )

    # WebSocket-Handler für Dashboard-Generierung nur einmal registrieren
    if not _WS_DASHBOARD_REGISTERED:
        websocket_api.async_register_command(hass, ws_dashboard_generate)
        _WS_DASHBOARD_REGISTERED = True
    _LOGGER.debug("inventar/dashboard/generate WebSocket-Handler registriert")


@websocket_api.websocket_command({"type": "inventar/dashboard/generate"})
@websocket_api.async_response
async def ws_dashboard_generate(hass, connection, msg):
    """Registriert das Inventar-Hauptpanel in der HA-Seitenleiste."""
    try:
        await async_register_main_panel(hass)

        # Merken dass das Panel bereits generiert wurde
        manager = hass.data[DOMAIN].get("settings_manager")
        if manager:
            current = manager.all
            dashboard = current.get("dashboard", {})
            dashboard["generated"] = True
            await manager.async_save({"dashboard": dashboard})

        _LOGGER.info("Inventar-Hauptpanel erfolgreich registriert")
        connection.send_result(msg["id"], {"success": True})

    except Exception as e:
        _LOGGER.error("Dashboard-Generierung fehlgeschlagen: %s", e)
        connection.send_error(
            msg["id"],
            websocket_api.const.ERR_UNKNOWN_ERROR,
            str(e),
        )


async def async_register_main_panel(hass):
    ts = int(time.time())
    # Vorhandenes Panel zuerst entfernen, damit Reload sauber neu registriert
    _remove_panel(hass, "inventar")
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="inventar-main-panel",
        frontend_url_path="inventar",
        module_url=f"/api/inventar_panel/inventar-panel.js?v={ts}",
        sidebar_title="Inventar App",
        sidebar_icon="mdi:package-variant-closed",
        require_admin=False,
    )
    _LOGGER.info("Inventar-Hauptpanel in Seitenleiste registriert ✓")
