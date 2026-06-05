from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.const import CURRENCY_EURO

from .const import ATTR_PRODUCT, ATTR_RESULTS, DOMAIN
from .coordinator import InventarCoordinator


async def async_setup_entry(hass, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    coordinator: InventarCoordinator = hass.data[DOMAIN][entry.entry_id]

    async_add_entities(
        [
            InventarTotalProductsSensor(coordinator, entry),
            InventarTotalValueSensor(coordinator, entry),
            InventarUnderMinSensor(coordinator, entry),
            InventarSearchResultsSensor(coordinator, entry),
            InventarActiveProductSensor(coordinator, entry),
        ]
    )


class InventarBaseSensor(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator: InventarCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Inventar",
            manufacturer="Custom",
            model="Inventar Integration",
        )


class InventarTotalProductsSensor(InventarBaseSensor):
    _attr_name = "Produkte gesamt"
    _attr_unique_id = "inventar_produkte_gesamt"
    _attr_icon = "mdi:package-variant-closed"

    @property
    def native_value(self):
        return self.coordinator.data.get("count", 0)


class InventarTotalValueSensor(InventarBaseSensor):
    _attr_name = "Gesamtwert"
    _attr_unique_id = "inventar_gesamtwert"
    _attr_icon = "mdi:cash-multiple"
    _attr_native_unit_of_measurement = CURRENCY_EURO

    @property
    def native_value(self):
        return self.coordinator.get_inventory_total_value()


class InventarUnderMinSensor(InventarBaseSensor):
    _attr_name = "Unter Mindestbestand"
    _attr_unique_id = "inventar_unter_mindestbestand"
    _attr_icon = "mdi:alert"

    @property
    def native_value(self):
        return self.coordinator.get_under_min_count()


class InventarSearchResultsSensor(InventarBaseSensor):
    _attr_name = "Suchergebnisse"
    _attr_unique_id = "inventar_suchergebnisse"
    _attr_icon = "mdi:magnify"

    @property
    def native_value(self):
        return len(self.coordinator.get_search_results())

    @property
    def extra_state_attributes(self):
        return {
            ATTR_RESULTS: self.coordinator.get_search_results(),
            "query": self.coordinator.search_query,
            "filter": self.coordinator.filter_kategorie,
        }


class InventarActiveProductSensor(InventarBaseSensor):
    _attr_name = "Aktives Produkt"
    _attr_unique_id = "inventar_aktives_produkt"
    _attr_icon = "mdi:package-variant"

    @property
    def native_value(self):
        active = self.coordinator.get_active_product()
        if not active:
            return ""
        return active.get("key", "")

    @property
    def extra_state_attributes(self):
        active = self.coordinator.get_active_product()
        if not active:
            return {ATTR_PRODUCT: None}
        product = dict(active)
        product["status_farbe"] = self.coordinator.get_status_color(active)
        return {ATTR_PRODUCT: product}