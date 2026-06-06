from __future__ import annotations

import os
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback

from .core.settings import InventarSettingsManager
from .api.websockets import async_register_websockets
from .api.panel import async_register_panel
from .api.services import async_register_services, _remove_from_configuration_yaml
from .coordinator import InventarCoordinator
from .const import EVENT_PRODUCT_CHANGED

_LOGGER = logging.getLogger(__name__)
DOMAIN = "inventar"
PLATFORMS = ["sensor", "select", "text"]





async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    _LOGGER.info("=== INVENTAR SETUP START ===")
    hass.data.setdefault(DOMAIN, {})

    settings_manager = InventarSettingsManager(hass)
    await settings_manager.async_load()

    if not entry.options.get("_initialized"):
        _LOGGER.info("Neuinstallation erkannt — setze Flags zurück")
        current = settings_manager.all
        dashboard_settings = current.get("dashboard", {})
        dashboard_settings["generated"] = False
        ui_settings = current.get("ui", {})
        ui_settings["welcome_dismissed"] = False
        externe_url = entry.data.get("externe_url", "").strip()
        app_settings = current.get("app", {})
        if externe_url:
            app_settings["externe_url"] = externe_url
        await settings_manager.async_save({
            "dashboard": dashboard_settings,
            "ui": ui_settings,
            "app": app_settings,
        })
        hass.config_entries.async_update_entry(
            entry, options={**entry.options, "_initialized": True}
        )

    hass.data[DOMAIN]["settings_manager"] = settings_manager

    coordinator = InventarCoordinator(hass, entry)
    try:
        await coordinator.async_config_entry_first_refresh()
        _LOGGER.info("Coordinator geladen ✓")
    except Exception as e:
        _LOGGER.error("Coordinator Fehler: %s", e)
        raise

    hass.data[DOMAIN]["coordinator"] = coordinator
    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Broadcasting: bei jeder Coordinator-Aktualisierung ein Bus-Event feuern,
    # damit ALLE verbundenen Panel-Clients sofort neu laden (Multi-Geraete-Sync).
    # Alle Mutationen (Anlegen/Bearbeiten/Bestand/Loeschen/Import/Restore/QR)
    # laufen ueber async_request_refresh und loesen damit den Listener aus.
    @callback
    def _broadcast_change() -> None:
        hass.bus.async_fire(EVENT_PRODUCT_CHANGED)

    entry.async_on_unload(coordinator.async_add_listener(_broadcast_change))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    async_register_websockets(hass)
    await async_register_panel(hass)
    await async_register_services(hass, coordinator, entry)


    # Hauptpanel registrieren falls bereits generiert
    settings = hass.data[DOMAIN]["settings_manager"].all
    if settings.get("dashboard", {}).get("generated"):
        from .api.panel import async_register_main_panel
        try:
            await async_register_main_panel(hass)
            _LOGGER.info("Inventar-Hauptpanel automatisch registriert")
        except Exception as e:
            _LOGGER.warning("Hauptpanel auto-registrierung fehlgeschlagen: %s", e)

    _LOGGER.info("=== INVENTAR SETUP FERTIG ===")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    try:
        manager = hass.data[DOMAIN]["settings_manager"]
        settings = manager.all
        pfad = settings["dashboard"]["pfad"]

        def cleanup():
            if os.path.exists(pfad):
                os.remove(pfad)
                _LOGGER.info("Dashboard-Datei gelöscht: %s", pfad)

        await hass.async_add_executor_job(cleanup)
        await hass.async_add_executor_job(
            _remove_from_configuration_yaml,
            hass.config.config_dir,
        )
    except Exception as e:
        _LOGGER.warning("Cleanup fehlgeschlagen: %s", e)

    # Sidebar-Panels abmelden, damit ein anschliessendes Setup (Reload) sie
    # ohne "Overwriting panel"-Fehler neu registrieren kann.
    from .api.panel import _remove_panel
    _remove_panel(hass, "inventar-settings")
    _remove_panel(hass, "inventar")

    hass.data.pop(DOMAIN, None)
    return unload_ok
