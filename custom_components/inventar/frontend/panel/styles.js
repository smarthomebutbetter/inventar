import { css } from "https://unpkg.com/lit@2?module";

export const panelStyles = css`
    :host { display:block;background:var(--primary-background-color);min-height:100vh;font-family:var(--paper-font-body1_-_font-family,sans-serif);--m3-space:8px;--m3-radius-large:28px;--m3-radius-medium:16px;--m3-radius-small:12px;--inv-fill:color-mix(in srgb,var(--primary-text-color) 6%,transparent);--inv-fill-2:color-mix(in srgb,var(--primary-text-color) 10%,transparent);--inv-active:color-mix(in srgb,var(--primary-text-color) 15%,transparent);--inv-line:var(--divider-color);--inv-surface:var(--card-background-color,var(--ha-card-background)); }
    *{ box-sizing:border-box;-webkit-tap-highlight-color:transparent; }
    :focus-visible { outline:2px solid var(--primary-color);outline-offset:2px; }
    .header { position:sticky;top:0;z-index:20;display:flex;align-items:center;padding:0 16px;height:64px;background:var(--app-header-background-color,var(--primary-background-color));border-bottom:1px solid var(--divider-color);box-shadow:0 1px 8px rgba(0,0,0,0.2); }
    .hamburger { background:none;border:none;cursor:pointer;padding:8px;border-radius:50%;color:var(--primary-text-color);display:flex;align-items:center;flex-shrink:0; }
    .hamburger svg { width:24px;height:24px;fill:currentColor; }
    .header-title { flex:1;text-align:center;font-size:18px;font-weight:700;color:var(--primary-text-color); }
    .header-right { display:flex;align-items:center;gap:6px;min-width:60px;justify-content:flex-end; }
    .header-version { font-size:12px;color:var(--secondary-text-color); }
    .content { padding:calc(var(--m3-space)*2) calc(var(--m3-space)*2) 100px;max-width:640px;margin:0 auto; }
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
    .empty-icon { --mdc-icon-size:52px;width:52px;height:52px;margin:0 auto 12px;color:var(--secondary-text-color);display:block; }
    .spin { animation:spin 1s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
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
