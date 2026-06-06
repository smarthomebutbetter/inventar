import { LitElement, html, css } from "https://unpkg.com/lit@2?module";

const VERSION = "1.0.0";

const CHANGELOG = [
  {
    version: "1.0.0",
    date: "April 2026",
    entries: [
      { type: "neu", text: "QR-Scanner mit iOS & Android Support" },
      { type: "neu", text: "Auto-Save — keine Save-Taste mehr nötig" },
      { type: "neu", text: "KI-Features mit Claude, OpenAI & Gemini" },
      { type: "fix", text: "iOS WKWebView GPU-Bug beim QR-Scannen behoben" },
    ],
  },
];

const KI_MODELS = {
  claude: [
    { id: "claude-opus-4-5",   label: "Claude Opus 4",     desc: "Stärkstes Modell"      },
    { id: "claude-sonnet-4-5", label: "Claude 3.5 Sonnet", desc: "Schnell & präzise"     },
  ],
  openai: [
    { id: "gpt-4o",      label: "GPT-4o",      desc: "Multimodal, stark" },
    { id: "gpt-4o-mini", label: "GPT-4o mini", desc: "Günstig & schnell" },
  ],
  gemini: [
    { id: "gemini-1.5-pro",   label: "Gemini 1.5 Pro",   desc: "Großes Kontextfenster" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Sehr schnell"          },
  ],
};

const ICONS = [
  // Allgemein
  "mdi:home","mdi:home-outline","mdi:grid","mdi:view-grid-outline",
  "mdi:shape","mdi:shape-outline","mdi:tag","mdi:tag-outline",
  "mdi:folder","mdi:folder-outline","mdi:star","mdi:star-outline",
  "mdi:heart","mdi:heart-outline","mdi:bookmark","mdi:bookmark-outline",
  "mdi:flag","mdi:flag-outline","mdi:information","mdi:information-outline",
  "mdi:label","mdi:label-outline","mdi:pin","mdi:pin-outline",
  // Werkzeug & Handwerk
  "mdi:wrench","mdi:wrench-outline","mdi:hammer","mdi:hammer-outline",
  "mdi:tools","mdi:toolbox","mdi:toolbox-outline","mdi:screwdriver",
  "mdi:home-repair-service","mdi:construction","mdi:hard-hat","mdi:hard-hat-outline",
  // Elektro
  "mdi:lightning-bolt","mdi:lightning-bolt-outline","mdi:flash","mdi:flash-outline",
  "mdi:power-plug","mdi:power-plug-outline","mdi:power-socket","mdi:power-socket-eu",
  "mdi:resistor","mdi:cable-data","mdi:electric-switch","mdi:light-switch",
  "mdi:light-switch-off","mdi:smoke-detector","mdi:smoke-detector-outline",
  // Lager & Inventar
  "mdi:package-variant","mdi:package-variant-closed","mdi:package-variant-closed-plus",
  "mdi:archive","mdi:archive-outline","mdi:inbox","mdi:inbox-outline",
  "mdi:warehouse","mdi:tray","mdi:tray-full","mdi:cube","mdi:cube-outline",
  // Netzwerk & Geräte
  "mdi:wifi","mdi:wifi-off","mdi:router","mdi:router-outline",
  "mdi:lan","mdi:lan-connect","mdi:lan-disconnect","mdi:server","mdi:server-outline",
  "mdi:devices","mdi:desktop-classic","mdi:tablet","mdi:cellphone",
  // Licht & Energie
  "mdi:lightbulb","mdi:lightbulb-outline","mdi:lightbulb-on","mdi:lightbulb-off-outline",
  "mdi:solar-power","mdi:solar-panel","mdi:battery","mdi:battery-outline",
  "mdi:thermometer","mdi:thermometer-lines","mdi:gauge","mdi:gauge-empty",
  // Sicherheit
  "mdi:shield","mdi:shield-outline","mdi:shield-check","mdi:shield-check-outline",
  "mdi:lock","mdi:lock-outline","mdi:lock-open","mdi:lock-open-outline",
  "mdi:security","mdi:cctv","mdi:fire-extinguisher","mdi:alarm-light",
  // Gebäude & Räume
  "mdi:door","mdi:door-open","mdi:window-closed","mdi:window-open",
  "mdi:garage","mdi:garage-open","mdi:fridge","mdi:fridge-outline",
  "mdi:sofa","mdi:bed","mdi:shower","mdi:bathtub","mdi:toilet",
  // Sonstiges
  "mdi:pipe","mdi:pipe-valve","mdi:car","mdi:car-outline",
  "mdi:bike","mdi:flower","mdi:tree","mdi:leaf",
  "mdi:medical-bag","mdi:pill","mdi:food","mdi:coffee",
  "mdi:music","mdi:headphones","mdi:camera","mdi:printer",
  "mdi:screw-lag","mdi:connection","mdi:nail","mdi:saw-blade",
];

const TABS = [
  { id: "uebersicht", label: "Übersicht",  icon: "mdi:home-outline"           },
  { id: "einrichten", label: "Einrichten", icon: "mdi:wrench-outline"         },
  { id: "funktionen", label: "Funktionen", icon: "mdi:puzzle-outline"         },
  { id: "daten",      label: "Daten",      icon: "mdi:database-outline"       },
  { id: "system",     label: "System",     icon: "mdi:cog-outline"            },
];


class InventarPanel extends LitElement {
  static properties = {
    hass:              {},
    _config:           { state: true },
    _pending:          { state: true },
    _activeTab:        { state: true },
    _open:             { state: true }, // { sectionId: bool }
    _dashboardLoading: { state: true },
    _dashboardDone:    { state: true },
    _dashboardError:   { state: true },
    _restartLoading:   { state: true },
    _restartDone:      { state: true },
    _backupLoading:    { state: true },
    _backupDone:       { state: true },
    _bkPassword:       { state: true },
    _bkBusy:           { state: true },
    _bkMsg:            { state: true },
    _bkErr:            { state: true },
    _serverBackups:    { state: true },
    _importName:       { state: true },
    _dbClearLoading:   { state: true },
    _dbClearConfirm:   { state: true },
    _iconPickerOpen:   { state: true },
    _iconPickerIndex:  { state: true },
    _iconPickerField:  { state: true },
    _qrRegenLoading:   { state: true },
    _qrRegenDone:      { state: true },
    _qrRegenError:     { state: true },
    _devStatus:        { state: true },
    _versionTapCount:  { state: true },
    _savePulse:        { state: true },
    _stats:            { state: true },
    _saveStatus:       { state: true },
  };

  constructor() {
    super();
    this._config           = {};
    this._pending          = {};
    this._activeTab        = "uebersicht";
    this._open             = { app: true, qr: true, kategorien: false, felder: false };
    this._dashboardLoading = false;
    this._dashboardDone    = false;
    this._dashboardError   = "";
    this._restartLoading   = false;
    this._restartDone      = false;
    this._backupLoading    = false;
    this._backupDone       = false;
    this._bkPassword       = "";
    this._bkBusy           = false;
    this._bkMsg            = "";
    this._bkErr            = "";
    this._serverBackups    = [];
    this._importName       = "";
    this._importData       = null;   // base64 der gewaehlten .invbak (nicht reaktiv)
    this._dbClearLoading   = false;
    this._dbClearConfirm   = false;
    this._iconPickerOpen   = false;
    this._iconPickerIndex  = null;
    this._iconPickerField  = "icon"; // "icon" oder "icon_inaktiv"
    this._qrRegenLoading   = false;
    this._qrRegenDone      = false;
    this._qrRegenError     = "";
    this._devStatus        = { show_dev_tools: false, last_qr_regeneration: "", last_debug_action: "" };
    this._versionTapCount  = 0;
    this._savePulse        = false;
    this._stats            = { gesamt: 0, kritisch: 0 };
    this._saveStatus       = 'idle'; // idle | saving | saved | error
    this._configLoaded     = false;
    this._saveTimer        = null;
  }

  updated(changedProps) {
    if (changedProps.has("hass") && this.hass && !this._configLoaded) {
      this._configLoaded = true;
      this._loadConfig();
      this._loadDevStatus();
      this._loadServerBackups();
    }
    if (changedProps.has("hass") && this.hass) {
      this._syncStats();
    }
  }

  _syncStats() {
    const gesamt   = parseInt(this.hass.states["sensor.inventar_produkte_gesamt"]?.state   ?? "0");
    const kritisch = parseInt(this.hass.states["sensor.inventar_unter_mindestbestand"]?.state ?? "0");
    this._stats = { gesamt, kritisch };
  }

  async _loadConfig() {
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/settings/get" });
      this._config  = r ?? {};
      this._pending = JSON.parse(JSON.stringify(r ?? {}));
    } catch (e) { console.error("[Settings] Load:", e); }
  }

  async _loadDevStatus() {
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/dev/status" });
      this._devStatus = r ?? this._devStatus;
    } catch (_) {}
  }

  _getVal(section, key) {
    return (this._pending?.[section]?.[key]) ?? (this._config?.[section]?.[key]);
  }

  _set(section, key, value) {
    this._pending = { ...this._pending, [section]: { ...(this._pending[section] ?? {}), [key]: value } };
    this._scheduleSave();
  }

  _toggle(section, key, e) { this._set(section, key, e.target.checked); }
  _input(section, key, e)  { this._set(section, key, e.target.value);   }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 700);
  }

  async _save() {
    this._saveStatus = 'saving';
    try {
      await this.hass.connection.sendMessagePromise({ type: "inventar/settings/save", settings: this._pending });
      this._config = JSON.parse(JSON.stringify(this._pending));
      this._savePulse = true;
      this._saveStatus = 'saved';
      setTimeout(() => { this._savePulse = false; this._saveStatus = 'idle'; }, 2000);
    } catch (e) {
      console.error("[Settings] Save:", e);
      this._saveStatus = 'error';
      setTimeout(() => { this._saveStatus = 'idle'; }, 3000);
    }
  }

  // ── Collapsible helper ───────────────────────────────────
  _toggleSection(id) {
    this._open = { ...this._open, [id]: !this._open[id] };
  }

  _isOpen(id, defaultOpen = false) {
    return this._open[id] ?? defaultOpen;
  }

  // ── Kategorien helpers ───────────────────────────────────
  _getKats() {
    return JSON.parse(JSON.stringify(this._pending?.kategorien ?? this._config?.kategorien ?? []));
  }

  _saveKats(kats) {
    this._pending = { ...this._pending, kategorien: kats };
    this._scheduleSave();
  }

  _getIconPickerValue() {
    if (this._iconPickerIndex == null) return "";
    if (this._iconPickerIndex === "alles") return this._getVal("icons","alles") ?? "m3rf:grid-view";
    if (this._iconPickerIndex === "favoriten") return this._getVal("icons","favoriten") ?? "m3rf:favorite";
    return this._getKats()[this._iconPickerIndex]?.icon ?? "";
  }

  _setIconFromPicker(icon) {
    if (this._iconPickerIndex === "alles") {
      this._set("icons", "alles", icon);
      // Auch in Kategorien-Array updaten
      const kats = this._getKats();
      const idx = kats.findIndex(k => k.name === "Alles");
      if (idx !== -1) { kats[idx].icon = icon; this._saveKats(kats); }
      else this._scheduleSave();
      return;
    }
    if (this._iconPickerIndex === "favoriten") {
      this._set("icons", "favoriten", icon);
      const kats = this._getKats();
      const idx = kats.findIndex(k => k.type === "favoriten");
      if (idx !== -1) { kats[idx].icon = icon; this._saveKats(kats); }
      else this._scheduleSave();
      return;
    }
    const kats = this._getKats();
    if (this._iconPickerIndex != null && kats[this._iconPickerIndex]) {
      kats[this._iconPickerIndex].icon = icon;
      this._saveKats(kats);
    }
  }

  _toggleFavoriten(checked) {
    const kats = this._getKats();
    const idx = kats.findIndex(k => k.type === "favoriten");
    if (idx !== -1) kats[idx].aktiv = checked;
    this._saveKats(kats);
  }

  _moveKategorie(index, dir) {
    const kats = this._getKats();
    const t = index + dir;
    if (t < 0 || t >= kats.length) return;
    [kats[index], kats[t]] = [kats[t], kats[index]];
    this._saveKats(kats);
  }

  _updateCustomKategorie(index, field, value) {
    const kats = this._getKats();
    if (kats[index]) kats[index][field] = value;
    this._saveKats(kats);
  }

  _deleteCustomKategorie(index) {
    const kats = this._getKats();
    kats.splice(index, 1);
    this._saveKats(kats);
  }

  _addCustomKategorie() {
    const kats = this._getKats();
    kats.push({ name: "Neue Kategorie", icon: "m3rf:tag", type: "custom", aktiv: true });
    this._saveKats(kats);
  }

  // ── Actions ──────────────────────────────────────────────
  async _generate() {
    this._dashboardLoading = true; this._dashboardError = "";
    try {
      await this.hass.connection.sendMessagePromise({ type: "inventar/dashboard/generate" });
      this._dashboardDone = true;
    } catch (e) { this._dashboardError = e.message || "Fehler"; }
    this._dashboardLoading = false;
  }

  async _restart() {
    this._restartLoading = true; this._restartDone = false;
    try {
      await this.hass.connection.sendMessagePromise({ type: "inventar/integration/reload" });
      this._restartDone = true;
      setTimeout(() => { this._restartDone = false; }, 2500);
    } catch (e) {
      console.error("[Settings] Reload:", e);
    }
    this._restartLoading = false;
  }

  // ── Backup / Restore ─────────────────────────────────────
  async _loadServerBackups() {
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/backup/list" });
      this._serverBackups = r?.backups ?? [];
    } catch (_) { this._serverBackups = []; }
  }

  _bkFlash(msg, isErr = false) {
    if (isErr) { this._bkErr = msg; this._bkMsg = ""; }
    else { this._bkMsg = msg; this._bkErr = ""; }
    setTimeout(() => { this._bkMsg = ""; this._bkErr = ""; }, 6000);
  }

  _b64ToBlob(b64, type = "application/octet-stream") {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type });
  }

  async _downloadB64(b64, filename) {
    const blob = this._b64ToBlob(b64);
    // iOS/Android: Web Share mit Datei bevorzugen (a.download unzuverlaessig auf iOS)
    if (navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: "application/octet-stream" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
      } catch (e) { if (e?.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async _exportBackup() {
    if ((this._bkPassword || "").length < 4) { this._bkFlash("Passwort: mindestens 4 Zeichen", true); return; }
    this._bkBusy = true; this._bkMsg = ""; this._bkErr = "";
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/backup/export", password: this._bkPassword });
      await this._downloadB64(r.data, r.filename);
      const c = r.counts || {};
      this._bkFlash(`Backup erstellt: ${c.products || 0} Produkte, ${c.images || 0} Bilder`);
      await this._loadServerBackups();
    } catch (e) { this._bkFlash(e?.message || "Export fehlgeschlagen", true); }
    this._bkBusy = false;
  }

  _pickImportFile() { this.shadowRoot?.querySelector("#bk-import-file")?.click(); }

  async _onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    this._importName = file.name;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    this._importData = btoa(bin);
    e.target.value = "";  // gleiche Datei erneut waehlbar
  }

  async _importBackup() {
    if (!this._importData) { this._bkFlash("Bitte zuerst eine .invbak-Datei waehlen", true); return; }
    if ((this._bkPassword || "").length < 4) { this._bkFlash("Passwort eingeben", true); return; }
    this._bkBusy = true; this._bkMsg = ""; this._bkErr = "";
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/backup/import", data: this._importData, password: this._bkPassword });
      this._bkFlash(`Wiederhergestellt: ${r.products || 0} Produkte, ${r.images || 0} Bilder`);
      this._importData = null; this._importName = "";
      await this._loadServerBackups();
    } catch (e) { this._bkFlash(e?.message || "Import fehlgeschlagen (falsches Passwort?)", true); }
    this._bkBusy = false;
  }

  async _restoreServer(filename) {
    if ((this._bkPassword || "").length < 4) { this._bkFlash("Passwort fuer Wiederherstellung eingeben", true); return; }
    this._bkBusy = true;
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/backup/restore_server", filename, password: this._bkPassword });
      this._bkFlash(`Wiederhergestellt: ${r.products || 0} Produkte, ${r.images || 0} Bilder`);
    } catch (e) { this._bkFlash(e?.message || "Wiederherstellung fehlgeschlagen (falsches Passwort?)", true); }
    this._bkBusy = false;
  }

  async _downloadServer(filename) {
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/backup/download", filename });
      await this._downloadB64(r.data, r.filename);
    } catch (e) { this._bkFlash(e?.message || "Download fehlgeschlagen", true); }
  }

  async _deleteServer(filename) {
    try {
      await this.hass.connection.sendMessagePromise({ type: "inventar/backup/delete", filename });
      await this._loadServerBackups();
    } catch (e) { this._bkFlash(e?.message || "Loeschen fehlgeschlagen", true); }
  }

  _fmtSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes || 0) + " B";
  }

  async _clearDb() {
    if (!this._dbClearConfirm) {
      this._dbClearConfirm = true;
      setTimeout(() => { this._dbClearConfirm = false; }, 4000);
      return;
    }
    this._dbClearLoading = true; this._dbClearConfirm = false;
    try { await this.hass.connection.sendMessagePromise({ type: "inventar/db/clear" }); }
    catch (e) { console.error("[Settings] DB clear:", e); }
    this._dbClearLoading = false;
  }

  async _regenerateAllQr() {
    this._qrRegenLoading = true; this._qrRegenDone = false; this._qrRegenError = "";
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/qr/regen_all" });
      if (r?.success) {
        this._qrRegenDone = true;
        await this._loadDevStatus();
        setTimeout(() => { this._qrRegenDone = false; }, 3500);
      } else { this._qrRegenError = r?.message || "Fehlgeschlagen"; }
    } catch (e) { this._qrRegenError = e?.message || "Fehler"; }
    this._qrRegenLoading = false;
  }

  async _handleVersionTap() {
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/dev/version_tap" });
      this._versionTapCount = r?.tap_count ?? 0;
      if (r?.activated) await this._loadDevStatus();
    } catch (_) {}
  }

  _openSidebar() {
    const drawer = document.querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")
      ?.shadowRoot?.querySelector("app-drawer-layout app-drawer");
    if (drawer) { drawer.open(); return; }
    window.dispatchEvent(new CustomEvent("hass-toggle-menu"));
    const haMain = document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main");
    if (haMain) haMain.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
  }

  // ── Styles ───────────────────────────────────────────────
  static styles = css`
    :host { display:block;background:var(--primary-background-color);min-height:100vh;font-family:var(--paper-font-body1_-_font-family,sans-serif);--m3-space:8px;--m3-radius-large:28px;--m3-radius-medium:16px;--m3-radius-small:12px;--inv-radius:20px;--inv-radius-sm:12px;--inv-fill:color-mix(in srgb,var(--primary-text-color) 5%,transparent);--inv-active:color-mix(in srgb,var(--primary-text-color) 12%,transparent); }

    /* ── Header ── */
    .header { position:sticky;top:0;z-index:20;display:flex;align-items:center;padding:0 16px 0 4px;height:64px;background:var(--app-header-background-color,var(--primary-background-color));border-bottom:1px solid var(--divider-color);box-shadow:0 1px 8px rgba(0,0,0,0.2); }
    .hamburger { background:none;border:none;cursor:pointer;padding:8px;border-radius:50%;color:var(--primary-text-color);display:flex;align-items:center;flex-shrink:0; }
    .hamburger svg { width:24px;height:24px;fill:currentColor; }
    .header-title { position:absolute;left:50%;transform:translateX(-50%);font-size:18px;font-weight:700;color:var(--primary-text-color);pointer-events:none;white-space:nowrap; }
    .header-right { margin-left:auto;display:flex;align-items:center;gap:8px; }
    .save-dot { width:9px;height:9px;border-radius:50%;transition:background 0.3s,box-shadow 0.3s; }
    .save-dot--idle    { background:transparent; }
    .save-dot--saving  { background:#fb8c00;box-shadow:0 0 8px rgba(251,140,0,0.7);animation:pulse 0.8s infinite alternate; }
    .save-dot--saved   { background:#43a047;box-shadow:0 0 10px rgba(67,160,71,0.6); }
    .save-dot--error   { background:#e53935;box-shadow:0 0 10px rgba(229,57,53,0.6); }
    @keyframes pulse { from{opacity:0.5}to{opacity:1} }
    .version-badge { cursor:pointer;user-select:none;-webkit-user-select:none; }

    /* ── Tabs ── */
    .tabs-wrap { position:sticky;top:64px;z-index:10;background:var(--primary-background-color);border-bottom:1px solid var(--divider-color); }
    .tabs { display:flex;max-width:600px;margin:0 auto; }
    .tab { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:10px 4px 9px;border:none;background:none;font-size:10px;font-weight:500;color:var(--secondary-text-color);border-bottom:2px solid transparent;cursor:pointer;font-family:inherit;transition:color 0.15s,border-color 0.15s;line-height:1; }
    .tab ha-icon { display:block;width:22px;height:22px;--mdc-icon-size:22px; }
    .tab.active { color:var(--primary-color);border-bottom-color:var(--primary-color);font-weight:700; }

    /* ── Content ── */
    .content { padding:14px 12px 48px;display:flex;flex-direction:column;gap:10px;max-width:600px;margin:0 auto; }

    /* ── Cards ── */
    :focus-visible { outline:2px solid var(--primary-color);outline-offset:2px; }
    .ccard { background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:var(--inv-radius);overflow:hidden; }
    .ccard-header { display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;user-select:none;-webkit-user-select:none;transition:background 0.12s; }
    .ccard-header:active { background:var(--inv-fill); }
    .ccard-header-left { display:flex;align-items:center;gap:10px; }
    .ccard-title { font-size:15px;font-weight:600;color:var(--primary-text-color); }
    .ccard-subtitle { font-size:12px;color:var(--secondary-text-color);margin-top:1px; }
    .ccard-chevron { width:20px;height:20px;color:var(--secondary-text-color);transition:transform 0.2s ease;flex-shrink:0; }
    .ccard-chevron.open { transform:rotate(180deg); }
    .ccard-body { border-top:1px solid var(--divider-color);animation:slideDown 0.18s ease; }
    @keyframes slideDown { from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)} }

    .card { background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:var(--inv-radius);overflow:hidden; }
    .card-header { padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:var(--secondary-text-color);border-bottom:1px solid var(--divider-color); }
    .card-body { padding:4px 0; }

    /* ── Rows ── */
    .row { display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 18px;border-bottom:1px solid var(--divider-color); }
    .row:last-child { border-bottom:none; }
    .row-info { flex:1;min-width:0; }
    .row-label { font-size:14px;font-weight:500;color:var(--primary-text-color); }
    .row-desc  { font-size:12px;color:var(--secondary-text-color);margin-top:2px;line-height:1.35; }
    .row-ctrl  { flex-shrink:0; }
    .sub-row { display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 18px;border-bottom:1px solid var(--divider-color);background:var(--inv-fill); }
    .sub-row:last-child { border-bottom:none; }

    /* ── Inputs ── */
    .inp { background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:var(--inv-radius-sm);color:var(--primary-text-color);font-size:14px;font-family:inherit;padding:9px 12px;outline:none;width:100%;box-sizing:border-box;transition:border-color 0.15s; }
    .inp:focus { border-color:var(--primary-color); }
    .inp-pw { -webkit-text-security:disc; }

    /* ── Buttons ── */
    .btn { display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:999px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity 0.15s,transform 0.1s;white-space:nowrap; }
    .btn:active { opacity:0.78;transform:scale(0.97); }
    .btn:disabled { opacity:0.38;cursor:not-allowed;transform:none; }
    .btn-primary { background:var(--primary-color);color:#fff; }
    .btn-danger  { background:#e53935;color:#fff; }
    .btn-warn    { background:#fb8c00;color:#fff; }
    .btn-outline { background:transparent;border:1.5px solid var(--primary-color);color:var(--primary-color); }
    .btn-full    { width:100%; }
    .btn-sm      { padding:8px 16px;font-size:13px; }

    /* ── Chips ── */
    .chip-select { display:flex;gap:8px;flex-wrap:wrap; }
    .chip { padding:8px 16px;border-radius:999px;border:1px solid var(--divider-color);font-size:13px;font-weight:500;cursor:pointer;background:var(--card-background-color,var(--ha-card-background));color:var(--secondary-text-color);transition:all 0.15s; }
    .chip.active { border-color:var(--primary-color);color:#fff;background:var(--primary-color);font-weight:600; }

    /* ── KI Model List ── */
    .model-grid { display:flex;flex-direction:column;gap:3px; }
    .model-option { display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;border:1px solid transparent;transition:background 0.12s; }
    .model-option:hover { background:var(--secondary-background-color); }
    .model-option.active { border-color:var(--primary-color);background:rgba(var(--rgb-primary-color,99,102,241),0.07); }
    .model-check { width:18px;height:18px;border-radius:50%;border:2px solid var(--divider-color);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .model-option.active .model-check { background:var(--primary-color);border-color:var(--primary-color); }
    .model-name { flex:1;font-size:14px;font-weight:500;color:var(--primary-text-color); }
    .model-id   { font-size:11px;color:var(--secondary-text-color);font-family:monospace; }

    /* ── Felder ── */
    .feld-row { display:flex;align-items:center;justify-content:space-between;padding:11px 18px;border-bottom:1px solid var(--divider-color); }
    .feld-row:last-child { border-bottom:none; }
    .feld-name { font-size:14px;color:var(--primary-text-color);font-weight:500; }
    .feld-desc { font-size:11px;color:var(--secondary-text-color);margin-top:1px; }

    /* ── Info Boxes ── */
    .info-box   { padding:12px 16px;border-radius:var(--inv-radius-sm);background:rgba(var(--rgb-primary-color,99,102,241),0.07);border:1px solid rgba(var(--rgb-primary-color,99,102,241),0.18);font-size:13px;color:var(--secondary-text-color);line-height:1.5; }
    .warn-box   { padding:12px 16px;border-radius:var(--inv-radius-sm);background:rgba(251,140,0,0.08);border:1px solid rgba(251,140,0,0.22);font-size:13px;color:#fb8c00;line-height:1.5; }
    .danger-box { padding:12px 16px;border-radius:var(--inv-radius-sm);background:rgba(229,57,53,0.08);border:1px solid rgba(229,57,53,0.22);font-size:13px;color:#e53935;line-height:1.5; }
    .bk-wrap { padding:14px 18px;display:flex;flex-direction:column;gap:12px; }
    .bk-input { width:100%;box-sizing:border-box;padding:12px 14px;border-radius:var(--inv-radius-sm);border:1.5px solid var(--divider-color);background:var(--card-background-color,#fff);color:var(--primary-text-color);font-size:14px;font-family:inherit;outline:none; }
    .bk-input:focus { border-color:var(--primary-color); }
    .bk-import-row { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--inv-radius-sm);background:rgba(var(--rgb-primary-color,99,102,241),0.07); }
    .bk-import-name { flex:1;font-size:13px;color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .bk-msg { padding:10px 14px;border-radius:var(--inv-radius-sm);font-size:13px;line-height:1.4; }
    .bk-msg.ok  { background:rgba(67,160,71,0.1);border:1px solid rgba(67,160,71,0.25);color:#2e7d32; }
    .bk-msg.err { background:rgba(229,57,53,0.08);border:1px solid rgba(229,57,53,0.22);color:#e53935; }
    .bk-list-title { font-size:13px;font-weight:700;color:var(--secondary-text-color);margin-top:4px; }
    .bk-empty { font-size:13px;color:var(--secondary-text-color);padding:10px 0;text-align:center; }
    .bk-item { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--inv-radius-sm);background:var(--secondary-background-color,rgba(0,0,0,0.03)); }
    .bk-item-info { flex:1;min-width:0; }
    .bk-item-name { font-size:13px;font-weight:600;color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .bk-item-meta { font-size:12px;color:var(--secondary-text-color);margin-top:2px; }
    .bk-item-actions { display:flex;gap:2px;flex-shrink:0; }
    .bk-icon-btn { width:38px;height:38px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--primary-color);padding:0;transition:background 0.15s; }
    .bk-icon-btn:hover { background:rgba(var(--rgb-primary-color,99,102,241),0.12); }
    .bk-icon-btn.danger { color:#e53935; }
    .bk-icon-btn.danger:hover { background:rgba(229,57,53,0.12); }
    .bk-icon-btn:disabled { opacity:0.4;cursor:default; }
    .success-box{ padding:12px 16px;border-radius:var(--inv-radius-sm);background:rgba(67,160,71,0.08);border:1px solid rgba(67,160,71,0.22);font-size:13px;color:#43a047;line-height:1.5; }

    /* ── Icon Picker Overlay ── */
    .overlay-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px; }
    .overlay-card { background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:var(--m3-radius-large);padding:20px;width:100%;max-width:400px;max-height:90vh;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,0.35); }
    .overlay-title { font-size:16px;font-weight:700;color:var(--primary-text-color); }
    .icon-grid { display:grid;grid-template-columns:repeat(5,1fr);gap:8px;overflow-y:auto;max-height:55vh; }
    .icon-btn { background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:12px;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;aspect-ratio:1;transition:background 0.12s;min-height:52px; }
    .icon-btn.active { background:var(--primary-color);border-color:var(--primary-color); }
    .icon-btn:hover:not(.active) { background:var(--card-background-color,var(--ha-card-background)); }

    /* ── Kategorien ── */
    .kat-item { display:flex;align-items:center;gap:8px;padding:10px 18px;border-bottom:1px solid var(--divider-color); }
    .kat-item:last-child { border-bottom:none; }
    .kat-move-btns { display:flex;flex-direction:column;gap:3px;flex-shrink:0; }
    .kat-move-btn { background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--primary-text-color);display:flex;align-items:center;justify-content:center; }
    .kat-icon-btn { background:var(--primary-color);border:none;border-radius:12px;cursor:pointer;flex-shrink:0;width:42px;height:42px;display:flex;align-items:center;justify-content:center;padding:0; }
    .kat-delete-btn { background:#c62828;color:#fff;border:none;border-radius:12px;cursor:pointer;flex-shrink:0;width:42px;height:42px;display:flex;align-items:center;justify-content:center; }

    /* ── Übersicht ── */
    .welcome-banner { border-radius:var(--inv-radius);background:linear-gradient(135deg,var(--primary-color) 0%,color-mix(in srgb,var(--primary-color) 65%,#000) 100%);padding:24px 20px;color:#fff;position:relative;overflow:hidden; }
    .welcome-banner::before { content:"";position:absolute;top:-40px;right:-40px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,0.08); }
    .welcome-banner::after  { content:"";position:absolute;bottom:-25px;left:10px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,0.05); }
    .welcome-title { font-size:24px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;position:relative; }
    .welcome-sub   { font-size:13px;opacity:0.8;line-height:1.4;position:relative; }

    .stat-row { display:flex;gap:10px; }
    .stat-card { flex:1;background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:var(--inv-radius-sm);padding:16px 12px;text-align:center; }
    .stat-num { font-size:32px;font-weight:800;color:var(--primary-text-color);line-height:1; }
    .stat-lbl { font-size:12px;color:var(--secondary-text-color);margin-top:5px;font-weight:500; }

    .quick-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px; }
    .quick-card { background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:14px;padding:14px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:opacity 0.15s,transform 0.1s; }
    .quick-card:active { opacity:0.7;transform:scale(0.97); }
    .quick-icon { width:34px;height:34px;border-radius:10px;background:var(--inv-fill);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .quick-label { font-size:13px;font-weight:600;color:var(--primary-text-color); }
    .quick-desc  { font-size:11px;color:var(--secondary-text-color);margin-top:1px; }

    .changelog-entry { display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--divider-color); }
    .changelog-entry:last-child { border-bottom:none; }
    .cl-badge { flex-shrink:0;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px; }
    .cl-neu  { background:rgba(var(--rgb-primary-color,99,102,241),0.15);color:var(--primary-color); }
    .cl-fix  { background:rgba(67,160,71,0.15);color:#43a047; }
    .cl-verb { background:rgba(251,140,0,0.15);color:#fb8c00; }
    .cl-text { font-size:13px;color:var(--primary-text-color);line-height:1.4;padding-top:2px; }

    /* ── QR Design ── */
    .qr-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 18px; }
    .qr-opt { border:1px solid var(--divider-color);border-radius:14px;padding:16px 12px;cursor:pointer;text-align:center;transition:all 0.15s;background:var(--card-background-color,var(--ha-card-background)); }
    .qr-opt.active { border-color:var(--primary-color);background:rgba(var(--rgb-primary-color,99,102,241),0.07); }
    .qr-preview { width:60px;height:60px;margin:0 auto 8px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center; }
    .qr-opt-label { font-size:13px;font-weight:600;color:var(--primary-text-color); }
    .qr-opt-desc  { font-size:11px;color:var(--secondary-text-color);margin-top:2px; }

    .api-link { color:var(--primary-color);text-decoration:none; }
    .action-row { display:flex;gap:10px;flex-wrap:wrap;padding:14px 18px; }
    .mini-label { font-size:11px;color:var(--secondary-text-color);margin-top:4px; }
  `;

  // ── Render ───────────────────────────────────────────────
  render() {
    return html`
      <div class="header">
        <button class="hamburger" @click=${this._openSidebar}>
          <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:currentColor;">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
        <div class="header-title">Einstellungen</div>
        <div class="header-right">
          <div class="save-dot save-dot--${this._saveStatus}" title="${
            this._saveStatus === 'saving' ? 'Speichert…' :
            this._saveStatus === 'saved'  ? 'Gespeichert' :
            this._saveStatus === 'error'  ? 'Fehler beim Speichern' : ''
          }"></div>
          <span class="version-badge" style="font-size:12px;color:var(--secondary-text-color);"
            @click=${this._handleVersionTap}>v${VERSION}</span>
        </div>
      </div>

      <div class="tabs-wrap"><div class="tabs">
        ${TABS.map(t => html`
          <button class="tab ${this._activeTab === t.id ? "active" : ""}"
            @click=${() => { this._activeTab = t.id; }}>
            <ha-icon icon="${t.icon}"></ha-icon>
            ${t.label}
          </button>
        `)}
      </div></div>

      <div class="content">
        ${this._activeTab === "uebersicht" ? this._renderUebersicht() : ""}
        ${this._activeTab === "einrichten" ? this._renderEinrichten() : ""}
        ${this._activeTab === "funktionen" ? this._renderFunktionen() : ""}
        ${this._activeTab === "daten"      ? this._renderDaten()      : ""}
        ${this._activeTab === "system"     ? this._renderSystem()     : ""}
      </div>

      ${this._iconPickerOpen ? this._renderIconPicker() : ""}
    `;
  }

  // ── Collapsible Card ─────────────────────────────────────
  _ccard(id, title, subtitle = "", defaultOpen = false, content = "") {
    const open = this._isOpen(id, defaultOpen);
    return html`
      <div class="ccard">
        <div class="ccard-header" @click=${() => this._toggleSection(id)}>
          <div class="ccard-header-left">
            <div>
              <div class="ccard-title">${title}</div>
              ${subtitle ? html`<div class="ccard-subtitle">${subtitle}</div>` : ""}
            </div>
          </div>
          <svg class="ccard-chevron ${open ? "open" : ""}" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
        ${open ? html`<div class="ccard-body">${content}</div>` : ""}
      </div>
    `;
  }

  // ── Icon Picker ──────────────────────────────────────────
  _renderIconPicker() {
    const current = this._getIconPickerValue();
    return html`
      <div class="overlay-backdrop"
        @click=${e => { if (e.target === e.currentTarget) this._iconPickerOpen = false; }}>
        <div class="overlay-card">
          <div class="overlay-title">Icon auswählen</div>
          <div class="icon-grid">
            ${ICONS.map(icon => html`
              <button class="icon-btn ${current === icon ? "active" : ""}"
                @click=${() => { this._setIconFromPicker(icon); this._iconPickerOpen = false; }}>
                <ha-icon icon="${icon}"
                  style="width:26px;height:26px;--mdc-icon-size:26px;display:block;
                  color:${current===icon?"#fff":"var(--primary-text-color)"};">
                </ha-icon>
              </button>
            `)}
          </div>
          <button class="btn btn-primary" @click=${() => { this._iconPickerOpen = false; }}>
            Schließen
          </button>
        </div>
      </div>
    `;
  }

  // ── Tab: Übersicht ───────────────────────────────────────
  _renderUebersicht() {
    const { gesamt, kritisch } = this._stats;
    const dashboardAktiv = this._getVal("dashboard", "generated") ?? false;

    return html`
      <!-- Banner -->
      <div class="welcome-banner">
        <div class="welcome-title">Inventar App</div>
        <div class="welcome-sub">Smarte Lagerverwaltung für Home Assistant</div>
      </div>


      <!-- Stats -->
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-num">${gesamt}</div>
          <div class="stat-lbl">Produkte</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:${kritisch>0?"#e53935":"#43a047"}">${kritisch}</div>
          <div class="stat-lbl">Kritisch</div>
        </div>
      </div>

      <!-- App registrieren -->
      ${this._ccard("sidebar", "App in Seitenleiste",
        dashboardAktiv ? "Bereits registriert" : "Noch nicht eingerichtet",
        true,
        html`
          <div style="padding:14px 18px;display:flex;flex-direction:column;gap:8px;">
            ${dashboardAktiv
              ? html`<div class="success-box">✅ Die App ist bereits in der Seitenleiste registriert.</div>`
              : html`<div class="info-box">Registriere die App einmalig, um sie direkt aus der Seitenleiste öffnen zu können.</div>`}
            <button class="btn btn-primary btn-full"
              ?disabled=${this._dashboardLoading}
              @click=${() => this._generate()}>
              ${this._dashboardLoading ? "Registriere…" : this._dashboardDone ? "✅ Fertig" : dashboardAktiv ? "Erneut registrieren" : "App registrieren"}
            </button>
            ${this._dashboardError ? html`<div class="warn-box">${this._dashboardError}</div>` : ""}
          </div>
        `
      )}

      <!-- Schnellzugriff -->
      <div class="card">
        <div class="card-header">Schnellzugriff</div>
        <div class="quick-grid">
          ${[
            { label: "Einrichten", desc: "App & QR", icon: "mdi:wrench-outline", tab: "einrichten" },
            { label: "Kategorien", desc: "Verwalten", icon: "mdi:shape-outline", tab: "einrichten" },
            { label: "Module",     desc: "Aktivieren", icon: "mdi:puzzle-outline", tab: "funktionen" },
            { label: "Backup",     desc: "Sichern", icon: "mdi:database-outline", tab: "daten" },
          ].map(q => html`
            <div class="quick-card" @click=${() => { this._activeTab = q.tab; }}>
              <div class="quick-icon">
                <ha-icon icon="${q.icon}" style="width:18px;height:18px;color:var(--primary-color);--mdc-icon-size:18px;"></ha-icon>
              </div>
              <div>
                <div class="quick-label">${q.label}</div>
                <div class="quick-desc">${q.desc}</div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <!-- Neuigkeiten -->
      ${this._ccard("changelog", "Neuigkeiten", "Was ist neu in v" + VERSION, false,
        html`
          ${CHANGELOG.map(release => html`
            <div style="padding:12px 18px 4px;">
              <span style="font-size:13px;font-weight:700;color:var(--primary-text-color);">v${release.version}</span>
              <span style="font-size:11px;color:var(--secondary-text-color);margin-left:8px;">${release.date}</span>
            </div>
            <div style="padding:0 18px 12px;">
              ${release.entries.map(e => html`
                <div class="changelog-entry">
                  <span class="cl-badge cl-${e.type}">${e.type === "neu" ? "Neu" : e.type === "fix" ? "Fix" : "Verb."}</span>
                  <span class="cl-text">${e.text}</span>
                </div>
              `)}
            </div>
          `)}
        `
      )}
    `;
  }

  // ── Tab: Einrichten ──────────────────────────────────────
  _renderEinrichten() {
    const qrDesign   = this._getVal("qr", "design")       ?? "standard";
    const showLogo   = this._getVal("qr", "show_logo")    ?? true;
    const qrGesperrt = this._getVal("qr", "eingerichtet") ?? false;

    return html`
      <!-- App-Einstellungen -->
      ${this._ccard("app", "App-Einstellungen", "Name, URL, Zugriff", true, html`
        <div class="row">
          <div class="row-info">
            <div class="row-label">App-Name</div>
            <div class="row-desc">Titel in der HA-Seitenleiste</div>
          </div>
          <input class="inp" style="width:130px;"
            .value=${this._getVal("app","name")??"Inventar"}
            @change=${e => this._input("app","name",e)}
            placeholder="Inventar">
        </div>
        <div class="row">
          <div class="row-info">
            <div class="row-label">Externe URL</div>
            <div class="row-desc">Deine HA-Adresse von außen</div>
          </div>
          <input class="inp" style="width:170px;"
            .value=${this._getVal("app","externe_url")??""}
            @change=${e => this._input("app","externe_url",e)}
            placeholder="https://ha.deine.de">
        </div>
        <div class="row">
          <div class="row-info">
            <div class="row-label">Nur für Admins</div>
            <div class="row-desc">Nur HA-Admins sehen die App</div>
          </div>
          <ha-switch ?checked=${this._getVal("app","require_admin")??false}
            @change=${e => this._toggle("app","require_admin",e)}></ha-switch>
        </div>
      `)}

      <!-- QR-System -->
      ${this._ccard("qr", "QR-System",
        qrGesperrt ? "Eingerichtet & gesperrt" : "⚠️ Noch einrichten",
        true,
        html`
          ${qrGesperrt ? html`
            <div style="padding:12px 18px;">
              <div class="warn-box">
                ⚠️ Das QR-Design ist gesperrt — gedruckte Labels bleiben für immer gültig.
                Zum Ändern: System-Tab → Entwicklertools → "QR zurücksetzen".
              </div>
            </div>
          ` : html`
            <div style="padding:12px 18px 0;">
              <div class="info-box">
                Wähle einmalig dein QR-Design. Nach dem Bestätigen ist es dauerhaft gesperrt —
                gedruckte Labels sind für immer gültig.
              </div>
            </div>
          `}

          <div class="qr-grid" style="${qrGesperrt?"opacity:0.5;pointer-events:none;":""}">
            <div class="qr-opt ${qrDesign==="standard"?"active":""}"
              @click=${() => this._set("qr","design","standard")}>
              <div class="qr-preview">
                <svg viewBox="0 0 36 36" width="36" height="36">
                  <rect x="1" y="1" width="14" height="14" fill="none" stroke="#000" stroke-width="2"/>
                  <rect x="4" y="4" width="8" height="8" fill="#000"/>
                  <rect x="21" y="1" width="14" height="14" fill="none" stroke="#000" stroke-width="2"/>
                  <rect x="24" y="4" width="8" height="8" fill="#000"/>
                  <rect x="1" y="21" width="14" height="14" fill="none" stroke="#000" stroke-width="2"/>
                  <rect x="4" y="24" width="8" height="8" fill="#000"/>
                  <rect x="21" y="21" width="4" height="4" fill="#000"/>
                  <rect x="27" y="21" width="4" height="4" fill="#000"/>
                  <rect x="33" y="21" width="2" height="4" fill="#000"/>
                  <rect x="21" y="27" width="4" height="4" fill="#000"/>
                  <rect x="27" y="27" width="8" height="4" fill="#000"/>
                  <rect x="21" y="33" width="14" height="2" fill="#000"/>
                </svg>
              </div>
              <div class="qr-opt-label">Standard</div>
              <div class="qr-opt-desc">Klassisch, max. Kompatibilität</div>
            </div>
            <div class="qr-opt ${qrDesign==="modern"?"active":""}"
              @click=${() => this._set("qr","design","modern")}>
              <div class="qr-preview">
                <svg viewBox="0 0 36 36" width="36" height="36">
                  <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="#000" stroke-width="2"/>
                  <rect x="4" y="4" width="8" height="8" rx="2" fill="#000"/>
                  <rect x="21" y="1" width="14" height="14" rx="3" fill="none" stroke="#000" stroke-width="2"/>
                  <rect x="24" y="4" width="8" height="8" rx="2" fill="#000"/>
                  <rect x="1" y="21" width="14" height="14" rx="3" fill="none" stroke="#000" stroke-width="2"/>
                  <rect x="4" y="24" width="8" height="8" rx="2" fill="#000"/>
                  <circle cx="29" cy="29" r="6" fill="var(--primary-color,#6366f1)"/>
                  <path d="M26 29h6M29 26v6" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="qr-opt-label">Modern</div>
              <div class="qr-opt-desc">Mit Icon in der Mitte</div>
            </div>
          </div>

          ${qrDesign==="modern" && !qrGesperrt ? html`
            <div class="row">
              <div class="row-info">
                <div class="row-label">Logo/Icon anzeigen</div>
                <div class="row-desc">Icon in der Mitte des QR-Codes</div>
              </div>
              <ha-switch ?checked=${showLogo}
                @change=${e => this._toggle("qr","show_logo",e)}></ha-switch>
            </div>
          ` : ""}

          ${!qrGesperrt ? html`
            <div style="padding:12px 18px;">
              <button class="btn btn-primary btn-full"
                @click=${() => this._set("qr","eingerichtet",true)}>
                Design bestätigen & sperren
              </button>
            </div>
          ` : ""}
        `
      )}

      <!-- Kategorien -->
      ${this._ccard("kategorien", "Kategorien", "Filter-Bereiche verwalten", false,
        this._renderKategorienContent()
      )}

      <!-- Felder -->
      ${this._ccard("felder", "Sichtbare Felder", "Welche Infos pro Produkt angezeigt werden", false,
        this._renderFelderContent()
      )}
    `;
  }

  _renderKategorienContent() {
    const kats   = this._getKats();
    const custom = kats.filter(k => k.type!=="favoriten" && k.name!=="Alles");
    const favAktiv = kats.find(k => k.type==="favoriten")?.aktiv ?? true;

    return html`
      <div class="row">
        <div style="display:flex;align-items:center;gap:12px;flex:1;">
          <ha-icon icon="m3rf:favorite" style="color:var(--primary-color);width:24px;height:24px;flex-shrink:0;"></ha-icon>
          <div class="row-info">
            <div class="row-label">Favoriten</div>
            <div class="row-desc">Als Favorit markierte Produkte</div>
          </div>
        </div>
        <ha-switch ?checked=${favAktiv} @change=${e => this._toggleFavoriten(e.target.checked)}></ha-switch>
      </div>
      <div class="row">
        <div style="display:flex;align-items:center;gap:12px;flex:1;">
          <ha-icon icon="m3rf:grid-view" style="color:var(--primary-color);width:24px;height:24px;flex-shrink:0;"></ha-icon>
          <div class="row-info">
            <div class="row-label">Alles</div>
            <div class="row-desc">Immer aktiv</div>
          </div>
        </div>
        <ha-switch checked disabled></ha-switch>
      </div>

      ${custom.map((kat) => {
        const origIdx = kats.indexOf(kat);
        const custIdx = custom.indexOf(kat);
        return html`
          <div class="kat-item">
            <div class="kat-move-btns">
              <button class="kat-move-btn" style="opacity:${custIdx===0?"0.25":"1"}"
                @click=${() => custIdx>0 && this._moveKategorie(origIdx,-1)}>
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"><path d="M7 14l5-5 5 5z"/></svg>
              </button>
              <button class="kat-move-btn" style="opacity:${custIdx===custom.length-1?"0.25":"1"}"
                @click=${() => custIdx<custom.length-1 && this._moveKategorie(origIdx,1)}>
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
              <button class="kat-icon-btn" title="Aktiv-Icon"
                @click=${() => { this._iconPickerIndex=origIdx; this._iconPickerField="icon"; this._iconPickerOpen=true; }}>
                <ha-icon icon="${kat.icon||"m3rf:tag"}" style="width:20px;height:20px;color:#fff;"></ha-icon>
              </button>
              <button class="kat-icon-btn" title="Inaktiv-Icon" style="background:var(--secondary-background-color);border:1px solid var(--divider-color);"
                @click=${() => { this._iconPickerIndex=origIdx; this._iconPickerField="icon_inaktiv"; this._iconPickerOpen=true; }}>
                <ha-icon icon="${kat.icon_inaktiv||kat.icon||"m3rf:tag"}" style="width:20px;height:20px;color:var(--secondary-text-color);"></ha-icon>
              </button>
            </div>
            <div style="flex:1;min-width:0;overflow:hidden;">
              <ha-textfield .value=${kat.name}
                @change=${e => this._updateCustomKategorie(origIdx,"name",e.target.value)}
                style="width:100%;"></ha-textfield>
            </div>
            <button class="kat-delete-btn" @click=${() => this._deleteCustomKategorie(origIdx)}>
              <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        `;
      })}

      <div style="padding:10px 18px;">
        <button class="btn btn-outline btn-full" @click=${() => this._addCustomKategorie()}>
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Kategorie hinzufügen
        </button>
      </div>
    `;
  }

  _renderFelderContent() {
    const felder = [
      { key: "artikelnummer",       label: "Artikelnummer",       desc: "Hersteller-Artikelnummer" },
      { key: "hersteller",          label: "Hersteller",          desc: "Marke / Lieferant"        },
      { key: "typ",                 label: "Typ / Modell",        desc: "Typenbezeichnung"         },
      { key: "serie",               label: "Serie",               desc: "Produktserie"             },
      { key: "mindestmenge",        label: "Mindestmenge",        desc: "Bestand-Warnschwelle"     },
      { key: "preis",               label: "Preis",               desc: "Einkaufspreis in €"       },
      { key: "lagerort",            label: "Lagerort",            desc: "Regal, Kiste, Raum …"     },
      { key: "notiz",               label: "Notiz",               desc: "Freies Textfeld"          },
      { key: "produktlink",         label: "Produktlink",         desc: "Link zum Shop"            },
      { key: "mindestbestellmenge", label: "Mindestbestellmenge", desc: "Menge für Nachbestellung" },
    ];
    return html`
      ${felder.map(f => html`
        <div class="feld-row">
          <div>
            <div class="feld-name">${f.label}</div>
            <div class="feld-desc">${f.desc}</div>
          </div>
          <ha-switch ?checked=${this._getVal("felder",f.key)??true}
            @change=${e => this._toggle("felder",f.key,e)}></ha-switch>
        </div>
      `)}
    `;
  }

  // ── Tab: Funktionen ──────────────────────────────────────
  _renderFunktionen() {
    const kiAktiv    = this._getVal("ki","aktiv")    ?? false;
    const kiProvider = this._getVal("ki","provider") ?? "claude";
    const kiModel    = this._getVal("ki","model")    ?? "";
    const leih         = this._getVal("module","leih")         ?? false;
    const mhd          = this._getVal("module","mhd")          ?? false;
    const verschiebe   = this._getVal("module","verschiebe")   ?? false;
    const nachbestellung = this._getVal("module","nachbestellung") ?? false;
    const autosync     = this._getVal("module","autosync")     ?? false;

    const placeholders = { claude:"sk-ant-api03-...", openai:"sk-...", gemini:"AIzaSy..." };
    const apiLinks = {
      claude: { url:"https://console.anthropic.com",      label:"console.anthropic.com"  },
      openai: { url:"https://platform.openai.com/api-keys", label:"platform.openai.com" },
      gemini: { url:"https://aistudio.google.com/apikey", label:"aistudio.google.com"   },
    };

    return html`
      <!-- KI — prominent als erstes -->
      ${this._ccard("ki", "🤖 KI-Features",
        kiAktiv ? `Aktiv · ${kiProvider.charAt(0).toUpperCase()+kiProvider.slice(1)}` : "Deaktiviert",
        true,
        html`
          <div class="row">
            <div class="row-info">
              <div class="row-label">KI aktivieren</div>
              <div class="row-desc">Foto-Analyse beim Anlegen, smarte Berichte</div>
            </div>
            <ha-switch ?checked=${kiAktiv} @change=${e => this._toggle("ki","aktiv",e)}></ha-switch>
          </div>

          ${kiAktiv ? html`
            <div class="sub-row" style="flex-direction:column;align-items:stretch;gap:10px;">
              <div class="row-label">Anbieter</div>
              <div class="chip-select">
                ${[["claude","Claude"],["openai","OpenAI"],["gemini","Gemini"]].map(([v,l]) => html`
                  <div class="chip ${kiProvider===v?"active":""}"
                    @click=${() => { this._set("ki","provider",v); this._set("ki","model",""); }}>
                    ${l}
                  </div>
                `)}
              </div>
            </div>

            <div class="sub-row" style="flex-direction:column;align-items:stretch;gap:4px;">
              <div class="row-label" style="margin-bottom:6px;">Modell</div>
              <div class="model-grid">
                ${(KI_MODELS[kiProvider]??[]).map(m => html`
                  <div class="model-option ${kiModel===m.id?"active":""}"
                    @click=${() => this._set("ki","model",m.id)}>
                    <div class="model-check">
                      ${kiModel===m.id ? html`
                        <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:#fff;">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>` : ""}
                    </div>
                    <span class="model-name">${m.label}</span>
                    <span class="model-id">${m.id}</span>
                  </div>
                `)}
              </div>
            </div>

            <div class="sub-row" style="flex-direction:column;align-items:stretch;gap:8px;">
              <div class="row-label">API Key</div>
              <input class="inp inp-pw" type="text"
                placeholder=${placeholders[kiProvider]??"API Key..."}
                .value=${this._getVal("ki","api_key")??""}
                @change=${e => this._input("ki","api_key",e)}>
              <div style="font-size:11px;color:var(--secondary-text-color);">
                Lokal gespeichert. Erstellen unter
                <a class="api-link" href="${apiLinks[kiProvider].url}" target="_blank">
                  ${apiLinks[kiProvider].label}
                </a>
              </div>
            </div>

            <div class="row">
              <div class="row-info">
                <div class="row-label">Foto-Analyse</div>
                <div class="row-desc">Foto → KI füllt Formular aus</div>
              </div>
              <ha-switch ?checked=${this._getVal("ki","foto_analyse")??true}
                @change=${e => this._toggle("ki","foto_analyse",e)}></ha-switch>
            </div>
            <div class="row">
              <div class="row-info">
                <div class="row-label">Smarte Berichte</div>
                <div class="row-desc">KI analysiert Bestandsänderungen</div>
              </div>
              <ha-switch ?checked=${this._getVal("ki","berichte")??false}
                @change=${e => this._toggle("ki","berichte",e)}></ha-switch>
            </div>
          ` : ""}
        `
      )}

      <!-- Module -->
      ${this._ccard("leih", "📤 Leih-Modus",
        leih ? "Aktiv" : "Deaktiviert", false,
        html`
          <div class="row">
            <div class="row-info">
              <div class="row-label">Leih-Tracking</div>
              <div class="row-desc">Verfolge was an wen verliehen wurde</div>
            </div>
            <ha-switch ?checked=${leih} @change=${e => this._toggle("module","leih",e)}></ha-switch>
          </div>
          ${leih ? html`
            <div class="sub-row">
              <div class="row-info">
                <div class="row-label">Erinnerung nach (Tage)</div>
              </div>
              <input class="inp" type="number" style="width:80px;"
                .value=${this._getVal("module","leih_tage")??14}
                @change=${e => this._input("module","leih_tage",e)}>
            </div>
          ` : ""}
        `
      )}

      ${this._ccard("mhd", "📅 Mindesthaltbarkeit",
        mhd ? "Aktiv" : "Deaktiviert", false,
        html`
          <div class="row">
            <div class="row-info">
              <div class="row-label">MHD-Tracking</div>
              <div class="row-desc">Warnung wenn Produkte ablaufen</div>
            </div>
            <ha-switch ?checked=${mhd} @change=${e => this._toggle("module","mhd",e)}></ha-switch>
          </div>
          ${mhd ? html`
            <div class="sub-row">
              <div class="row-info"><div class="row-label">Vorwarnung (Tage)</div></div>
              <input class="inp" type="number" style="width:80px;"
                .value=${this._getVal("module","mhd_tage")??30}
                @change=${e => this._input("module","mhd_tage",e)}>
            </div>
          ` : ""}
        `
      )}

      ${this._ccard("verschiebe", "📦 Verschiebe-Modus",
        verschiebe ? "Aktiv" : "Deaktiviert", false,
        html`
          <div class="row">
            <div class="row-info">
              <div class="row-label">Ort-QR-Codes</div>
              <div class="row-desc">Regal scannen → Inhalt zuweisen</div>
            </div>
            <ha-switch ?checked=${verschiebe} @change=${e => this._toggle("module","verschiebe",e)}></ha-switch>
          </div>
        `
      )}

      ${this._ccard("nachbestellung", "🛒 Nachbestell-Liste",
        nachbestellung ? "Aktiv" : "Deaktiviert", false,
        html`
          <div class="row">
            <div class="row-info">
              <div class="row-label">Automatische Liste</div>
              <div class="row-desc">Unter Mindestmenge → Einkaufsliste</div>
            </div>
            <ha-switch ?checked=${nachbestellung} @change=${e => this._toggle("module","nachbestellung",e)}></ha-switch>
          </div>
          ${nachbestellung ? html`
            <div class="sub-row" style="flex-direction:column;align-items:stretch;gap:6px;">
              <div class="row-label">E-Mail für Berichte</div>
              <input class="inp" type="email" placeholder="du@beispiel.de"
                .value=${this._getVal("module","bericht_email")??""}
                @change=${e => this._input("module","bericht_email",e)}>
            </div>
          ` : ""}
        `
      )}

      ${this._ccard("autosync", "☁️ Auto-Sync",
        autosync ? "Aktiv (coming soon)" : "Deaktiviert", false,
        html`
          <div class="row">
            <div class="row-info">
              <div class="row-label">Cloud-Sync</div>
              <div class="row-desc">Inventar spiegeln (coming soon)</div>
            </div>
            <ha-switch ?checked=${autosync} @change=${e => this._toggle("module","autosync",e)}></ha-switch>
          </div>
          ${autosync ? html`
            <div style="padding:0 18px 12px;">
              <div class="info-box">Wird in einer späteren Version unterstützt.</div>
            </div>
          ` : ""}
        `
      )}
    `;
  }

  // ── Tab: Daten ───────────────────────────────────────────
  _renderDaten() {
    const backupZiel = this._getVal("system","backup_ziel") ?? "lokal";

    return html`
      ${this._ccard("backup", "🗄️ Backup & Wiederherstellung",
        "Produktdaten, Bilder, Settings", true,
        html`
          <div class="row">
            <div class="row-info">
              <div class="row-label">Delete-Guard</div>
              <div class="row-desc">Beim Entfernen: Backup-Abfrage</div>
            </div>
            <ha-switch ?checked=${this._getVal("system","delete_guard")??true}
              @change=${e => this._toggle("system","delete_guard",e)}></ha-switch>
          </div>
          <div class="row">
            <div class="row-info">
              <div class="row-label">Auto-Recovery</div>
              <div class="row-desc">Alte Backups bei Neuinstallation erkennen</div>
            </div>
            <ha-switch ?checked=${this._getVal("system","auto_recovery")??true}
              @change=${e => this._toggle("system","auto_recovery",e)}></ha-switch>
          </div>
          <div class="row">
            <div class="row-info"><div class="row-label">Speicherort</div></div>
            <div style="display:flex;gap:8px;">
              ${["lokal","extern"].map(v => html`
                <div style="padding:7px 14px;border-radius:999px;cursor:pointer;font-size:13px;font-weight:600;
                  border:1.5px solid ${backupZiel===v?"var(--primary-color)":"var(--divider-color)"};
                  background:${backupZiel===v?"rgba(var(--rgb-primary-color,99,102,241),0.1)":"transparent"};
                  color:${backupZiel===v?"var(--primary-color)":"var(--secondary-text-color)"};
                  transition:all 0.15s;"
                  @click=${() => this._set("system","backup_ziel",v)}>
                  ${v==="lokal"?"💾 Lokal":"☁️ Extern"}
                </div>
              `)}
            </div>
          </div>
          <div class="bk-wrap">
            <div class="info-box">
              🔒 Backups werden mit AES-256 verschlüsselt. Das Passwort wird
              <b>nicht</b> gespeichert — ohne Passwort ist keine Wiederherstellung möglich.
            </div>

            <input type="password" class="bk-input" placeholder="Passwort für Verschlüsselung / Wiederherstellung"
              .value=${this._bkPassword || ""}
              @input=${e => { this._bkPassword = e.target.value; }}>

            <div class="action-row" style="padding:0;">
              <button class="btn btn-primary" style="flex:1;"
                ?disabled=${this._bkBusy}
                @click=${() => this._exportBackup()}>
                <ha-icon icon="mdi:lock" style="width:16px;height:16px;--mdc-icon-size:16px;"></ha-icon>
                ${this._bkBusy ? "Bitte warten…" : "Verschlüsseltes Backup"}
              </button>
              <button class="btn btn-outline" style="flex:1;"
                ?disabled=${this._bkBusy}
                @click=${() => this._pickImportFile()}>
                <ha-icon icon="mdi:upload" style="width:16px;height:16px;--mdc-icon-size:16px;"></ha-icon>
                Importieren
              </button>
              <input id="bk-import-file" type="file" accept=".invbak" style="display:none;"
                @change=${e => this._onImportFile(e)}>
            </div>

            ${this._importName ? html`
              <div class="bk-import-row">
                <ha-icon icon="mdi:file-lock-outline" style="width:18px;height:18px;--mdc-icon-size:18px;color:var(--primary-color);"></ha-icon>
                <span class="bk-import-name">${this._importName}</span>
                <button class="btn btn-primary btn-sm" ?disabled=${this._bkBusy}
                  @click=${() => this._importBackup()}>Wiederherstellen</button>
              </div>` : ""}

            ${this._bkMsg ? html`<div class="bk-msg ok">${this._bkMsg}</div>` : ""}
            ${this._bkErr ? html`<div class="bk-msg err">${this._bkErr}</div>` : ""}

            <div class="bk-list-title">Backups auf dem Server (${(this._serverBackups || []).length})</div>
            ${(this._serverBackups || []).length === 0
              ? html`<div class="bk-empty">Noch keine Server-Backups vorhanden</div>`
              : (this._serverBackups || []).map(b => html`
                <div class="bk-item">
                  <div class="bk-item-info">
                    <div class="bk-item-name">${b.filename}</div>
                    <div class="bk-item-meta">${(b.created || "").replace("T", " ")} · ${this._fmtSize(b.size)}</div>
                  </div>
                  <div class="bk-item-actions">
                    <button class="bk-icon-btn" title="Wiederherstellen" ?disabled=${this._bkBusy}
                      @click=${() => this._restoreServer(b.filename)}>
                      <ha-icon icon="mdi:backup-restore" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
                    </button>
                    <button class="bk-icon-btn" title="Herunterladen"
                      @click=${() => this._downloadServer(b.filename)}>
                      <ha-icon icon="mdi:download" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
                    </button>
                    <button class="bk-icon-btn danger" title="Löschen"
                      @click=${() => this._deleteServer(b.filename)}>
                      <ha-icon icon="mdi:delete-outline" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
                    </button>
                  </div>
                </div>`)}

            <button class="btn ${this._dbClearConfirm ? "btn-warn" : "btn-danger"}" style="width:100%;margin-top:4px;"
              ?disabled=${this._dbClearLoading}
              @click=${() => this._clearDb()}>
              <ha-icon icon="mdi:delete-sweep" style="width:16px;height:16px;--mdc-icon-size:16px;"></ha-icon>
              ${this._dbClearLoading ? "Leere…" : this._dbClearConfirm ? "Nochmal tippen!" : "Datenbank leeren"}
            </button>
            ${this._dbClearConfirm ? html`
              <div class="danger-box">Alle Produktdaten werden unwiderruflich gelöscht. Noch einmal tippen.</div>
            ` : ""}
          </div>
        `
      )}
    `;
  }

  // ── Tab: System ──────────────────────────────────────────
  _renderSystem() {
    const devVisible = this._devStatus?.show_dev_tools ?? false;

    return html`
      ${this._ccard("integration", "Integration", "Neu laden ohne HA-Neustart", true, html`
        <div class="row">
          <div class="row-info">
            <div class="row-label">Integration neu laden</div>
            <div class="row-desc">Kein HA-Neustart nötig</div>
          </div>
          <button class="btn btn-danger btn-sm"
            ?disabled=${this._restartLoading}
            @click=${() => this._restart()}>
            ${this._restartLoading?"…":this._restartDone?"✅ Fertig":"Neu laden"}
          </button>
        </div>
      `)}

      ${devVisible ? this._ccard("devtools", "🛠️ Entwicklerwerkzeuge", "Freigeschaltet", true, html`
        <div class="row">
          <div class="row-info">
            <div class="row-label">Status</div>
          </div>
          <div style="font-size:13px;color:#43a047;font-weight:700;">Aktiv</div>
        </div>
        <div class="row">
          <div class="row-info">
            <div class="row-label">QR-Codes neu generieren</div>
            <div class="row-desc">QR-Metadaten neu berechnen</div>
          </div>
          <button class="btn btn-outline btn-sm"
            ?disabled=${this._qrRegenLoading}
            @click=${() => this._regenerateAllQr()}>
            ${this._qrRegenLoading?"Läuft…":this._qrRegenDone?"✅ Fertig":"Generieren"}
          </button>
        </div>
        <div class="row">
          <div class="row-info">
            <div class="row-label">QR-System zurücksetzen</div>
            <div class="row-desc">⚠️ Labels müssen neu gedruckt werden</div>
          </div>
          <button class="btn btn-warn btn-sm"
            @click=${() => this._set("qr","eingerichtet",false)}>
            Zurücksetzen
          </button>
        </div>
        ${this._qrRegenError ? html`<div style="padding:0 18px 12px;"><div class="warn-box">${this._qrRegenError}</div></div>` : ""}
        ${this._devStatus?.last_qr_regeneration ? html`
          <div class="sub-row">
            <div class="row-info">
              <div class="row-label">Letzte QR-Regeneration</div>
              <div class="row-desc">${this._devStatus.last_qr_regeneration}</div>
            </div>
          </div>` : ""}

        <!-- Icons für Alles + Favoriten -->
        ${["Alles","Favoriten"].map(name => {
          const kat = this._getKats().find(k => k.name === name);
          if (!kat) return "";
          return html`
            <div class="row">
              <div class="row-info">
                <div class="row-label">${name} — Icons</div>
                <div class="row-desc">Aktiv / Inaktiv</div>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="kat-icon-btn" title="Aktiv"
                  @click=${() => { this._iconPickerIndex=null; this._iconPickerField="icon:"+name; this._iconPickerOpen=true; }}>
                  <ha-icon icon="${kat.icon||"m3rf:grid-view"}" style="width:20px;height:20px;color:#fff;"></ha-icon>
                </button>
                <button class="kat-icon-btn" title="Inaktiv" style="background:var(--secondary-background-color);border:1px solid var(--divider-color);"
                  @click=${() => { this._iconPickerIndex=null; this._iconPickerField="icon_inaktiv:"+name; this._iconPickerOpen=true; }}>
                  <ha-icon icon="${kat.icon_inaktiv||kat.icon||"m3rf:grid-view"}" style="width:20px;height:20px;color:var(--secondary-text-color);"></ha-icon>
                </button>
              </div>
            </div>`;
        })}
      `) : html`
        <div class="info-box">
          💡 Mehrfach auf die Versionsnummer oben rechts tippen, um Entwicklerwerkzeuge freizuschalten.
        </div>
      `}

      ${this._ccard("info", "Info", `v${VERSION}`, false, html`
        <div class="row">
          <div class="row-label">Version</div>
          <div class="version-badge" style="color:var(--secondary-text-color);font-size:14px;"
            @click=${this._handleVersionTap}>v${VERSION}</div>
        </div>
        <div class="row">
          <div class="row-label">Datenspeicher</div>
          <div style="color:var(--secondary-text-color);font-size:13px;font-family:monospace;">/config/inventar/</div>
        </div>
        ${this._versionTapCount>0 ? html`
          <div class="row">
            <div class="row-label">Entwickler-Taps</div>
            <div style="color:var(--secondary-text-color);font-size:14px;">${this._versionTapCount}/5</div>
          </div>` : ""}
      `)}
    `;
  }
}

customElements.define("inventar-panel", InventarPanel);
