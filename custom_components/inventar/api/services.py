import os
import re
import yaml
import logging
from datetime import datetime

_LOGGER = logging.getLogger(__name__)
DOMAIN = "inventar"
DASHBOARD_URL_PATH = "inventar-dashboard"

BLOCK_START_MARKER = "# INVENTAR_DASHBOARD_START"
BLOCK_END_MARKER = "# INVENTAR_DASHBOARD_END"


def _build_dashboard_content(settings):
    # Wird nicht mehr aktiv genutzt — bleibt als Stub erhalten
    return {}


async def async_register_services(hass, coordinator, entry):

    # ── Settings ──────────────────────────────────────────────────────────

    async def handle_update_settings(call):
        manager = hass.data[DOMAIN]["settings_manager"]
        await manager.async_save(call.data)

    # ── Panel / App aktivieren & deaktivieren ─────────────────────────────

    async def handle_generate_dashboard(call):
        from .panel import async_register_main_panel

        manager = hass.data[DOMAIN]["settings_manager"]
        try:
            await async_register_main_panel(hass)
            _LOGGER.info("Inventar-Panel erfolgreich registriert")
        except Exception as e:
            _LOGGER.error("Inventar-Panel registrieren fehlgeschlagen: %s", e)
            return

        current = manager.all
        dashboard_settings = current.get("dashboard", {})
        dashboard_settings["generated"] = True
        await manager.async_save({"dashboard": dashboard_settings})

    async def handle_delete_dashboard(call):
        manager = hass.data[DOMAIN]["settings_manager"]
        current = manager.all
        dashboard_settings = current.get("dashboard", {})
        dashboard_settings["generated"] = False
        await manager.async_save({"dashboard": dashboard_settings})
        _LOGGER.info("Inventar-App deaktiviert")

    async def handle_update_dashboard(call):
        from .panel import async_register_main_panel

        manager = hass.data[DOMAIN]["settings_manager"]
        try:
            await async_register_main_panel(hass)
            _LOGGER.info("Inventar-Panel aktualisiert")
        except Exception as e:
            _LOGGER.error("Inventar-Panel aktualisieren fehlgeschlagen: %s", e)

    async def handle_restart(call):
        # Nur die Integration neu laden — kein kompletter Home-Assistant-Neustart
        await hass.config_entries.async_reload(entry.entry_id)

    # ── Bestand ändern ────────────────────────────────────────────────────

    async def handle_bestand_aendern(call):
        """
        Ändert den Bestand eines Produkts.

        Zwei Aufrufarten:
          - delta-Modus:       key=x delta=5
          - modus+wert-Modus:  key=x modus=setzen wert=10
        """
        key = str(call.data.get("key", "")).strip()
        if not key:
            _LOGGER.error("bestand_aendern: 'key' fehlt")
            return

        product = coordinator.get_product(key)
        if product is None:
            _LOGGER.error("bestand_aendern: Produkt '%s' nicht gefunden", key)
            return

        alter_bestand = float(product.get("bestand", 0))

        if "delta" in call.data:
            try:
                delta = float(call.data["delta"])
            except (ValueError, TypeError):
                _LOGGER.error("bestand_aendern: 'delta' ist kein gültiger Zahlenwert")
                return
            neuer_bestand = alter_bestand + delta
        else:
            modus = str(call.data.get("modus", "addieren")).strip().lower()
            try:
                wert = float(call.data.get("wert", 0))
            except (ValueError, TypeError):
                _LOGGER.error("bestand_aendern: 'wert' ist kein gültiger Zahlenwert")
                return

            if modus == "setzen":
                neuer_bestand = wert
            elif modus == "subtrahieren":
                neuer_bestand = alter_bestand - wert
            else:
                neuer_bestand = alter_bestand + wert

        neuer_bestand = max(0.0, neuer_bestand)

        updated = dict(product)
        updated["bestand"] = neuer_bestand
        updated["last_change"] = datetime.now().isoformat(timespec="seconds")

        await coordinator.async_write_product(updated)
        _LOGGER.info("Bestand '%s': %.2f → %.2f", key, alter_bestand, neuer_bestand)

    # ── Produkt aktualisieren ─────────────────────────────────────────────

    async def handle_produkt_aktualisieren(call):
        """
        Aktualisiert beliebige Felder eines bestehenden Produkts.
        Pflichtfeld: key — alle anderen Felder werden gemergt.
        """
        data = dict(call.data)
        key = str(data.pop("key", "")).strip()
        if not key:
            _LOGGER.error("produkt_aktualisieren: 'key' fehlt")
            return

        product = coordinator.get_product(key)
        if product is None:
            _LOGGER.error("produkt_aktualisieren: Produkt '%s' nicht gefunden", key)
            return

        updated = dict(product)

        _float_fields = {"preis", "bestand", "mindestmenge", "mindestbestellmenge"}
        _int_fields = {"verpackungseinheit"}
        _bool_fields = {"nachbestellung_offen", "favorit"}
        _list_fields = {"suchbegriffe"}

        for field, value in data.items():
            if field in _float_fields:
                try:
                    updated[field] = float(value)
                except (ValueError, TypeError):
                    _LOGGER.warning(
                        "produkt_aktualisieren: '%s' konnte nicht als float geparst werden",
                        field,
                    )
            elif field in _int_fields:
                try:
                    updated[field] = int(float(value))
                except (ValueError, TypeError):
                    _LOGGER.warning(
                        "produkt_aktualisieren: '%s' konnte nicht als int geparst werden",
                        field,
                    )
            elif field in _bool_fields:
                updated[field] = bool(value)
            elif field in _list_fields:
                updated[field] = value if isinstance(value, list) else [value]
            else:
                updated[field] = value

        updated["last_update"] = datetime.now().isoformat(timespec="seconds")

        await coordinator.async_write_product(updated)
        _LOGGER.info("Produkt '%s' aktualisiert: %s", key, list(data.keys()))

    # ── Produkt anlegen ───────────────────────────────────────────────────

    async def handle_produkt_anlegen(call):
        """
        Legt ein neues Produkt als YAML-Datei an.
        Pflichtfeld: produktname
        """
        import re as _re

        data = dict(call.data)

        produktname = data.get("produktname", "").strip()
        if not produktname:
            _LOGGER.error("produkt_anlegen: 'produktname' ist Pflichtfeld")
            return

        key = data.get("key", "").strip()
        if not key:
            key = _re.sub(r"[^a-z0-9_]", "", produktname.lower().replace(" ", "_"))
            key = _re.sub(r"_+", "_", key).strip("_")
            if not key:
                key = f"produkt_{int(hass.loop.time())}"

        if coordinator.get_product(key) is not None:
            _LOGGER.error("produkt_anlegen: Key '%s' existiert bereits", key)
            return

        settings_manager = hass.data[DOMAIN].get("settings_manager")
        settings = settings_manager.all if settings_manager else {}

        qr_mode = settings.get("qr", {}).get("modus", "auto")
        qr_design = settings.get("qr", {}).get("design", "standard")

        product = {
            "key": key,
            "id": data.get("id", key),
            "produktname": produktname,
            "anzeige_name": data.get("anzeige_name", ""),
            "artikelnummer": data.get("artikelnummer", ""),
            "hersteller": data.get("hersteller", ""),
            "kategorie": data.get("kategorie", ""),
            "typ": data.get("typ", ""),
            "serie": data.get("serie", ""),
            "einheit": data.get("einheit", "Stück"),
            "preis": float(data.get("preis", 0)),
            "verpackungseinheit": int(data.get("verpackungseinheit", 1)),
            "bestand": float(data.get("bestand", 0)),
            "mindestmenge": float(data.get("mindestmenge", 0)),
            "mindestbestellmenge": float(data.get("mindestbestellmenge", 0)),
            "lagerort": data.get("lagerort", ""),
            "notiz": data.get("notiz", ""),
            "kontrollklasse": data.get("kontrollklasse", "B"),
            "nachbestellung_offen": bool(data.get("nachbestellung_offen", False)),
            "favorit": bool(data.get("favorit", False)),
            "bild": data.get("bild", ""),
            "produktlink": data.get("produktlink", ""),
            "suchbegriffe": data.get("suchbegriffe", []),
            "kurzbeschreibung": data.get("kurzbeschreibung", ""),
            "shop_kategorie": data.get("shop_kategorie", ""),
            "tag_id": data.get("tag_id", key),
            "qr_text": data.get("qr_text", f"inventar:{key}"),
            "qr_mode": data.get("qr_mode", qr_mode),
            "qr_design": data.get("qr_design", qr_design),
            "buttons": data.get("buttons", {}),
            "created_at": datetime.now().isoformat(timespec="seconds"),
        }

        await coordinator.async_write_product(product)
        _LOGGER.info("Produkt '%s' angelegt (key: %s)", produktname, key)

    # ── Produkt löschen ───────────────────────────────────────────────────

    async def handle_produkt_loeschen(call):
        """Löscht ein Produkt — YAML-Datei wird entfernt."""
        key = str(call.data.get("key", "")).strip()
        if not key:
            _LOGGER.error("produkt_loeschen: 'key' fehlt")
            return

        if coordinator.get_product(key) is None:
            _LOGGER.error("produkt_loeschen: Produkt '%s' nicht gefunden", key)
            return

        await coordinator.async_delete_product(key)
        _LOGGER.info("Produkt '%s' gelöscht", key)

    # ── QR-Codes neu generieren ───────────────────────────────────────────

    async def handle_qr_codes_erneuern(call):
        """
        Regeneriert logisch alle QR-Codes.
        QR wird on-demand erzeugt, daher hier:
        - alle Produkte validieren
        - QR-Metadaten aktualisieren
        - Timestamp speichern
        """
        settings_manager = hass.data[DOMAIN].get("settings_manager")
        if not settings_manager:
            _LOGGER.error("qr_codes_erneuern: Settings Manager nicht gefunden")
            return

        settings = settings_manager.all
        products = coordinator.data.get("products", []) if coordinator.data else []

        qr_mode = settings.get("qr", {}).get("modus", "auto")
        qr_design = settings.get("qr", {}).get("design", "standard")

        ok = 0
        failed = 0

        for product in products:
            try:
                key = str(product.get("key") or product.get("id") or "").strip()
                if not key:
                    failed += 1
                    continue

                updated = dict(product)
                updated["tag_id"] = key
                updated["qr_text"] = f"inventar:{key}"
                updated["qr_mode"] = qr_mode
                updated["qr_design"] = qr_design
                updated["qr_last_refresh"] = datetime.now().isoformat(timespec="seconds")

                await coordinator.async_write_product(updated)
                ok += 1

            except Exception as e:
                failed += 1
                _LOGGER.error("qr_codes_erneuern: Fehler bei Produkt '%s': %s", product.get("key"), e)

        developer = settings.get("developer", {})
        developer["enabled"] = True
        developer["show_dev_tools"] = True
        developer["last_qr_regeneration"] = datetime.now().isoformat(timespec="seconds")
        await settings_manager.async_save({"developer": developer})

        _LOGGER.info("QR-Regeneration abgeschlossen: %s OK / %s Fehler", ok, failed)

    # ── Entwicklerwerkzeuge aktivieren ────────────────────────────────────

    async def handle_dev_tools_aktivieren(call):
        settings_manager = hass.data[DOMAIN]["settings_manager"]
        current = settings_manager.all
        developer = current.get("developer", {})
        developer["enabled"] = True
        developer["show_dev_tools"] = True
        await settings_manager.async_save({"developer": developer})
        _LOGGER.info("Entwicklerwerkzeuge aktiviert")

    # ── Services registrieren ─────────────────────────────────────────────

    hass.services.async_register(DOMAIN, "update_settings", handle_update_settings)
    hass.services.async_register(DOMAIN, "dashboard_generieren", handle_generate_dashboard)
    hass.services.async_register(DOMAIN, "dashboard_loeschen", handle_delete_dashboard)
    hass.services.async_register(DOMAIN, "dashboard_aktualisieren", handle_update_dashboard)
    hass.services.async_register(DOMAIN, "restart", handle_restart)
    hass.services.async_register(DOMAIN, "bestand_aendern", handle_bestand_aendern)
    hass.services.async_register(DOMAIN, "produkt_aktualisieren", handle_produkt_aktualisieren)
    hass.services.async_register(DOMAIN, "produkt_anlegen", handle_produkt_anlegen)
    hass.services.async_register(DOMAIN, "produkt_loeschen", handle_produkt_loeschen)

    # Neu
    hass.services.async_register(DOMAIN, "qr_codes_erneuern", handle_qr_codes_erneuern)
    hass.services.async_register(DOMAIN, "dev_tools_aktivieren", handle_dev_tools_aktivieren)


def _update_configuration_yaml(config_dir, dashboard_name, pfad):
    config_path = os.path.join(config_dir, "configuration.yaml")

    with open(config_path, "r", encoding="utf-8") as f:
        config_content = f.read()

    if BLOCK_START_MARKER in config_content:
        pattern = rf"\n{re.escape(BLOCK_START_MARKER)}.*?{re.escape(BLOCK_END_MARKER)}\n"
        config_content = re.sub(pattern, "", config_content, flags=re.DOTALL)

    new_block = (
        f"\n{BLOCK_START_MARKER}\n"
        f"lovelace:\n"
        f"  dashboards:\n"
        f"    {DASHBOARD_URL_PATH}:\n"
        f"      mode: yaml\n"
        f"      filename: {pfad}\n"
        f"      title: {dashboard_name}\n"
        f"      icon: mdi:package-variant\n"
        f"      show_in_sidebar: true\n"
        f"      require_admin: false\n"
        f"{BLOCK_END_MARKER}\n"
    )
    config_content += new_block

    with open(config_path, "w", encoding="utf-8") as f:
        f.write(config_content)

    _LOGGER.info("Inventar-Dashboard in configuration.yaml eingetragen")


def _remove_from_configuration_yaml(config_dir):
    config_path = os.path.join(config_dir, "configuration.yaml")

    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()

    if BLOCK_START_MARKER not in content:
        return

    pattern = rf"\n*{re.escape(BLOCK_START_MARKER)}.*?{re.escape(BLOCK_END_MARKER)}\n?"
    cleaned = re.sub(pattern, "", content, flags=re.DOTALL)

    with open(config_path, "w", encoding="utf-8") as f:
        f.write(cleaned)

    _LOGGER.info("Inventar-Block aus configuration.yaml entfernt")