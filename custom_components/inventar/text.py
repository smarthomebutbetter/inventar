from __future__ import annotations

from homeassistant.components.text import TextEntity
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
    async_add_entities([InventarSucheText(coordinator, entry)])


class InventarSucheText(TextEntity):
    """Text-Entity für die Inventar-Suche."""

    _attr_has_entity_name = True
    _attr_name = "Suche"
    _attr_unique_id = "inventar_suche"
    _attr_icon = "mdi:magnify"
    _attr_native_value = ""
    _attr_native_min = 0
    _attr_native_max = 255

    def __init__(
        self,
        coordinator: InventarCoordinator,
        entry: ConfigEntry,
    ) -> None:
        self._coordinator = coordinator
        self._entry = entry

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name="Inventar",
            manufacturer="Custom",
            model="Inventar Integration",
        )

    async def async_set_value(self, value: str) -> None:
        self._attr_native_value = value
        self.async_write_ha_state()
        self._coordinator.search_query = value
        await self._coordinator.async_request_refresh()
