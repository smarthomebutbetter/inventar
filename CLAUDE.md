# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Inventar** is a Home Assistant custom integration (domain `inventar`, `single_config_entry`) for
inventory management, with its own Lovelace panel. Distributed via HACS.

- Integration code: `custom_components/inventar/`
- `hacs.json` lives in the **repo root** (HACS reads it there); brand assets in
  `custom_components/inventar/brand/`.

## Commands

There is **no unit-test suite**. Validation runs in GitHub Actions (`.github/workflows/validate.yml`):
`home-assistant/actions/hassfest` + `hacs/action` (category `integration`).

- JS syntax check (panels are ES modules with top-level `await` + dynamic imports): check as a module,
  e.g. copy to `*.mjs` and `node --check` — `node --check file.js` chokes on `import`.
- Python syntax check: `python -m py_compile custom_components/inventar/**/*.py`.
- CI status: `gh run list --repo smarthomebutbetter/inventar`.

After changing code in a running HA instance: **backend (`.py`) changes need a full HA restart**;
**frontend (`.js`/JSON/CSS) changes** need only an integration reload (cache-busted) or a hard browser
refresh — a config-entry reload does not re-import Python modules.

## Architecture

Platforms: `sensor` / `select` / `text`.

- **Data model:** each product is **one YAML file** in `/config/inventar/produkte` (no database).
  `coordinator.py` **normalizes** every product on read (`_normalize_product`) and writes a **whitelist
  payload** on save (`_write_product_sync`). When adding a product field you MUST update both, or the
  field silently vanishes on the next reload.
- **Package layout:**
  - root — `__init__.py` (setup/unload), `coordinator.py`, `const.py`, `config_flow.py`, platform files
  - `core/` — `settings.py` (HA `Store`-backed settings) + `backup.py` (AES-256-GCM encrypted `.invbak`
    archives, PBKDF2)
  - `api/` — `websockets.py` (all `inventar/*` WS commands), `services.py` (HA services), `panel.py`
    (registers the Lovelace panels and serves `frontend/` at the static path `/api/inventar_panel`)
- **Frontend** (`frontend/`, vanilla Lit web components served via the static path):
  `inventar-panel.js` (main), `inventar-panel-settings.js` (tabbed settings), `inventar-qr.js`
  (local QR generator), `panel/styles.js` (extracted CSS), `i18n/{de,en}.json` with a `_t(key, fallback)`
  helper, `vendor/jsQR.min.js` (scanner library).
- **Cache-busting:** `panel.py` registers each panel `module_url` with `?v=<timestamp>`; the panel entry
  reads its own `?v` and propagates it to its dynamic imports, so one reload refreshes every module
  consistently.
- **Reload-safety:** the HTTP static path and websocket commands cannot be unregistered in HA, so they
  are registered **once per process** via module-global guards (`panel.py`, `websockets.py`); sidebar
  panels are removed in `async_unload_entry`. Removing these guards makes a reload throw
  "Overwriting panel" / "already registered".
- **Multi-device sync:** after a mutation the coordinator calls `fire_changed(key)`, firing the bus event
  `inventar_product_changed` **carrying the changed product**. Use the **awaited `async_refresh()`**, not
  the debounced `async_request_refresh()`, so the broadcast/data is fresh. The frontend applies the
  broadcast product directly (no re-fetch race), keeps an optimistic `_pendingWrites` lock (~3 s) so a
  client's own echo never reverts its just-saved value, and has a 30 s polling fallback. Popups
  **auto-save on close** (X / swipe / tap-outside).
- **Theming:** panel CSS must work in light AND dark themes — use HA theme variables and the `--inv-*`
  `color-mix` tokens, never hardcoded `rgba(255,255,255,…)` for surfaces (the fullscreen scanner overlay
  is the one intentional dark exception).
- **Brand icon:** `custom_components/inventar/brand/{icon,icon@2x,logo,logo@2x}.png` uses the
  HA 2026.3+ local brand mechanism — no `home-assistant/brands` PR is needed.
