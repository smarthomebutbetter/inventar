from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import InventarCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: InventarCoordinator = hass.data[DOMAIN][entry.entry_id]
    manager = hass.data[DOMAIN]["settings_manager"]
    settings = manager.all

    # Kategorien aus dem Store holen
    kategorien = [k["name"] for k in settings.get("kategorien", [])]
    if not kategorien:
        kategorien = ["Alles"]

    async_add_entities([
        InventarFilterKategorieSelect(coordinator, entry, kategorien),
    ])


class InventarFilterKategorieSelect(SelectEntity):
    """Select-Entity für den Kategorie-Filter."""

    _attr_has_entity_name = True
    _attr_name = "Filter Kategorie"
    _attr_unique_id = "inventar_filter_kategorie"
    _attr_icon = "mdi:filter"

    def __init__(
        self,
        coordinator: InventarCoordinator,
        entry: ConfigEntry,
        kategorien: list[str],
    ) -> None:
        self._coordinator = coordinator
        self._entry = entry
        self._attr_options = kategorien
        self._attr_current_option = kategorien[0] if kategorien else "Alles"

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name="Inventar",
            manufacturer="Custom",
            model="Inventar Integration",
        )

    async def async_select_option(self, option: str) -> None:
        self._attr_current_option = option
        self.async_write_ha_state()
        self._coordinator.filter_kategorie = option
        await self._coordinator.async_request_refresh()
