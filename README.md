# Inventar

Eine Home-Assistant-Custom-Integration zur **Lager- und Inventarverwaltung** –
ideal für Werkstatt, Elektrohandwerk und Hobby. Produkte werden als einfache
YAML-Dateien gespeichert und über ein eigenes Lovelace-Panel verwaltet.

## Funktionen

- 📦 **Produktverwaltung** – jedes Produkt eine YAML-Datei (Name, Artikelnummer,
  Hersteller, Kategorie, Preis, Verpackungseinheit, Lagerort u. v. m.)
- 🔎 **Volltextsuche & Kategoriefilter**
- 🚦 **Bestands-Ampel** (rot / gelb / grün) anhand Mindestmenge und
  Mindestbestellmenge
- 💶 **Gesamtwert-Berechnung** des Lagers
- 🏷️ **QR-Codes** (Home-Assistant-Tag-Links) zum schnellen Scannen per Handy
- 🖥️ **Eigenes Lovelace-Panel** in der Seitenleiste (inkl. Einstellungen)
- 🔌 **Websocket-API** für das Frontend
- ⭐ Favoriten, Mindestmengen-Warnungen, Nachbestell-Status

## Installation

### HACS (empfohlen)

1. HACS → **Integrationen** → ⋮ → **Benutzerdefinierte Repositories**
2. Repository `https://github.com/smarthomebutbetter/inventar` als Typ
   **Integration** hinzufügen
3. „Inventar" installieren und Home Assistant neu starten
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Inventar**

### Manuell

Den Ordner `custom_components/inventar` in das `custom_components`-Verzeichnis
deiner Home-Assistant-Installation kopieren und HA neu starten.

## Konfiguration

Die Einrichtung erfolgt vollständig über die Benutzeroberfläche (Config Flow).
Standardmäßig werden Produkte unter `/config/inventar/produkte` als YAML
abgelegt; Bilder und QR-Codes landen unter `/config/www/inventar`.

## Voraussetzungen

- Home Assistant ≥ 2024.1.0
- Python-Pakete `PyYAML` und `qrcode[pil]` (werden automatisch installiert)

## Lizenz

Siehe Repository.
