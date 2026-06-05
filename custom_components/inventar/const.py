from __future__ import annotations

DOMAIN = "inventar"

CONF_PRODUKT_ORDNER = "produkt_ordner"
CONF_DASHBOARD_PATH = "dashboard_path"
CONF_DASHBOARD_NAME = "dashboard_name"
CONF_KATEGORIEN = "kategorien"

DEFAULT_PRODUKT_ORDNER = "/config/inventar/produkte"
DEFAULT_DASHBOARD_PATH = "inventar"
DEFAULT_DASHBOARD_NAME = "Inventar"

DEFAULT_IMAGE_DIR = "/config/www/inventar/images"
DEFAULT_QR_DIR = "/config/www/inventar/qr"
DEFAULT_BACKUP_DIR = "/config/inventar/backups"

DEFAULT_KATEGORIEN = [
    "Alles",
    "Klemmtechnik",
    "Leitungen",
    "Befestigung",
    "Werkzeug",
    "Geräte",
    "Schalterprogramme",
    "Netzwerk",
    "Sicherungsmaterial",
    "Rohr / Kanal",
    "Beleuchtung",
    "Sonstiges",
]

ATTR_RESULTS = "results"
ATTR_PRODUCT = "product"
ATTR_SETTINGS = "settings"

SERVICE_PRODUCT_CREATE = "produkt_erstellen"
SERVICE_PRODUCT_EDIT = "produkt_bearbeiten"
SERVICE_PRODUCT_DELETE = "produkt_loeschen"
SERVICE_STOCK_CHANGE = "bestand_aendern"
SERVICE_RELOAD = "registry_aktualisieren"
SERVICE_QR_GENERATE = "qr_generieren"
SERVICE_UPDATE_SETTINGS = "update_settings"

EVENT_PRODUCT_CHANGED = "inventar_product_changed"