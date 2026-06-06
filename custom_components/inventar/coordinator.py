from __future__ import annotations

import logging
from copy import deepcopy
from pathlib import Path
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import (
    ATTR_SETTINGS,
    CONF_DASHBOARD_NAME,
    CONF_DASHBOARD_PATH,
    CONF_KATEGORIEN,
    CONF_PRODUKT_ORDNER,
    DEFAULT_DASHBOARD_NAME,
    DEFAULT_DASHBOARD_PATH,
    DEFAULT_KATEGORIEN,
    DEFAULT_PRODUKT_ORDNER,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)


class InventarCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry

        self.produkt_ordner = Path(
            entry.options.get(
                CONF_PRODUKT_ORDNER,
                entry.data.get(CONF_PRODUKT_ORDNER, DEFAULT_PRODUKT_ORDNER),
            )
        )

        self.dashboard_name = entry.options.get(
            CONF_DASHBOARD_NAME,
            entry.data.get(CONF_DASHBOARD_NAME, DEFAULT_DASHBOARD_NAME),
        )
        self.dashboard_path = entry.options.get(
            CONF_DASHBOARD_PATH,
            entry.data.get(CONF_DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH),
        )

        kategorien_raw = entry.options.get(
            CONF_KATEGORIEN,
            entry.data.get(CONF_KATEGORIEN, ", ".join(DEFAULT_KATEGORIEN)),
        )
        self.kategorien = [x.strip() for x in kategorien_raw.split(",") if x.strip()] or DEFAULT_KATEGORIEN

        self.settings = hass.data[DOMAIN]["settings_manager"].all

        self.active_product_key: str = ""
        self.search_query: str = ""
        self.filter_kategorie: str = "Alles"

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
        )

    async def _async_update_data(self) -> dict[str, Any]:
        self.settings = self.hass.data[DOMAIN]["settings_manager"].all
        return await self.async_load_products()

    async def async_load_products(self) -> dict[str, Any]:
        return await self.hass.async_add_executor_job(self._load_products_sync)

    def _load_products_sync(self) -> dict[str, Any]:
        self.produkt_ordner.mkdir(parents=True, exist_ok=True)

        products: list[dict[str, Any]] = []

        for file in sorted(self.produkt_ordner.glob("*.yaml")):
            try:
                import yaml
                raw = yaml.safe_load(file.read_text(encoding="utf-8")) or {}
            except Exception as err:
                _LOGGER.error("Fehler beim Lesen von %s: %s", file, err)
                continue

            key = file.stem
            product = self._normalize_product(key, raw)
            products.append(product)

        by_key = {p["key"]: p for p in products}

        return {
            "products": products,
            "by_key": by_key,
            "count": len(products),
            ATTR_SETTINGS: self.settings,
        }

    def _normalize_product(self, key: str, raw: dict[str, Any]) -> dict[str, Any]:
        suchbegriffe = raw.get("suchbegriffe", [])
        if not isinstance(suchbegriffe, list):
            suchbegriffe = []

        buttons = raw.get("buttons", {})
        if not isinstance(buttons, dict):
            buttons = {}

        return {
            "key": key,
            "id": key,  # id ist immer gleich key
            "produktname": self._s(raw.get("produktname")),
            "anzeige_name": self._s(raw.get("anzeige_name")),
            "artikelnummer": self._s(raw.get("artikelnummer")),
            "hersteller": self._s(raw.get("hersteller")),
            "kategorie": self._s(raw.get("kategorie")),
            "typ": self._s(raw.get("typ")),
            "serie": self._s(raw.get("serie")),
            "einheit": self._s(raw.get("einheit")) or self._s(raw.get("einheit_anzeige")) or "Stück",
            "preis": self._float(raw.get("preis", raw.get("preis_pro_stueck", 0))),
            "verpackungseinheit": self._int(raw.get("verpackungseinheit", 1)),
            "bestand": self._float(raw.get("bestand", 0)),
            "mindestmenge": self._float(raw.get("mindestmenge", raw.get("minbestand", 0))),
            "mindestbestellmenge": self._float(raw.get("mindestbestellmenge", 0)),
            "lagerort": self._s(raw.get("lagerort", raw.get("lagerort_standard"))),
            "notiz": self._s(raw.get("notiz", raw.get("notiz_standard"))),
            "kontrollklasse": self._s(raw.get("kontrollklasse")) or "B",
            "nachbestellung_offen": bool(raw.get("nachbestellung_offen", False)),
            "favorit": bool(raw.get("favorit", False)),  # ← NEU: persistent gespeichert
            "bild": self._s(raw.get("bild")),
            "produktlink": self._s(raw.get("produktlink")),
            "suchbegriffe": [self._s(x) for x in suchbegriffe if self._s(x)],
            "kurzbeschreibung": self._s(raw.get("kurzbeschreibung")),
            "shop_kategorie": self._s(raw.get("shop_kategorie")),
            "tag_id": self._s(raw.get("tag_id")) or key,
            # QR-Inhalt: gespeicherten Wert bevorzugen, sonst HA-Tag-Link als Default
            "qr_text": self._s(raw.get("qr_text")) or f"https://www.home-assistant.io/tag/{key}",
            "qr_mode": self._s(raw.get("qr_mode")),
            "qr_design": self._s(raw.get("qr_design")),
            "qr_public_url": self._s(raw.get("qr_public_url")),
            "qr_last_refresh": self._s(raw.get("qr_last_refresh")),
            "created_at": self._s(raw.get("created_at")),
            "last_change": self._s(raw.get("last_change")),
            "last_update": self._s(raw.get("last_update")),
            "buttons": buttons,
        }

    def _s(self, value: Any) -> str:
        if value is None:
            return ""
        value = str(value).strip()
        if value.lower() in {"unknown", "unavailable", "none", "null"}:
            return ""
        return value

    def _int(self, value: Any) -> int:
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def _float(self, value: Any) -> float:
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def get_product(self, key: str) -> dict[str, Any] | None:
        return self.data.get("by_key", {}).get(key) if self.data else None

    def set_active_product(self, key: str) -> None:
        self.active_product_key = key

    def get_active_product(self) -> dict[str, Any] | None:
        if not self.active_product_key:
            return None
        return self.get_product(self.active_product_key)

    def set_search_query(self, value: str) -> None:
        self.search_query = value.strip()

    def set_filter_kategorie(self, value: str) -> None:
        self.filter_kategorie = value.strip() or "Alles"

    def get_search_results(self) -> list[dict[str, Any]]:
        if not self.data:
            return []

        products = deepcopy(self.data["products"])

        if self.filter_kategorie and self.filter_kategorie != "Alles":
            products = [p for p in products if p.get("kategorie") == self.filter_kategorie]

        query = self.search_query.lower().strip()
        if not query:
            return products[:20]

        results = []
        for p in products:
            text = " ".join(
                [
                    p.get("key", ""),
                    p.get("produktname", ""),
                    p.get("anzeige_name", ""),
                    p.get("artikelnummer", ""),
                    p.get("hersteller", ""),
                    p.get("kategorie", ""),
                    p.get("typ", ""),
                    p.get("serie", ""),
                    p.get("kurzbeschreibung", ""),
                    " ".join(p.get("suchbegriffe", [])),
                ]
            ).lower()

            if query in text:
                results.append(p)

        return results[:20]

    def get_inventory_total_value(self) -> float:
        if not self.data:
            return 0.0
        return round(sum(p.get("bestand", 0) * p.get("preis", 0) for p in self.data["products"]), 2)

    def get_under_min_count(self) -> int:
        if not self.data:
            return 0
        return sum(1 for p in self.data["products"] if p.get("bestand", 0) < p.get("mindestmenge", 0))

    def get_status_color(self, product: dict[str, Any]) -> str:
        bestand = product.get("bestand", 0)
        mindestmenge = product.get("mindestmenge", 0)
        mindestbestellmenge = product.get("mindestbestellmenge", 0)

        if bestand < mindestmenge:
            return "red"
        if bestand < (mindestmenge + max(mindestbestellmenge, 1)):
            return "yellow"
        return "green"

    async def async_write_product(self, product: dict[str, Any]) -> None:
        await self.hass.async_add_executor_job(self._write_product_sync, product)
        await self.async_request_refresh()

    def _write_product_sync(self, product: dict[str, Any]) -> None:
        import yaml

        self.produkt_ordner.mkdir(parents=True, exist_ok=True)
        key = product["key"]
        path = self.produkt_ordner / f"{key}.yaml"

        payload = {
            "id": key,
            "produktname": product.get("produktname", ""),
            "anzeige_name": product.get("anzeige_name", ""),
            "artikelnummer": product.get("artikelnummer", ""),
            "hersteller": product.get("hersteller", ""),
            "kategorie": product.get("kategorie", ""),
            "typ": product.get("typ", ""),
            "serie": product.get("serie", ""),
            "einheit": product.get("einheit", "Stück"),
            "preis": product.get("preis", 0),
            "verpackungseinheit": product.get("verpackungseinheit", 1),
            "bestand": product.get("bestand", 0),
            "mindestmenge": product.get("mindestmenge", 0),
            "mindestbestellmenge": product.get("mindestbestellmenge", 0),
            "lagerort": product.get("lagerort", ""),
            "notiz": product.get("notiz", ""),
            "kontrollklasse": product.get("kontrollklasse", "B"),
            "nachbestellung_offen": product.get("nachbestellung_offen", False),
            "favorit": product.get("favorit", False),  # ← NEU: wird ins YAML geschrieben
            "bild": product.get("bild", ""),
            "produktlink": product.get("produktlink", ""),
            "suchbegriffe": product.get("suchbegriffe", []),
            "kurzbeschreibung": product.get("kurzbeschreibung", ""),
            "shop_kategorie": product.get("shop_kategorie", ""),
            "tag_id": product.get("tag_id") or key,
            # QR-/Meta-Felder erhalten, damit Regenerierung & Zeitstempel persistieren
            "qr_text": product.get("qr_text") or f"https://www.home-assistant.io/tag/{key}",
            "qr_mode": product.get("qr_mode", ""),
            "qr_design": product.get("qr_design", ""),
            "qr_public_url": product.get("qr_public_url", ""),
            "qr_last_refresh": product.get("qr_last_refresh", ""),
            "created_at": product.get("created_at", ""),
            "last_change": product.get("last_change", ""),
            "last_update": product.get("last_update", ""),
            "buttons": product.get("buttons", {}),
        }

        path.write_text(
            yaml.safe_dump(payload, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )

    async def async_delete_product(self, key: str) -> None:
        await self.hass.async_add_executor_job(self._delete_product_sync, key)
        await self.async_request_refresh()

    def _delete_product_sync(self, key: str) -> None:
        path = self.produkt_ordner / f"{key}.yaml"
        if path.exists():
            path.unlink()
