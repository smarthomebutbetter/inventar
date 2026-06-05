from __future__ import annotations

import time
import logging
from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.components import websocket_api

_LOGGER = logging.getLogger(__name__)
DOMAIN = "inventar"


async def async_register_panel(hass):
    frontend_path = Path(__file__).parent / "frontend"
    ts = int(time.time())

    await hass.http.async_register_static_paths([
        StaticPathConfig(
            url_path="/api/inventar_panel",
            path=str(frontend_path),
            cache_headers=False,
        )
    ])

    # Settings Panel
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="inventar-panel",
        frontend_url_path="inventar-settings",
        module_url=f"/api/inventar_panel/inventar-panel-settings.js?v={ts}",
        sidebar_title="Inventar Settings",
        sidebar_icon="mdi:cog",
        require_admin=True,
    )

    # WebSocket-Handler für Dashboard-Generierung registrieren
    websocket_api.async_register_command(hass, ws_dashboard_generate)
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
    try:
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
    except Exception as e:
        # Panel bereits registriert — kein echter Fehler
        _LOGGER.debug("Hauptpanel bereits registriert (normal bei Reload): %s", e)
