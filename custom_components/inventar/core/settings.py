import copy
from homeassistant.helpers.storage import Store

STORAGE_KEY = "inventar.settings"
STORAGE_VERSION = 1

DEFAULT_KATEGORIEN = [
    {"name": "Favoriten",          "icon": "m3rf:favorite",                  "type": "favoriten", "aktiv": True},
    {"name": "Alles",              "icon": "m3rf:grid-view",                 "type": "alles"},
    {"name": "Klemmtechnik",       "icon": "m3rf:settings-input-component",  "type": "custom"},
    {"name": "Leitungen",          "icon": "m3rf:cable",                     "type": "custom"},
    {"name": "Befestigung",        "icon": "m3rf:hardware",                  "type": "custom"},
    {"name": "Werkzeug",           "icon": "m3rf:build",                     "type": "custom"},
    {"name": "Geräte",             "icon": "m3rf:devices",                   "type": "custom"},
    {"name": "Schalterprogramme",  "icon": "m3rf:electrical-services",       "type": "custom"},
    {"name": "Netzwerk",           "icon": "m3rf:router",                    "type": "custom"},
    {"name": "Sicherungsmaterial", "icon": "m3rf:shield",                    "type": "custom"},
    {"name": "Rohr / Kanal",       "icon": "m3rf:plumbing",                  "type": "custom"},
    {"name": "Beleuchtung",        "icon": "m3rf:lightbulb",                 "type": "custom"},
    {"name": "Sonstiges",          "icon": "m3rf:more-horiz",                "type": "custom"},
]

DEFAULT_SETTINGS = {
    # ── Allgemein ─────────────────────────────────────────────
    "general": {
        "aktiv": True,
        "lagerort_prefix": "Lager",
        "datumsformat": "DD.MM.YYYY",
    },

    # ── App ───────────────────────────────────────────────────
    "app": {
        "name": "Inventar",
        "externe_url": "",
        "require_admin": False,
    },

    # ── Kategorien ────────────────────────────────────────────
    "kategorien": DEFAULT_KATEGORIEN,

    # ── Felder ────────────────────────────────────────────────
    "felder": {
        "anzeige_name": True,
        "hersteller": True,
        "artikelnummer": True,
        "typ": True,
        "serie": True,
        "lagerort": True,
        "notiz": True,
        "preis": True,
        "bild": True,
        "qr_code": True,
        "mindestmenge": True,
        "mindestbestellmenge": True,
        "produktlink": True,
    },

    # ── Anzeige ───────────────────────────────────────────────
    "anzeige": {
        "bilder": True,
        "qr": True,
        "statusfarben": True,
        "buttons": True,
        "hersteller_gruppieren": True,
        "virtual_scroll": True,
    },

    # ── Dashboard ─────────────────────────────────────────────
    "dashboard": {
        "name": "Inventar",
        "pfad": "/config/inventar/generated/inventar_dashboard.yaml",
        "auto_generate": False,
        "generated": False,
    },

    # ── QR / Tag System ───────────────────────────────────────
    "qr": {
        # auto = intelligent / intern = inventar:key / public = URL
        "modus": "auto",
        # standard = klassisch / modern = neues Design
        "design": "modern",
        # öffentlich lesbare Produktseite erlaubt
        "public_enabled": False,
        # öffentlicher Pfad / Zielseite
        "public_base_url": "",
        # Hybrid-System aktiv
        "hybrid_enabled": True,
        # QR standardmäßig mit abgerundeter Karte / modernem Stil
        "rounded_style": True,
        # Logo/Icon in QR-Vorschau verwenden
        "show_logo": True,
        # Bei Download Dateiname bereinigen
        "safe_filename": True,
        # Nach Regeneration Timestamp
        "last_regenerated": "",
    },

    # ── KI ────────────────────────────────────────────────────
    "ki": {
        "aktiv": False,
        "provider": "claude",
        "model": "",
        "api_key": "",
        "foto_analyse": True,
        "berichte": False,
    },

    # ── Module ────────────────────────────────────────────────
    "module": {
        "leih": False,
        "leih_tage": 14,
        "mhd": False,
        "mhd_tage": 30,
        "verschiebe": False,
        "nachbestellung": False,
        "bericht_email": "",
        "autosync": False,
    },

    # ── System ────────────────────────────────────────────────
    "system": {
        "delete_guard": True,
        "auto_recovery": True,
        "backup_ziel": "lokal",
    },

    # ── Erweitert ─────────────────────────────────────────────
    "erweitert": {
        "debug": False,
        "cache": True,
    },

    # ── UI ────────────────────────────────────────────────────
    "ui": {
        "welcome_dismissed": False,
        # Version-Tap-Tracking für geheime Dev-Tools
        "version_tap_count": 0,
        "last_version_tap": 0,
    },

    # ── Developer Tools ───────────────────────────────────────
    "developer": {
        "enabled": False,
        "show_dev_tools": False,
        "last_qr_regeneration": "",
        "last_cache_clear": "",
        "last_debug_action": "",
    },
}


def _deep_merge(base: dict, updates: dict) -> dict:
    result = copy.deepcopy(base)
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


class InventarSettingsManager:
    def __init__(self, hass):
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._settings = {}

    async def async_load(self):
        data = await self._store.async_load()
        self._settings = _deep_merge(DEFAULT_SETTINGS, data or {})
        return self._settings

    async def async_save(self, updates: dict):
        self._settings = _deep_merge(self._settings, updates)
        await self._store.async_save(self._settings)
        return self._settings

    @property
    def all(self):
        return copy.deepcopy(self._settings)