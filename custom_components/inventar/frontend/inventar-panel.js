import { LitElement, html, css } from "https://unpkg.com/lit@2?module";
import { generateQrCode, QR_ICONS } from "/api/inventar_panel/inventar-qr.js";

const VERSION = "1.0.0";

class InventarMainPanel extends LitElement {
  static properties = {
    hass: {},
    _alleProdukte:          { state: true },
    _filtered:              { state: true },
    _query:                 { state: true },
    _kategorie:             { state: true },
    _kategorien:            { state: true },
    _loading:               { state: true },
    _detailOpen:            { state: true },
    _detailProdukt:         { state: true },
    _editMode:              { state: true },
    _editData:              { state: true },
    _qrOpen:                { state: true },
    _saveLoading:           { state: true },
    _copyDone:              { state: true },
    _neuOpen:               { state: true },
    _neuData:               { state: true },
    _neuLoading:            { state: true },
    _neuError:              { state: true },
    _bildUploading:         { state: true },
    _kategoriePickerOpen:   { state: true },
    _kategoriePickerTarget: { state: true },
    _visibleCount:          { state: true },
    _grouped:               { state: true },
    _qrData:                { state: true },
    _qrLoading:             { state: true },
    _scannerOpen:           { state: true },
    _scannerError:          { state: true },
    _scannerManual:         { state: true },
    _torchSupported:        { state: true },
    _torchOn:               { state: true },
    _zoomSupported:         { state: true },
    _zoomValue:             { state: true },
    _settings:              { state: true },
  };

  constructor() {
    super();
    this._alleProdukte          = [];
    this._filtered              = [];
    this._query                 = "";
    this._kategorie             = "Alles";
    this._kategorien            = [];
    this._loading               = true;
    this._detailOpen            = false;
    this._detailProdukt         = null;
    this._editMode              = false;
    this._editData              = {};
    this._qrOpen                = false;
    this._saveLoading           = false;
    this._copyDone              = false;
    this._neuOpen               = false;
    this._neuData               = {};
    this._neuLoading            = false;
    this._neuError              = "";
    this._bildUploading         = false;
    this._kategoriePickerOpen   = false;
    this._kategoriePickerTarget = null;
    this._visibleCount          = 50;
    this._grouped               = [];
    this._qrData                = null;
    this._qrLoading             = false;
    this._scannerOpen           = false;
    this._scannerError          = "";
    this._scannerManual         = false;
    this._scannerStream         = null;
    this._scannerInterval       = null;
    this._scannerTrack          = null;   // aktiver Video-Track (Torch/Zoom)
    this._torchSupported        = false;
    this._torchOn               = false;
    this._zoomSupported         = false;
    this._zoomValue             = 1;
    this._zoomMin               = 1;
    this._zoomMax               = 1;
    this._zoomStep              = 0.1;
    this._pinchStartDist        = 0;
    this._pinchStartZoom        = 1;
    this._settings              = {};
    this._bestandLocked         = false;
    this._bestandLockTimer      = null;
    this._hassReady             = false;
    this._reloadTimer           = null;
  }

  updated(changedProps) {
    if (changedProps.has("hass") && this.hass && !this._hassReady) {
      this._hassReady = true;
      this._initialLoad();
    }
    this.updateComplete.then(() => {
      const sheets = this.shadowRoot?.querySelectorAll(".sheet");
      if (sheets) sheets.forEach(s => {
        if (!s._swipeInit) {
          s._swipeInit = true;
          const closeAction = this._detailOpen ? () => this._closeDetail()
            : this._neuOpen ? () => this._closeNeu()
            : () => { this._kategoriePickerOpen = false; };
          this._swipeSetup(s, closeAction);
        }
      });
    });
  }

  async _initialLoad() {
    await Promise.all([this._loadSettings(), this._loadAlleProdukte()]);
    this._loading = false;
    this._subscribeTagEvents();
    this._checkUrlParam();
  }

  _checkUrlParam() {
    try {
      const params = new URLSearchParams(window.location.search);
      const key = params.get("key");
      if (!key) return;
      const tryOpen = () => {
        const produkt = this._alleProdukte.find(p => (p.key || p.id) === key);
        if (produkt) { if (navigator.vibrate) navigator.vibrate(30); this._openDetail(produkt); }
      };
      if (this._alleProdukte.length > 0) tryOpen();
      else setTimeout(tryOpen, 1000);
    } catch (e) { console.warn("[Inventar] URL-Parameter:", e); }
  }

  _subscribeTagEvents() {
    try {
      this.hass.connection.subscribeEvents((event) => {
        const tagId = event.data?.tag_id;
        if (!tagId) return;
        const produkt = this._alleProdukte.find(p => (p.key || p.id) === tagId);
        if (produkt) { if (navigator.vibrate) navigator.vibrate(30); this._openDetail(produkt); }
      }, "tag_scanned");
    } catch (e) { console.warn("[Inventar] Tag-Events:", e); }
  }

  async _loadSettings() {
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/settings/get" });
      this._settings = r ?? {};
      const kats = r?.kategorien ?? [];
      // Aktive Kategorien, "Alles" rausfiltern (kommt hardcoded), Favoriten zuerst
      const aktiveKats = kats.filter(k => k.aktiv !== false && k.name !== "Alles");
      const favoriten = aktiveKats.filter(k => k.type === "favoriten");
      const rest = aktiveKats.filter(k => k.type !== "favoriten");
      const alleIcon = r?.icons?.alles ?? kats.find(k => k.name === "Alles")?.icon ?? "m3rf:grid-view";
      const favIcon  = r?.icons?.favoriten ?? "m3rf:favorite";
      // Favoriten-Icon aus Settings übernehmen
      const favoritenMitIcon = favoriten.map(k => ({ ...k, icon: favIcon }));
      this._kategorien = [
        ...favoritenMitIcon,
        { name: "Alles", icon: alleIcon, type: "alles" },
        ...rest,
      ];
    } catch (e) { console.error("[Inventar] Settings:", e); }
  }

  async _loadAlleProdukte() {
    try {
      const r = await this.hass.connection.sendMessagePromise({ type: "inventar/produkte/alle" });
      this._alleProdukte = r?.produkte ?? [];
      this._applyFilter();
    } catch (e) { console.error("[Inventar] Produkte:", e); }
  }

  _scheduleReload(ms = 1500) {
    if (this._reloadTimer) clearTimeout(this._reloadTimer);
    this._reloadTimer = setTimeout(() => this._loadAlleProdukte(), ms);
  }

  _applyFilter() {
    let r = [...this._alleProdukte];
    if (this._kategorie !== "Alles") {
      if (this._kategorie === "Favoriten") r = r.filter(p => p.favorit);
      else r = r.filter(p => p.kategorie === this._kategorie);
    }
    if (this._query) {
      const q = this._query.toLowerCase();
      r = r.filter(p => [
        p.produktname, p.anzeige_name, p.artikelnummer, p.hersteller,
        p.kategorie, p.kurzbeschreibung, ...(p.suchbegriffe ?? []), ...(p.tags ?? []),
      ].join(" ").toLowerCase().includes(q));
    }
    r.sort((a, b) => {
      const ha = (a.hersteller || "").toLowerCase();
      const hb = (b.hersteller || "").toLowerCase();
      if (ha !== hb) return ha.localeCompare(hb);
      return (a.anzeige_name || a.produktname || "").localeCompare(b.anzeige_name || b.produktname || "");
    });
    this._filtered = r;
    this._visibleCount = Math.min(50, r.length);
  }

  _setKategorie(name) { this._kategorie = name; this._applyFilter(); }
  _setQuery(q) { this._query = q; this._applyFilter(); }

  _openDetail(p) {
    this._detailProdukt = { ...p };
    this._editData = { ...p };
    this._editMode = false;
    this._qrOpen = false;
    this._detailOpen = true;
  }

  _closeDetail() {
    this._detailOpen = false;
    this._editMode = false;
    this._qrOpen = false;
    setTimeout(() => { this._detailProdukt = null; }, 300);
  }

  _sc(p) {
    const b = p.bestand ?? 0, m = p.mindestmenge ?? 0;
    if (m === 0) return "#43a047";
    if (b < m) return "#e53935";
    if (b < m * 1.5) return "#fb8c00";
    return "#43a047";
  }

  _st(p) {
    const b = p.bestand ?? 0, m = p.mindestmenge ?? 0;
    if (m === 0) return "OK";
    if (b < m) return "Kritisch";
    if (b < m * 1.5) return "Knapp";
    return "OK";
  }

  async _changeBestand(delta) {
    const p = this._detailProdukt;
    if (!p) return;
    if (navigator.vibrate) navigator.vibrate(30);
    const key = p.key || p.id;
    const alt = p.bestand ?? 0;
    const neu = Math.max(0, alt + delta);
    this._bestandLocked = true;
    this._detailProdukt = { ...this._detailProdukt, bestand: neu };
    this._alleProdukte = this._alleProdukte.map(i => (i.key || i.id) === key ? { ...i, bestand: neu } : i);
    this._applyFilter();
    try {
      await this.hass.callService("inventar", "bestand_aendern", { key, delta });
    } catch (e) {
      console.error("[Inventar] Bestand:", e);
      this._detailProdukt = { ...this._detailProdukt, bestand: alt };
      this._alleProdukte = this._alleProdukte.map(i => (i.key || i.id) === key ? { ...i, bestand: alt } : i);
      this._applyFilter();
    }
    clearTimeout(this._bestandLockTimer);
    this._bestandLockTimer = setTimeout(() => { this._bestandLocked = false; }, 3000);
  }

  async _toggleFavorit() {
    const p = this._detailProdukt;
    if (!p) return;
    const key = p.key || p.id;
    const neuFavorit = !p.favorit;
    if (navigator.vibrate) navigator.vibrate(neuFavorit ? [20, 30, 20] : 20);
    this._detailProdukt = { ...this._detailProdukt, favorit: neuFavorit };
    this._alleProdukte = this._alleProdukte.map(i => (i.key || i.id) === key ? { ...i, favorit: neuFavorit } : i);
    this._applyFilter();
    try {
      await this.hass.callService("inventar", "produkt_aktualisieren", { key, favorit: neuFavorit });
    } catch (e) {
      console.error("[Inventar] Favorit:", e);
      this._detailProdukt = { ...this._detailProdukt, favorit: p.favorit };
      this._alleProdukte = this._alleProdukte.map(i => (i.key || i.id) === key ? { ...i, favorit: p.favorit } : i);
      this._applyFilter();
    }
  }

  _startEdit() { this._editData = { ...this._detailProdukt }; this._editMode = true; }
  _cancelEdit() { this._editMode = false; this._editData = { ...this._detailProdukt }; }

  async _loescheProdukt() {
    const p = this._detailProdukt;
    if (!p) return;
    const name = p.anzeige_name || p.produktname;
    if (!confirm(`"${name}" wirklich löschen?\nDiese Aktion kann nicht rückgängig gemacht werden.`)) return;
    try {
      await this.hass.callService("inventar", "produkt_loeschen", { key: p.key || p.id });
      this._alleProdukte = this._alleProdukte.filter(i => (i.key || i.id) !== (p.key || p.id));
      this._applyFilter();
      this._closeDetail();
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } catch(e) {
      console.error("[Inventar] Löschen:", e);
      alert("Fehler beim Löschen. Prüfe die HA Logs.");
    }
  }

  async _saveEdit() {
    this._saveLoading = true;
    try {
      const key = this._detailProdukt.key || this._detailProdukt.id;
      await this.hass.callService("inventar", "produkt_aktualisieren", { key, ...this._editData });
      this._detailProdukt = { ...this._editData };
      this._alleProdukte = this._alleProdukte.map(i => (i.key || i.id) === key ? { ...this._editData } : i);
      this._applyFilter();
      this._editMode = false;
    } catch (e) { console.error("[Inventar] Speichern:", e); }
    this._saveLoading = false;
  }

  _openNeu() { this._neuData = { einheit: "Stück", bestand: 0 }; this._neuError = ""; this._neuOpen = true; }
  _closeNeu() { this._neuOpen = false; this._neuError = ""; setTimeout(() => { this._neuData = {}; }, 300); }
  _neuField(f, v) { this._neuData = { ...this._neuData, [f]: v }; }

  async _saveNeu() {
    if (!this._neuData.produktname?.trim()) { this._neuError = "Produktname ist ein Pflichtfeld."; return; }
    this._neuLoading = true; this._neuError = "";
    try {
      await this.hass.callService("inventar", "produkt_anlegen", {
        ...this._neuData,
        bestand:      parseFloat(this._neuData.bestand)      || 0,
        mindestmenge: parseFloat(this._neuData.mindestmenge) || 0,
        preis:        parseFloat(this._neuData.preis)        || 0,
      });
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      this._closeNeu();
      this._scheduleReload(1200);
    } catch (e) { console.error("[Inventar] Anlegen:", e); this._neuError = "Fehler beim Anlegen."; }
    this._neuLoading = false;
  }

  _triggerBildUpload(key, onSuccess) {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/webp,image/*";
    inp.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      this._bildUploading = true;
      try {
        const dataUrl = await this._toWebp(file);
        const r = await this.hass.connection.sendMessagePromise({ type: "inventar/bild/upload", key, data: dataUrl });
        if (r?.url) { onSuccess(r.url); if (navigator.vibrate) navigator.vibrate([20, 30, 20]); }
      } catch (err) { console.error("[Inventar] Bild:", err); }
      this._bildUploading = false;
    };
    inp.click();
  }

  _toWebp(file) {
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        URL.revokeObjectURL(u); res(c.toDataURL("image/webp", 0.85));
      };
      img.onerror = rej; img.src = u;
    });
  }

  async _loescheBild(key) {
    try { await this.hass.connection.sendMessagePromise({ type: "inventar/bild/loeschen", key }); }
    catch (e) { console.error("[Inventar] Bild löschen:", e); }
  }

  // ── QR-Code ──────────────────────────────────────────────
  _qrText(p) {
    // Inhalt immer live berechnen — unveränderlich, für immer gültig
    const key = p.key || p.id;
    return `inventar:${key}`;
  }

  async _loadQr(p) {
    this._qrData = null;
    this._qrLoading = true;
    try {
      const design = this._settings?.qr?.design  ?? "standard";
      const iconId = this._settings?.qr?.icon_id ?? "package";
      const text   = this._qrText(p);
      this._qrData = await generateQrCode(text, { design, iconId, size: 600 });
    } catch (e) {
      console.error("[Inventar] QR generieren:", e);
      // Fallback auf externen Service
      const key  = p.key || p.id;
      const text = encodeURIComponent(`inventar:${key}`);
      this._qrData = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&margin=2&data=${text}`;
    }
    this._qrLoading = false;
  }

  _getHaUrl() {
    const manualUrl = this._settings?.app?.externe_url?.trim();
    if (manualUrl) return manualUrl.replace(/\/$/, "");
    return `${window.location.protocol}//${window.location.host}`;
  }

  async _copyLink(text) {
    try { await navigator.clipboard.writeText(text); this._copyDone = true; setTimeout(() => { this._copyDone = false; }, 2000); }
    catch (e) {}
  }

  async _downloadQr(productName) {
    if (!this._qrData) return;
    const filename = `qr_${(productName || "qrcode").toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;

    // DataURL/URL -> Blob (fuer Web Share & zuverlaessigen Download)
    let blob = null;
    try {
      const resp = await fetch(this._qrData);
      blob = await resp.blob();
    } catch (_) {}

    // 1) iOS/Android: Web Share API mit Datei (a.download wird in iOS Safari/
    //    WKWebView ignoriert) — bevorzugt, wenn Datei-Sharing unterstuetzt wird.
    if (blob && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
      } catch (e) {
        if (e?.name === "AbortError") return; // Nutzer hat abgebrochen
      }
    }

    // 2) Desktop/Android Chrome: klassischer Download ueber <a download>
    const href = blob ? URL.createObjectURL(blob) : this._qrData;
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (blob) setTimeout(() => URL.revokeObjectURL(href), 4000);

    // 3) iOS-Fallback ohne Web Share: Bild in neuem Tab oeffnen (lange
    //    gedrueckt halten -> "Bild sichern")
    if (blob && /iP(hone|ad|od)/.test(navigator.userAgent) && !navigator.canShare) {
      window.open(href, "_blank");
    }
  }

  // ── Scanner ──────────────────────────────────────────────
  async _openScanner() {
    this._scannerError = "";
    this._scannerOpen = true;
    await this.updateComplete;
    await this._startCamera();
  }

  async _startCamera() {
    const video = this.shadowRoot?.querySelector("#scanner-video");
    if (!video) return;
    try {
      this._scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      video.srcObject = this._scannerStream;
      video.style.opacity = "0";
      video.oncanplay = () => { video.style.transition = "opacity 0.3s"; video.style.opacity = "1"; };
      // iOS WKWebView braucht diese Attribute explizit fuer Inline-Wiedergabe
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.setAttribute("autoplay", "");
      await video.play();
      this._setupCameraControls();
      this._startScanning(video);
    } catch (e) {
      this._scannerError = "Kamerazugriff verweigert. Bitte Berechtigung erteilen.";
      console.error("[Inventar] Kamera:", e);
    }
  }

  // ── Torch (Blitz) & Zoom ────────────────────────────────
  _setupCameraControls() {
    const track = this._scannerStream?.getVideoTracks?.()[0];
    this._scannerTrack = track || null;
    this._torchSupported = false;
    this._torchOn = false;
    this._zoomSupported = false;
    if (!track || typeof track.getCapabilities !== "function") return;

    let caps = {};
    try { caps = track.getCapabilities() || {}; } catch (_) { caps = {}; }

    // Blitz wird in der Regel nur von Android-Chrome unterstuetzt (nicht iOS)
    if ("torch" in caps) this._torchSupported = true;

    // Hardware-Zoom (Android, teilw. iOS 16+ Safari)
    if (caps.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > (caps.zoom.min ?? 1)) {
      this._zoomSupported = true;
      this._zoomMin  = caps.zoom.min ?? 1;
      this._zoomMax  = caps.zoom.max;
      this._zoomStep = caps.zoom.step || 0.1;
      let cur = this._zoomMin;
      try { cur = track.getSettings?.().zoom ?? this._zoomMin; } catch (_) {}
      this._zoomValue = cur;
    }
  }

  async _toggleTorch() {
    if (!this._scannerTrack || !this._torchSupported) return;
    try {
      const next = !this._torchOn;
      await this._scannerTrack.applyConstraints({ advanced: [{ torch: next }] });
      this._torchOn = next;
    } catch (e) {
      console.warn("[Inventar] Torch:", e?.message || e);
      this._torchSupported = false;
    }
  }

  async _setZoom(value) {
    if (!this._scannerTrack || !this._zoomSupported) return;
    const v = Math.min(this._zoomMax, Math.max(this._zoomMin, Number(value) || this._zoomMin));
    try {
      await this._scannerTrack.applyConstraints({ advanced: [{ zoom: v }] });
      this._zoomValue = v;
    } catch (e) {
      console.warn("[Inventar] Zoom:", e?.message || e);
    }
  }

  _onZoomSlider(e) { this._setZoom(e.target.value); }

  // Pinch-to-Zoom auf dem Kamerabild
  _onScannerTouchStart(e) {
    if (!this._zoomSupported || e.touches?.length !== 2) return;
    this._pinchStartDist = this._touchDist(e.touches);
    this._pinchStartZoom = this._zoomValue;
  }

  _onScannerTouchMove(e) {
    if (!this._zoomSupported || e.touches?.length !== 2 || !this._pinchStartDist) return;
    e.preventDefault();
    const dist = this._touchDist(e.touches);
    const factor = dist / this._pinchStartDist;
    this._setZoom(this._pinchStartZoom * factor);
  }

  _touchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  async _startScanning(video) {
    if ("BarcodeDetector" in window) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        if (supported.includes("qr_code")) {
          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          this._scannerInterval = setInterval(async () => {
            try {
              if (video.readyState < 2 || !video.videoWidth) return;
              const codes = await detector.detect(video);
              if (codes.length > 0) this._processQrResult(codes[0].rawValue);
            } catch (_) {}
          }, 250);
          return;
        }
      } catch (e) { console.warn("[Inventar] BarcodeDetector:", e.message); }
    }
    this._loadAndStartJsQR(video);
  }

  async _loadAndStartJsQR(video) {
    if (typeof window.jsQR === "function") { this._startJsQRLoop(video, window.jsQR); return; }
    try {
      const r = await fetch("/api/inventar_panel/vendor/jsQR.min.js");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const code = await r.text();

      // Strategie 1: Blob-URL ES Module
      try {
        const blob = new Blob([
          "const module={exports:{}};const exports=module.exports;\n",
          code,
          "\nexport default module.exports.default||module.exports;"
        ], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        const mod = await import(blobUrl);
        URL.revokeObjectURL(blobUrl);
        if (typeof mod.default === "function") { this._startJsQRLoop(video, mod.default); return; }
      } catch (_) {}

      // Strategie 2: Inline Script-Tag (iOS WKWebView Fix)
      await new Promise((resolve) => {
        const s = document.createElement("script");
        s.textContent = code + "\n;window._jsQR=typeof jsQR!=='undefined'?jsQR:module&&module.exports;";
        document.head.appendChild(s);
        setTimeout(resolve, 100);
      });
      const fn = window._jsQR || window.jsQR;
      if (typeof fn === "function") { this._startJsQRLoop(video, fn); return; }
    } catch (e) { console.error("[Inventar] jsQR:", e); }
    this._scannerError = "QR-Scanner konnte nicht geladen werden.";
  }

  _startJsQRLoop(video, jsQR) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const scan = () => {
      if (!this._scannerOpen) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        try {
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
          if (code?.data) { this._processQrResult(code.data); return; }
        } catch (_) {}
      }
      if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(scan);
      else setTimeout(scan, 250);
    };
    if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(scan);
    else setTimeout(scan, 250);
  }

  _processQrResult(raw) {
    if (!raw) return;
    this._closeScanner();
    let key = null;
    if (raw.startsWith("inventar:"))               key = raw.slice(9).trim();
    else if (raw.includes("home-assistant.io/tag/")) key = raw.split("/tag/").pop().trim();
    else if (raw.includes("/inventar?key="))         key = new URL(raw).searchParams.get("key");
    else if (raw.startsWith("tag:"))                key = raw.slice(4).trim();
    if (!key) { console.warn("[Inventar] QR nicht erkannt:", raw); return; }
    const produkt = this._alleProdukte.find(p => (p.key || p.id) === key);
    if (produkt) { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); this._openDetail(produkt); }
    else console.warn("[Inventar] Produkt nicht gefunden:", key);
  }

  _closeScanner() {
    this._scannerOpen = false;
    this._scannerManual = false;
    clearInterval(this._scannerInterval);
    this._scannerInterval = null;
    // Torch ausschalten bevor der Track gestoppt wird
    if (this._scannerTrack && this._torchOn) {
      try { this._scannerTrack.applyConstraints({ advanced: [{ torch: false }] }); } catch (_) {}
    }
    if (this._scannerStream) { this._scannerStream.getTracks().forEach(t => t.stop()); this._scannerStream = null; }
    this._scannerTrack = null;
    this._torchOn = false;
    this._torchSupported = false;
    this._zoomSupported = false;
    this._zoomValue = 1;
    this._pinchStartDist = 0;
  }

  _openSidebar() {
    this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
  }

  _generateKey(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[äöüß]/g, c => ({ ä:"ae", ö:"oe", ü:"ue", ß:"ss" }[c]))
      .replace(/[\s\-\/\.]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  _feldSichtbar(key) {
    // Default true wenn nicht explizit deaktiviert
    return this._settings?.felder?.[key] !== false;
  }

  _swipeSetup(el, onClose) {
    if (!el) return;
    const handle = el.querySelector(".handle");
    if (!handle) return;
    let startY = 0, curY = 0, dragging = false;
    handle.addEventListener("touchstart", (e) => { startY = e.touches[0].clientY; dragging = true; el.style.transition = "none"; }, { passive: true });
    el.addEventListener("touchmove", (e) => { if (!dragging) return; curY = e.touches[0].clientY - startY; if (curY > 0) el.style.transform = `translateY(${curY}px)`; }, { passive: true });
    el.addEventListener("touchend", () => { if (!dragging) return; dragging = false; el.style.transition = ""; el.style.transform = ""; if (curY > 100) onClose(); curY = 0; });
  }

  static styles = css`
    :host { display:block;background:var(--primary-background-color);min-height:100vh;font-family:var(--paper-font-body1_-_font-family,sans-serif);--m3-space:8px;--m3-radius-large:28px;--m3-radius-medium:16px;--m3-radius-small:12px;--inv-fill:color-mix(in srgb,var(--primary-text-color) 6%,transparent);--inv-fill-2:color-mix(in srgb,var(--primary-text-color) 10%,transparent);--inv-active:color-mix(in srgb,var(--primary-text-color) 15%,transparent);--inv-line:var(--divider-color);--inv-surface:var(--card-background-color,var(--ha-card-background)); }
    .header { position:sticky;top:0;z-index:20;display:flex;align-items:center;padding:0 16px;height:64px;background:var(--app-header-background-color,var(--primary-background-color));border-bottom:1px solid var(--divider-color);box-shadow:0 1px 8px rgba(0,0,0,0.2); }
    .hamburger { background:none;border:none;cursor:pointer;padding:8px;border-radius:50%;color:var(--primary-text-color);display:flex;align-items:center;flex-shrink:0; }
    .hamburger svg { width:24px;height:24px;fill:currentColor; }
    .header-title { flex:1;text-align:center;font-size:18px;font-weight:700;color:var(--primary-text-color); }
    .header-right { display:flex;align-items:center;gap:6px;min-width:60px;justify-content:flex-end; }
    .header-version { font-size:12px;color:var(--secondary-text-color); }
    .content { padding:calc(var(--m3-space)*2) calc(var(--m3-space)*2) 100px; }
    .pills { display:flex;gap:var(--m3-space);overflow-x:auto;padding:calc(var(--m3-space)*0.5) 0 calc(var(--m3-space)*1.5);scrollbar-width:none; }
    .pills::-webkit-scrollbar { display:none; }
    .pill { flex-shrink:0;display:flex;align-items:center;gap:6px;height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--divider-color);cursor:pointer;font-size:14px;font-weight:500;background:var(--card-background-color,var(--ha-card-background));color:var(--secondary-text-color);transition:all 150ms ease; }
    .pill ha-icon { width:18px;height:18px;--mdc-icon-size:18px; }
    .pill.active { background:var(--primary-color);border-color:var(--primary-color);color:#fff;padding:0 16px 0 12px;font-weight:600;border-radius:16px; }
    .search-bar { display:flex;align-items:center;gap:10px;background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:var(--m3-radius-large);padding:12px 16px;margin-bottom:var(--m3-space); }
    .search-bar ha-icon { color:var(--secondary-text-color);width:20px;height:20px;flex-shrink:0; }
    .search-bar input { flex:1;background:none;border:none;outline:none;font-size:15px;color:var(--primary-text-color);font-family:inherit; }
    .search-bar input::placeholder { color:var(--secondary-text-color); }
    .search-clear { background:none;border:none;cursor:pointer;color:var(--secondary-text-color);display:flex;padding:2px; }
    .search-hint { font-size:12px;color:var(--secondary-text-color);padding:0 4px 10px; }
    .produkt-list { display:flex;flex-direction:column;gap:8px; }
    .produkt-card { display:flex;align-items:center;gap:12px;background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:20px;padding:12px 14px;cursor:pointer;transition:opacity 0.12s,transform 0.12s; }
    .produkt-card:active { opacity:0.7;transform:scale(0.985); }
    .produkt-img { width:48px;height:48px;border-radius:12px;object-fit:contain;flex-shrink:0;background:var(--inv-fill);padding:4px;box-sizing:border-box; }
    .produkt-ph { width:48px;height:48px;border-radius:12px;flex-shrink:0;background:var(--inv-fill);display:flex;align-items:center;justify-content:center; }
    .produkt-info { flex:1;min-width:0; }
    .produkt-name { font-size:15px;font-weight:600;color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .produkt-sub { font-size:12px;color:var(--secondary-text-color);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .status-dot { width:10px;height:10px;border-radius:50%;flex-shrink:0;box-shadow:0 0 8px currentColor;align-self:center; }
    .hersteller-header { font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--secondary-text-color);padding:calc(var(--m3-space)*2) 4px calc(var(--m3-space)*0.75); }
    .empty { text-align:center;padding:60px 24px;color:var(--secondary-text-color); }
    .empty-icon { font-size:52px;margin-bottom:12px; }
    .empty-title { font-size:16px;font-weight:600;color:var(--primary-text-color); }
    .empty-sub { font-size:13px;margin-top:6px; }
    .fab-row { position:fixed;bottom:24px;right:16px;display:flex;flex-direction:column;gap:10px;align-items:center;z-index:30;width:58px; }
    .fab-scan { width:46px;height:46px;border-radius:15px;background:var(--inv-surface);border:1.5px solid var(--inv-line);color:var(--primary-text-color);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.3);transition:transform 0.12s;padding:0; }
    .fab-scan:active { transform:scale(0.91); }
    .fab { width:58px;height:58px;border-radius:18px;background:var(--primary-color);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.35);transition:transform 0.12s; }
    .fab:active { transform:scale(0.91); }
    .backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:50;display:flex;align-items:flex-end;animation:fadeIn 0.2s ease; }
    @keyframes fadeIn { from{opacity:0}to{opacity:1} }
    .sheet { width:100%;max-height:92vh;background:var(--secondary-background-color,var(--primary-background-color));border-radius:var(--m3-radius-large) var(--m3-radius-large) 0 0;overflow-y:auto;padding-bottom:52px;animation:slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
    @keyframes slideUp { from{transform:translateY(100%)}to{transform:translateY(0)} }
    .handle { width:36px;height:4px;border-radius:2px;background:var(--inv-fill-2);margin:12px auto 0; }
    .sheet-hdr { display:flex;justify-content:flex-end;padding:8px 14px 4px; }
    .sheet-body { padding:4px 14px 0; }
    .icon-btn { width:42px;height:42px;border-radius:50%;border:1px solid var(--inv-line);background:var(--inv-surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--primary-text-color);transition:opacity 0.15s,transform 0.1s;padding:0;flex-shrink:0; }
    .icon-btn:active { opacity:0.7;transform:scale(0.93); }
    .fav-btn { transition:transform 0.15s!important; }
    .fav-btn:active { transform:scale(0.85)!important; }
    .fav-active { border-color:rgba(229,57,53,0.4)!important; }
    .card { background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:var(--m3-radius-large);margin-bottom:calc(var(--m3-space)*1.5); }
    .card-hero-inner { border-radius:26px;padding:22px 20px 20px;display:flex;flex-direction:column;align-items:center;text-align:center; }
    .card-p { padding:18px 18px 14px; }
    .card-psm { padding:14px; }
    .card-pf { padding:16px 18px; }
    .hero-img-wrap { position:relative;margin-bottom:14px;cursor:pointer; }
    .hero-img { width:110px;height:110px;border-radius:20px;object-fit:contain;background:var(--inv-fill);padding:8px;box-sizing:border-box;display:block; }
    .hero-ph { width:110px;height:110px;border-radius:20px;background:var(--inv-fill);display:flex;align-items:center;justify-content:center;margin-bottom:14px;cursor:pointer; }
    .hero-overlay { position:absolute;inset:0;border-radius:20px;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s; }
    .hero-img-wrap:hover .hero-overlay { opacity:1; }
    .hero-name { font-size:20px;font-weight:700;color:var(--primary-text-color);margin-top:10px;margin-bottom:8px;letter-spacing:-0.3px; }
    .hero-bestand { font-size:46px;font-weight:700;line-height:1.05;margin-bottom:6px; }
    .hero-einheit { font-size:20px;font-weight:400;opacity:0.55;margin-left:5px; }
    .hero-badge { display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:16px;margin-top:4px; }
    .badge-dot { width:7px;height:7px;border-radius:50%;display:inline-block; }
    .open-btn { padding:10px 28px;border-radius:999px;border:none;background:var(--inv-fill-2);color:var(--primary-text-color);font-size:14px;font-weight:500;cursor:pointer; }
    .open-btn:active { background:var(--inv-active); }
    .bild-row { display:flex;gap:8px;margin-top:8px;width:100%; }
    .bild-btn { flex:1;height:42px;border-radius:14px;border:none;background:var(--inv-fill-2);color:var(--primary-text-color);font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px; }
    .bild-btn:active { background:var(--inv-active); }
    .bild-btn.del { color:#e57373; }
    .f-lbl { font-size:11px;font-weight:600;letter-spacing:0.6px;color:var(--secondary-text-color);text-transform:uppercase;margin-bottom:4px; }
    .f-lbl.req::after { content:" *";color:#e53935; }
    .f-val { font-size:16px;font-weight:600;color:var(--primary-text-color); }
    .f-inp { width:100%;background:none;border:none;border-bottom:1.5px solid var(--inv-line);color:var(--primary-text-color);font-size:16px;font-weight:500;font-family:inherit;padding:3px 0 7px;outline:none;box-sizing:border-box;transition:border-color 0.15s; }
    .f-inp:focus { border-bottom-color:var(--primary-color); }
    .f-inp::placeholder { color:var(--secondary-text-color);opacity:0.6;font-weight:400; }
    .f-wrap { margin-bottom:16px; }
    .f-wrap:last-child { margin-bottom:0; }
    .f-empty { font-size:14px;color:var(--secondary-text-color);opacity:0.7;font-style:italic; }
    .btn-main-row { display:flex;gap:10px;margin-bottom:10px; }
    .btn-main { flex:1;height:58px;border-radius:var(--m3-radius-medium);border:1px solid var(--divider-color);background:var(--card-background-color,var(--ha-card-background));color:var(--primary-text-color);font-size:28px;font-weight:300;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.12s,transform 0.1s; }
    .btn-main:active { background:var(--inv-active);transform:scale(0.95); }
    .quick-row { display:flex;gap:7px; }
    .quick-btn { flex:1;height:48px;border-radius:var(--m3-radius-small);border:1px solid var(--divider-color);background:var(--card-background-color,var(--ha-card-background));color:var(--primary-text-color);font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.12s,transform 0.1s; }
    .quick-btn:active { background:var(--inv-active);transform:scale(0.94); }
    .tags-row { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px; }
    .tag-chip { padding:5px 13px;border-radius:999px;font-size:12px;background:var(--inv-fill-2);color:var(--secondary-text-color); }
    .act-row { display:flex;gap:10px; }
    .act-btn { flex:1;display:flex;align-items:center;padding:0 20px;height:52px;border-radius:26px;border:none;cursor:pointer;font-size:15px;font-weight:600;transition:opacity 0.15s,transform 0.1s; }
    .act-btn:active { transform:scale(0.97); }
    .act-btn:disabled { opacity:0.5;cursor:not-allowed; }
    .act-btn ha-icon { width:20px;height:20px;flex-shrink:0; }
    .act-btn-txt { flex:1;text-align:center;margin-right:20px; }
    .act-btn.pri { background:var(--primary-color);color:#fff; }
    .act-btn.sec { background:var(--card-background-color,var(--ha-card-background));border:1.5px solid var(--primary-color);color:var(--primary-color); }
    .act-btn.sec:active { background:var(--inv-active); }
    .bild-preview { width:100%;height:130px;border-radius:16px;background:var(--inv-fill);display:flex;align-items:center;justify-content:center;margin-bottom:8px;overflow:hidden;cursor:pointer;border:2px dashed var(--inv-line);transition:border-color 0.15s; }
    .bild-preview:hover { border-color:var(--primary-color); }
    .bild-preview img { width:100%;height:100%;object-fit:contain; }
    .bild-ph { display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--secondary-text-color);font-size:13px; }
    .neu-error { background:rgba(229,57,53,0.15);border-radius:12px;padding:12px 16px;margin-bottom:10px;font-size:13px;color:#e57373; }
    .kat-btn { width:100%;background:none;border:none;border-bottom:1.5px solid var(--inv-line);padding:4px 0 9px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-family:inherit;font-size:16px;font-weight:500; }
    .kat-btn:focus { border-bottom-color:var(--primary-color);outline:none; }
    .picker-sheet { width:100%;background:var(--secondary-background-color,var(--card-background-color));border-radius:28px 28px 0 0;max-height:70vh;overflow-y:auto;animation:slideUp 0.25s cubic-bezier(0.32,0.72,0,1);padding-bottom:32px; }
    .picker-hdr { display:flex;align-items:center;justify-content:space-between;padding:16px 18px 8px;border-bottom:1px solid var(--inv-line); }
    .picker-ttl { font-size:16px;font-weight:700;color:var(--primary-text-color); }
    .picker-opt { display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border:none;border-bottom:1px solid var(--inv-line);cursor:pointer;font-size:15px;color:var(--primary-text-color);background:none;width:100%;font-family:inherit;text-align:left;transition:background 0.1s; }
    .picker-opt:active { background:var(--inv-fill); }
    .picker-opt.sel { color:var(--primary-color);font-weight:600; }
    /* QR */
    .qr-hdr { display:flex;align-items:center;gap:12px;padding:16px 16px 0;flex-wrap:wrap; }
    .qr-ttl { font-size:17px;font-weight:700;color:var(--primary-text-color); }
    .qr-sub { font-size:13px;color:var(--secondary-text-color);margin-top:2px; }
    .qr-body { display:flex;flex-direction:column;align-items:center;padding:22px 16px 0; }
    .qr-img { width:240px;height:240px;border-radius:18px;background:#fff;padding:10px;box-sizing:border-box;image-rendering:pixelated; }
    .qr-link { display:flex;align-items:center;gap:10px;margin-top:16px;width:100%;background:var(--inv-fill);border-radius:16px;padding:13px 16px;box-sizing:border-box; }
    .qr-link-txt { flex:1;font-size:12px;color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .qr-copy { flex-shrink:0;background:none;border:none;cursor:pointer;display:flex;padding:4px;color:var(--primary-color); }
    .qr-done { color:#43a047!important; }
    .qr-design-badge { margin-left:auto;padding:4px 10px;border-radius:999px;background:var(--inv-fill-2);font-size:11px;font-weight:600;color:var(--secondary-text-color);white-space:nowrap; }
    /* Scanner */
    .scanner-backdrop { position:fixed;inset:0;background:#000;z-index:100;display:flex;flex-direction:column;animation:fadeIn 0.2s ease; }
    .scanner-header { display:flex;align-items:center;justify-content:space-between;padding:16px;background:rgba(0,0,0,0.7);position:absolute;top:0;left:0;right:0;z-index:10; }
    .scanner-title { font-size:17px;font-weight:700;color:#fff; }
    .scanner-close { width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,0.2);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;padding:0; }
    .scanner-video { width:100%;height:100%;object-fit:cover; }
    .scanner-loading { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#111;flex-direction:column;gap:12px; }
    .scanner-loading-text { color:rgba(255,255,255,0.4);font-size:13px; }
    .scanner-overlay { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none; }
    .scanner-frame { width:260px;height:260px;border-radius:20px;border:3px solid rgba(255,255,255,0.8);box-shadow:0 0 0 9999px rgba(0,0,0,0.5); }
    .scanner-hint { position:absolute;bottom:60px;left:0;right:0;text-align:center;color:rgba(255,255,255,0.8);font-size:14px;font-weight:500; }
    .scanner-controls { position:absolute;bottom:110px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:16px;z-index:11;padding:0 24px; }
    .scanner-zoom { display:flex;align-items:center;gap:12px;width:100%;max-width:340px;background:rgba(0,0,0,0.45);border-radius:24px;padding:10px 16px; }
    .scanner-zoom-slider { flex:1;-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,0.4);outline:none; }
    .scanner-zoom-slider::-webkit-slider-thumb { -webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.4); }
    .scanner-zoom-slider::-moz-range-thumb { width:22px;height:22px;border:none;border-radius:50%;background:#fff;cursor:pointer; }
    .scanner-ctrl { width:56px;height:56px;border-radius:50%;border:none;background:rgba(255,255,255,0.2);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;padding:0;transition:background 0.15s,color 0.15s; }
    .scanner-ctrl.active { background:#fff;color:#111; }
    .scanner-error { position:absolute;bottom:100px;left:24px;right:24px;background:rgba(229,57,53,0.9);border-radius:14px;padding:14px 18px;color:#fff;font-size:14px;text-align:center; }
  `;

  render() {
    return html`
      ${this._detailOpen && this._detailProdukt ? html`
        <div class="backdrop" @click=${(e) => e.target===e.currentTarget && this._closeDetail()}>
          ${this._qrOpen ? this._renderQR() : this._renderDetail()}
        </div>` : ""}
      ${this._neuOpen ? html`
        <div class="backdrop" @click=${(e) => e.target===e.currentTarget && this._closeNeu()}>
          ${this._renderNeu()}
        </div>` : ""}
      ${this._kategoriePickerOpen ? html`
        <div class="backdrop" @click=${(e) => e.target===e.currentTarget && (this._kategoriePickerOpen=false)}>
          ${this._renderPicker()}
        </div>` : ""}

      <div class="header">
        <button class="hamburger" @click=${this._openSidebar}>
          <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
        </button>
        <div class="header-title">${this._settings?.app?.name || "Inventar"}</div>
        <div class="header-right"><span class="header-version">v${VERSION}</span></div>
      </div>

      <div class="content">
        <div class="pills">
          ${this._kategorien.map(k => {
            const a = this._kategorie === k.name;
            const icon = a ? (k.icon ?? "m3rf:grid-view") : (k.icon_inaktiv ?? k.icon ?? "m3rf:grid-view");
            return html`<button class="pill ${a?"active":""}" @click=${()=>this._setKategorie(k.name)}>
              <ha-icon icon="${icon}"></ha-icon>${a ? html`<span>${k.name}</span>` : ""}
            </button>`;
          })}
        </div>

        <div class="search-bar">
          <ha-icon icon="mdi:magnify"></ha-icon>
          <input type="text" placeholder="Suchen..." .value=${this._query}
            @input=${e=>this._setQuery(e.target.value)} />
          ${this._query ? html`<button class="search-clear" @click=${()=>this._setQuery("")}>
            <ha-icon icon="mdi:close" style="width:18px;height:18px;"></ha-icon>
          </button>` : ""}
        </div>
        <div class="search-hint">${this._query ? `${this._filtered.length} Treffer` : `${this._filtered.length} Produkte`}</div>

        ${this._loading ? html`
          <div class="empty"><div class="empty-icon">⏳</div><div class="empty-title">Lade…</div></div>
        ` : this._filtered.length === 0 ? html`
          <div class="empty">
            <div class="empty-icon">📭</div>
            <div class="empty-title">Keine Produkte</div>
            <div class="empty-sub">${this._query ? `Kein Ergebnis für „${this._query}"` : "Noch keine Produkte angelegt"}</div>
          </div>
        ` : html`
          <div class="produkt-list"
            @scroll=${(e) => {
              const el = e.target;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 300 && this._visibleCount < this._filtered.length)
                this._visibleCount = Math.min(this._visibleCount + 30, this._filtered.length);
            }}
            style="max-height:calc(100vh - 220px);overflow-y:auto;padding-bottom:100px;">
            ${(() => {
              const visible = this._filtered.slice(0, this._visibleCount);
              let lastH = null;
              const items = [];
              visible.forEach(p => {
                const h = p.hersteller || "Ohne Hersteller";
                if (h !== lastH) { lastH = h; items.push(html`<div class="hersteller-header">${h}</div>`); }
                const sc = this._sc(p);
                items.push(html`
                  <div class="produkt-card" @click=${()=>this._openDetail(p)}>
                    ${p.bild
                      ? html`<img class="produkt-img" src="${p.bild}" alt="">`
                      : html`<div class="produkt-ph"><ha-icon icon="mdi:package-variant-closed" style="width:24px;height:24px;color:var(--secondary-text-color);"></ha-icon></div>`}
                    <div class="produkt-info">
                      <div class="produkt-name">${p.anzeige_name||p.produktname}</div>
                      <div class="produkt-sub">${p.artikelnummer?`Art.-Nr. ${p.artikelnummer}`:""}</div>
                    </div>
                    <div class="status-dot" style="background:${sc};color:${sc};"></div>
                    <ha-icon icon="mdi:chevron-right" style="width:20px;height:20px;color:var(--secondary-text-color);flex-shrink:0;align-self:center;"></ha-icon>
                  </div>`);
              });
              if (this._visibleCount < this._filtered.length) {
                items.push(html`<div style="text-align:center;padding:16px;color:var(--secondary-text-color);font-size:13px;">
                  ${this._filtered.length - this._visibleCount} weitere — scroll down
                </div>`);
              }
              return items;
            })()}
          </div>
        `}
      </div>

      ${this._scannerOpen ? html`
        <div class="scanner-backdrop"
          @touchstart=${(e)=>this._onScannerTouchStart(e)}
          @touchmove=${(e)=>this._onScannerTouchMove(e)}>
          <div class="scanner-header">
            <div class="scanner-title">QR-Code scannen</div>
            <button class="scanner-close" @click=${()=>this._closeScanner()}>
              <ha-icon icon="mdi:close" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
            </button>
          </div>
          <div class="scanner-loading" id="scanner-loading">
            <ha-icon icon="mdi:camera" style="width:48px;height:48px;color:rgba(255,255,255,0.4);--mdc-icon-size:48px;"></ha-icon>
            <span class="scanner-loading-text">Kamera startet…</span>
          </div>
          <video id="scanner-video" class="scanner-video" playsinline muted autoplay
            @canplay=${() => { const l = this.shadowRoot?.querySelector("#scanner-loading"); if(l) l.style.display="none"; }}>
          </video>
          <div class="scanner-overlay"><div class="scanner-frame"></div></div>

          ${(this._torchSupported || this._zoomSupported) ? html`
            <div class="scanner-controls">
              ${this._zoomSupported ? html`
                <div class="scanner-zoom">
                  <ha-icon icon="mdi:magnify-minus-outline" style="width:20px;height:20px;--mdc-icon-size:20px;color:#fff;"></ha-icon>
                  <input type="range" class="scanner-zoom-slider"
                    min="${this._zoomMin}" max="${this._zoomMax}" step="${this._zoomStep}"
                    .value="${String(this._zoomValue)}"
                    @input=${(e)=>this._onZoomSlider(e)}>
                  <ha-icon icon="mdi:magnify-plus-outline" style="width:20px;height:20px;--mdc-icon-size:20px;color:#fff;"></ha-icon>
                </div>` : ""}
              ${this._torchSupported ? html`
                <button class="scanner-ctrl ${this._torchOn ? "active" : ""}" @click=${()=>this._toggleTorch()} title="Blitz">
                  <ha-icon icon="${this._torchOn ? 'mdi:flashlight' : 'mdi:flashlight-off'}" style="width:24px;height:24px;--mdc-icon-size:24px;"></ha-icon>
                </button>` : ""}
            </div>` : ""}

          ${this._scannerError
            ? html`<div class="scanner-error">${this._scannerError}</div>`
            : html`<div class="scanner-hint">QR-Code in den Rahmen halten</div>`}
        </div>
      ` : ""}

      <div class="fab-row">
        <button class="fab-scan" @click=${()=>this._openScanner()} title="QR scannen">
          <ha-icon icon="mdi:qrcode-scan" style="width:22px;height:22px;--mdc-icon-size:22px;"></ha-icon>
        </button>
        <button class="fab" @click=${()=>this._openNeu()}>
          <ha-icon icon="mdi:plus" style="width:28px;height:28px;"></ha-icon>
        </button>
      </div>
    `;
  }

  _renderPicker() {
    const t = this._kategoriePickerTarget;
    const cur = t==="neu" ? this._neuData.kategorie : this._editData.kategorie;
    const opts = this._kategorien.filter(k=>k.type!=="favoriten"&&k.name!=="Alles").map(k=>k.name);
    const sel = (v) => {
      if(t==="neu") this._neuData={...this._neuData,kategorie:v};
      else this._editData={...this._editData,kategorie:v};
      this._kategoriePickerOpen=false;
    };
    return html`<div class="picker-sheet">
      <div class="handle"></div>
      <div class="picker-hdr">
        <div class="picker-ttl">Kategorie wählen</div>
        <button class="icon-btn" @click=${()=>{this._kategoriePickerOpen=false;}}>
          <ha-icon icon="mdi:close" style="width:18px;height:18px;--mdc-icon-size:18px;"></ha-icon>
        </button>
      </div>
      <button class="picker-opt ${!cur?"sel":""}" @click=${()=>sel("")}>
        <span>— Keine Kategorie —</span>
        ${!cur?html`<ha-icon icon="mdi:check" style="width:18px;height:18px;color:var(--primary-color);"></ha-icon>`:""}
      </button>
      ${opts.map(k=>html`
        <button class="picker-opt ${cur===k?"sel":""}" @click=${()=>sel(k)}>
          <span>${k}</span>
          ${cur===k?html`<ha-icon icon="mdi:check" style="width:18px;height:18px;color:var(--primary-color);"></ha-icon>`:""}
        </button>`)}
    </div>`;
  }

  _renderNeu() {
    const d = this._neuData;
    const tmpKey = this._generateKey(d.produktname || "neu") || "neu";
    return html`<div class="sheet">
      <div class="handle"></div>
      <div class="sheet-hdr">
        <button class="icon-btn" @click=${this._closeNeu}>
          <ha-icon icon="mdi:close" style="width:18px;height:18px;--mdc-icon-size:18px;"></ha-icon>
        </button>
      </div>
      <div class="sheet-body">
        <div class="card card-p">
          <div style="font-size:20px;font-weight:700;color:var(--primary-text-color);margin-bottom:4px;">Produkt anlegen</div>
          <div style="font-size:13px;color:var(--secondary-text-color);">* = Pflichtfeld</div>
          ${d.produktname ? html`<div style="margin-top:10px;padding:8px 12px;background:var(--inv-fill);border-radius:10px;border:1px solid var(--inv-line);">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.6px;color:var(--secondary-text-color);text-transform:uppercase;">Key (auto)</span><br>
            <span style="font-size:14px;font-family:monospace;color:var(--primary-color);">${this._generateKey(d.produktname)}</span>
          </div>` : ""}
        </div>
        ${this._neuError?html`<div class="neu-error">${this._neuError}</div>`:""}

        <div class="card card-p">
          <div class="f-lbl">Produktbild</div>
          <div class="bild-preview" @click=${()=>this._triggerBildUpload(tmpKey,url=>{this._neuData={...this._neuData,bild:url};})}>
            ${d.bild?html`<img src="${d.bild}" alt="">`:html`<div class="bild-ph">
              <ha-icon icon="${this._bildUploading?"mdi:loading":"mdi:image-plus"}" style="width:32px;height:32px;"></ha-icon>
              <span>${this._bildUploading?"Hochladen…":"Tippen zum Hochladen"}</span>
            </div>`}
          </div>
          ${d.bild?html`<button class="bild-btn del" style="width:100%;margin-top:4px;"
            @click=${()=>{this._neuData={...this._neuData,bild:""};}}><ha-icon icon="mdi:delete" style="width:16px;height:16px;"></ha-icon> Entfernen</button>`:""}
        </div>

        <div class="card card-p">
          ${[["produktname","Produktname","z. B. Wago Klemme",true],["anzeige_name","Anzeige-Name","Kurzname",false],["artikelnummer","Artikelnummer","z. B. 221-413",false],["hersteller","Hersteller","z. B. Wago",false]].map(([f,l,ph,r])=>html`
            <div class="f-wrap"><div class="f-lbl ${r?"req":""}">${l}</div>
              <input class="f-inp" placeholder="${ph}" .value=${d[f]??""} @input=${e=>this._neuField(f,e.target.value)} />
            </div>`)}
        </div>

        <div class="card card-p">
          ${[["bestand","Bestand","0","number"],["einheit","Einheit","Stück","text"],["mindestmenge","Mindestmenge","0","number"],["preis","Preis (€)","0.00","number"]].map(([f,l,ph,t])=>html`
            <div class="f-wrap"><div class="f-lbl">${l}</div>
              <input class="f-inp" type="${t}" placeholder="${ph}" .value=${d[f]??""} @input=${e=>this._neuField(f,e.target.value)} />
            </div>`)}
        </div>

        <div class="card card-p">
          <div class="f-wrap">
            <div class="f-lbl">Kategorie</div>
            <button class="kat-btn" @click=${()=>{this._kategoriePickerTarget="neu";this._kategoriePickerOpen=true;}}>
              <span style="color:${d.kategorie?"var(--primary-text-color)":"var(--secondary-text-color)"}">${d.kategorie||"— Keine Kategorie —"}</span>
              <ha-icon icon="mdi:chevron-right" style="width:18px;height:18px;color:var(--secondary-text-color);"></ha-icon>
            </button>
          </div>
          ${[["lagerort","Lagerort","z. B. Regal A3"],["notiz","Notiz","Freie Notiz…"]].map(([f,l,ph])=>html`
            <div class="f-wrap"><div class="f-lbl">${l}</div>
              <input class="f-inp" placeholder="${ph}" .value=${d[f]??""} @input=${e=>this._neuField(f,e.target.value)} />
            </div>`)}
        </div>

        <div class="act-row">
          <button class="act-btn pri" ?disabled=${this._neuLoading} @click=${()=>this._saveNeu()}>
            <ha-icon icon="mdi:check" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
            <span class="act-btn-txt">${this._neuLoading?"Anlegen…":"Anlegen"}</span>
          </button>
          <button class="act-btn sec" @click=${()=>this._closeNeu()}>
            <ha-icon icon="mdi:close" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
            <span class="act-btn-txt">Abbrechen</span>
          </button>
        </div>
      </div>
    </div>`;
  }

  _renderDetail() {
    const p=this._detailProdukt, sc=this._sc(p), st=this._st(p);
    const einheit=p.einheit||"Stück", ed=this._editData, key=p.key||p.id;
    const bildUrl=this._editMode?(ed.bild||""):(p.bild||"");
    const yamlBtns=p.buttons?Object.entries(p.buttons).filter(([k])=>k.endsWith("_label")).map(([k,l])=>({label:l,value:p.buttons[k.replace("_label","_value")]??1})).filter(b=>Math.abs(b.value)!==1):[];
    const qBtns=yamlBtns.length>0?yamlBtns:[{label:"−25",value:-25},{label:"−10",value:-10},{label:"+10",value:10},{label:"+25",value:25}];
    const alleEditF=[["Produktname","produktname"],["Anzeige-Name","anzeige_name"],["Typ","typ"],["Serie","serie"],["Hersteller","hersteller"],["Artikelnummer","artikelnummer"],["Mindestmenge","mindestmenge"],["Mindestbestellmenge","mindestbestellmenge"],["Preis (€)","preis"],["Einheit","einheit"],["Produktlink","produktlink"]];
    const editF=alleEditF.filter(([,f])=>this._feldSichtbar(f));

    return html`<div class="sheet">
      <div class="handle"></div>
      <div class="sheet-hdr" style="justify-content:space-between;">
        <button class="icon-btn fav-btn ${p.favorit?"fav-active":""}" @click=${()=>this._toggleFavorit()}>
          <ha-icon icon="${p.favorit?"mdi:heart":"mdi:heart-outline"}"
            style="width:20px;height:20px;--mdc-icon-size:20px;color:${p.favorit?"#e53935":"var(--secondary-text-color)"};"></ha-icon>
        </button>
        <button class="icon-btn" @click=${this._closeDetail}>
          <ha-icon icon="mdi:close" style="width:18px;height:18px;--mdc-icon-size:18px;"></ha-icon>
        </button>
      </div>
      <div class="sheet-body">
        <div class="card card-hero-inner">
          ${this._editMode ? html`
            <div class="hero-img-wrap" @click=${()=>this._triggerBildUpload(key,url=>{this._editData={...this._editData,bild:url};this._detailProdukt={...this._detailProdukt,bild:url};})}>
              ${bildUrl
                ? html`<img class="hero-img" src="${bildUrl}" alt=""><div class="hero-overlay"><ha-icon icon="mdi:camera" style="width:28px;height:28px;color:#fff;"></ha-icon></div>`
                : html`<div class="hero-ph" style="margin-bottom:0;"><ha-icon icon="mdi:image-plus" style="width:40px;height:40px;color:var(--secondary-text-color);"></ha-icon><div class="hero-overlay"><ha-icon icon="mdi:camera" style="width:28px;height:28px;color:#fff;"></ha-icon></div></div>`}
            </div>
          ` : bildUrl
            ? html`<img class="hero-img" src="${bildUrl}" alt="">`
            : html`<div class="hero-ph"><ha-icon icon="mdi:package-variant-closed" style="width:46px;height:46px;color:var(--secondary-text-color);"></ha-icon></div>`}

          <div class="hero-name">${p.anzeige_name||p.produktname}</div>
          <div class="hero-bestand" style="color:${sc};">${p.bestand??0}<span class="hero-einheit">${einheit}</span></div>
          <div class="hero-badge" style="background:${sc}20;color:${sc};">
            <span class="badge-dot" style="background:${sc};"></span>
            ${st}${p.mindestmenge>0?` · Min. ${p.mindestmenge} ${einheit}`:""}
          </div>
          ${!this._editMode?html`<button class="open-btn">Produkt öffnen</button>`:""}
        </div>

        ${!this._editMode&&((p.artikelnummer&&this._feldSichtbar("artikelnummer"))||(p.mindestmenge>0&&this._feldSichtbar("mindestmenge")))?html`<div class="card card-p">
          ${p.artikelnummer&&this._feldSichtbar("artikelnummer")?html`<div class="f-wrap"><div class="f-lbl">Artikelnummer</div><div class="f-val">${p.artikelnummer}</div></div>`:""}
          ${p.mindestmenge>0&&this._feldSichtbar("mindestmenge")?html`<div class="f-wrap"><div class="f-lbl">Mindestbestand</div><div class="f-val">${p.mindestmenge} ${einheit}</div></div>`:""}
        </div>`:""}

        <div class="card card-psm">
          <div class="btn-main-row">
            <button class="btn-main" @click=${()=>this._changeBestand(-1)}>−</button>
            <button class="btn-main" @click=${()=>this._changeBestand(1)}>+</button>
          </div>
          <div class="quick-row">${qBtns.map(b=>html`<button class="quick-btn" @click=${()=>this._changeBestand(b.value)}>${b.label}</button>`)}</div>
        </div>

        ${this._feldSichtbar("lagerort")?html`<div class="card card-pf">
          <div class="f-lbl">Lagerort</div>
          ${this._editMode
            ? html`<input class="f-inp" .value=${ed.lagerort??""} placeholder="z. B. Regal A3" @input=${e=>{this._editData={...this._editData,lagerort:e.target.value};}}>`
            : p.lagerort?html`<div class="f-val">${p.lagerort}</div>`:html`<div class="f-empty">Nicht angegeben</div>`}
        </div>`:""}

        ${this._feldSichtbar("notiz")?html`<div class="card card-pf">
          <div class="f-lbl">Notiz</div>
          ${this._editMode
            ? html`<input class="f-inp" .value=${ed.notiz??""} placeholder="Freie Notiz…" @input=${e=>{this._editData={...this._editData,notiz:e.target.value};}}>`
            : p.notiz?html`<div class="f-val">${p.notiz}</div>`:html`<div class="f-empty">Keine Notiz</div>`}
        </div>`:""}

        ${this._editMode?html`<div class="card card-p">
          ${bildUrl?html`<div class="f-wrap">
            <div class="f-lbl">Produktbild</div>
            <div class="bild-row">
              <button class="bild-btn" @click=${()=>this._triggerBildUpload(key,url=>{this._editData={...this._editData,bild:url};this._detailProdukt={...this._detailProdukt,bild:url};})}>
                <ha-icon icon="mdi:image-edit" style="width:16px;height:16px;"></ha-icon> Bild ändern
              </button>
              <button class="bild-btn del" @click=${async()=>{await this._loescheBild(key);this._editData={...this._editData,bild:""};this._detailProdukt={...this._detailProdukt,bild:""};}}>
                <ha-icon icon="mdi:delete" style="width:16px;height:16px;"></ha-icon> Löschen
              </button>
            </div>
          </div>`:html`<div class="f-wrap">
            <div class="f-lbl">Produktbild</div>
            <button class="bild-btn" style="width:100%;" @click=${()=>this._triggerBildUpload(key,url=>{this._editData={...this._editData,bild:url};this._detailProdukt={...this._detailProdukt,bild:url};})}>
              <ha-icon icon="mdi:image-plus" style="width:16px;height:16px;"></ha-icon> Bild hochladen
            </button>
          </div>`}
          <div class="f-wrap">
            <div class="f-lbl">Kategorie</div>
            <button class="kat-btn" @click=${()=>{this._kategoriePickerTarget="edit";this._kategoriePickerOpen=true;}}>
              <span style="color:${ed.kategorie?"var(--primary-text-color)":"var(--secondary-text-color)"}">${ed.kategorie||"— Keine Kategorie —"}</span>
              <ha-icon icon="mdi:chevron-right" style="width:18px;height:18px;color:var(--secondary-text-color);"></ha-icon>
            </button>
          </div>
          ${editF.map(([l,f])=>html`<div class="f-wrap"><div class="f-lbl">${l}</div>
            <input class="f-inp" .value=${ed[f]??""} placeholder="—" @input=${e=>{this._editData={...this._editData,[f]:e.target.value};}}>
          </div>`)}
        </div>`:""}

        ${p.tags?.length?html`<div class="tags-row">${p.tags.map(t=>html`<span class="tag-chip">${t}</span>`)}</div>`:""}

        ${this._editMode ? html`
          <button style="width:100%;height:50px;border-radius:16px;border:1.5px solid rgba(229,57,53,0.3);background:rgba(229,57,53,0.1);color:#e57373;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;font-family:inherit;"
            @click=${()=>this._loescheProdukt()}>
            <ha-icon icon="mdi:delete-outline" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
            Produkt löschen
          </button>` : ""}

        <div class="act-row">
          ${this._editMode?html`
            <button class="act-btn pri" ?disabled=${this._saveLoading} @click=${()=>this._saveEdit()}>
              <ha-icon icon="mdi:check" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
              <span class="act-btn-txt">${this._saveLoading?"Speichere…":"Speichern"}</span>
            </button>
            <button class="act-btn sec" @click=${()=>this._cancelEdit()}>
              <ha-icon icon="mdi:close" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
              <span class="act-btn-txt">Abbrechen</span>
            </button>
          `:html`
            <button class="act-btn pri" @click=${()=>this._startEdit()}>
              <ha-icon icon="mdi:pencil" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
              <span class="act-btn-txt">Bearbeiten</span>
            </button>
            <button class="act-btn sec" @click=${()=>{this._qrOpen=true;this._loadQr(p);}}>
              <ha-icon icon="mdi:qrcode" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
              <span class="act-btn-txt">QR-Code</span>
            </button>`}
        </div>
      </div>
    </div>`;
  }

  _renderQR() {
    const p       = this._detailProdukt;
    const qrText  = this._qrText(p);
    const design  = this._settings?.qr?.design  ?? "standard";
    const iconId  = this._settings?.qr?.icon_id ?? "package";
    const iconDef = QR_ICONS.find(i => i.id === iconId);
    const name    = p.anzeige_name || p.produktname;

    return html`<div class="sheet">
      <div class="handle"></div>
      <div class="qr-hdr">
        <button class="icon-btn" @click=${()=>{this._qrOpen=false;}}>
          <ha-icon icon="mdi:arrow-left" style="width:18px;height:18px;--mdc-icon-size:18px;"></ha-icon>
        </button>
        <div>
          <div class="qr-ttl">QR-Code</div>
          <div class="qr-sub">${name}</div>
        </div>
        <div class="qr-design-badge">
          ${design === "modern" ? `Modern · ${iconDef?.label ?? ""}` : "Standard"}
        </div>
      </div>

      <div class="qr-body">
        ${this._qrLoading ? html`
          <div class="qr-img" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
            <ha-icon icon="mdi:qrcode" style="width:48px;height:48px;color:rgba(0,0,0,0.15);"></ha-icon>
            <span style="font-size:12px;color:#999;">Generiere…</span>
          </div>
        ` : this._qrData ? html`
          <img class="qr-img" src="${this._qrData}" alt="QR-Code">
        ` : html`
          <div class="qr-img" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
            <ha-icon icon="mdi:qrcode-remove" style="width:40px;height:40px;color:#999;"></ha-icon>
            <span style="font-size:12px;color:#999;">Fehler</span>
          </div>
        `}

        <div class="qr-link">
          <span class="qr-link-txt">${qrText}</span>
          <button class="qr-copy ${this._copyDone?"qr-done":""}"
            @click=${()=>this._copyLink(qrText)}>
            <ha-icon icon="${this._copyDone?"mdi:check":"mdi:content-copy"}" style="width:20px;height:20px;"></ha-icon>
          </button>
        </div>

        ${this._qrData ? html`
          <button class="act-btn pri" style="margin-top:12px;width:100%;"
            @click=${()=>this._downloadQr(name)}>
            <ha-icon icon="mdi:download" style="width:20px;height:20px;--mdc-icon-size:20px;"></ha-icon>
            <span class="act-btn-txt">Als PNG herunterladen</span>
          </button>
        ` : ""}
      </div>
    </div>`;
  }
}

customElements.define("inventar-main-panel", InventarMainPanel);
