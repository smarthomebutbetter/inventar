/**
 * inventar-qr.js
 * QR-Code Generator für Inventar — Standard & Modern Design
 * Nutzt qrcode-generator (MIT) von cdnjs
 * Kein externer Service, läuft komplett lokal im Browser
 */

// ── Icon-Optionen für Modern-Design ──────────────────────
export const QR_ICONS = [
  { id: "package", label: "Paket",    icon: "mdi:package-variant-closed", path: "M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A1 1 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9M12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15M5 15.91l6 3.38v-6.71L5 9.21v6.7m14 0v-6.7l-6 3.37v6.71l6-3.38z" },
  { id: "bolt",    label: "Blitz",    icon: "mdi:lightning-bolt",          path: "M11 21H5L9 9H3L13 3H17l-4 7h6l-8 11z" },
  { id: "wrench",  label: "Werkzeug", icon: "mdi:wrench",                  path: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" },
  { id: "label",   label: "Label",    icon: "mdi:label-outline",           path: "M5.5 7A1.5 1.5 0 0 1 4 5.5 1.5 1.5 0 0 1 5.5 4 1.5 1.5 0 0 1 7 5.5 1.5 1.5 0 0 1 5.5 7M21.41 11.58L12.41 2.58A2 2 0 0 0 11 2H4A2 2 0 0 0 2 4V11A2 2 0 0 0 2.59 12.42L11.59 21.42A2 2 0 0 0 13 22A2 2 0 0 0 14.41 21.41L21.41 14.41A2 2 0 0 0 22 13A2 2 0 0 0 21.41 11.58M13 20L4 11V4H11L20 13Z" },
  { id: "home",    label: "Haus",     icon: "mdi:home-outline",            path: "M12 5.69L17 10.19V18H15V12H9V18H7V10.19L12 5.69M12 3L2 12H5V20H11V14H13V20H19V12H22L12 3Z" },
];

// ── QR-Lib laden ─────────────────────────────────────────
let _qrLib = null;

async function _loadQrLib() {
  if (_qrLib) return _qrLib;

  return new Promise((resolve, reject) => {
    if (typeof window.qrcode !== "undefined") {
      _qrLib = window.qrcode;
      return resolve(_qrLib);
    }

    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.onload = () => {
      _qrLib = window.qrcode;
      resolve(_qrLib);
    };
    s.onerror = () => reject(new Error("qrcode-generator konnte nicht geladen werden"));
    document.head.appendChild(s);
  });
}

// ── Haupt-Generator ──────────────────────────────────────
/**
 * Generiert einen QR-Code als DataURL (PNG)
 * @param {string} text     - QR-Inhalt (z.B. "inventar:mein-produkt")
 * @param {object} options  - { design: "standard"|"modern", iconId: string, size: number }
 * @returns {Promise<string>} DataURL
 */
export async function generateQrCode(text, options = {}) {
  const { design = "standard", iconId = "package", size = 600 } = options;

  await _loadQrLib();

  // Modern braucht ZWINGEND "H" (30% Redundanz) weil der Icon-Bereich
  // Module ausblendet die durch Error Correction wiederhergestellt werden müssen.
  // iOS BarcodeDetector ist strenger als Android — ohne H schlägt die Erkennung fehl.
  const ecLevel = design === "modern" ? "H" : "L";
  const qr = _qrLib(0, ecLevel);
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (design === "modern") {
    await _drawModern(ctx, qr, moduleCount, size, iconId);
  } else {
    _drawStandard(ctx, qr, moduleCount, size);
  }

  return canvas.toDataURL("image/png");
}

// ── Standard Design ──────────────────────────────────────
function _drawStandard(ctx, qr, moduleCount, size) {
  const margin  = Math.floor(size * 0.04);
  const inner   = size - 2 * margin;
  const cellSize = inner / moduleCount;

  // Hintergrund weiß
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Module zeichnen
  ctx.fillStyle = "#000000";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = margin + col * cellSize;
        const y = margin + row * cellSize;
        ctx.fillRect(
          Math.floor(x),
          Math.floor(y),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }
  }
}

// ── Modern Design ────────────────────────────────────────
async function _drawModern(ctx, qr, moduleCount, size, iconId) {
  const margin    = Math.floor(size * 0.04);
  const inner     = size - 2 * margin;
  const cellSize  = inner / moduleCount;
  const radius    = cellSize * 0.35; // Rundungsradius für normale Module
  const finderR   = cellSize * 0.4;  // Mehr Rundung für Finder-Patterns

  // Hintergrund weiß
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Finder-Pattern Positionen (7×7 Module, oben-links, oben-rechts, unten-links)
  const finderPositions = [
    { row: 0, col: 0 },
    { row: 0, col: moduleCount - 7 },
    { row: moduleCount - 7, col: 0 },
  ];

  const isFinderZone = (row, col) => {
    return finderPositions.some(fp =>
      row >= fp.row && row < fp.row + 7 &&
      col >= fp.col && col < fp.col + 7
    );
  };

  // Icon-Zone: exakt 3×3 Module in der Mitte freihalten
  // Mit H-Error-Correction können max. 30% der Module fehlen — 3×3 ist sicher
  const center    = Math.floor(moduleCount / 2);
  const iconZoneR = 1; // 1 Modul Radius = 3×3 Zone

  const isIconZone = (row, col) => {
    return Math.abs(row - center) <= iconZoneR && Math.abs(col - center) <= iconZoneR;
  };

  // Für die Zeichnung: Icon-Größe und Position basierend auf den freigeh. Modulen
  const iconModules = iconZoneR * 2 + 1; // = 3
  const iconSize    = iconModules * cellSize;
  const iconX       = margin + (center - iconZoneR) * cellSize;
  const iconY       = margin + (center - iconZoneR) * cellSize;

  ctx.fillStyle = "#000000";

  // ── Normale Module (abgerundet) ──
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!qr.isDark(row, col)) continue;
      if (isFinderZone(row, col)) continue;
      if (isIconZone(row, col)) continue;

      const x = margin + col * cellSize;
      const y = margin + row * cellSize;
      _roundRect(ctx, x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, radius);
    }
  }

  // ── Finder-Patterns (abgerundet, als Ganzes) ──
  for (const fp of finderPositions) {
    const x = margin + fp.col * cellSize;
    const y = margin + fp.row * cellSize;
    const w = 7 * cellSize;

    // Äußerer Rahmen
    ctx.fillStyle = "#000000";
    _roundRect(ctx, x + 0.5, y + 0.5, w - 1, w - 1, finderR * 2);

    // Weißes Inneres
    ctx.fillStyle = "#ffffff";
    _roundRect(ctx, x + cellSize + 0.5, y + cellSize + 0.5, 5 * cellSize - 1, 5 * cellSize - 1, finderR);

    // Schwarzes Zentrum
    ctx.fillStyle = "#000000";
    _roundRect(ctx, x + 2 * cellSize + 0.5, y + 2 * cellSize + 0.5, 3 * cellSize - 1, 3 * cellSize - 1, finderR);
  }

  // ── Icon in der Mitte ──
  const iconDef = QR_ICONS.find(i => i.id === iconId) ?? QR_ICONS[0];

  // Schwarzes Hintergrund-Quadrat — exakt über den freigeh. Modulen
  const bgPad = cellSize * 0.3;
  ctx.fillStyle = "#000000";
  _roundRect(ctx, iconX - bgPad, iconY - bgPad, iconSize + bgPad * 2, iconSize + bgPad * 2, cellSize * 0.5);

  // Icon weiß auf schwarzem Hintergrund
  await _drawSvgIcon(ctx, iconDef.path, iconX, iconY, iconSize, "#ffffff");
}

// ── Hilfsfunktion: abgerundetes Rechteck ─────────────────
function _roundRect(ctx, x, y, w, h, r) {
  const clampedR = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + clampedR, y);
  ctx.lineTo(x + w - clampedR, y);
  ctx.arcTo(x + w, y, x + w, y + clampedR, clampedR);
  ctx.lineTo(x + w, y + h - clampedR);
  ctx.arcTo(x + w, y + h, x + w - clampedR, y + h, clampedR);
  ctx.lineTo(x + clampedR, y + h);
  ctx.arcTo(x, y + h, x, y + h - clampedR, clampedR);
  ctx.lineTo(x, y + clampedR);
  ctx.arcTo(x, y, x + clampedR, y, clampedR);
  ctx.closePath();
  ctx.fill();
}

// ── Hilfsfunktion: SVG Path auf Canvas zeichnen ──────────
async function _drawSvgIcon(ctx, pathData, x, y, size, color = "#000000") {
  const padding  = size * 0.12;
  const drawSize = size - 2 * padding;

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${drawSize}" height="${drawSize}">
    <path d="${pathData}" fill="${color}"/>
  </svg>`;

  return new Promise((resolve) => {
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      ctx.drawImage(img, x + padding, y + padding, drawSize, drawSize);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}
