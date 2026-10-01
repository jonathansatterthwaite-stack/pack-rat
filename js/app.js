// UI: views, modals and event wiring. Plain DOM, no framework.

// ------------------------------------------------------------------ helpers

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (["value", "checked", "disabled", "selected", "indeterminate"].includes(k)) el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : String(c));
  }
  return el;
}

// Replace an element's children. Like h(), skips null/false/undefined —
// the DOM's own replaceChildren() would print them as the text "null".
function setChildren(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter(c => c != null && c !== false));
}

const ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  bag: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"/><path d="M8 10h8"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  wand: '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  weight: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.9 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.93-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  move: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  sort: '<path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  zoomIn: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  more: '<circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/><circle cx="5" cy="12" r="1.3" fill="currentColor"/>',
};

function icon(name, cls = "") {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("class", "icon " + cls);
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONS[name];
  return s;
}

function iconBtn(name, label, onclick, cls = "") {
  return h("button", { class: "icon-btn " + cls, type: "button", title: label, "aria-label": label, onclick }, icon(name));
}

function templateBadge(tpl) {
  return h("span", { class: "type-dot", style: { background: templateColor(tpl) }, title: tpl.name });
}

function colorDot(color, title) {
  return h("span", { class: "type-dot", style: { background: color }, title });
}

// ------------------------------------------------------------------ toast / undo

let toastTimer;
function toast(msg, undoState) {
  const el = document.getElementById("toast");
  el.replaceChildren(h("span", null, msg), !undoState ? "" : h("button", {
    class: "link", onclick: () => {
      store.data = normalizeData(JSON.parse(undoState));
      store.update(() => {});
      el.classList.remove("show");
    },
  }, "Undo"));
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), undoState ? 6000 : 2500);
}

// Drop a pending Undo. Used when the server changes our characters (e.g. a
// trade): restoring the older snapshot would undo the trade on one side only.
function cancelUndo() {
  document.querySelector("#toast .link")?.remove();
}

// Mutate the active character and optionally offer undo.
function commit(fn, msg, undoable = false) {
  const before = undoable ? JSON.stringify(store.data) : null;
  store.update(s => fn(s, store.char()));
  if (msg) toast(msg, before);
}

// ------------------------------------------------------------------ modal

// head: more controls beside the close button. backdrop: an element shown faintly behind the
// dialog's content (an item's icon as a watermark; see iconFocusSwitch).
function openModal(title, body, { wide = false, footer = null, head = null, backdrop = null } = {}) {
  const root = document.getElementById("modal-root");
  const close = () => { overlay.remove(); document.body.classList.toggle("modal-open", root.children.length > 0); };
  const panel = h("div", { class: "modal" + (wide ? " wide" : "") + (backdrop ? " has-backdrop" : ""), role: "dialog", "aria-modal": "true", "aria-label": title },
    backdrop && h("div", { class: "modal-backdrop", "aria-hidden": "true" }, backdrop),
    h("div", { class: "modal-head" }, h("h2", null, title), head, iconBtn("x", "Close", () => close())),
    h("div", { class: "modal-body" }, body),
    footer && h("div", { class: "modal-foot" }, footer));
  const overlay = h("div", { class: "overlay", onmousedown: e => { if (e.target === overlay) close(); } }, panel);
  root.append(overlay);
  document.body.classList.add("modal-open");
  const first = panel.querySelector(".modal-body input:not([type=checkbox]), .modal-body select, .modal-body textarea");
  if (first && window.matchMedia("(pointer: fine)").matches) setTimeout(() => first.focus(), 30);
  return close;
}

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const last = document.getElementById("modal-root").lastElementChild;
  if (last) { last.remove(); document.body.classList.toggle("modal-open", !!document.getElementById("modal-root").children.length); }
});

function confirmDialog(message, okLabel, onOk) {
  let close;
  const foot = [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn danger", onclick: () => { close(); onOk(); } }, okLabel),
  ];
  close = openModal("Are you sure?", h("p", null, message), { footer: foot });
}

// ------------------------------------------------------------------ UI state

const PREF_VIEWS = ["inventory", "catalog"]; // tabs with their own display options (see loadViewPrefs)

const ui = {
  view: "inventory",
  invSearch: "",
  invType: "all",
  invSub: null,
  collapsed: new Set(),
  catSearch: "",
  catType: "all",
  catSub: null,
  catLimit: 150,
  trinketTable: null,
  views: loadViewPrefs(),
  sort: readPref("packrat-sort", "smart"),
  sortReverse: readPref("packrat-sort-rev", "") === "1",
  gmTab: "players", // the GM tab's sub-tab: "players" or "values"
  settingsTab: "settings", // Settings · Campaigns · Files
  catTab: "items", // Catalog: Items · My items · Drawings · Templates
  role: readPref("packrat-role", "player"), // "gm" to prepare GM things outside a party (see isGmDevice)
  playerMode: readPref("packrat-player-mode", "") === "1",
};

// Display options are per tab (list or tiles, the tiles' labels): the inventory's don't change the
// catalog's. The old shared settings are the starting point for both.
function loadViewPrefs() {
  return Object.fromEntries(PREF_VIEWS.map(v => [v, {
    layout: readPref(`packrat-layout-${v}`, readPref("packrat-layout", "list")),
    tileWorth: readPref(`packrat-tile-worth-${v}`, readPref("packrat-tile-worth", "1")) === "1",
    tileWeight: readPref(`packrat-tile-weight-${v}`, readPref("packrat-tile-weight", "1")) === "1",
  }]));
}
const viewPrefs = () => ui.views[PREF_VIEWS.includes(ui.view) ? ui.view : "inventory"];

function writePref(key, value) {
  kv.set(key, value);
}

// Display preferences (per device; shared by every window in the Windows app).
function readPref(key, fallback) {
  return kv.get(key) || fallback;
}

function applyPrefs() {
  ui.views = loadViewPrefs();
  ui.sort = readPref("packrat-sort", "smart");
  ui.sortReverse = readPref("packrat-sort-rev", "") === "1";
  ui.playerMode = readPref("packrat-player-mode", "") === "1";
  ui.role = readPref("packrat-role", "player");
}

// Another Pack Rat window on this PC saved changes: show them here too.
let reloadTimer;
function reloadSharedData() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    await kv.refresh();
    if (document.querySelector("#modal-root .overlay")) return; // don't yank a form away mid-edit; next change will catch up
    store.load();
    applyPrefs();
    render();
  }, 150);
}

function layoutToggle() {
  const prefs = viewPrefs();
  const set = v => {
    prefs.layout = v;
    writePref(`packrat-layout-${ui.view}`, v);
    render();
  };
  return h("div", { class: "seg", role: "group", "aria-label": "Layout" },
    [["list", "list", "List view"], ["tiles", "grid", "Tile view"]].map(([v, ic, label]) =>
      h("button", { type: "button", class: prefs.layout === v ? "active" : "", title: label, "aria-label": label,
        "aria-pressed": String(prefs.layout === v), onclick: () => set(v) }, icon(ic))));
}

// Tile view: show or hide the worth and weight labels in the tiles' top corners.
function tileLabelToggles() {
  const prefs = viewPrefs();
  if (prefs.layout !== "tiles") return null;
  const toggle = (key, pref, label, ic) => h("button", {
    type: "button", class: prefs[key] ? "active" : "", title: `${prefs[key] ? "Hide" : "Show"} ${label.toLowerCase()} on tiles`,
    "aria-label": `${label} on tiles`, "aria-pressed": String(prefs[key]),
    onclick: () => { prefs[key] = !prefs[key]; writePref(`${pref}-${ui.view}`, prefs[key] ? "1" : "0"); render(); },
  }, icon(ic));
  return h("div", { class: "seg tile-toggles", role: "group", "aria-label": "Tile labels" },
    toggle("tileWorth", "packrat-tile-worth", "Worth", "coins"),
    toggle("tileWeight", "packrat-tile-weight", "Weight", "weight"));
}

// A grid of tiles; names shrink to fit (the worth / weight labels can be hidden).
function tilesBox(extraClass = "") {
  const prefs = viewPrefs();
  const cls = ["tiles", "detail-minimal", !prefs.tileWorth && "hide-worth", !prefs.tileWeight && "hide-weight", extraClass];
  const box = h("div", { class: cls.filter(Boolean).join(" ") });
  tileResizer()?.observe(box);
  return box;
}

// One observer for every tile grid on screen (render() lets go of the old ones), refitting
// names when a grid's width changes.
let tileObserver = null;
const tileWidths = new WeakMap();
function tileResizer() {
  if (!tileObserver && window.ResizeObserver) {
    tileObserver = new ResizeObserver(entries => {
      let changed = false;
      for (const e of entries) {
        if (Math.abs(e.contentRect.width - (tileWidths.get(e.target) || 0)) < 1) continue;
        tileWidths.set(e.target, e.contentRect.width);
        changed = true;
      }
      if (changed) syncTileSize();
    });
  }
  return tileObserver;
}

// One tile size for the whole view, set by its widest grid, so tiles in narrower grids (strapped
// outside, nested containers) are the same size, just fewer to a row. Then names are refitted.
const TILE_MIN = 66, TILE_GAP = 6;
function syncTileSize(root = document.getElementById("view")) {
  if (!root) return;
  const boxes = [...root.querySelectorAll(".tiles")].filter(b => b.offsetParent);
  const width = Math.max(0, ...boxes.map(b => {
    const cs = getComputedStyle(b);
    return b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }));
  if (width > 0) {
    const n = Math.max(1, Math.floor((width + TILE_GAP) / (TILE_MIN + TILE_GAP)));
    root.style.setProperty("--tile-size", Math.floor((width - (n - 1) * TILE_GAP) / n * 100) / 100 + "px");
  }
  boxes.forEach(fitTileNames);
}

// Shrink each tile's name until it fits its tile (binary search on the font size).
// If even the smallest size can't fit a long word, let it break.
function fitTileNames(box) {
  if (!box.isConnected) return;
  for (const el of box.querySelectorAll(".tile-name")) {
    el.style.fontSize = "";
    el.classList.remove("tight");
    const fits = () => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    if (fits()) continue;
    let lo = 8, hi = parseFloat(getComputedStyle(el).fontSize);
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + "px";
      if (fits()) lo = mid; else hi = mid;
    }
    el.style.fontSize = lo + "px";
    if (!fits()) el.classList.add("tight");
  }
}

const VIEWS = {
  inventory: { label: "Inventory", icon: "bag", render: renderInventory,
    top: () => [missingSystemBanner(), foundElsewhereBanner(), notInPartyBanner(), party.active && undecidedBanner()] },
  catalog: { label: "Catalog", icon: "book", render: renderCatalog, builder: true },
  shops: { label: "Shops", icon: "cart", render: renderShops },
  gm: { label: "GM", icon: "shield", render: renderGm, gmOnly: true },
  party: { label: "Party", icon: "users", render: renderParty, partyOnly: true },
  settings: { label: "Settings", icon: "sliders", render: renderSettingsTabs },
};

// The campaign rules settings the system uses (D&D 5e: encumbrance, size), shown in Settings → Rules.
const usesSetting = (key, sys = activeSystem()) => (sys.campaignSettings || []).includes(key);

// Player mode (Settings) hides making and editing items; a GM always has them.
const playerOnly = () => ui.playerMode && !isGmDevice();

// Does this GM play characters too? If not, the Inventory tab would only ever be empty.
const gmHasCharacters = () => party.active ? party.linked().length > 0 : store.state.characters.some(c => !isBlankCharacter(c));

// A tab's name (the GM tab's comes from the game system's words).
const viewLabel = key => key === "gm" ? term("gm") : VIEWS[key].label;

function viewVisible(key) {
  const v = VIEWS[key];
  if (v.partyOnly && !party.active) return false;
  if (v.builder && playerOnly()) return false;
  if (v.gmOnly && !isGmDevice()) return false;
  if (key === "inventory" && (isGmDevice() || party.isHost()) && !gmHasCharacters()) return false;
  return true;
}

// Held while something is being dragged (a GM control's pin), so party updates don't redraw it
// out from under the pointer; one render follows when it's let go.
let renderHeld = false, renderWanted = false;
function holdRender(on) {
  renderHeld = on;
  if (!on && renderWanted) { renderWanted = false; render(); }
}

function render() {
  if (renderHeld) { renderWanted = true; return; }
  runTriggers(); // items' triggers, for whatever just changed (js/triggers.js)
  const char = store.char();
  // In a party with none of this device's characters playing yet: choose one first (a GM or the
  // host needn't: they have the party to run).
  const joining = party.active && !party.linked().length && !party.isGm() && !party.isHost();
  if (!viewVisible(ui.view)) ui.view = isGmDevice() && viewVisible("gm") ? "gm" : Object.keys(VIEWS).find(viewVisible);
  // A GM who plays no character is just the GM.
  document.getElementById("char-name").textContent = joining ? "Join the party"
    : isGmDevice() && !gmHasCharacters() ? termCap("gameMaster") : char ? char.name : "";
  document.getElementById("campaign-name").textContent = store.campaign().name;
  document.getElementById("nav").hidden = joining;
  const offers = party.active ? party.incoming().length : 0;
  document.querySelectorAll("[data-view]").forEach(b => {
    b.classList.toggle("active", b.dataset.view === ui.view);
    b.hidden = !viewVisible(b.dataset.view);
    b.querySelector(".nav-label").textContent = viewLabel(b.dataset.view);
    const badge = b.querySelector(".badge");
    if (badge) { badge.textContent = offers; badge.hidden = !offers; }
  });
  const main = document.getElementById("view");
  const scroll = window.scrollY;
  tileObserver?.disconnect(); // the grids being replaced; new ones observe themselves
  // Above the view: its notices, then the system's panels (they stay loaded: see js/panels.js).
  setChildren(document.getElementById("view-top"), !joining && VIEWS[ui.view].top?.());
  syncPanels(char, !joining && ui.view === "inventory");
  main.replaceChildren(joining ? renderJoin() : VIEWS[ui.view].render());
  // Tiles are laid out now: size them and shrink names to fit (resizes are handled by each grid's observer).
  syncTileSize(main);
  window.scrollTo(0, scroll);
  refreshLiveIcons(); // live icons outside the view (an open item's details) show the new values
}

function go(view) {
  ui.view = view;
  history.replaceState(null, "", "#" + view);
  render();
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ inventory view

// The campaign plays a game system this device hasn't got (the GM's, in a party; or an imported
// campaign's): it shows without its templates and panels until it's added.
function missingSystemBanner() {
  const id = store.campaign().system;
  if (!id || systemById(id)) return null;
  const bundled = bundledSystem(id);
  return h("section", { class: "found-banner" }, icon("book"),
    h("div", null, h("b", null, `${store.campaign().name} plays ${systemName(id)}`),
      h("p", { class: "muted small" }, bundled ? "It comes with Pack Rat but was removed from this device. Add it back to see its catalog and panels."
        : "This device hasn't got it. Ask for its file, then import it (Settings → Files → Import a file).")),
    bundled ? h("button", { class: "btn primary", onclick: () => commit(() => installSystem({ id }), `Added ${bundled.name}`, true) }, icon("plus"), "Add it")
      : h("button", { class: "btn", onclick: () => { ui.settingsTab = "files"; go("settings"); } }, "Files"));
}

function renderInventory() {
  const char = store.char();
  const list = h("div", { class: "inv-list" });
  const drawList = () => {
    setChildren(list, inventoryTree(char));
    syncTileSize(); // no-op until the view is on screen
  };
  drawList();

  const toolbar = h("div", { class: "toolbar" },
    h("label", { class: "search" }, icon("search"),
      h("input", { type: "search", placeholder: "Search inventory", value: ui.invSearch,
        oninput: e => { ui.invSearch = e.target.value; drawList(); } })),
    sortControl(),
    layoutToggle(),
    tileLabelToggles());

  return h("div", { class: "view-inventory" }, toolbar, inventoryTypeChips(char), list);
}

// "12 pp 40 gp 0 ep …", each coin in its colour.
function coinChips(coins) {
  return currency().coins.map(c => h("span", { class: "coin " + c.key },
    h("b", { style: c.color ? { color: c.color } : null }, (coins[c.key] || 0).toLocaleString()), " ", c.key));
}

// Inventory filter: "all", "equipped", or a group (Gear & Tools…), optionally narrowed to one
// of its subcategories (ui.invSub: a type in a combined group, or a category).
function invTypeMatches(e, group, sub = null) {
  if (group === "all") return true;
  if (group === "equipped") return e.equipped;
  if (groupOfItem(e.item)?.id !== group) return false;
  return !sub || !!subcategories(group).find(s => s.key === sub)?.match(e.item);
}

// The active filter, falling back to "all" once nothing of that group is left.
function activeInvType(char) {
  const t = ui.invType;
  return t !== "all" && !listed(char).some(e => invTypeMatches(e, t)) ? "all" : t;
}

function activeInvSub(char, group) {
  return ui.invSub && listed(char).some(e => invTypeMatches(e, group, ui.invSub)) ? ui.invSub : null;
}

// A row of chips, keeping the selected one scrolled into view on narrow screens.
function chipRow(label, chips, cls = "") {
  const row = h("div", { class: ("chips " + cls).trim(), role: "tablist", "aria-label": label }, chips);
  setTimeout(() => {
    const el = row.querySelector(".active");
    if (el && (el.offsetLeft + el.offsetWidth > row.scrollLeft + row.clientWidth || el.offsetLeft < row.scrollLeft)) {
      row.scrollLeft = el.offsetLeft - row.offsetLeft - 16;
    }
  });
  return row;
}

// Subcategory chips for a group: each in its shade of the group's hue. count(sub) -> number or null (hide).
function subChips(groupId, active, count, onPick) {
  const subs = subcategories(groupId);
  const shown = subs.map((s, i) => ({ ...s, i, n: count(s) })).filter(s => s.n !== 0);
  if (shown.length < 2) return null;
  const chip = (key, label, n, dot) => h("button", {
    class: "chip-btn" + (active === key ? " active" : ""), role: "tab", "aria-selected": String(active === key),
    onclick: () => onPick(key),
  }, dot, label, n != null && h("span", { class: "chip-count" }, n));
  const g = groupById(groupId);
  return chipRow("Filter within " + g.name, [
    chip(null, "All " + g.name.toLowerCase(), null),
    shown.map(s => chip(s.key, s.label, s.n, colorDot(shade(groupHue(groupId), s.i, subs.length), s.label))),
  ], "sub-chips");
}

// What the inventory lists: everything except the cards inside decks (those show in the deck's details).
const listed = char => char.items.filter(e => !inDeck(char, e));

function inventoryTypeChips(char) {
  const items = listed(char);
  if (!items.length) return null;
  const counts = {};
  for (const e of items) { const g = groupOfItem(e.item)?.id; counts[g] = (counts[g] || 0) + 1; }
  const equipped = items.filter(e => e.equipped).length;
  const active = activeInvType(char);
  const chip = (key, label, n, dot) => h("button", {
    class: "chip-btn" + (active === key ? " active" : ""), role: "tab", "aria-selected": String(active === key),
    onclick: () => { ui.invType = key; ui.invSub = null; render(); },
  }, dot, label, h("span", { class: "chip-count" }, n));
  const row = chipRow("Filter by type", [
    chip("all", "All", items.length),
    equipped > 0 && chip("equipped", "Equipped", equipped),
    systemGroups().filter(g => counts[g.id]).map(g => chip(g.id, g.name, counts[g.id], colorDot(groupColor(g.id), g.name))),
  ]);
  const sub = groupById(active) && subChips(active, activeInvSub(char, active),
    s => items.filter(e => invTypeMatches(e, active, s.key)).length,
    key => { ui.invSub = key; render(); });
  return [row, sub];
}

function matchesSearch(item, q) {
  if (!q) return true;
  q = q.toLowerCase();
  return [item.name, item.category, item.description, item.body, item.author, item.damageType, itemTemplate(item).name, groupOfItem(item)?.name, ...(item.properties || [])]
    .some(v => v && String(v).toLowerCase().includes(q));
}

// Each comparator gives the natural order for that sort; "Reverse" flips it.
// Ties always fall back to name so the order is stable.
const INV_SORTS = {
  smart: { label: "Equipped first", cmp: (a, b) => b.equipped - a.equipped },
  name: { label: "Name", cmp: () => 0 },
  type: { label: "Type", cmp: (a, b) => templateOrder(a.item) - templateOrder(b.item) },
  weight: { label: "Heaviest", cmp: (a, b, char) => entryTotalWeight(char, b) - entryTotalWeight(char, a) },
  value: { label: "Most valuable", cmp: (a, b) => entryValue(b) - entryValue(a) },
  qty: { label: "Quantity", cmp: (a, b) => b.qty - a.qty },
  recent: { label: "Recently added", cmp: (a, b, char) => char.items.indexOf(b) - char.items.indexOf(a) },
};

function sortEntries(char, entries) {
  const cmp = (INV_SORTS[ui.sort] || INV_SORTS.smart).cmp;
  const dir = ui.sortReverse ? -1 : 1;
  return [...entries].sort((a, b) => dir * (cmp(a, b, char) || entryName(a).localeCompare(entryName(b))));
}

function sortControl() {
  const set = (key, rev) => {
    ui.sort = key;
    ui.sortReverse = rev;
    writePref("packrat-sort", key);
    writePref("packrat-sort-rev", rev ? "1" : "");
    render();
  };
  return h("div", { class: "sort" },
    h("label", { class: "sort-select", title: "Sort by" }, icon("sort"),
      h("select", { "aria-label": "Sort inventory by", onchange: e => set(e.target.value, ui.sortReverse) },
        Object.entries(INV_SORTS).map(([k, v]) => h("option", { value: k, selected: ui.sort === k }, v.label)))),
    h("button", { type: "button", class: "sort-dir" + (ui.sortReverse ? " active" : ""), title: "Reverse order",
      "aria-label": "Reverse order", "aria-pressed": String(ui.sortReverse), onclick: () => set(ui.sort, !ui.sortReverse) },
      ui.sortReverse ? "↑" : "↓"));
}

function inventoryTree(char) {
  const q = ui.invSearch.trim();
  if (!char.items.length) {
    return [h("div", { class: "empty" },
      icon("bag", "big"),
      h("p", null, "Your pack is empty."),
      !playerOnly() && h("button", { class: "btn primary", onclick: () => go("catalog") }, "Browse the catalog"),
      !party.active && isFreshData() && h("p", { class: "muted small" }, "Moving from another device? ",
        h("button", { class: "link", onclick: pickBackup }, "Import a backup"), " exported from Pack Rat's Settings."))];
  }
  const type = activeInvType(char);
  if (q || type !== "all") {
    // Filtered: one flat list, with each item tagged by the container it's in.
    const sub = activeInvSub(char, type);
    const hits = listed(char).filter(e => invTypeMatches(e, type, sub) &&
      (matchesSearch(currentItem(e, char), q) || [e.notes, e.customName].some(t => (t || "").toLowerCase().includes(q.toLowerCase()))));
    if (!hits.length) return [h("p", { class: "muted pad" }, "Nothing matches.")];
    const weight = hits.reduce((sum, e) => sum + entryOwnWeight(e), 0);
    return [h("div", { class: "group" },
      h("div", { class: "group-head" },
        h("h3", null, `${hits.length} ${hits.length === 1 ? "entry" : "entries"}`),
        h("span", { class: "muted" }, fmtWeight(weight))),
      entryList(char, sortEntries(char, hits), true))];
  }
  const top = childrenOf(char, null);
  const containers = orderContainers(char, top.filter(e => holdsItems(char, e)));
  const collapsed = ui.collapsed.has("person");
  const toggle = () => { collapsed ? ui.collapsed.delete("person") : ui.collapsed.add("person"); render(); };
  return [
    // Everything carried, containers included (their contents are in their own sections below).
    dropZone(null, h("div", { class: "group" },
      h("div", { class: "group-head" },
        h("button", { class: "collapse" + (collapsed ? " closed" : ""), onclick: toggle, "aria-expanded": String(!collapsed) }, icon("chevron"),
          h("h3", null, "On person")),
        h("span", { class: "muted", title: "Everything carried, including what's in containers" },
          fmtWeight(top.reduce((s, e) => s + entryTotalWeight(char, e), 0)))),
      !collapsed && (top.length ? entryList(char, sortEntries(char, top)) : h("p", { class: "muted pad" }, "Nothing carried.")))),
    ...containers.map((c, i) => containerGroup(char, c, 0, containers, i)),
  ];
}

// Container sections in the order the player chose (char.containerOrder); ones not placed yet
// follow in the current sort.
function orderContainers(char, list) {
  const order = char.containerOrder || [];
  const pos = e => { const i = order.indexOf(e.uid); return i < 0 ? Infinity : i; };
  return sortEntries(char, list).sort((a, b) => pos(a) - pos(b));
}

// Move a container section up or down among its neighbours (siblings: the list as shown).
function moveContainer(siblings, index, dir) {
  const j = index + dir;
  if (j < 0 || j >= siblings.length) return;
  const ids = siblings.map(e => e.uid);
  [ids[index], ids[j]] = [ids[j], ids[index]];
  commit((s, c) => { c.containerOrder = [...ids, ...(c.containerOrder || []).filter(id => !ids.includes(id) && c.items.some(e => e.uid === id))]; });
}

function containerGroup(char, c, depth, siblings = [c], index = 0) {
  const all = sortEntries(char, childrenOf(char, c.uid));
  const kids = all.filter(k => !k.strapped);
  const outside = all.filter(k => k.strapped);
  const spec = holderSpec(c);
  const fill = fillLevel(char, c);
  const collapsed = ui.collapsed.has(c.uid);
  const toggle = () => { collapsed ? ui.collapsed.delete(c.uid) : ui.collapsed.add(c.uid); render(); };
  return dropZone(c.uid, h("div", { class: "group container-group", style: { marginLeft: depth ? "12px" : null } },
    withFill(h("div", { class: "group-head" },
      h("button", { class: "collapse" + (collapsed ? " closed" : ""), onclick: toggle, "aria-expanded": String(!collapsed) }, icon("chevron"),
        h("h3", null, entryName(c), c.qty > 1 ? ` ×${c.qty}` : "")),
      h("span", { class: "muted" + (fill?.over ? " warn-text" : ""), title: spec ? `Holds ${spec.label.toLowerCase()}` : null },
        contentsLoad(char, c), c.item.weightless ? " (weightless)" : ""),
      siblings.length > 1 && h("span", { class: "reorder" },
        h("button", { class: "icon-btn", type: "button", title: `Move ${entryName(c)} up`, "aria-label": `Move ${entryName(c)} up`,
          disabled: index === 0, onclick: () => moveContainer(siblings, index, -1) }, icon("up")),
        h("button", { class: "icon-btn", type: "button", title: `Move ${entryName(c)} down`, "aria-label": `Move ${entryName(c)} down`,
          disabled: index === siblings.length - 1, onclick: () => moveContainer(siblings, index, 1) }, icon("down"))),
      iconBtn("more", "Container details", () => openEntry(c.uid))), fill),
    !collapsed && [
      entryList(char, kids),
      orderContainers(char, kids.filter(k => holdsItems(char, k))).map((k, i, list) => containerGroup(char, k, depth + 1, list, i)),
      !kids.length && h("p", { class: "muted pad" }, spec
        ? `Empty — holds ${spec.key === "scrolls" ? `${spec.limit} rolled-up sheets of paper (${spec.limit / 2} of parchment), maps or scrolls` : `${spec.limit} ${spec.unit}s`}. Drag them here or use Location.`
        : "Empty — drag items here or use Location."),
      (canStrap(c) || outside.length > 0) && dropZone(c.uid, h("div", { class: "strapped" },
        h("div", { class: "strapped-head" }, icon("link"), h("h4", null, "Strapped outside"),
          h("span", { class: "muted" }, outside.length ? fmtWeight(strappedWeight(char, c)) : "")),
        outside.length
          ? [entryList(char, outside),
             orderContainers(char, outside.filter(k => holdsItems(char, k))).map((k, i, list) => containerGroup(char, k, depth + 1, list, i))]
          : h("p", { class: "muted pad small" }, "Bedrolls, rope, a shield… Drag items here or set Location to “strapped to”.")), true),
    ]));
}

// Desktop drag-and-drop between containers; touch uses the Move menu.
function dropZone(parentUid, el, strapped = false) {
  el.addEventListener("dragover", e => {
    if (!e.dataTransfer.types.includes("text/entry")) return;
    e.preventDefault(); e.stopPropagation();
    el.classList.add("drop-target");
  });
  el.addEventListener("dragleave", e => { if (!el.contains(e.relatedTarget)) el.classList.remove("drop-target"); });
  el.addEventListener("drop", e => {
    e.preventDefault(); e.stopPropagation();
    el.classList.remove("drop-target");
    const id = e.dataTransfer.getData("text/entry");
    moveEntry(id, parentUid, strapped);
  });
  return el;
}

function moveEntry(id, parentUid, strapped = false) {
  const char = store.char();
  const entry = char.items.find(x => x.uid === id);
  strapped = !!(parentUid && strapped);
  if (!entry || entry.uid === parentUid || (entry.parent === parentUid && !!entry.strapped === strapped)) return;
  if (parentUid && isDescendant(char, parentUid, id)) return toast("Can't put a container inside itself");
  const holder = parentUid && char.items.find(x => x.uid === parentUid);
  const name = holder ? entryName(holder) : null;
  const dest = !name ? "on person" : strapped ? `the outside of ${name}` : name;
  // Cases and quivers take only their own kind of thing, and only as many as fit.
  const spec = holder && !strapped && holderSpec(holder);
  if (spec) {
    const size = spec.size(entry.item);
    if (!size) return toast(`The ${name} only holds ${spec.label.toLowerCase()}`);
    const room = Math.floor((spec.limit - holderUsed(char, holder, spec)) / size);
    if (room <= 0) return toast(`The ${name} is full`);
    if (room < entry.qty) {
      // Move what fits; the rest stays where it was.
      return commit((s, c) => {
        const x = c.items.find(x => x.uid === id);
        x.qty -= room;
        // A renamed stack keeps its name (and doesn't join an unnamed one).
        if (x.customName) c.items.push({ ...clone(x), uid: uid(), qty: room, parent: parentUid, strapped: false, equipped: false, attuned: false, toggles: {}, states: {} });
        else addToInventory(c, { ...clone(x.item), id: x.srcId }, room, parentUid);
      }, `Moved ${room} × ${entryName(entry)} to ${dest} (it's full)`, true);
    }
  }
  commit((s, c) => {
    const x = c.items.find(x => x.uid === id);
    x.parent = parentUid;
    x.strapped = strapped;
  }, `Moved ${entryName(entry)} to ${dest}`, true);
}

// "in Backpack" / "on Backpack" for filtered lists.
function locationLabel(char, e) {
  if (!e.parent) return null;
  const holder = char.items.find(x => x.uid === e.parent);
  const name = holder && entryName(holder);
  return name && (e.strapped ? "on " : "in ") + name;
}

// A container listed as an item: what's in it ("12 items · 20 / 30 lb"), or null for anything else.
function containerLoad(char, e) {
  if (!holdsItems(char, e)) return null;
  const inside = childrenOf(char, e.uid).filter(k => !k.strapped);
  if (!inside.length) return "Empty";
  return `${plural(inside.length, "item")} · ${contentsLoad(char, e)}`;
}

// How full a container is: "12 / 20 arrows", "14.5 / 30 lb", or just the weight inside.
function contentsLoad(char, e) {
  const spec = holderSpec(e);
  if (spec) return `${holderUsed(char, e, spec)} / ${spec.limit} ${spec.unit}s`;
  const inner = contentsWeight(char, e);
  return e.item.capacityLb > 0 ? `${+inner.toFixed(2)} / ${e.item.capacityLb} ${weightUnit()}` : fmtWeight(inner);
}

// Tile labels: worth top-left, weight top-right, and along the bottom the stack count or, for a
// container, how full it is.
function minimalCorners(worthCp, weightLb, bottom) {
  return [
    // No space before the unit: two labels share the top of a small tile.
    // Worth and weight share the top edge: whichever is shorter leaves the other more room.
    (worthCp > 0 || weightLb > 0) && h("span", { class: "tile-top" },
      worthCp > 0 && h("span", { class: "tile-mini tile-worth", title: "Worth" }, fmtCostShort(worthCp).replace(/^([\d.]+k?) /, "$1")),
      weightLb > 0 && h("span", { class: "tile-mini tile-wt", title: "Weight" }, +weightLb.toFixed(1) + weightUnit())),
    bottom && h("span", { class: "tile-mini tile-bottom" }, bottom),
  ];
}

// "15 gp", "1.8 gp", "4 sp", "1.5k gp" (for the small corner labels).
function fmtCostShort(cp) {
  cp = Math.round(cp);
  const { key, value } = showCoin();
  if (cp >= value * 1000) return `${+(cp / (value * 1000)).toFixed(cp >= value * 10000 ? 0 : 1)}k ${key}`;
  if (cp >= value) return `${+(cp / value).toFixed(cp >= value * 10 ? 0 : 1)} ${key}`;
  return fmtCost(cp);
}

// A container's used / total capacity in a few characters: "14/30 lb", "15/20", "1/4 pt".
function containerCapacity(char, e) {
  const fill = fillLevel(char, e);
  if (!fill) return null;
  if (fill.unit) return `${fill.used}/${fill.limit}`;
  if (fill.kind === "liquid") {
    const cap = liquidCap(e), have = e.liquid?.pints || 0;
    const [n, unit] = cap < 1 ? [16, "oz"] : cap >= 8 ? [1 / 8, "gal"] : [1, "pt"];
    return `${+(have * n).toFixed(1)}/${+(cap * n).toFixed(1)} ${unit}`;
  }
  return `${+contentsWeight(char, e).toFixed(1)}/${e.item.capacityLb} ${weightUnit()}`;
}

// A faint tint filling the element as far as the container is full (see fillLevel).
function withFill(el, fill) {
  if (!fill) return el;
  el.classList.add("fill", "fill-" + fill.kind);
  if (fill.over) el.classList.add("fill-over");
  el.style.setProperty("--fill", Math.min(100, fill.ratio * 100).toFixed(1) + "%");
  return el;
}

// Rows or a tile grid, depending on the layout preference.
function entryList(char, entries, showPath = false) {
  if (!entries.length) return null;
  if (viewPrefs().layout !== "tiles") return entries.map(e => entryRow(char, e, showPath));
  const box = tilesBox();
  box.append(...entries.map(e => entryTile(char, e, showPath)));
  return box;
}

function entryTile(char, e, showPath) {
  const it = currentItem(e, char); // as it is now (its active layers)
  const path = showPath ? locationLabel(char, e) : null;
  const el = h("button", { class: "tile" + (e.equipped ? " equipped" : ""), draggable: "true",
    title: [entryName(e), liquidLabel(e) || containerLoad(char, e) || itemSummary(it), e.equipped && equipWord(e),
      ...statesOnFor(char, e).map(st => st.label.toLowerCase()), e.charges != null && `${e.charges}/${it.maxCharges} charges`, path].filter(Boolean).join(" · "),
    onclick: () => openEntry(e.uid),
    ondragstart: ev => { ev.dataTransfer.setData("text/entry", e.uid); ev.dataTransfer.effectAllowed = "move"; } },
    itemIcon(it, "tile-icon", () => entryIconVars(char, e)),
    h("span", { class: "tile-name" }, entryName(e)),
    minimalCorners(entryTotalValue(char, e), entryTotalWeight(char, e), containerCapacity(char, e) || (e.qty !== 1 ? "×" + e.qty.toLocaleString() : null)));
  el.style.setProperty("--type", itemColor(it));
  return withFill(el, fillLevel(char, e));
}

function entryRow(char, e, showPath = false) {
  const it = currentItem(e, char); // as it is now (its active layers)
  const path = showPath ? locationLabel(char, e) : null;
  const setQty = n => setEntryQty(e, n);
  return withFill(h("div", { class: "row" + (e.equipped ? " equipped" : ""), draggable: "true",
    ondragstart: ev => { ev.dataTransfer.setData("text/entry", e.uid); ev.dataTransfer.effectAllowed = "move"; } },
    itemIcon(it, "row-icon", () => entryIconVars(char, e)),
    h("button", { class: "row-main", onclick: () => openEntry(e.uid) },
      h("div", { class: "row-title" }, entryName(e),
        e.equipped && h("span", { class: "tag on" }, equipWord(e)),
        statesOnFor(char, e).map(st => h("span", { class: "tag attuned" }, st.label.toLowerCase())),
        e.charges != null && h("span", { class: "tag" }, `${e.charges}/${it.maxCharges} charges`),
        path && h("span", { class: "tag" }, path)),
      h("div", { class: "row-sub" }, [liquidLabel(e) || containerLoad(char, e) || itemSummary(it), e.notes].filter(Boolean).join(" — "))),
    h("div", { class: "row-weight muted" }, fmtWeight(entryOwnWeight(e))),
    writingButton(e),
    isEquipable(e) && iconBtn(equipKind(e) === "wielded" ? "sword" : "shield", e.equipped ? "Unequip" : "Equip",
      () => toggleEquip(e.uid), "equip" + (e.equipped ? " on" : "")),
    h("div", { class: "qty" },
      iconBtn("minus", "Decrease", () => setQty(e.qty - 1)),
      h("input", { type: "number", inputmode: "numeric", value: e.qty, min: 0, "aria-label": "Quantity",
        onchange: ev => setQty(Math.floor(+ev.target.value || 0)) }),
      iconBtn("plus", "Increase", () => setQty(e.qty + 1)))), fillLevel(char, e));
}

// Open an inventory document (or written-in paper, a book…) in the reader; it can be written in from there.
function readEntry(entryUid) {
  const e = store.char()?.items.find(x => x.uid === entryUid);
  if (!e) return;
  openReader({ ...e.item, name: entryName(e) }, { onEdit: () => writeEntry(entryUid) });
}

const hasWriting = it => !!(it.body && it.body.trim());

// Writing or a picture (or neither), for an item.
function pageKind(it, srcId) {
  return hasFeature(it, "picture", srcId) ? "picture" : hasFeature(it, "writable", srcId) ? "writing" : null;
}

// Documents: items whose template is for writing (they always open in the reader, even blank).
const isDocument = it => !!templateFeatureDefaults(itemTemplate(it)).writable;

// Something to read or look at already.
const hasPage = (it, kind) => hasWriting(it) || (kind === "writing" && isDocument(it));

// On an item's row: read or view what's there, or write in it / add a picture.
function writingButton(e, onDone = () => {}, cls = "equip") {
  const it = e.item, kind = pageKind(it, e.srcId);
  if (!kind) return null;
  const read = hasPage(it, kind);
  const [ic, label] = kind === "picture" ? ["image", read ? "View" : "Add a picture"] : read ? ["book", "Read"] : ["edit", "Write"];
  return iconBtn(ic, label, () => { onDone(); read ? readEntry(e.uid) : writeEntry(e.uid); }, cls);
}

// Write in paper, a book, a letter…: just its text (player mode included). Writing on one sheet
// of a stack takes that sheet off the stack.
function writeEntry(entryUid) {
  const e = store.char()?.items.find(x => x.uid === entryUid);
  if (!e) return;
  const draft = clone(e.item);
  const picture = pageKind(e.item, e.srcId) === "picture";
  let close;
  const save = () => {
    commit((s, c) => {
      const x = c.items.find(x => x.uid === entryUid);
      if (!x) return;
      let target = x;
      if (x.qty > 1 && JSON.stringify(draft) !== JSON.stringify(x.item)) {
        x.qty -= 1;
        target = { ...clone(x), uid: uid(), qty: 1, equipped: false };
        c.items.push(target);
      }
      for (const k of ["body", "author"]) if (!(draft[k] || "").trim()) delete draft[k];
      target.item = draft;
    }, picture ? `Updated the picture on ${entryName(e)}` : `Wrote in ${entryName(e)}`, true);
    close();
  };
  close = openModal(picture ? `Picture: ${entryName(e)}` : `Write in ${entryName(e)}`, [
    e.qty > 1 && h("p", { class: "muted small" }, `One of your ${e.qty} changes; the rest stay as they are.`),
    h("div", { class: "form grid" },
      !picture && h("label", { class: "field full" }, h("span", null, "Author / from"),
        h("input", { type: "text", value: draft.author || "", placeholder: "e.g. Captain Varra", oninput: ev => { draft.author = ev.target.value; } })),
      picture ? h("div", { class: "field full" }, pictureEditor({ key: "body" }, draft)) : markdownField({ key: "body", label: "Text" }, draft)),
  ], { wide: true, footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: save }, icon("check"), "Save"),
  ] });
}

// ------------------------------------------------------------------ item states
// A player switching one of their item's states (Attuned…), within its limit. Returns whether it changed.
function playerSetState(entryUid, key, on) {
  const char = store.char(), e = char?.items.find(x => x.uid === entryUid), st = stateByKey(key);
  if (!e || !st || !statesFor(e).includes(st)) return false;
  if (!isGmDevice() && !canPlayerSet(char, e, key)) { toast(`Only the ${term("gm")} can change that now`); return false; }
  const lim = on && !stateOn(char, e, key) ? stateLimit(char, st) : null;
  if (lim != null && stateCount(char, key) >= lim) {
    if (st.limit.mode === "block") { toast(limitText(st, lim)); return false; }
    toast(`${limitText(st, lim)} (keeping it anyway)`);
  }
  commit((s, c) => setState(c.items.find(x => x.uid === entryUid), key, on));
  return true;
}

// The GM's switches for an item's states: the player's choice, or always on, or always off.
function gmStateControls(char, e) {
  const over = stateOverrides(char, e), target = `${char.id}/${e.uid}`;
  return h("div", { class: "field full gm-states" }, h("span", null, `States (${term("gm")})`),
    h("div", { class: "gm-state-list" }, statesFor(e).map(st => h("label", { class: "gm-state" }, h("span", null, st.label),
      h("select", { "aria-label": `${st.label} (${term("gm")})`, onchange: async ev => {
        const v = ev.target.value;
        try { await setGmValue("item", target, "gm_state_" + st.key, v === "" ? null : +v); } catch (err) { toast(err.message); }
        render();
      } },
        h("option", { value: "", selected: !(st.key in over) }, st.who === "player" ? "Player's choice" : "Not set"),
        h("option", { value: "1", selected: over[st.key] === true }, "On"),
        h("option", { value: "0", selected: over[st.key] === false }, "Off"))))));
}

// Equippable items (weapons, armor, magic items…) and anything worn for an AC bonus; armor is "worn".
const wornForAc = e => !!currentItem(e).acBonus && hasFeature(currentItem(e), "worn", e.srcId);
const isEquipable = e => hasFeature(currentItem(e), "equippable", e.srcId) || wornForAc(e);
// How it's equipped: a system's features say ("wielded" weapons, "worn" armor); else just equipped.
function equipKind(e) {
  const it = currentItem(e), kinds = allFeatures().filter(f => f.equip && hasFeature(it, f.key, e.srcId)).map(f => f.equip);
  return kinds.includes("wielded") ? "wielded" : kinds.includes("worn") || wornForAc(e) ? "worn" : "equipped";
}
const equipWord = e => equipKind(e) === "worn" ? "worn" : "equipped";

// Set a stack's quantity; at 0 it's removed (with Undo).
function setEntryQty(e, n) {
  n = Math.max(0, Math.floor(+n || 0));
  commit((s, c) => {
    const x = c.items.find(x => x.uid === e.uid);
    if (!x) return;
    x.qty = n;
    if (!n) removeEntry(c, x.uid);
  }, n ? null : `Removed ${entryName(e)}`, !n);
}

function toggleEquip(entryUid) {
  commit((s, c) => {
    const e = c.items.find(x => x.uid === entryUid);
    e.equipped = !e.equipped;
    // Only one suit of armor and one shield at a time.
    const isArmor = x => hasFeature(currentItem(x), "armor", x.srcId);
    if (e.equipped && isArmor(e)) {
      const shield = e.item.category === "Shield";
      c.items.forEach(o => {
        if (o !== e && o.equipped && isArmor(o) && (o.item.category === "Shield") === shield) o.equipped = false;
      });
    }
  });
}

// ------------------------------------------------------------------ entry details

// A details dialog shows the item's icon (or picture) as a watermark behind the details, and a
// switch in its header to see just the icon: the details fade out and the icon comes up full.
// The icon is the real one, live drawings included, so it keeps updating either way.
const iconBackdrop = (item, vars) => itemIcon(item, "details-watermark", vars);
function iconFocusSwitch() {
  return h("label", { class: "icon-focus-switch", title: "Show just the icon" }, icon("image"),
    h("input", { type: "checkbox", role: "switch", class: "switch", "aria-label": "Show just the icon",
      onchange: e => e.target.closest(".modal").classList.toggle("icon-focus", e.target.checked) }));
}

// ------------------------------------------------------------------ layers in details and editing

// The fields a layer can change: the template's simple ones (not icons, pictures, pieces…).
const LAYER_KINDS = new Set(["text", "textarea", "number", "select", "checkbox", "tags", "dice", "cost"]);
const layerFields = tpl => templateFields(tpl).filter(f => LAYER_KINDS.has(f.kind) && f.key !== "source");

function layerValue(f, v) {
  if (f.kind === "cost") return fmtCost(v);
  if (f.kind === "weight" || f.key === "weight") return fmtWeight(v);
  return fieldDisplay(f, v);
}

// The item's layers whose states are off, faded: what it would gain ("Needs: Attuned" for the
// player's states, "When Identified" for the GM's). isOn(key) says which are on.
function layerSections(item, isOn) {
  const layers = item.layers || {}, tpl = itemTemplate(item);
  // The template's fields, and the features' (an AC bonus…), once each.
  const fields = [...layerFields(tpl), ...allFeatures().flatMap(ft => ft.fields).filter(f => LAYER_KINDS.has(f.kind))]
    .filter((f, i, all) => all.findIndex(g => g.key === f.key) === i);
  const meaningful = L => Object.entries(L).some(([k, v]) => v !== "" && v != null && (typeof v !== "object" || Object.keys(v).length));
  const off = systemStates().filter(st => layers[st.key] && meaningful(layers[st.key]) && !isOn(st.key));
  if (!off.length) return null;
  return h("div", { class: "layer-sections" }, off.map(st => {
    const L = layers[st.key];
    const rows = fields.filter(f => L[f.key] !== undefined && L[f.key] !== "" && !["description", "effect"].includes(f.key))
      .map(f => [f.label, layerValue(f, L[f.key])]).filter(([, v]) => v != null && v !== "");
    const feats = Object.keys(L.features || {}).filter(k => L.features[k]).map(k => featureByKey(k)?.label).filter(Boolean);
    return h("section", { class: "layer-off" },
      h("h4", null, st.who === "player" ? `Needs: ${st.label}` : `When ${st.label}`),
      rows.length > 0 && h("dl", null, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
      feats.length > 0 && h("p", { class: "small" }, "Also: " + feats.join(", ")),
      (L.locks || []).length > 0 && h("p", { class: "small" }, `Only the ${term("gm")} can change: ` + L.locks.map(k => stateByKey(k)?.label || k).join(", ")),
      L.effect && h("p", { class: "desc" }, L.effect),
      L.description && String(L.description).split("\n\n").map(p => h("p", { class: "desc" }, p)),
      null);
  }));
}

// One field of a layer: empty means "as the item is" (its value shows greyed as the placeholder).
function layerFieldInput(f, layer, base) {
  const set = v => { if (v === "" || v == null || (Array.isArray(v) && !v.length)) delete layer[f.key]; else layer[f.key] = v; };
  const cls = "field" + (["textarea", "tags"].includes(f.kind) ? " full" : "");
  const label = h("span", null, fieldLabel(f));
  const ph = base[f.key] == null ? "" : Array.isArray(base[f.key]) ? base[f.key].join(", ") : String(base[f.key]);
  switch (f.kind) {
    case "textarea":
      return h("label", { class: cls }, label, h("textarea", { rows: 3, value: layer[f.key] || "", placeholder: ph, oninput: e => set(e.target.value) }));
    case "number":
      return h("label", { class: cls }, label, h("input", { type: "number", step: f.step || "any", inputmode: "decimal", value: layer[f.key] ?? "", placeholder: ph,
        oninput: e => set(e.target.value === "" ? undefined : +e.target.value) }));
    case "cost":
      return h("label", { class: cls }, h("span", null, `${f.label} (${showCoin().key})`), h("input", { type: "number", step: "any", min: 0, inputmode: "decimal",
        value: layer[f.key] != null ? layer[f.key] / showCoin().value : "", placeholder: base[f.key] != null ? String(base[f.key] / showCoin().value) : "",
        oninput: e => set(e.target.value === "" ? undefined : Math.round(+e.target.value * showCoin().value)) }));
    case "select":
    case "checkbox": {
      const opts = f.kind === "checkbox" ? [[true, "Yes"], [false, "No"]] : f.options.filter(o => o !== "").map(o => [o, f.labels?.[o] || o]);
      const cur = layer[f.key];
      return h("label", { class: cls }, label, h("select", { onchange: e => set(e.target.value === "" ? undefined : opts[+e.target.value][0]) },
        h("option", { value: "", selected: cur === undefined }, `As the item is${ph ? ` (${f.kind === "checkbox" ? (base[f.key] ? "Yes" : "No") : ph})` : ""}`),
        opts.map(([v, l], i) => h("option", { value: i, selected: cur === v }, l))));
    }
    case "tags":
      return h("label", { class: cls }, label, h("input", { type: "text", value: (layer[f.key] || []).join(", "), placeholder: ph || "Comma separated",
        oninput: e => set(e.target.value.split(",").map(x => x.trim()).filter(Boolean)) }));
    default:
      return h("label", { class: cls }, label, h("input", { type: "text", value: layer[f.key] || "", placeholder: ph, oninput: e => set(e.target.value) }));
  }
}

// A layer's tab in the item form: its fields, the features it turns on, the states it locks.
function layerForm(st, draft, tpl, onRemove) {
  const layer = draft.layers[st.key];
  const featBox = h("div", { class: "layer-features" });
  const drawFeats = () => setChildren(featBox,
    h("p", { class: "muted small" }, "Turns on (while " + st.label.toLowerCase() + "):"),
    h("div", { class: "inline wrap" }, allFeatures().filter(ft => !mainFeatures(tpl).includes(ft.key) && !ft.flag).map(ft => h("label", { class: "check" },
      h("input", { type: "checkbox", checked: !!layer.features?.[ft.key], onchange: e => {
        layer.features = { ...(layer.features || {}) };
        if (e.target.checked) layer.features[ft.key] = true; else delete layer.features[ft.key];
        if (!Object.keys(layer.features).length) delete layer.features;
        drawFeats();
      } }), " " + ft.label))),
    // The turned-on features' settings.
    h("div", { class: "form grid" }, Object.keys(layer.features || {}).flatMap(k => (featureByKey(k)?.fields || []).filter(f => LAYER_KINDS.has(f.kind))
      .map(f => layerFieldInput(f, layer, draft)))));
  drawFeats();
  const others = systemStates().filter(o => o.key !== st.key);
  return h("div", { class: "layer-form" },
    h("p", { class: "muted small" }, `While ${st.label.toLowerCase()}, the item changes to what's here. Leave a field empty to keep it as it is.`),
    h("div", { class: "form grid" }, layerFields(tpl).map(f => layerFieldInput(f, layer, draft))),
    featBox,
    others.length > 0 && h("div", { class: "layer-locks" }, h("p", { class: "muted small" }, `While ${st.label.toLowerCase()}, only the ${term("gm")} can change:`),
      h("div", { class: "inline wrap" }, others.map(o => h("label", { class: "check" },
        h("input", { type: "checkbox", checked: (layer.locks || []).includes(o.key), onchange: e => {
          const set = new Set(layer.locks || []);
          if (e.target.checked) set.add(o.key); else set.delete(o.key);
          if (set.size) layer.locks = [...set]; else delete layer.locks;
        } }), " " + o.label)))),
    h("button", { class: "btn danger", type: "button", onclick: onRemove }, icon("trash"), `Remove the ${st.label} state`));
}

// Template fields the details show in their own way (the rest are listed by label).
const DETAILS_SHOWN = new Set(["poisonType", "saveDC", "effect"]);

// onIcon(id): when given, the item's icon can be changed from its details.
// srcId: the catalog item an inventory copy came from (older copies take missing fields from it).
// watermarked: the dialog shows the icon behind the details (iconBackdrop), so they leave it out.
function itemDetails(item, onIcon = null, srcId = item.id, vars = null, watermarked = false) {
  const has = key => hasFeature(item, key, srcId);
  const rows = [];
  const add = (k, v) => { if (v !== undefined && v !== null && v !== "" && v !== false) rows.push([k, v]); };
  // D&D 5e's weapons and armor have rows written for them; any other system's features list their fields.
  const dnd = activeSystem() === DND5E_SYSTEM;
  const tpl = itemTemplate(item), weapon = dnd && has("weapon"), armor = dnd && has("armor");
  // A weapon's category is simple or martial (listed below); other templates' show with the type.
  const weaponCats = weapon && (mainFeatures(tpl).includes("weapon") || !tpl.categories?.length);
  add("Type", tpl.name + (!weaponCats && item.category ? ` — ${item.category}` : ""));
  if (weaponCats) {
    add("Simple / martial", item.category || "—");
    add("Melee / ranged", item.kind || "—");
  } else if (weapon) add("Melee / ranged", item.kind || "—");
  add("Cost", item.cost ? fmtCost(item.cost) + (item.bundle > 1 ? ` per ${item.bundle}` : "") : null);
  add("Weight", item.weight ? fmtWeight(item.weight) + (item.bundle > 1 ? ` per ${item.bundle}` : "") : null);
  add("Rarity", item.rarity);
  // Toggles that need a feature (5e: attunement): the feature is "required".
  // States that need a feature (5e: attunement): the feature is "required".
  for (const st of systemStates()) if (st.requires && has(st.requires)) add(featureByKey(st.requires)?.label || st.label, "Required");
  if (weapon) add("Damage", [item.damage, item.damageType].filter(Boolean).join(" ") || "—");
  if (weapon || armor || (dnd && has("ammunition"))) add("Magic bonus", item.bonus && fmtMod(item.bonus));
  if (!dnd) for (const ft of activeSystem().features || []) if (has(ft.key)) for (const f of ft.fields) add(fieldLabel(f), fieldDisplay(f, item[f.key]));
  if (armor) {
    add("Armor Class", armorSummary(item).split(" · ")[0]);
    add("Strength", item.strength && `Str ${item.strength}`);
    add("Stealth", item.stealthDisadvantage && "Disadvantage");
  }
  if (has("holds")) {
    add("Capacity", item.capacity || (item.capacityLb && item.capacityLb + " " + weightUnitFor(item.capacityLb)));
    add("Weightless", item.weightless && "Contents don't count toward carried weight");
    add("Straps", item.straps && "Gear can be strapped to the outside");
    const spec = HOLDERS[item.holds];
    add("Holds", spec && `Only ${spec.label.toLowerCase()} — up to ${item.holdLimit || spec.limit} ${spec.unit}s` +
      (item.holds === "scrolls" ? " (parchment takes 2)" : ""));
  }
  if (has("liquid")) add("Liquid", item.liquidPints > 0 && `Holds ${fmtVolume(item.liquidPints)}`);
  add("Writing", has("writable") && !isDocument(item) && (hasWriting(item) ? "Written in" : "Blank — can be written in"));
  add("Picture", has("picture") && !isDocument(item) && (hasWriting(item) ? "Has a picture" : "No picture yet"));
  add("Poison type", item.poisonType);
  add("Save DC", item.saveDC);
  if (has("charges")) {
    add("Max charges", item.maxCharges);
    add("Recharge", item.recharge);
  }
  add("AC bonus", has("worn") && item.acBonus && fmtMod(item.acBonus));
  add("Trinket table", item.table && `${item.table} (${item.roll})`);
  add("Set", has("deck") && item.deckCards?.length && plural(item.deckCards.length, pieceNoun(item)));
  // The template's other fields.
  for (const f of tpl.fields || []) if (!DETAILS_SHOWN.has(f.key)) add(f.label, fieldDisplay(f, item[f.key]));
  add("Source", item.source);

  return h("div", { class: "details" },
    !watermarked && item.image && storedImage(item.image, "details-image", img => img.remove()),
    (!watermarked || onIcon) && h("div", { class: "details-icon" }, !watermarked && itemIcon(item, "big-icon", vars),
      onIcon && h("button", { class: "btn", type: "button", onclick: () => openIconPicker(item.icon, onIcon, item,
        { drawings: drawingLibrary(), onDrawing: d => onIcon(undefined, d) }) }, "Change icon")),
    h("dl", null, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
    item.properties?.length && h("div", { class: "props" }, propertyChips(item.properties)),
    item.effect && h("p", { class: "desc" }, item.effect),
    item.description && item.description.split("\n\n").map(p => h("p", { class: "desc" }, p)),
    item.activities?.length && h("table", { class: "mini" },
      h("thead", null, h("tr", null, h("th", null, "Activity"), h("th", null, "DC"))),
      h("tbody", null, item.activities.map(a => h("tr", null, h("td", null, a.activity), h("td", null, a.dc))))),
    has("pack") && item.contents?.length && h("div", null, h("h4", null, "Contents"),
      h("ul", { class: "contents" }, packPlan(item).map(r => h("li", null, r.qty > 1 ? `${r.qty} × ` : "", r.name,
        h("span", { class: "muted" }, { holder: " — holds the rest", strap: " — strapped outside", loose: " — on person", in: "" }[r.place]))))));
}

// Weapon properties as chips, each with its rule as a tooltip.
function propertyChips(props) {
  return props.map(p => {
    const glossary = activeSystem().glossary || {};
    const key = Object.keys(glossary).find(k => p.toLowerCase().startsWith(k.toLowerCase()));
    return h("span", { class: "chip", title: key ? glossary[key] : "" }, p);
  });
}

function fieldDisplay(f, v) {
  if (v == null || v === "") return null;
  if (f.kind === "checkbox") return v ? "Yes" : null;
  if (f.kind === "tags") return (v || []).join(", ");
  return String(v);
}

// Option values: "" = on person, "<uid>" = inside, "<uid>:out" = strapped to the outside.
function containerOptions(char, exclude) {
  const entry = exclude && char.items.find(x => x.uid === exclude);
  return [h("option", { value: "" }, "On person"),
    ...char.items.filter(c => holdsItems(char, c) && c.uid !== exclude && !(exclude && isDescendant(char, c.uid, exclude)))
      .flatMap(c => {
        const name = entryName(c) + (c.parent ? " (nested)" : "");
        // Counted containers are only offered for what they take, with how full they are.
        const spec = holderSpec(c);
        const fits = !spec || !entry || spec.size(entry.item) > 0 || entry.parent === c.uid;
        return [fits && h("option", { value: c.uid }, "In " + name + (spec ? ` (${holderUsed(char, c, spec)}/${spec.limit})` : "")),
          canStrap(c) && h("option", { value: c.uid + ":out" }, "Strapped to " + name)];
      }).filter(Boolean)];
}

function parseLocation(value) {
  const [parent, out] = (value || "").split(":");
  return { parent: parent || null, strapped: out === "out" };
}

function openEntry(entryUid) {
  const char = store.char();
  const e = char.items.find(x => x.uid === entryUid);
  if (!e) return;
  // A deck added before decks had cards: put them in now.
  if (isDeckEntry(e) && !e.deckFilled && !cardsIn(char, e).length) {
    commit((s, c) => { const x = c.items.find(x => x.uid === entryUid); if (x) fillDeck(c, x); });
    return openEntry(entryUid);
  }
  const base = e.item, it = currentItem(e, char); // kept as `base`; shown as it is now
  let close;
  const moveSel = h("select", { onchange: ev => {
    const loc = parseLocation(ev.target.value);
    moveEntry(e.uid, loc.parent, loc.strapped);
    close();
  } }, containerOptions(char, e.uid));
  moveSel.value = e.parent ? e.parent + (e.strapped ? ":out" : "") : "";

  const controls = h("div", { class: "entry-controls" },
    // A name of the player's own for this copy, shown instead of the item's name.
    h("label", { class: "field full" }, h("span", null, "Display name"),
      h("input", { type: "text", maxlength: 80, value: e.customName || "", placeholder: it.name,
        onchange: ev => commit((s, c) => {
          const x = c.items.find(x => x.uid === e.uid);
          const v = ev.target.value.trim();
          if (v && v !== it.name) x.customName = v; else delete x.customName;
        }) })),
    h("label", { class: "field" }, h("span", null, "Location"), moveSel),
    h("label", { class: "field" }, h("span", null, "Quantity"),
      h("input", { type: "number", min: 0, value: e.qty, inputmode: "numeric",
        onchange: ev => { const n = Math.floor(+ev.target.value || 0); if (!n) close(); setEntryQty(e, n); } })),
    (e.qty > 1 || sameStacks(char, e).length > 0) && h("div", { class: "field stack-actions" }, h("span", null, "Stack"),
      h("div", { class: "inline" },
        e.qty > 1 && h("button", { class: "btn", type: "button", onclick: () => { close(); openSplit(e.uid); } }, icon("copy"), "Split stack"),
        sameStacks(char, e).length > 0 && h("button", { class: "btn", type: "button", onclick: () => { close(); combineStacks(e.uid); } },
          icon("plus"), `Combine (${sameStacks(char, e).length + 1} stacks here)`))),
    hasFeature(it, "charges", e.srcId) && it.maxCharges && h("label", { class: "field" }, h("span", null, `Charges (max ${it.maxCharges})`),
      h("input", { type: "number", min: 0, max: it.maxCharges, value: e.charges ?? it.maxCharges,
        onchange: ev => commit((s, c) => { c.items.find(x => x.uid === e.uid).charges = Math.max(0, Math.min(it.maxCharges, +ev.target.value)); }) })),
    isEquipable(e) && h("label", { class: "check" },
      h("input", { type: "checkbox", checked: e.equipped, onchange: () => toggleEquip(e.uid) }), " Equipped / worn"),
    // The player's states (Attuned…): a checkbox each, unless only the GM can change it now.
    statesFor(e).filter(st => st.who === "player").map(st => {
      const locked = !canPlayerSet(char, e, st.key), lim = stateLimit(char, st);
      return h("label", { class: "check", title: locked ? `Only the ${term("gm")} can change this now` : "" },
        h("input", { type: "checkbox", checked: stateOn(char, e, st.key), disabled: locked && !isGmDevice(), onchange: ev => {
          if (!playerSetState(e.uid, st.key, ev.target.checked)) ev.target.checked = !ev.target.checked;
        } }), " " + st.label, lim != null && h("span", { class: "muted small" }, ` (${stateCount(char, st.key)} / ${lim})`),
        locked && h("span", { class: "muted small" }, " · locked"));
    }),
    isGmDevice() && gmStateControls(char, e),
    h("label", { class: "field full" }, h("span", null, "Notes"),
      h("textarea", { rows: 2, placeholder: "Engravings, who it came from, etc.", value: e.notes,
        onchange: ev => commit((s, c) => { c.items.find(x => x.uid === e.uid).notes = ev.target.value; }) })));

  // A pack carried as one item can be unpacked here, where it is (one pack from the stack).
  const planner = hasFeature(it, "pack", e.srcId) && it.contents?.length ? packPlanner(it, char) : null;
  const unpack = () => {
    const plan = planner.plan();
    close();
    commit((s, c) => {
      const x = c.items.find(x => x.uid === e.uid);
      if (!x) return;
      const where = { parent: x.parent, strapped: !!x.strapped };
      if (x.qty > 1) x.qty -= 1; else removeEntry(c, x.uid);
      unpackPack(c, plan.rows, { into: plan.into, ...where });
    }, `Unpacked ${entryName(e)}`, true);
  };
  const footer = [
    h("button", { class: "btn danger", onclick: () => { close(); commit((s, c) => removeEntry(c, e.uid), `Removed ${entryName(e)}`, true); } }, icon("trash"), "Remove"),
    planner && h("button", { class: "btn primary", onclick: unpack }, icon("package"), "Unpack"),
    h("button", { class: "btn", onclick: () => { close(); openSell(e.uid); } }, icon("coins"), "Sell"),
    // Player mode: no editing items (a copy can still be renamed with its display name).
    !playerOnly() && h("button", { class: "btn", onclick: () => { close(); openItemForm(base, { entryUid: e.uid }); } }, icon("edit"), "Edit"),
    !playerOnly() && h("button", { class: "btn", title: "Save a copy of this item as a reusable custom item", onclick: () => {
      commit(s => s.customItems.unshift({ ...clone(base), id: "custom-" + uid(), source: base.source || "Homebrew" }), `Saved “${base.name}” to custom items`);
    } }, icon("copy"), "Save as custom"),
    party.active && party.others().length > 0 &&
      h("button", { class: "btn", onclick: () => { close(); openTradeBuilder(null, e.uid); } }, icon("move"), "Trade"),
  ];
  const changeIcon = (id, drawing) => {
    close();
    commit((s, c) => {
      const x = c.items.find(x => x.uid === e.uid);
      if (drawing) return setItemDrawing(x.item, drawing);
      if (id) x.item.icon = id; else delete x.item.icon;
      setItemDrawing(x.item, null); // a chosen icon replaces a drawing
    }, "Icon changed");
    openEntry(e.uid);
  };
  // Things that can be written in: read what's there, and write (more).
  const kind = pageKind(it, e.srcId);
  const read = !!kind && hasPage(it, kind);
  const readBtn = kind && h("div", { class: "inline wrap read-btns" },
    read && h("button", { class: "btn primary read-btn", onclick: () => { close(); readEntry(e.uid); } },
      icon(kind === "picture" ? "image" : "book"), kind === "picture" ? "View" : "Read"),
    h("button", { class: "btn" + (read ? "" : " primary") + " read-btn", onclick: () => { close(); writeEntry(e.uid); } },
      icon(kind === "picture" ? "image" : "edit"), kind === "picture" ? (read ? "Change picture" : "Add a picture") : read ? "Write" : "Write in it"));
  // Older inventory copies of catalog containers get their capacity from the catalog.
  const shown = { ...it, holds: containerField(e, "holds"), liquidPints: containerField(e, "liquidPints") };
  const reopen = () => { close(); openEntry(entryUid); };
  // Live drawings read this copy's values as they are now (it may have changed, or been
  // replaced by a party update, since the dialog opened).
  const vars = () => {
    const c = store.char(), x = c?.items.find(i => i.uid === entryUid);
    return x ? entryIconVars(c, x) : {};
  };
  close = openModal(entryName(e), [e.customName && h("p", { class: "muted small" }, it.name),
    readBtn, liquidCap(e) > 0 && liquidControls(e), isDeckEntry(e) && deckSection(e, reopen, () => close()),
    cardBackButton(e, () => close()), controls, planner?.el, itemDetails(shown, changeIcon, e.srcId, vars, true), layerSections(base, key => stateOn(char, e, key))],
  { footer, wide: !!planner, head: iconFocusSwitch(), backdrop: iconBackdrop(it, vars) });
}

const LIQUIDS = ["Water", "Wine", "Ale", "Beer", "Mead", "Cider", "Milk", "Juice", "Tea", "Brandy", "Rum", "Whiskey",
  "Oil", "Lamp oil", "Holy water", "Acid", "Alchemist's fire", "Antitoxin", "Potion of Healing", "Blood", "Ink", "Vinegar"];

// What's in a waterskin, flask, vial…: the liquid's name and how much, with a slider.
function liquidControls(e) {
  const cap = liquidCap(e);
  // Ounces for small vessels, quarter pints for mid-sized ones, whole pints for barrels.
  const step = cap <= 2 ? 1 / 16 : cap <= 16 ? 0.25 : 1;
  let pints = Math.min(cap, e.liquid?.pints || 0), name = e.liquid?.name || "";
  const out = h("output", { class: "liquid-amount" });
  const save = () => commit((s, c) => {
    const x = c.items.find(x => x.uid === e.uid);
    if (!x) return;
    if (pints > 0 || name.trim()) x.liquid = { name: name.trim(), pints };
    else delete x.liquid;
  });
  const slider = h("input", { type: "range", class: "liquid-slider", min: 0, max: cap, step, value: pints,
    "aria-label": "How much is in it", oninput: ev => { pints = +ev.target.value; draw(); }, onchange: save });
  const draw = () => {
    slider.value = pints;
    slider.style.setProperty("--fill", (pints / cap * 100).toFixed(1) + "%");
    out.textContent = `${fmtVolume(pints)} of ${fmtVolume(cap)}${e.qty > 1 ? " each" : ""}`;
  };
  const set = n => { pints = n; draw(); save(); };
  draw();
  return h("div", { class: "liquid-box" },
    h("div", { class: "liquid-head" },
      h("label", { class: "field" }, h("span", null, "Contents"),
        h("input", { type: "text", list: "liquid-list", placeholder: "Water, wine, lamp oil…", value: name,
          onchange: ev => { name = ev.target.value; if (name.trim() && !pints) pints = cap; draw(); save(); } }),
        h("datalist", { id: "liquid-list" }, LIQUIDS.map(l => h("option", { value: l })))),
      h("div", { class: "liquid-btns" },
        h("button", { type: "button", class: "btn", onclick: () => set(0) }, "Empty"),
        h("button", { type: "button", class: "btn", onclick: () => set(cap) }, "Fill"))),
    slider, out);
}

// ------------------------------------------------------------------ splitting & combining stacks

// Other stacks of exactly the same item in the same place (e.g. after a split).
function sameStacks(char, e) {
  const json = JSON.stringify(e.item);
  return char.items.filter(x => x !== e && x.srcId === e.srcId && x.parent === e.parent && !!x.strapped === !!e.strapped &&
    (x.customName || "") === (e.customName || "") && JSON.stringify(x.item) === json && !char.items.some(k => k.parent === x.uid));
}

// Divide a stack: how many go into the new stack, and where it goes (default: right beside it).
function openSplit(entryUid) {
  const char = store.char();
  const e = char.items.find(x => x.uid === entryUid);
  if (!e || e.qty < 2) return;
  let n = Math.floor(e.qty / 2), close;
  const summary = h("p", { class: "split-summary" });
  const num = h("input", { type: "number", min: 1, max: e.qty - 1, value: n, inputmode: "numeric", "aria-label": "How many to split off",
    oninput: ev => set(+ev.target.value, "num") });
  const slider = h("input", { type: "range", min: 1, max: e.qty - 1, value: n, "aria-label": "How many to split off",
    oninput: ev => set(+ev.target.value, "slider") });
  const set = (v, from) => {
    n = Math.max(1, Math.min(e.qty - 1, Math.floor(v) || 1));
    if (from !== "num") num.value = n;
    if (from !== "slider") slider.value = n;
    summary.textContent = `${(e.qty - n).toLocaleString()} stay · ${n.toLocaleString()} in the new stack`;
  };
  const where = h("select", { "aria-label": "Put the new stack" }, containerOptions(char, e.uid));
  where.value = e.parent ? e.parent + (e.strapped ? ":out" : "") : "";
  set(n);
  const split = () => {
    close();
    const newUid = uid();
    commit((s, c) => {
      const x = c.items.find(x => x.uid === entryUid);
      if (!x || x.qty <= n) return;
      x.qty -= n;
      // Same item, notes and contents; not equipped or attuned (that stays with the original).
      c.items.splice(c.items.indexOf(x) + 1, 0, { ...clone(x), uid: newUid, qty: n, equipped: false, attuned: false, toggles: {}, states: {} });
    }, `Split ${n} × ${entryName(e)} into a new stack`, true);
    const loc = parseLocation(where.value);
    if (loc.parent !== (e.parent || null) || loc.strapped !== !!e.strapped) {
      moveEntry(newUid, loc.parent, loc.strapped);
      // A quiver or case that took only part of it: the rest goes back into the original stack.
      const left = store.char().items.find(x => x.uid === newUid && x.parent === e.parent && !!x.strapped === !!e.strapped);
      if (left) commit((s, c) => {
        const x = c.items.find(x => x.uid === entryUid), y = c.items.find(y => y.uid === newUid);
        if (!x || !y) return;
        x.qty += y.qty;
        c.items = c.items.filter(i => i !== y);
      });
    }
  };
  close = openModal(`Split ${entryName(e)}`, h("div", { class: "form" },
    h("p", { class: "muted small" }, `${e.qty.toLocaleString()} in this stack${(e.item.bundle || 1) > 1 ? ` (bundles of ${e.item.bundle})` : ""}.`),
    h("label", { class: "field" }, h("span", null, "How many go into the new stack"), h("div", { class: "inline" }, num, slider)),
    summary,
    h("label", { class: "field" }, h("span", null, "Put the new stack"), where)),
  { footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: split }, icon("check"), "Split"),
  ] });
}

// Join identical stacks in the same place back into one.
function combineStacks(entryUid) {
  const char = store.char();
  const e = char.items.find(x => x.uid === entryUid);
  const others = e ? sameStacks(char, e) : [];
  if (!others.length) return;
  const ids = new Set(others.map(o => o.uid));
  commit((s, c) => {
    const x = c.items.find(x => x.uid === entryUid);
    if (!x) return; // gone meanwhile (e.g. traded away)
    for (const o of c.items.filter(o => ids.has(o.uid))) {
      x.qty += o.qty;
      if (o.notes && !x.notes.includes(o.notes)) x.notes = [x.notes, o.notes].filter(Boolean).join("\n");
      x.equipped = x.equipped || o.equipped;
      x.states = { ...ownStates(o), ...ownStates(x) };
      delete x.attuned; delete x.toggles;
    }
    c.items = c.items.filter(o => !ids.has(o.uid));
  }, `Combined ${others.length + 1} stacks of ${entryName(e)}`, true);
}

function openSell(entryUid) {
  const char = store.char();
  const e = char.items.find(x => x.uid === entryUid);
  if (!e) return;
  const unit = (e.item.cost || 0) / (e.item.bundle || 1);
  let qty = e.qty, pct = 50, close;
  const out = h("p", { class: "big-num" });
  const upd = () => { out.textContent = fmtMoney(Math.floor(unit * qty * pct / 100)); };
  const body = h("div", { class: "form" },
    h("label", { class: "field" }, h("span", null, `Quantity (of ${e.qty})`),
      h("input", { type: "number", min: 1, max: e.qty, value: qty, oninput: ev => { qty = Math.max(1, Math.min(e.qty, +ev.target.value || 1)); upd(); } })),
    h("label", { class: "field" }, h("span", null, "Price (% of list)"),
      h("input", { type: "number", min: 0, value: pct, oninput: ev => { pct = Math.max(0, +ev.target.value || 0); upd(); } })),
    h("div", null, h("span", { class: "muted" }, "You receive"), out));
  upd();
  close = openModal(`Sell ${entryName(e)}`, body, { footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: () => {
      close();
      commit((s, c) => {
        const x = c.items.find(x => x.uid === entryUid);
        if (!x) return;
        c.coins = receiveCoins(c.coins, Math.floor(unit * qty * pct / 100));
        x.qty -= qty;
        if (x.qty <= 0) removeEntry(c, x.uid);
      }, `Sold ${qty} × ${entryName(e)}`, true);
    } }, "Sell"),
  ] });
}

// ------------------------------------------------------------------ coins

function openCoins() {
  const char = store.char();
  const coins = { ...char.coins };
  let close;
  let amt = 0, denom = currency().show;
  const body = h("div", { class: "form" },
    h("div", { class: "coin-grid" }, coinOrder().map(k => h("label", { class: "field coin-field " + k },
      h("span", null, k.toUpperCase()),
      h("input", { type: "number", min: 0, inputmode: "numeric", value: coins[k] || 0,
        oninput: ev => { coins[k] = Math.max(0, Math.floor(+ev.target.value || 0)); } })))),
    h("h4", null, "Quick transaction"),
    h("div", { class: "inline" },
      h("input", { type: "number", min: 0, inputmode: "decimal", placeholder: "Amount", oninput: ev => { amt = +ev.target.value || 0; } }),
      h("select", { onchange: ev => { denom = ev.target.value; } }, coinOrder().map(k => h("option", { value: k, selected: k === denom }, k))),
      h("button", { class: "btn", onclick: () => txn(1) }, icon("plus"), "Gain"),
      h("button", { class: "btn", onclick: () => txn(-1) }, icon("minus"), "Spend")),
    h("p", { class: "muted small" }, "Spending makes change automatically: paying with a bigger coin gives smaller ones back."),
    h("button", { class: "btn", onclick: () => {
      close();
      commit((s, c) => {
        c.coins = receiveCoins(Object.fromEntries(coinOrder().map(k => [k, 0])), coinTotalCp(c.coins));
      }, `Converted coins to ${changeCoins().join("/")}`, true);
    } }, `Consolidate into ${changeCoins().join(" / ")}`));

  function txn(sign) {
    const cp = Math.round(amt * coinValue(denom));
    if (!cp) return;
    if (sign > 0) {
      close();
      // Whole coins as given; a fraction (1.5 gp) as its worth in smaller coins.
      commit((s, c) => {
        c.coins = Number.isInteger(amt) ? { ...c.coins, [denom]: (c.coins[denom] || 0) + amt } : receiveCoins(c.coins, cp);
      }, `Gained ${amt} ${denom}`, true);
    } else {
      const paid = payCoins(char.coins, cp);
      if (!paid) return toast("Not enough coin");
      close();
      commit((s, c) => { c.coins = paid; }, `Spent ${amt} ${denom}`, true);
    }
  }
  close = openModal("Coin purse", body, { footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: () => { close(); commit((s, c) => { c.coins = coins; }, "Coins updated", true); } }, "Save"),
  ] });
}

// ------------------------------------------------------------------ catalog view

// Catalog tabs: everything, each group that has items, and the player's own custom items.
function catTypes() {
  const has = new Set(store.catalog().map(i => groupOfItem(i)?.id));
  return [["all", "All"], ...systemGroups().filter(g => has.has(g.id)).map(g => [g.id, g.name]), ["custom", "Custom"]];
}

// Catalog items in a tab (catTypes), matching a search, optionally in one subcategory.
function catalogFiltered(t = ui.catType, q = ui.catSearch, sub = ui.catSub) {
  q = q.trim();
  const subMatch = sub && groupById(t) ? subcategories(t).find(s => s.key === sub)?.match : null;
  return store.catalog().filter(i => {
    if (t === "custom") { if (!i.id.startsWith("custom-")) return false; }
    else if (t !== "all" && groupOfItem(i)?.id !== t) return false;
    if (subMatch && !subMatch(i)) return false;
    return matchesSearch(i, q);
  });
}

const CATALOG_TABS = [["items", "Items"], ["mine", "My items"], ["drawings", "Drawings"], ["templates", "Templates"]];

function renderCatalog() {
  const tab = CATALOG_TABS.some(([k]) => k === ui.catTab) ? ui.catTab : "items";
  return h("div", { class: "view-catalog-tabs" },
    subTabs("Catalog", CATALOG_TABS, tab, k => { ui.catTab = k; render(); }),
    tab === "items" ? catalogItemsView()
      : h("div", { class: "view-custom" }, tab === "mine" ? myItemsSection() : tab === "drawings" ? drawingsSection() : templatesSection()));
}

// A row of sub-tabs at the top of a screen.
function subTabs(label, tabs, active, onPick) {
  return h("div", { class: "seg sub-tabs", role: "tablist", "aria-label": label },
    tabs.map(([k, text]) => h("button", { type: "button", role: "tab", class: active === k ? "active" : "", "aria-selected": String(active === k),
      onclick: () => onPick(k) }, text)));
}

function catalogItemsView() {
  const tiles = viewPrefs().layout === "tiles";
  const list = tiles ? tilesBox("cat-tiles") : h("div", { class: "cat-list" });
  const count = h("span", { class: "muted small" });
  const draw = () => {
    const items = catalogFiltered();
    count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    setChildren(list, items.slice(0, ui.catLimit).map(tiles ? catalogTile : catalogRow),
      items.length > ui.catLimit ? h("button", { class: "btn wide", onclick: () => { ui.catLimit += 300; draw(); } }, `Show more (${items.length - ui.catLimit} left)`) : null,
      !items.length ? h("p", { class: "muted pad" }, "No items found. ", h("button", { class: "link", onclick: () => openItemForm(null) }, "Create a custom item?")) : null);
    // New tiles after searching don't resize the grid, so fit their names now.
    if (tiles) fitTileNames(list);
  };
  draw();
  const chips = chipRow("Item types", catTypes().map(([k, label]) =>
    h("button", { class: "chip-btn" + (ui.catType === k ? " active" : ""), role: "tab", "aria-selected": String(ui.catType === k),
      onclick: () => { ui.catType = k; ui.catSub = null; ui.catLimit = 150; render(); } },
      groupById(k) && colorDot(groupColor(k), label), label)));
  // Within a group: its subcategories (Gear / Tools, Light / Medium / Heavy…), each in its shade.
  const all = groupById(ui.catType) ? catalogFiltered(ui.catType, ui.catSearch, null) : [];
  const subs = groupById(ui.catType) && subChips(ui.catType, ui.catSub, s => all.filter(s.match).length,
    key => { ui.catSub = key; ui.catLimit = 150; render(); });
  return h("div", { class: "view-catalog" },
    h("div", { class: "toolbar" },
      h("label", { class: "search" }, icon("search"),
        h("input", { type: "search", placeholder: "Search items, properties, descriptions…", value: ui.catSearch,
          oninput: e => { ui.catSearch = e.target.value; ui.catLimit = 150; draw(); } })),
      (activeSystem().tables || []).length > 0 && h("button", { class: "btn", onclick: openTrinketRoller }, icon("dice"), h("span", null, term("rollTable"))),
      h("button", { class: "btn primary", onclick: () => openItemForm(null) }, icon("plus"), h("span", { class: "hide-sm" }, "New custom item")),
      layoutToggle(), tileLabelToggles()),
    chips, subs, count, list);
}

function quickAdd(item) {
  if (hasFeature(item, "pack", item.id)) return openCatalogItem(item);
  commit((s, c) => addToInventory(c, item), `Added ${item.name}${item.bundle > 1 ? ` ×${item.bundle}` : ""}`, true);
}

function catalogTile(item) {
  const el = h("div", { class: "tile" },
    h("button", { class: "tile-hit", onclick: () => openCatalogItem(item), "aria-label": item.name }),
    itemIcon(item, "tile-icon"),
    h("span", { class: "tile-name" }, item.name),
    minimalCorners(item.cost || 0, item.weight || 0, (item.bundle || 1) > 1 ? "×" + item.bundle : null));
  el.title = [item.name, itemSummary(item), item.id.startsWith("custom-") && "custom"].filter(Boolean).join(" · ");
  el.style.setProperty("--type", itemColor(item));
  return el;
}

function catalogRow(item) {
  const isCustom = item.id.startsWith("custom-");
  return h("div", { class: "row cat-row" },
    itemIcon(item, "row-icon"),
    h("button", { class: "row-main", onclick: () => openCatalogItem(item) },
      h("div", { class: "row-title" }, item.name, isCustom && h("span", { class: "tag custom" }, "custom")),
      h("div", { class: "row-sub" }, itemSummary(item))),
    h("div", { class: "row-cost muted" }, fmtCost(item.cost)),
    h("div", { class: "row-weight muted" }, fmtWeight(item.weight)),
    iconBtn("plus", "Add to inventory", () => quickAdd(item), "add"));
}

function openCatalogItem(item) {
  const char = store.char();
  const isCustom = item.id.startsWith("custom-");
  const isPack = hasFeature(item, "pack", item.id);
  let qty = item.bundle || 1, parent = null, strapped = false, payForPack = false, close;
  const unit = (item.cost || 0) / (item.bundle || 1);
  const priceEl = h("span", { class: "muted" });
  const updPrice = () => { priceEl.textContent = item.cost ? `Total ${fmtCost(Math.round(unit * qty))}` : ""; };
  updPrice();
  const controls = h("div", { class: "entry-controls" },
    !isPack && h("label", { class: "field" }, h("span", null, item.bundle > 1 ? `Quantity (bundle of ${item.bundle})` : "Quantity"),
      h("input", { type: "number", min: 1, value: qty, inputmode: "numeric", oninput: e => { qty = Math.max(1, Math.floor(+e.target.value || 1)); updPrice(); } })),
    h("label", { class: "field" }, h("span", null, "Put in"),
      h("select", { onchange: e => { ({ parent, strapped } = parseLocation(e.target.value)); } }, containerOptions(char))),
    h("div", { class: "field" }, h("span", null, `Purse: ${fmtCost(coinTotalCp(char.coins))}`), priceEl),
    isPack && item.cost && h("label", { class: "check" },
      h("input", { type: "checkbox", onchange: e => { payForPack = e.target.checked; } }), ` Pay ${fmtCost(item.cost)} from purse`));
  const planner = isPack ? packPlanner(item, char) : null;
  // Returns the purse after paying for a pack (or unchanged), or null if unaffordable.
  const packPurse = () => {
    if (!payForPack) return char.coins;
    const p = payCoins(char.coins, item.cost);
    if (!p) toast(`${char.name} can't afford ${fmtCost(item.cost)}`);
    return p;
  };

  const add = (buy) => {
    const cost = Math.round(unit * qty);
    let purse = null;
    if (buy && cost) {
      purse = payCoins(char.coins, cost);
      if (!purse) return toast(`${char.name} can't afford ${fmtCost(cost)}`);
    }
    close();
    commit((s, c) => {
      if (purse) c.coins = purse;
      addToInventory(c, item, qty, parent, strapped);
    }, `${buy ? "Bought" : "Added"} ${qty > 1 ? qty + " × " : ""}${item.name}`, true);
  };

  const footer = [
    isCustom && h("button", { class: "btn danger", onclick: () => { close(); deleteCustom(item); } }, icon("trash"), "Delete"),
    h("button", { class: "btn", onclick: () => { close(); openItemForm(isCustom ? item : { ...item, id: null, source: item.source }, { copyOf: !isCustom }); } },
      icon(isCustom ? "edit" : "copy"), isCustom ? "Edit" : "Customize"),
    isPack ? [
      h("button", { class: "btn", onclick: () => {
        const purse = packPurse(); if (!purse) return;
        close();
        commit((s, c) => { c.coins = purse; addToInventory(c, item, 1, parent, strapped); }, `Added ${item.name}`, true);
      } }, "Add as one item"),
      h("button", { class: "btn primary", onclick: () => {
        const purse = packPurse(); if (!purse) return;
        close();
        const plan = planner.plan();
        commit((s, c) => { c.coins = purse; unpackPack(c, plan.rows, { into: plan.into, parent, strapped }); }, `Unpacked ${item.name}`, true);
      } }, icon("package"), "Unpack"),
    ] : [
      item.cost ? h("button", { class: "btn", onclick: () => add(true) }, icon("cart"), "Buy") : null,
      h("button", { class: "btn primary", onclick: () => add(false) }, icon("plus"), "Add"),
    ],
  ];
  // Custom items can change their icon right here; catalog items via "Customize".
  const changeIcon = isCustom ? (id, drawing) => {
    close();
    commit(() => {
      const x = store.findCustom(item.id);
      if (drawing) return setItemDrawing(x, drawing);
      if (id) x.icon = id; else delete x.icon;
      setItemDrawing(x, null); // a chosen icon replaces a drawing
    }, "Icon changed");
    openCatalogItem(store.findCustom(item.id));
  } : null;
  const readBtn = isDocument(item) && h("button", { class: "btn primary read-btn", onclick: () => {
    close();
    openReader(item, isCustom ? { onEdit: () => openItemForm(store.findCustom(item.id) || item) } : {});
  } }, icon(item.imageOnly ? "image" : "book"), item.imageOnly ? "View" : "Read");
  close = openModal(item.name, [readBtn, controls, planner?.el, itemDetails(item, changeIcon, item.id, null, true), layerSections(item, () => false)],
    { footer, wide: !!planner, head: iconFocusSwitch(), backdrop: iconBackdrop(item) });
}

// ------------------------------------------------------------------ decks

// Take cards out of a deck: they go where the deck is, as ordinary items.
function takeCards(deckUid, cardUids, msg) {
  commit((s, c) => {
    const deck = c.items.find(x => x.uid === deckUid);
    if (!deck) return;
    for (const x of c.items) if (cardUids.includes(x.uid) && x.parent === deckUid) { x.parent = deck.parent; x.strapped = !!deck.strapped; }
  }, msg, true);
}

function putCardsBack(deckUid, cardUids, msg) {
  commit((s, c) => {
    if (!c.items.some(x => x.uid === deckUid)) return;
    for (const x of c.items) if (cardUids.includes(x.uid)) { x.parent = deckUid; x.strapped = false; x.equipped = false; }
  }, msg, true);
}

// A set's details (a deck of cards, a chess set…): its pieces, to take out (one, all, or at random) and put back.
function deckSection(deck, reopen, closeDetails) {
  const char = store.char();
  const inside = cardsIn(char, deck), out = cardsOut(char, deck);
  const noun = pieceNoun(deck.item), nouns = noun + "s", name = entryName(deck);
  const act = fn => () => { fn(); reopen(); };
  return h("section", { class: "deck" },
    h("div", { class: "section-head" }, h("h4", null, `${nouns[0].toUpperCase() + nouns.slice(1)} — ${plural(inside.length, noun)} in the ${name.toLowerCase()}`)),
    h("div", { class: "inline wrap deck-actions" },
      inside.length > 0 && h("button", { class: "btn primary", type: "button", onclick: () => { closeDetails(); openDraw(deck.uid); } },
        icon("dice"), noun === "card" ? "Draw a card" : "Take one at random"),
      inside.length > 1 && h("button", { class: "btn", type: "button", onclick: act(() => takeCards(deck.uid, inside.map(x => x.uid), `Took all the ${nouns} out of the ${name}`)) }, "Take all out"),
      out.length > 0 && h("button", { class: "btn", type: "button", onclick: act(() => putCardsBack(deck.uid, out.map(x => x.uid), `Put ${plural(out.length, noun)} back`)) }, `Put ${plural(out.length, noun)} back`)),
    inside.length ? h("div", { class: "group deck-cards" }, inside.map(card => h("div", { class: "row" + (card.item.image ? " has-img" : "") },
      itemIcon(card.item, "row-icon"),
      h("div", { class: "row-main static" }, h("div", { class: "row-title" }, card.item.name)),
      h("button", { class: "btn", type: "button", onclick: act(() => takeCards(deck.uid, [card.uid], `Took out ${card.item.name}`)) }, "Take out"))))
      : h("p", { class: "muted small" }, `The ${name.toLowerCase()} is empty.`),
    out.length > 0 && h("p", { class: "muted small" }, `Taken out: ${out.map(x => x.item.name).join(", ")}.`),
    h("p", { class: "muted small" }, `${nouns[0].toUpperCase() + nouns.slice(1)} in the set don't show in your inventory. Taken out, they're ordinary items (their details can put them back).`));
}

// ------------------------------------------------------------------ drawing from a set

// Draw from a set into a window of its own: the first piece fills it, and each further draw
// shrinks them all to share it (1, then 2 side by side or stacked, 2×2, 3×3…, whichever makes
// them biggest for their shape) until they'd be too small, when it scrolls instead. Drawn pieces
// are already out of the set, where it is; Keep leaves them there, Put back returns them.
// The window only shows what drawFromSet did, so a party could later show the same draw to everyone.
function openDraw(setUid, count = 1) {
  const char = store.char();
  const set = char.items.find(e => e.uid === setUid);
  if (!set) return;
  const noun = pieceNoun(set.item), name = entryName(set);
  const drawn = []; // piece uids, in the order drawn
  const draw = n => {
    let got = [];
    commit((s, c) => { got = drawFromSet(c, setUid, n); }, null, false);
    drawn.push(...got);
    if (!got.length) toast(`The ${name.toLowerCase()} is empty`);
    return got;
  };

  const title = h("div", { class: "reader-title" });
  const board = drawBoard(noun);
  const drawBtn = h("button", { class: "btn primary", onclick: () => { if (draw(1).length) refresh(true); } }, icon("dice"), "");
  const backBtn = h("button", { class: "btn", onclick: () => { putCardsBack(setUid, drawn, `Put ${plural(drawn.length, noun)} back in the ${name}`); close(); } }, icon("undo"), "Put back");
  const keepBtn = h("button", { class: "btn primary", onclick: () => { toast(`${plural(drawn.length, noun)} to your inventory`); close(); } }, icon("check"), "Keep");
  const refresh = (added = false) => {
    const c = store.char();
    const pieces = drawn.map(u => c.items.find(x => x.uid === u)).filter(Boolean);
    const left = cardsIn(c, c.items.find(x => x.uid === setUid) || set).length;
    title.textContent = `${name}: ${plural(pieces.length, noun)} drawn`;
    drawBtn.lastChild.textContent = `Draw ${noun === "card" ? "another" : "one more"} (${left} left)`;
    drawBtn.disabled = !left;
    backBtn.disabled = keepBtn.disabled = !pieces.length;
    board.show(pieces.map(p => ({ uid: p.uid, item: p.item, name: entryName(p) })), added, uid => {
      // Put just this one back.
      putCardsBack(setUid, [uid], null);
      drawn.splice(drawn.indexOf(uid), 1);
      if (drawn.length) refresh(); else close();
    });
  };

  const overlay = h("div", { class: "reader draw-view", role: "dialog", "aria-modal": "true", "aria-label": `Drawing from ${name}` },
    h("div", { class: "reader-bar" }, title,
      iconBtn("x", "Close (keeps what was drawn)", () => close())),
    board.el,
    h("div", { class: "draw-actions" }, drawBtn, backBtn, keepBtn));
  const onKey = e => { if (e.key === "Escape") close(); };
  const onResize = () => board.layout();
  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    document.body.classList.toggle("modal-open", !!document.getElementById("modal-root").children.length);
    render();
  }
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
  document.body.append(overlay);
  document.body.classList.add("modal-open");
  if (draw(count).length) refresh(true); else close();
}

// The drawn pieces, laid out as big as they fit. Shows pieces given as { uid, item, name }
// (from this character, or later from a party's shared draw).
const DRAW_MIN_WIDTH = 110, DRAW_GAP = 12;
function drawBoard(noun) {
  const grid = h("div", { class: "draw-grid" });
  const stage = h("div", { class: "draw-stage" }, grid);
  let count = 0, aspect = noun === "card" ? 2.5 / 3.5 : 1; // width / height; a picture's own shape once it's loaded

  // Columns that make the pieces biggest; if even that's too small, scroll at a readable size.
  const layout = () => {
    const cs = getComputedStyle(stage);
    const W = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!count || W <= 0 || H <= 0) return;
    let best = { cols: 1, w: 0 };
    for (let cols = 1; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);
      const w = Math.min((W - DRAW_GAP * (cols - 1)) / cols, (H - DRAW_GAP * (rows - 1)) / rows * aspect);
      if (w > best.w) best = { cols, w };
    }
    let { cols, w } = best;
    const scrolls = w < DRAW_MIN_WIDTH;
    if (scrolls) {
      cols = Math.max(1, Math.floor((W + DRAW_GAP) / (DRAW_MIN_WIDTH + DRAW_GAP)));
      w = (W - DRAW_GAP * (cols - 1)) / cols;
    }
    stage.classList.toggle("scrolls", scrolls);
    grid.style.gridTemplateColumns = `repeat(${cols}, ${Math.floor(w)}px)`;
    grid.style.setProperty("--piece-h", Math.floor(w / aspect) + "px");
  };

  const face = p => {
    if (p.item.image) {
      const img = storedImage(p.item.image, "draw-img", el => el.replaceWith(textFace(p)));
      img.addEventListener("load", () => {
        // The pieces take the shape of their pictures.
        if (img.naturalWidth && img.naturalHeight) { aspect = img.naturalWidth / img.naturalHeight; layout(); }
      }, { once: true });
      return img;
    }
    return textFace(p);
  };
  const textFace = p => {
    const el = h("div", { class: "draw-face" }, itemIcon({ ...p.item, image: undefined }, "draw-icon"), h("span", { class: "draw-name" }, p.name));
    el.style.setProperty("--type", itemColor(p.item));
    return el;
  };

  const show = (pieces, added, onPutBack) => {
    count = pieces.length;
    setChildren(grid, pieces.map((p, i) => h("figure", { class: "draw-piece" + (added && i === pieces.length - 1 ? " new" : ""), title: p.name },
      face(p),
      h("figcaption", null, p.name),
      onPutBack && h("button", { type: "button", class: "draw-back", title: `Put ${p.name} back`, "aria-label": `Put ${p.name} back`,
        onclick: () => onPutBack(p.uid) }, icon("undo")))));
    layout();
    requestAnimationFrame(() => {
      layout();
      // Scrolling: bring the newest draw into view.
      if (added && stage.classList.contains("scrolls")) grid.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };
  if (window.ResizeObserver) new ResizeObserver(layout).observe(stage);
  return { el: stage, show, layout };
}

// A card taken out of a deck this character still has: put it back.
function cardBackButton(e, close) {
  if (!e.fromDeck || e.parent === e.fromDeck) return null;
  const deck = store.char().items.find(x => x.uid === e.fromDeck);
  if (!deck) return null;
  return h("button", { class: "btn primary read-btn", type: "button", onclick: () => { close(); putCardsBack(deck.uid, [e.uid], `Put ${entryName(e)} back in the ${entryName(deck)}`); } },
    icon("package"), `Put back in the ${entryName(deck)}`);
}

// Unpacking a pack: which items to include, how many, and where each goes (inside its container,
// strapped outside, or loose), and whether to pack into its own container or one already carried.
function packPlanner(pack, char) {
  const rows = packPlan(pack);
  let into = "";
  const holderRow = () => rows.find(r => r.place === "holder");
  const list = h("div", { class: "group pack-plan" });
  const note = h("p", { class: "muted small" });
  const intoSel = h("select", { "aria-label": "Pack into", onchange: e => { into = e.target.value; draw(); } });
  const draw = () => {
    const holder = holderRow();
    const theirs = char.items.filter(e => holdsItems(char, e) && !holderSpec(e));
    setChildren(intoSel,
      h("option", { value: "" }, holder ? `Its own ${holder.name}` : "Nothing — everything on person"),
      theirs.map(e => h("option", { value: e.uid, selected: into === e.uid }, `My ${entryName(e)}${e.parent ? " (nested)" : ""}`)));
    intoSel.value = into;
    const intoEntry = into && char.items.find(e => e.uid === into);
    const target = intoEntry ? entryName(intoEntry) : holder?.name;
    note.textContent = into && holder ? `The pack's own ${holder.name} comes along too, on person.` : "";
    setChildren(list, rows.map(r => h("div", { class: "row pack-row" + (r.include ? "" : " off") },
      h("input", { type: "checkbox", checked: r.include, "aria-label": `Include ${r.name}`, onchange: e => { r.include = e.target.checked; draw(); } }),
      r.item ? itemIcon(r.item, "row-icon") : h("span", { class: "row-icon" }),
      h("div", { class: "row-main static" }, h("div", { class: "row-title" }, r.name),
        !r.item && h("div", { class: "row-sub warn-text" }, "Not in the catalog — skipped"),
        r.place === "strap" && target && h("div", { class: "row-sub" }, `Strapped to the ${target}`),
        r.place === "in" && target && h("div", { class: "row-sub" }, `In the ${target}`)),
      h("input", { type: "number", min: 1, value: r.qty, class: "pack-qty", inputmode: "numeric", "aria-label": `How many ${r.name}`,
        oninput: e => { r.qty = Math.max(1, Math.floor(+e.target.value || 1)); } }),
      h("select", { class: "pack-place", "aria-label": `Where ${r.name} goes`, onchange: e => {
        // Only one container holds the rest.
        if (e.target.value === "holder") for (const x of rows) if (x.place === "holder") x.place = "in";
        r.place = e.target.value;
        draw();
      } }, PACK_PLACES.filter(([k]) => k !== "holder" || hasFeature(r.item, "holds", r.item?.id))
        .map(([k, label]) => h("option", { value: k, selected: r.place === k }, label))))));
  };
  draw();
  return {
    el: h("section", { class: "pack-planner" },
      h("h4", null, "Unpacking"),
      h("label", { class: "field" }, h("span", null, "Pack into"), intoSel),
      note, list,
      h("p", { class: "muted small" }, "Untick anything you don't want. “Strapped outside” needs a container with straps, like a backpack; otherwise it goes inside.")),
    plan: () => ({ rows, into: into || null }),
  };
}

function deleteCustom(item) {
  confirmDialog(`Delete the custom item “${item.name}”? Copies already in inventories are kept.`, "Delete",
    () => commit(() => {
      const pkg = store.packageOf(item.id);
      if (pkg) pkg.customItems = pkg.customItems.filter(i => i.id !== item.id);
    }, `Deleted ${item.name}`, true));
}

// ------------------------------------------------------------------ trinket roller

function openTrinketRoller() {
  let close, current = null;
  const result = h("div", { class: "trinket-result" }, h("p", { class: "muted" }, "Pick a table and roll."));
  const tables = activeSystem().tables || [];
  if (!tables.some(t => t.id === ui.trinketTable)) ui.trinketTable = tables[0]?.id;
  const sel = h("select", { onchange: e => { ui.trinketTable = e.target.value; } },
    tables.map(t => h("option", { value: t.id, selected: t.id === ui.trinketTable }, `${t.name} (${t.die})`)));
  const roll = () => {
    const t = tables.find(t => t.id === ui.trinketTable);
    const entry = t.entries[Math.floor(Math.random() * t.entries.length)];
    current = catalogItem(entry.id);
    result.replaceChildren(
      h("div", { class: "die" }, entry.roll),
      h("p", { class: "trinket-text" }, current.name),
      h("p", { class: "muted small" }, `${t.name} — ${t.book}`));
    result.classList.remove("pop"); void result.offsetWidth; result.classList.add("pop");
  };
  close = openModal(term("rollTitle"), h("div", { class: "form" },
    h("label", { class: "field" }, h("span", null, "Table"), sel), result), { footer: [
    h("button", { class: "btn", onclick: roll }, icon("dice"), "Roll"),
    h("button", { class: "btn primary", onclick: () => {
      if (!current) return roll();
      commit((s, c) => addToInventory(c, current), `Added trinket to ${store.char().name}`, true);
      close();
    } }, icon("plus"), "Keep it"),
  ] });
}

// ------------------------------------------------------------------ item form (custom items + editing)

function openItemForm(item, opts = {}) {
  if (!item) return chooseTemplate(tpl => openItemForm(newItemFrom(tpl), opts));
  const draft = clone(item);
  const tpl = itemTemplate(draft);
  const fields = templateFields(tpl);
  // The catalog item this is (or is a copy of): older copies take missing feature fields from it.
  const srcId = opts.entryUid ? store.char()?.items.find(x => x.uid === opts.entryUid)?.srcId : item.id;
  const cat = catalogItem(srcId);
  // The saved item this form edits (not saved with it): lets a drawing tell "this item" from others.
  Object.defineProperty(draft, "_self", { enumerable: false, value: opts.entryUid
    ? store.char()?.items.find(x => x.uid === opts.entryUid)?.item
    : store.findCustom(draft.id) });
  // An inventory copy: its drawing is edited with the copy's own values (how full it is…).
  Object.defineProperty(draft, "_vars", { enumerable: false, value: opts.entryUid ? () => {
    const c = store.char(), e = c?.items.find(x => x.uid === opts.entryUid);
    return e ? entryIconVars(c, e) : {};
  } : null });
  for (const k of featureFieldKeys()) if (draft[k] === undefined && cat?.[k] !== undefined) draft[k] = clone(cat[k]);
  const chosen = {}; // features ticked or unticked here
  const isOn = key => key in chosen ? chosen[key] : hasFeature(draft, key, srcId);
  const features = featuresPanel(draft, isOn, chosen, tpl);
  // The features go above the description (a document has none: then above the source).
  const els = fields.map(f => [f.key, fieldInput(f, draft)]);
  let at = els.findIndex(([k]) => k === "description");
  if (at < 0) at = els.findIndex(([k]) => k === "source");
  els.splice(at < 0 ? els.length : at, 0, ["features", features]);
  const form = h("form", { class: "form grid", onsubmit: e => { e.preventDefault(); save(); } }, els.map(([, el]) => el));
  let close;

  // Its states' layers, a tab each (an item that needs attunement starts with an empty Attuned one).
  draft.layers = clone(draft.layers || {});
  for (const st of systemStates()) if (st.requires && !draft.layers[st.key] && hasFeature(draft, st.requires, srcId)) draft.layers[st.key] = {};
  let tab = "basic";
  const tabsBox = h("div"), layerBox = h("div");
  const triggersBox = triggersEditor(draft);
  const drawTabs = () => {
    const present = systemStates().filter(st => draft.layers[st.key]);
    const missing = systemStates().filter(st => !draft.layers[st.key]);
    if (tab !== "basic" && tab !== "triggers" && !draft.layers[tab]) tab = "basic";
    setChildren(tabsBox, (present.length || missing.length) && h("div", { class: "inline wrap layer-tabs" },
      subTabs("Item states", [["basic", "Basic"], ...present.map(st => [st.key, st.label]), ["triggers", "Triggers"]], tab, k => { tab = k; drawTabs(); }),
      missing.length > 0 && h("select", { class: "add-state", "aria-label": "Add a state", onchange: e => {
        if (!e.target.value) return;
        draft.layers[e.target.value] = {};
        tab = e.target.value;
        drawTabs();
      } }, h("option", { value: "" }, "+ Add a state…"), missing.map(st => h("option", { value: st.key }, st.label)))));
    form.hidden = tab !== "basic";
    const st = stateByKey(tab);
    setChildren(layerBox, st ? layerForm(st, draft, tpl, () => { delete draft.layers[st.key]; tab = "basic"; drawTabs(); })
      : tab === "triggers" && [h("p", { class: "muted small" }, "What happens by itself: when the item enters an inventory, or one of its states turns on or off, it can turn states on or off and tell the player."),
        triggersBox]);
  };
  drawTabs();

  function save() {
    if (!draft.name?.trim()) return toast("Give the item a name");
    draft.name = draft.name.trim();
    // Unticked features lose their settings; the item keeps which features it has only where
    // that differs from the default for its kind.
    const all = allFeatures();
    const on = Object.fromEntries(all.map(ft => [ft.key, isOn(ft.key)]));
    const kept = new Set(all.filter(ft => on[ft.key]).flatMap(ft => ft.fields.map(f => f.key))); // shared fields (the body, bonus)
    for (const ft of all) if (!on[ft.key]) for (const f of ft.fields) if (!kept.has(f.key)) delete draft[f.key];
    for (const ft of all) if (ft.flag) { if (on[ft.key]) draft[ft.flag] = true; else delete draft[ft.flag]; }
    delete draft.features;
    const flags = Object.fromEntries(all.filter(ft => !ft.flag && on[ft.key] !== featureDefault(draft, ft.key, srcId)).map(ft => [ft.key, on[ft.key]]));
    if (Object.keys(flags).length) draft.features = flags;
    if (on.pack) draft.contents = (draft.contents || []).filter(c => c.name);
    if (!Object.keys(draft.layers || {}).length) delete draft.layers;
    draft.triggers = cleanTriggers(draft.triggers);
    if (!draft.triggers.length) delete draft.triggers;
    for (const k of Object.keys(draft)) if (draft[k] === "" || draft[k] == null) delete draft[k];
    delete draft.noStack;
    if (opts.entryUid) {
      const { id, ...snap } = draft;
      if (!stacks(snap, srcId)) snap.noStack = true; // see addToInventory
      commit((s, c) => { c.items.find(x => x.uid === opts.entryUid).item = snap; }, `Updated ${draft.name}`, true);
    } else {
      // Saved back into the rule package it's in; a new one goes into the chosen package, else
      // the campaign's home package.
      const pkg = draft.id && store.packageOf(draft.id);
      if (!pkg) draft.id = "custom-" + uid();
      draft.source = draft.source || "Homebrew";
      commit(() => {
        if (pkg) pkg.customItems = pkg.customItems.map(i => i.id === draft.id ? draft : i);
        else (store.data.packages.find(p => p.id === opts.package) || store.homePackage()).customItems.unshift(draft);
      }, `${pkg ? "Saved" : "Created"} ${draft.name}`, true);
    }
    close();
  }

  const title = opts.entryUid ? `Edit ${item.name}` : opts.copyOf ? `Customize ${item.name}` :
    draft.id ? `Edit ${item.name}` : `New ${tpl.name.toLowerCase()}`;
  close = openModal(title, [
    h("p", { class: "muted small" }, templateBadge(tpl), ` Template: ${tpl.name}`,
      opts.entryUid ? " — changes apply only to this copy in the inventory." : ""),
    tabsBox, form, layerBox,
  ], { wide: true, footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: save }, icon("check"), "Save"),
  ] });
}

// ------------------------------------------------------------------ drawing icons (svg-lay-tool)

// Libraries only some screens need, loaded the first time they're wanted. Every caller meanwhile
// shares the one load (a screen of live icons would otherwise add the script once per icon).
const scriptLoads = new Map();
function loadScript(src, global, what) {
  if (window[global]) return Promise.resolve();
  if (!scriptLoads.has(src)) {
    scriptLoads.set(src, new Promise((ok, fail) => {
      const script = h("script", { src });
      script.onload = ok;
      script.onerror = () => { script.remove(); scriptLoads.delete(src); fail(new Error(`Couldn't load ${what}`)); };
      document.head.append(script);
    }));
  }
  return scriptLoads.get(src);
}

// The icon editor (svg-lay-tool).
const loadSvgLay = () => loadScript("js/vendor/svg-lay-tool.js", "SvgLayTool", "the icon editor");

// Draw an icon from shapes on layers, in one colour (the app tints it like its other icons).
// opts: doc (to edit), name (for the title), color (to draw in), templates (offer "Start from…" a
// library drawing). onSave(doc, svg): the editor's document and the icon as SVG painted in
// currentColor; onSave(null) when every shape was removed.
async function openIconDrawer(opts, onSave) {
  try {
    await loadSvgLay();
  } catch (e) {
    return toast(e.message);
  }
  const { SvgLayEditor, normalizeDocument } = window.SvgLayTool;
  const host = h("div", { class: "icon-drawer-host" });
  let editor, stopSync;
  const close = () => {
    stopSync?.();
    editor?.destroy();
    overlay.remove();
    document.body.classList.toggle("modal-open", !!document.getElementById("modal-root").children.length);
  };
  const save = () => {
    const doc = editor.getDocument();
    if (!doc.layers.length) { onSave(null); close(); return; }
    onSave(doc, drawingSvg(doc));
    close();
  };
  // Start from a copy of a library drawing (a template); undo brings the old canvas back.
  const startFrom = opts.templates && (store.state.iconLibrary || []).length > 0 &&
    h("button", { class: "btn", onclick: () => pickDrawing("Start from a drawing", d => {
      editor?.store.commit(normalizeDocument(clone(d.doc)));
      editor?.fitToView();
    }) }, icon("copy"), h("span", { class: "hide-sm" }, "Start from…"));
  // No Escape-to-close: the editor uses Escape itself, and closing would lose the drawing.
  const overlay = h("div", { class: "reader icon-drawer", role: "dialog", "aria-modal": "true", "aria-label": "Draw an icon" },
    h("div", { class: "reader-bar" },
      h("div", { class: "reader-title" }, opts.title || `Draw an icon${opts.name ? ` for ${opts.name}` : ""}`),
      startFrom,
      h("button", { class: "btn", onclick: close }, "Cancel"),
      h("button", { class: "btn primary", onclick: save }, icon("check"), opts.saveLabel || "Use this icon")),
    h("p", { class: "icon-drawer-hint muted small" },
      "Build the icon from shapes on layers: add shapes from the library and pick a layer in the strip beside the canvas. Press and hold a shape to move it; drag its handles to resize or rotate it. Modifiers add outlines, effects and masks. Variables make it live: in the Variables tab, bind a layer to one of Pack Rat's item values (“fill” shows how full a container is) or to the time for a clock. GM values (names starting gm_, e.g. gm_curse) are set by the GM from the Party screen: add one with + GM value in the Variables tab, where the Pack Rat item list explains them. It's drawn in one colour; the app colours it like its other icons."),
    host);
  document.body.append(overlay);
  document.body.classList.add("modal-open");
  try {
    editor = new SvgLayEditor(host, {
      document: opts.doc ? normalizeDocument(opts.doc) : undefined,
      width: 256, height: 256, background: null,
      theme: "auto", // follows light / dark like the app (whose colours it takes, see .icon-drawer-host)
      features: {
        colorMode: "monochrome", monoColor: opts.color || "#888",
        export: false, canvasSize: false, background: false,
      },
      // The values Pack Rat fills in for an item: formulas can use them, and the Variables tab lists
      // them (with this copy's real values when editing one in an inventory).
      variableGroups: [iconVariableGroup(opts.vars, opts.doc)],
      // "+ GM value" beside "+ Add variable": a gm_ variable with a slider (its default and range).
      variablePresets: [{ id: "packrat-gm", label: "GM value",
        title: "Add a GM value: a variable the GM sets from the Party screen (GM values tab). Rename it, keeping the gm_ at the start (e.g. gm_curse); its slider is the default and range.",
        variable: { name: "gm_value", value: 0, min: 0, max: 1, step: 0.01 } }],
      // The editor's side panels keep the widths you drag them to (on this device).
      panelWidths: (() => { try { return JSON.parse(readPref("packrat-icon-editor-panels", "null")) || undefined; } catch { return undefined; } })(),
    });
    editor.on("panelresize", widths => writePref("packrat-icon-editor-panels", JSON.stringify(widths)));
    stopSync = syncIconVariables(editor, host, opts.vars);
    // Fit the canvas once the window has its final size.
    requestAnimationFrame(() => requestAnimationFrame(() => editor?.fitToView()));
  } catch (e) {
    close();
    toast("The icon editor couldn't start: " + e.message);
  }
}

// A drawing as the SVG the app shows: one colour (currentColor, so it's tinted like the other
// icons), no background, ids that drawnIcon() makes unique per copy. Needs the editor loaded.
function drawingSvg(doc, variables) {
  const { renderDocumentToString, normalizeDocument } = window.SvgLayTool;
  const n = normalizedDrawing(doc, normalizeDocument);
  return renderDocumentToString(n, {
    background: false, colorMode: "monochrome", monoColor: "currentColor", idPrefix: DRAWN_ID_PREFIX,
    variables: { ...iconVariableDefaults(n), ...(variables || {}) } });
}

// The editor's app values win over a drawing's own variables of the same name. Keep them in step:
// a value the drawing declares follows its slider unless this inventory copy has a real value for it,
// and gm_ names added while drawing join the list. Held while a pointer is down, so redrawing the
// Variables panel doesn't interrupt dragging a slider. Returns a function that stops it.
function syncIconVariables(editor, host, vars) {
  const actual = readVars(vars);
  const known = knownGmNames(); // elsewhere in Pack Rat: doesn't change while drawing
  let listed = "", held = false, pending = false;
  const sync = () => {
    pending = false;
    const doc = editor.getDocument();
    const group = iconVariableGroup(vars, doc, known);
    const names = group.variables.map(v => v.name).join();
    if (names !== listed) { listed = names; editor.registerVariables(group); }
    const follow = {};
    for (const v of doc.variables || []) {
      // A formula variable computes its own value (an override would freeze it).
      if (v.expression?.trim()) continue;
      if (group.variables.some(g => g.name === v.name) && !(v.name in actual)) follow[v.name] = v.value;
    }
    if (Object.keys(follow).length) editor.setVariables(follow);
  };
  host.addEventListener("pointerdown", () => { held = true; }, true);
  const release = () => { if (held) { held = false; if (pending) sync(); } };
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  editor.on("change", () => { if (held) pending = true; else sync(); });
  sync();
  return () => {
    window.removeEventListener("pointerup", release, true);
    window.removeEventListener("pointercancel", release, true);
  };
}

// The values a live drawing gets: an object, or a function giving one (read each time it's drawn).
function readVars(vars) {
  try { return (typeof vars === "function" ? vars() : vars) || {}; } catch { return {}; }
}

// Pack Rat's values that a drawing uses without declaring them get a default (so formulas work in
// the catalog and the library too); a variable the drawing declares itself keeps its slider value.
// GM values used in formulas but not declared start at 0.
function iconVariableDefaults(doc) {
  const declared = new Set((doc.variables || []).map(v => v.name));
  const out = Object.fromEntries(ICON_VARIABLES.filter(v => !declared.has(v.name)).map(v => [v.name, v.value]));
  for (const [name, spec] of drawingGmSpecs(doc)) if (!declared.has(name)) out[name] = spec.value;
  return out;
}

// GM values (see party.gmValues) are variables named gm_…: declared in a drawing (with a slider
// giving the default and range), or just used in its formulas (default 0, range 0–1).
const GM_NAME_RE = /\bgm_[A-Za-z0-9_]+\b/g;
function drawingGmSpecs(doc) {
  const specs = new Map();
  for (const v of doc?.variables || []) if (/^gm_[A-Za-z0-9_]+$/.test(v.name || "")) specs.set(v.name, v);
  // Used in a formula variable (e.g. heat = gm_heat * 2) or a binding.
  for (const name of drawingFormulas(doc).join(" ").match(GM_NAME_RE) || []) {
    if (!specs.has(name)) specs.set(name, { name, value: 0, min: 0, max: 1, step: 0.01 });
  }
  return specs;
}

// The formulas of a drawing's layers (the enabled bindings), and with its formula variables too.
function bindingFormulas(doc) {
  const out = [];
  const walk = layers => (layers || []).forEach(l => {
    for (const b of l.bindings || []) if (b.enabled !== false && (b.expression || "").trim()) out.push(b.expression);
    if (l.type === "group") walk(l.children);
  });
  walk(doc?.layers);
  return out;
}
const drawingFormulas = doc => [...(doc?.variables || []).map(v => v.expression || "").filter(Boolean), ...bindingFormulas(doc)];

// Every GM value name Pack Rat knows of: set by the GM in the party, or used by a drawing on
// this device (the library, custom items, characters' items).
function knownGmNames() {
  const names = new Set();
  const g = gmValuesNow();
  for (const bucket of [g.party, ...Object.values(g.characters || {}), ...Object.values(g.items || {})]) {
    for (const name of Object.keys(bucket || {})) names.add(name);
  }
  const docs = [...drawingLibrary().map(d => d.doc), ...store.allCustomItems().map(i => i.iconDoc),
    ...store.state.characters.flatMap(c => c.items.map(e => e.item.iconDoc))];
  for (const doc of docs) if (doc) for (const name of drawingGmSpecs(doc).keys()) names.add(name);
  for (const c of store.state.gmControls || []) for (const p of c.pins) for (const n of [p.xVar, p.yVar]) if (n) names.add(n);
  return names;
}

// Pack Rat's values as a variable group for the editor's Variables tab: the item values, then the
// GM values (this drawing's, and every other one Pack Rat knows of, so names stay consistent).
// actual: the real values for the inventory copy being edited, if any. A value the drawing declares
// itself shows its slider value (see openIconDrawer, which keeps the two in step).
function iconVariableGroup(vars, doc, known = knownGmNames()) {
  const actual = readVars(vars);
  const declared = new Map((doc?.variables || []).map(v => [v.name, v.value]));
  const value = (name, fallback) => name in actual ? actual[name] : declared.has(name) ? declared.get(name) : fallback;
  const gmHere = drawingGmSpecs(doc);
  const gmNames = [...new Set([...gmHere.keys(), ...known])].sort();
  const gmLabel = name => {
    const where = name in actual ? `this item's GM value (${actual[name]})` : party.active ? "not set by the GM for this item" : "set by the GM in a party";
    return `GM value: the GM sets it for the party, a player or an item (Party screen → GM values); ${where}.` +
      (gmHere.has(name) ? " This drawing uses it." : " Used by other drawings.");
  };
  return { id: "packrat", title: "Pack Rat item", variables: [
    ...ICON_VARIABLES.map(v => ({ name: v.name, label: v.label, value: value(v.name, v.value) })),
    // How to make a GM value, listed with the item values (the name "gm_" on its own isn't one).
    { name: "gm_", value: 0, label: "GM values: variables named gm_ followed by a word, e.g. gm_curse or gm_heat. " +
      "Add one with + GM value (its slider sets the default and range; rename it, keeping the gm_), or just use a gm_ name in a formula (it starts at 0). " +
      "Bind layers to it like any other variable. In a party, the GM sets it on the Party screen → GM values tab, for everyone, one player or one item; each item uses the most specific value. " +
      "The GM values Pack Rat knows of are listed below." },
    ...gmNames.map(name => ({ name, label: gmLabel(name), value: value(name, gmHere.get(name)?.value ?? 0) })),
  ] };
}

// Stored drawings may be from an older editor version: normalise each once.
const normalizedDrawings = new WeakMap();
function normalizedDrawing(doc, normalizeDocument) {
  let n = normalizedDrawings.get(doc);
  if (!n) { n = normalizeDocument(doc); normalizedDrawings.set(doc, n); }
  return n;
}

// ------------------------------------------------------------------ live drawings (variables)
// A drawing whose layers are bound to variables is live: Pack Rat fills in values for the item it
// belongs to (ICON_VARIABLES, by name; the editor lists them as the "Pack Rat item" group) and
// redraws it, and ones bound to the time keep ticking.

const ICON_VARIABLES = [
  { name: "fill", label: "How full it is, 0 to 1 (a container's contents, or its liquid); over 1 when overfilled", value: 0.5, min: 0, max: 1, step: 0.01 },
  { name: "used", label: "How much is in it: pounds, or pieces for a quiver or case, or pints of liquid", value: 10, min: 0, max: 30, step: 0.5 },
  { name: "capacity", label: "How much it holds (same units as used)", value: 30, min: 0, max: 100, step: 1 },
  { name: "qty", label: "How many in the stack", value: 1, min: 0, max: 20, step: 1 },
  { name: "charges", label: "Charges left", value: 3, min: 0, max: 10, step: 1 },
  { name: "maxCharges", label: "Maximum charges", value: 3, min: 0, max: 10, step: 1 },
  { name: "pieces", label: "Pieces still in a set (cards left in the deck)", value: 54, min: 0, max: 60, step: 1 },
  { name: "piecesTotal", label: "All the set's pieces (in it or taken out)", value: 54, min: 0, max: 60, step: 1 },
  { name: "equipped", label: "1 when equipped or worn, else 0", value: 0, min: 0, max: 1, step: 1 },
  { name: "attuned", label: "1 when attuned, else 0", value: 0, min: 0, max: 1, step: 1 },
  { name: "worth", label: "Worth in gp, with anything inside", value: 10, min: 0, max: 1000, step: 1 },
  { name: "weight", label: "Weight in lb, with anything inside", value: 5, min: 0, max: 100, step: 0.5 },
];

// The values for an inventory entry (only those that apply; the rest keep the drawing's own).
function entryIconVars(char, e) {
  const it = currentItem(e, char);
  const v = { qty: e.qty, equipped: e.equipped ? 1 : 0, attuned: char && stateOn(char, e, "attuned") ? 1 : 0,
    worth: entryTotalValue(char, e) / 100, weight: entryTotalWeight(char, e) };
  const fill = fillLevel(char, e);
  if (fill) {
    v.fill = Math.max(0, fill.ratio);
    if (fill.kind === "liquid") { v.used = e.liquid?.pints || 0; v.capacity = liquidCap(e); }
    else if (fill.unit) { v.used = fill.used; v.capacity = fill.limit; }
    else { v.used = contentsWeight(char, e); v.capacity = it.capacityLb; }
  }
  if (hasFeature(it, "charges", e.srcId) && it.maxCharges) { v.charges = e.charges ?? it.maxCharges; v.maxCharges = it.maxCharges; }
  if (isDeckEntry(e)) { v.pieces = cardsIn(char, e).length; v.piecesTotal = v.pieces + cardsOut(char, e).length; }
  if (char?.id) Object.assign(v, gmValuesFor(char.id, e.uid)); // the GM's values (or, preparing offline, the presets)
  return v;
}

// Does a drawing have bindings? (Checked without the editor library.)
const isLiveDrawing = doc => !!doc && bindingFormulas(doc).length > 0;

// Live icons on screen. Each shows the saved picture first, then is redrawn with its item's values
// once the editor library has loaded, again whenever the data changes (refreshLiveIcons), and every
// so often if it uses the time.
const liveIcons = new Set();
let liveTimer = null;
function liveDrawnIcon(doc, svgText, cls, vars) {
  const node = drawnIcon(svgText, cls) || iconSvg("image", cls);
  const live = { doc, cls, vars, node, born: Date.now(), seen: false, period: 0, last: 0 };
  loadSvgLay().then(() => {
    redrawLive(live);
    liveIcons.add(live);
    const { documentUsesTime, normalizeDocument } = window.SvgLayTool;
    const n = normalizedDrawing(doc, normalizeDocument);
    if (!documentUsesTime(n)) return;
    // Smooth hands and loops ("t", "time", "now") update often; whole hours/minutes/seconds once a
    // second. Time can also come through a formula variable.
    const smooth = /\b(t|time|now|dayFraction)\b/.test(drawingFormulas(n).join(" "));
    live.period = smooth ? 100 : 1000;
    if (!liveTimer) liveTimer = setInterval(tickLiveIcons, 100);
  }).catch(() => {});
  return node;
}

// Still on screen, or about to be? Ones that have gone (or were never shown) are forgotten.
function keepLive(live, now) {
  if (live.node.isConnected) return live.seen = true;
  if (live.seen || now - live.born > 5000) { liveIcons.delete(live); return false; }
  return true;
}

// The data changed (an edit, a trade, a GM value): redraw the live icons still showing. The views
// are redrawn with new icons anyway; this reaches the ones that stay, like an open item's details.
function refreshLiveIcons() {
  const now = Date.now();
  for (const live of liveIcons) if (keepLive(live, now) && live.seen) redrawLive(live);
}

function redrawLive(live) {
  const next = drawnIcon(drawingSvg(live.doc, readVars(live.vars)), live.cls, { cache: false });
  if (!next) return;
  // Swap the picture inside the same element, so it works whether or not it's on screen yet.
  live.node.setAttribute("viewBox", next.getAttribute("viewBox") || "0 0 256 256");
  live.node.replaceChildren(...next.childNodes);
  live.last = Date.now();
}

// The clock: redraws the icons that use the time when they're due, and stops when none are left.
function tickLiveIcons() {
  if (document.hidden) return;
  const now = Date.now();
  let ticking = 0;
  for (const live of liveIcons) {
    if (!keepLive(live, now) || !live.period) continue;
    ticking++;
    if (live.seen && now - live.last >= live.period) redrawLive(live);
  }
  if (!ticking) { clearInterval(liveTimer); liveTimer = null; }
}

// ------------------------------------------------------------------ the drawings library
// Every drawn icon is kept in the library (store.state.iconLibrary) to use again, edit, or start
// new ones from. Items keep their own copy (iconDoc, iconSvg, so they travel with trades and
// exports) and iconLib, the library drawing it came from: editing that drawing can update them.

const drawingLibrary = () => store.state.iconLibrary || [];
const findDrawing = id => id && drawingLibrary().find(d => d.id === id);

function setItemDrawing(it, d) {
  if (d) { it.iconDoc = clone(d.doc); it.iconSvg = d.svg; it.iconLib = d.id; delete it.icon; }
  else { delete it.iconDoc; delete it.iconSvg; delete it.iconLib; }
}

// Custom items (every rule package) and inventory copies (every campaign) that use a library drawing.
function drawingUsers(id) {
  return [...store.allCustomItems(), ...store.data.campaigns.flatMap(cp => cp.characters.flatMap(c => c.items.map(e => e.item)))]
    .filter(it => it.iconLib === id);
}

function addDrawing(name, doc, svg) {
  const d = { id: "d" + uid(), name: (name || "").trim() || `Drawing ${drawingLibrary().length + 1}`, doc, svg, updated: Date.now() };
  commit(s => { (s.iconLibrary ||= []).unshift(d); }, null);
  return findDrawing(d.id);
}

// Change a library drawing, and every item using it. Returns how many items changed.
function updateDrawing(id, doc, svg) {
  let n = 0;
  commit(s => {
    const d = s.iconLibrary.find(x => x.id === id);
    if (!d) return;
    Object.assign(d, { doc, svg, updated: Date.now() });
    for (const it of drawingUsers(id)) { setItemDrawing(it, d); n++; }
  }, null);
  return n;
}

// A small list to pick a library drawing from.
function pickDrawing(title, onPick) {
  let close;
  close = openModal(title, h("div", { class: "icon-grid" }, drawingLibrary().map(d =>
    h("button", { type: "button", class: "icon-tile drawing", title: d.name, onclick: () => { close(); onPick(d); } },
      drawnIcon(d.svg) || icon("image"), h("span", null, d.name)))), { wide: true });
}

// Edit an item's drawing (in a form: `it` is the draft). One used by other items too asks
// whether to change it everywhere or make this a drawing of its own.
function editItemDrawing(it, done) {
  const d = findDrawing(it.iconLib);
  openIconDrawer({ doc: d?.doc || it.iconDoc, name: it.name, color: itemColor(it), vars: it._vars }, (doc, svg) => {
    if (!doc) { setItemDrawing(it, null); return done(); }
    const others = d ? drawingUsers(d.id).filter(u => u !== it._self).length : 0;
    const asNew = () => { setItemDrawing(it, addDrawing(it.name, doc, svg)); done(); };
    const everywhere = () => {
      const n = updateDrawing(d.id, doc, svg);
      setItemDrawing(it, findDrawing(d.id));
      if (n) toast(`Updated “${d.name}” on ${plural(n, "other item")}`);
      done();
    };
    if (!d) return asNew();
    if (!others) return everywhere();
    let close;
    close = openModal("Change the drawing everywhere?", h("p", null,
      `“${d.name}” is also the icon of ${plural(others, "other item")}. Change it on all of them, or keep this as a new drawing just for this item?`), { footer: [
      h("button", { class: "btn", onclick: () => { close(); asNew(); } }, "Just this item"),
      h("button", { class: "btn primary", onclick: () => { close(); everywhere(); } }, "Change everywhere"),
    ] });
  });
}

// Drawings made before the library existed: add the ones on custom items to it.
function adoptItemDrawings() {
  const loose = store.allCustomItems().filter(it => it.iconSvg && it.iconDoc && !findDrawing(it.iconLib));
  if (!loose.length) return;
  commit(s => {
    for (const it of loose) {
      const d = { id: "d" + uid(), name: it.name, doc: it.iconDoc, svg: it.iconSvg, updated: Date.now() };
      (s.iconLibrary ||= []).push(d);
      it.iconLib = d.id;
    }
  }, null);
}

// The library, in Catalog → Drawings: draw new ones, edit (updating the items that use them), rename,
// start a new drawing from a copy, delete (items keep their copies).
function drawingsSection() {
  const lib = drawingLibrary();
  const used = id => drawingUsers(id).length;
  const edit = d => openIconDrawer({ doc: d.doc, title: `Edit “${d.name}”`, color: "var(--accent)", saveLabel: "Save" }, (doc, svg) => {
    if (!doc) return toast("A drawing needs at least one shape");
    const n = updateDrawing(d.id, doc, svg);
    toast(n ? `Saved “${d.name}” and updated ${plural(n, "item")}` : `Saved “${d.name}”`);
  });
  const copy = d => openIconDrawer({ doc: clone(d.doc), title: `New drawing from “${d.name}”`, color: "var(--accent)", saveLabel: "Save" }, (doc, svg) => {
    if (doc) { addDrawing(`${d.name} (copy)`, doc, svg); toast("Saved a new drawing"); }
  });
  const rename = d => {
    let close;
    const input = h("input", { type: "text", value: d.name, maxlength: 60 });
    const ok = () => { const v = input.value.trim(); if (v) commit(s => { s.iconLibrary.find(x => x.id === d.id).name = v; }, null); close(); };
    close = openModal("Rename drawing", h("label", { class: "field" }, h("span", null, "Name"), input), { footer: [
      h("button", { class: "btn", onclick: () => close() }, "Cancel"), h("button", { class: "btn primary", onclick: ok }, "Rename")] });
    input.focus(); input.select();
  };
  const remove = d => confirmDialog(`Delete the drawing “${d.name}”?${used(d.id) ? ` The ${plural(used(d.id), "item")} using it keep their icon.` : ""}`, "Delete",
    () => commit(s => { s.iconLibrary = s.iconLibrary.filter(x => x.id !== d.id); for (const it of drawingUsers(d.id)) delete it.iconLib; }, `Deleted “${d.name}”`, true));
  const newOne = () => openIconDrawer({ title: "New drawing", color: "var(--accent)", templates: true, saveLabel: "Save" }, (doc, svg) => {
    if (doc) { addDrawing("", doc, svg); toast("Saved a new drawing"); }
  });
  return h("section", null,
    h("div", { class: "section-head" }, h("h2", null, "Drawings"),
      h("button", { class: "btn", onclick: newOne }, icon("plus"), "New drawing")),
    h("p", { class: "muted small" }, "Icons you've drawn. Give one to an item from its Icon (Choose…), edit one (items using it can update too), or start a new one from a copy."),
    lib.length ? h("div", { class: "drawing-grid" }, lib.map(d => {
      const live = isLiveDrawing(d.doc), n = used(d.id);
      return h("div", { class: "drawing-tile" },
        h("button", { class: "drawing-art", type: "button", title: `Edit “${d.name}”`, onclick: () => edit(d) },
          (live ? liveDrawnIcon(d.doc, d.svg, "drawing-svg", null) : drawnIcon(d.svg, "drawing-svg")) || icon("image")),
        live && h("span", { class: "tag" }, "live"),
        h("b", null, d.name),
        h("small", { class: "muted" }, n ? `Used by ${plural(n, "item")}` : "Not used yet"),
        h("div", { class: "tpl-actions" },
          h("button", { class: "link", onclick: () => edit(d) }, "Edit"),
          h("button", { class: "link", onclick: () => copy(d) }, "Use as template"),
          h("button", { class: "link", onclick: () => rename(d) }, "Rename"),
          h("button", { class: "link danger-link", onclick: () => remove(d) }, "Delete")));
    }))
      : h("p", { class: "muted pad" }, "No drawings yet. Draw one here, or with Draw… next to an item's icon."));
}

// An item's own image, shown in place of its icon (a playing card's face, a portrait…).
function imageField(f, draft, cls, label) {
  const box = h("div", { class: "inline image-field" });
  const pick = () => pickImageFiles(false, async ([file]) => {
    try { draft[f.key] = await addImageFile(file); draw(); } catch (e) { toast(e.message); }
  });
  const draw = () => setChildren(box,
    draft[f.key] ? storedImage(draft[f.key], "pic-thumb") : h("span", { class: "muted small" }, "None"),
    h("button", { type: "button", class: "btn", onclick: pick }, icon("image"), draft[f.key] ? "Change…" : "Choose…"),
    draft[f.key] && h("button", { type: "button", class: "btn", onclick: () => { delete draft[f.key]; draw(); } }, "Remove"));
  draw();
  return h("div", { class: cls }, label, box);
}

// A set's pieces: a name each and, optionally, a picture. Pictures can be added in one go (each
// becomes a piece named after its file, e.g. a folder of card faces), and names pasted as a list.
function piecesField(f, draft) {
  const rows = (draft[f.key] || []).map(pieceSpec);
  const save = () => {
    const list = rows.filter(r => r.name.trim()).map(r => r.image ? { name: r.name.trim(), image: r.image } : r.name.trim());
    if (list.length) draft[f.key] = list; else delete draft[f.key];
  };
  const list = h("div", { class: "pieces-list" });
  const count = h("span", { class: "muted small" });
  const setImage = (r, done) => pickImageFiles(false, async ([file]) => {
    try { r.image = await addImageFile(file); save(); done(); } catch (e) { toast(e.message); }
  });
  const draw = () => {
    count.textContent = rows.length ? plural(rows.length, "piece") : "No pieces yet";
    setChildren(list, rows.map((r, i) => h("div", { class: "piece-row" },
      h("button", { type: "button", class: "piece-img", title: r.image ? "Change picture" : "Add a picture", "aria-label": r.image ? "Change picture" : "Add a picture",
        onclick: () => setImage(r, draw) }, r.image ? storedImage(r.image) : icon("image")),
      h("input", { type: "text", value: r.name, placeholder: "Name", "aria-label": `Piece ${i + 1} name`,
        oninput: e => { r.name = e.target.value; save(); } }),
      r.image && iconBtn("x", "Remove picture", () => { delete r.image; save(); draw(); }),
      iconBtn("trash", "Remove piece", () => { rows.splice(i, 1); save(); draw(); }))));
  };
  const paste = h("textarea", { rows: 4, placeholder: "One name per line", hidden: true });
  const addPasted = h("button", { type: "button", class: "btn", hidden: true, onclick: () => {
    for (const name of paste.value.split("\n").map(x => x.trim()).filter(Boolean)) rows.push({ name });
    paste.value = ""; paste.hidden = addPasted.hidden = true;
    save(); draw();
  } }, "Add these");
  const addPictures = () => pickImageFiles(true, async files => {
    toast(`Adding ${plural(files.length, "picture")}…`);
    for (const file of files) {
      try {
        rows.push({ name: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(), image: await addImageFile(file) });
      } catch (e) { toast(e.message); }
    }
    save(); draw();
  });
  draw();
  return h("div", { class: "field full" },
    h("span", null, f.label, " ", count),
    list,
    h("div", { class: "inline wrap" },
      h("button", { type: "button", class: "btn", onclick: () => { rows.push({ name: "" }); draw(); list.lastElementChild?.querySelector("input")?.focus(); } }, icon("plus"), "Add piece"),
      h("button", { type: "button", class: "btn", onclick: addPictures }, icon("image"), "Add from pictures…"),
      h("button", { type: "button", class: "btn", onclick: () => { paste.hidden = addPasted.hidden = false; paste.focus(); } }, icon("edit"), "Paste a list…")),
    paste, addPasted,
    h("p", { class: "muted small" }, "“Add from pictures” makes a piece from each picture you pick (named after the file), e.g. all 54 faces of a deck of cards at once."));
}

// The item form's features: a collapsible panel across the form. Closed, it lists what's ticked.
// The template's main features aren't listed: they're always on, their fields in the form itself.
function featuresPanel(draft, isOn, chosen, tpl) {
  let open = readPref("packrat-features-open", "") === "1";
  const main = mainFeatures(tpl);
  const features = allFeatures().filter(ft => !main.includes(ft.key));
  const summary = h("span", { class: "muted small features-summary" });
  const drawSummary = () => { summary.textContent = features.filter(ft => isOn(ft.key)).map(ft => ft.label).join(" · ") || "None"; };
  const rows = {};
  const set = (key, v) => {
    chosen[key] = v;
    rows[key].input.checked = v;
    rows[key].box.hidden = !v || !rows[key].box.childElementCount;
  };
  const shown = new Set(templateFields(tpl).map(f => f.key)); // fields the form has already (a magic bonus…)
  const list = features.map(ft => {
    const box = h("div", { class: "form grid feature-fields" }, ft.fields.filter(f => !shown.has(f.key)).map(f => fieldInput(f, draft)));
    box.hidden = !isOn(ft.key) || !box.childElementCount;
    const input = h("input", { type: "checkbox", checked: isOn(ft.key), onchange: ev => {
      set(ft.key, ev.target.checked);
      if (!box.childElementCount) box.hidden = true;
      if (ev.target.checked && ft.excludes && isOn(ft.excludes)) set(ft.excludes, false); // writing or a picture, not both
      drawSummary();
    } });
    rows[ft.key] = { input, box };
    return h("div", { class: "feature" },
      h("label", { class: "check" }, input, h("span", null, h("b", null, ft.label), ft.hint && h("span", { class: "muted" }, " " + ft.hint))),
      box);
  });
  const body = h("div", { class: "features-body" }, list);
  body.hidden = !open;
  const toggle = h("button", { type: "button", class: "collapse" + (open ? "" : " closed"), "aria-expanded": String(open), onclick: () => {
    open = !open;
    writePref("packrat-features-open", open ? "1" : "");
    body.hidden = !open;
    toggle.classList.toggle("closed", !open);
    toggle.setAttribute("aria-expanded", String(open));
  } }, icon("chevron"), h("h3", null, "Features"));
  drawSummary();
  return h("section", { class: "group features-panel" }, h("div", { class: "group-head" }, toggle, summary), body);
}

function fieldInput(f, draft) {
  const set = v => { draft[f.key] = v; };
  const cls = "field" + (["textarea", "tags"].includes(f.kind) ? " full" : "");
  const label = h("span", null, fieldLabel(f), f.required ? " *" : "");
  switch (f.kind) {
    case "textarea":
      return h("label", { class: cls }, label, h("textarea", { rows: 3, value: draft[f.key] || "", oninput: e => set(e.target.value) }));
    case "number":
      return h("label", { class: cls }, label, h("input", { type: "number", step: f.step || 1, min: f.min, inputmode: "decimal",
        value: draft[f.key] ?? "", oninput: e => set(e.target.value === "" ? undefined : +e.target.value) }));
    case "checkbox":
      return h("label", { class: "check field" }, h("input", { type: "checkbox", checked: !!draft[f.key], onchange: e => set(e.target.checked) }), " ", f.label);
    case "select": {
      if (draft[f.key] === undefined && f.options[0] !== "") draft[f.key] = f.options[0];
      const opts = [...f.options];
      if (draft[f.key] && !opts.includes(draft[f.key])) opts.push(draft[f.key]);
      if (f.segmented) {
        const group = h("div", { class: "seg seg-field", role: "radiogroup", "aria-label": f.label },
          opts.map(o => h("button", { type: "button", role: "radio", class: draft[f.key] === o ? "active" : "",
            "aria-checked": String(draft[f.key] === o),
            onclick: ev => {
              set(o);
              for (const b of group.children) { b.classList.toggle("active", b === ev.currentTarget); b.setAttribute("aria-checked", String(b === ev.currentTarget)); }
            } }, f.labels?.[o] || o)));
        return h("div", { class: cls }, label, group);
      }
      return h("label", { class: cls }, label, h("select", { onchange: e => set(e.target.value) },
        opts.map(o => h("option", { value: o, selected: draft[f.key] === o }, f.labels?.[o] || o || "—"))));
    }
    case "tags": {
      const input = h("input", { type: "text", value: (draft[f.key] || []).join(", "), placeholder: "Comma separated",
        oninput: e => set(e.target.value.split(",").map(s => s.trim()).filter(Boolean)) });
      return h("label", { class: cls }, label, input,
        f.suggestions && h("div", { class: "chips small" }, f.suggestions.map(s => h("button", { type: "button", class: "chip-btn",
          onclick: () => { const cur = draft[f.key] || []; if (!cur.includes(s)) { set([...cur, s]); input.value = draft[f.key].join(", "); } } }, "+ " + s))));
    }
    case "dice":
      return h("label", { class: cls }, label, h("input", { type: "text", value: draft[f.key] || "", placeholder: f.placeholder,
        pattern: "^\\s*(\\d+(d\\d+)?(\\s*[+\\-]\\s*\\d+)?)?\\s*$", oninput: e => set(e.target.value.trim()) }));
    case "markdown":
      return markdownField(f, draft);
    case "picture":
      return h("div", { class: "field full" }, pictureEditor(f, draft));
    case "image":
      return imageField(f, draft, cls, label);
    case "pieces":
      return piecesField(f, draft);
    case "packContents":
      return packContentsField(f, draft);
    case "icon": {
      // Preview updates with the name/type; "Automatic" follows the item's name. Or draw one.
      const preview = h("span", { class: "icon-preview" });
      const label2 = h("span", { class: "muted small" });
      // Draw a new icon (it goes into the drawings library), or edit this item's drawing.
      const drawBtn = h("button", { class: "btn", type: "button", onclick: () => {
        if (draft.iconDoc) return editItemDrawing(draft, draw);
        openIconDrawer({ name: draft.name, color: itemColor(draft), templates: true, vars: draft._vars }, (doc, svg) => {
          if (doc) setItemDrawing(draft, addDrawing(draft.name, doc, svg));
          draw();
        });
      } }, icon("edit"), "");
      const draw = () => {
        setChildren(preview, itemIcon(draft, "big-icon"));
        label2.textContent = draft.iconSvg ? findDrawing(draft.iconLib)?.name || "Your drawing" : draft.icon ? ICON_BY_ID.get(draft.icon)?.n || "" : "Automatic";
        drawBtn.lastChild.textContent = draft.iconDoc ? "Edit drawing…" : "Draw…";
      };
      draw();
      return h("div", { class: cls }, label,
        h("div", { class: "inline wrap" }, preview,
          h("button", { class: "btn", type: "button", onclick: () => openIconPicker(draft.icon, id => {
            if (id) draft.icon = id; else delete draft.icon;
            setItemDrawing(draft, null); // a chosen icon replaces a drawing
            draw();
          }, draft, { drawings: drawingLibrary(), onDrawing: d => { setItemDrawing(draft, d); draw(); } }) }, "Choose…"),
          drawBtn,
          label2));
    }
    case "cost": {
      // Stored in the smallest coin; edited as an amount of one (the largest change coin it's a whole number of).
      const cp = draft.cost || 0;
      let denom = cp ? changeCoins().find(k => cp % coinValue(k) === 0) || coinOrder().at(-1) : currency().show;
      let amount = cp ? cp / coinValue(denom) : "";
      const upd = () => set(amount === "" ? 0 : Math.round(amount * coinValue(denom)));
      return h("label", { class: cls }, label, h("div", { class: "inline" },
        h("input", { type: "number", min: 0, step: "any", inputmode: "decimal", value: amount, oninput: e => { amount = e.target.value === "" ? "" : +e.target.value; upd(); } }),
        h("select", { onchange: e => { denom = e.target.value; upd(); } }, coinOrder().map(k => h("option", { value: k, selected: k === denom }, k)))));
    }
    default:
      return h("label", { class: cls }, label, h("input", { type: "text", value: draft[f.key] ?? "", placeholder: f.placeholder || "",
        required: f.required, oninput: e => set(e.target.value) }));
  }
}

// A pack's contents: item (from the catalog or your custom items), how many, and where it goes
// when unpacked ("Auto" follows the usual rules: see packPlan).
function packContentsField(f, draft) {
  draft[f.key] = (draft[f.key] || []).map(c => ({ ...c }));
  const rows = draft[f.key];
  const names = [...new Set(store.catalog().filter(i => !hasFeature(i, "pack", i.id)).map(i => i.name))].sort();
  const listId = "pack-items-" + uid();
  const box = h("div", { class: "pack-edit" });
  const draw = () => setChildren(box,
    rows.map((c, i) => h("div", { class: "pack-edit-row" },
      h("input", { type: "text", list: listId, value: c.name || "", placeholder: "Item name", "aria-label": "Item",
        class: c.name && !findItemByName(c.name) ? "invalid" : "",
        onchange: e => { c.name = e.target.value.trim(); draw(); } }),
      h("input", { type: "number", min: 1, value: c.qty || 1, class: "pack-qty", inputmode: "numeric", "aria-label": "How many",
        oninput: e => { c.qty = Math.max(1, Math.floor(+e.target.value || 1)); } }),
      h("select", { "aria-label": "Where it goes", onchange: e => { if (e.target.value) c.place = e.target.value; else delete c.place; } },
        h("option", { value: "" }, "Auto"), PACK_PLACES.map(([k, label]) => h("option", { value: k, selected: c.place === k }, label))),
      iconBtn("trash", "Remove", () => { rows.splice(i, 1); draw(); }))),
    rows.some(c => c.name && !findItemByName(c.name)) && h("p", { class: "warn-text small" }, "Items not in the catalog (or your custom items) are skipped when unpacking."),
    h("button", { type: "button", class: "btn", onclick: () => { rows.push({ name: "", qty: 1 }); draw(); } }, icon("plus"), "Add item"),
    h("datalist", { id: listId }, names.map(n => h("option", { value: n }))));
  draw();
  return h("div", { class: "field full" }, h("span", null, f.label), box,
    h("p", { class: "muted small" }, "“Auto” puts everything in the pack's backpack or chest, with bedrolls, rope and the like strapped to a backpack's side."));
}

// A new item made with a template (the system's or a package's), with its defaults filled in. Its
// `type` is the system template it descends from (what older versions and the party servers know).
const newItemFrom = tpl => ({ type: rootTemplate(tpl).id, template: isSystemTemplate(tpl) ? undefined : tpl.id, ...clone(tpl.defaults || {}),
  ...(tpl.layers && Object.keys(tpl.layers).length ? { layers: clone(tpl.layers) } : {}),
  ...(tpl.triggers?.length ? { triggers: clone(tpl.triggers) } : {}) });

// A new template that starts as a copy of another (the system's or yours).
function copyTemplate(tpl) {
  const { id, builtin, hidden, plural, ...rest } = clone(tpl);
  openTemplateEditor({ ...rest, name: tpl.name + " (copy)", from: tpl.id, hue: tpl.hue ?? templateHue(tpl) }, true);
}

// What a template is, under its name: its group, or the template it was copied from.
function templateNote(t) {
  if (isSystemTemplate(t)) return groupOfTemplate(t)?.name || "";
  const from = templateById(t.from);
  return from ? `From ${from.name}` : groupOfTemplate(t)?.name || "";
}

// The system's templates in group order (so Gear sits next to Tools), then the packages'.
function orderedTemplates() {
  const sys = systemGroups().flatMap(g => groupTemplates(g));
  return [...sys, ...store.templates().filter(t => !isSystemTemplate(t))];
}

function chooseTemplate(onPick, title = "Choose a template", extra = null) {
  let close;
  const tile = t => h("button", { class: "tpl-tile", onclick: () => { close(); onPick(t); } },
    h("span", { class: "tpl-swatch", style: { background: templateColor(t) } }),
    h("b", null, t.name),
    h("small", { class: "muted" }, templateNote(t)));
  close = openModal(title, [
    h("div", { class: "tpl-grid" }, orderedTemplates().map(tile)),
    extra ? extra(() => close()) : h("p", { class: "muted small" }, "Need different fields? ",
      h("button", { class: "link", onclick: () => { close(); newTemplate(); } }, "Create a template"), "."),
  ], { wide: true });
}

// A new template: a copy of one there is, or a blank one.
function newTemplate() {
  chooseTemplate(copyTemplate, "New template: start from a copy of…", close => h("p", { class: "muted small" }, "Or ",
    h("button", { class: "link", onclick: () => { close(); openTemplateEditor(null); } }, "start from a blank template"), "."));
}

// ------------------------------------------------------------------ custom view

// Your own items, by the rule packages this campaign uses (new ones go into the package they're made in).
function myItemsSection() {
  const camp = store.campaign(), pkgs = store.enabledPackages();
  const home = store.homePackage();
  return h("section", null,
    h("div", { class: "section-head" }, h("h2", null, "My items"),
      h("button", { class: "btn primary", onclick: () => openItemForm(null, { package: home.id }) }, icon("plus"), "New item")),
    h("p", { class: "muted small" }, `Custom items come in rule packages: ${camp.name} uses ${plural(pkgs.length, "package")}. `,
      h("button", { class: "link", onclick: () => { ui.settingsTab = "campaigns"; go("settings"); } }, "Choose packages"), "."),
    pkgs.map(pkg => h("div", { class: "group package-group" },
      h("div", { class: "group-head" }, h("h3", null, pkg.name),
        pkg.id === home.id && h("span", { class: "tag" }, "new items go here"),
        h("span", { class: "muted small" }, plural(pkg.customItems.length, "item")),
        pkgs.length > 1 && h("button", { class: "btn", onclick: () => openItemForm(null, { package: pkg.id }) }, icon("plus"), "New")),
      pkg.customItems.length ? pkg.customItems.map(catalogRow)
        : h("p", { class: "muted pad" }, "No items yet. Make a homebrew weapon, a family heirloom, or a +1 version of an existing item (open any catalog item → Customize)."))));
}

// Templates: the system's by group, and the templates of the packages in use.
function templatesSection() {
  const usage = id => store.customItems().filter(i => i.template === id).length;
  const several = store.enabledPackages().length > 1;
  const sys = activeSystem();
  return h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "Templates"),
        h("button", { class: "btn", onclick: newTemplate }, icon("plus"), "New template")),
      h("p", { class: "muted small" }, "Templates decide which fields an item has and what it can do (its features: a container holds things, a weapon shows in the Combat panel…). "
        + (sys.none ? "With no game system there's one plain template, Item; make your own from a copy of it, or from a blank one."
          : `The game system's come with ${sys.name}; make your own from a copy of any of them.`)),
      h("div", { class: "tpl-grid" },
        // The system's templates, by group: each group has a hue, its subcategories are shades of it.
        systemGroups().map(g => {
          const tpls = groupTemplates(g);
          if (!tpls.length) return null;
          const subs = subcategories(g.id);
          const multi = tpls.length > 1;
          return h("div", { class: "tpl-tile static" },
            h("span", { class: "tpl-swatch tpl-shades" }, subs.length > 1
              ? subs.map((sc, i) => h("span", { style: { background: shade(groupHue(g.id), i, subs.length) }, title: sc.label }))
              : h("span", { style: { background: groupColor(g.id) } })),
            h("b", null, g.name),
            h("small", { class: "muted" }, multi ? "Built-in" : `Built-in · ${templateFields(tpls[0]).length} fields`),
            // A combined group lists its templates, each in its shade, with its own New / Copy.
            multi && h("div", { class: "tpl-types" }, tpls.map(t => h("div", { class: "tpl-type" },
              colorDot(templateColor(t), t.name), h("span", null, t.name),
              h("button", { class: "link", onclick: () => openItemForm(newItemFrom(t)) }, "New"),
              h("button", { class: "link", onclick: () => copyTemplate(t) }, "Copy")))),
            h("div", { class: "tpl-actions" },
              h("button", { class: "link", onclick: () => openGroupColour(g.id) }, "Colour"),
              !multi && [
                h("button", { class: "link", onclick: () => openItemForm(newItemFrom(tpls[0])) }, "New item"),
                h("button", { class: "link", onclick: () => copyTemplate(tpls[0]) }, "Copy"),
              ]));
        }),
        // The game system's example templates you haven't got (D&D 5e: Spell Scroll, Gemstone, Cursed Item).
        (sys.starterTemplates || []).filter(t => !store.template(t.id)).map(t => h("div", { class: "tpl-tile static example" },
          h("span", { class: "tpl-swatch", style: { background: templateColor(t) } }),
          h("b", null, t.name),
          h("small", { class: "muted" }, `Example · ${templateNote(t)}`),
          h("div", { class: "tpl-actions" },
            h("button", { class: "link", onclick: () => commit(() => store.homePackage().templates.push(clone(t)), `Added the template ${t.name}`, true) }, "Add to my templates")))),
        store.templates().filter(t => !isSystemTemplate(t)).map(t => h("div", { class: "tpl-tile static" },
          h("span", { class: "tpl-swatch", style: { background: templateColor(t) } }),
          h("b", null, t.name),
          h("small", { class: "muted" }, `${templateNote(t)} · ${plural(templateFields(t).length, "field")} · ${plural(usage(t.id), "item")}`
            + (several ? ` · ${store.templatePackage(t.id)?.name || ""}` : "")),
          h("div", { class: "tpl-actions" },
            h("button", { class: "link", onclick: () => openItemForm(newItemFrom(t)) }, "New item"),
            h("button", { class: "link", onclick: () => openTemplateEditor(t) }, "Edit"),
            h("button", { class: "link", onclick: () => copyTemplate(t) }, "Copy"))))));
}

// Pick a hue: a rainbow slider and quick swatches, with a live preview of the shades
// its subcategories get. onChange(hue) is called as it moves.
const HUE_PRESETS = [0, 11, 30, 48, 70, 100, 140, 172, 195, 220, 250, 280, 322, 345];

function huePicker(label, hue, subs, onChange, note) {
  const main = h("span", { class: "shade-preview" });
  const shadesBox = h("div", { class: "hue-shades" });
  const slider = h("input", { type: "range", class: "hue-slider", min: 0, max: 359, value: hue, "aria-label": "Hue",
    oninput: e => set(+e.target.value) });
  const presets = h("div", { class: "shade-presets", role: "group", "aria-label": "Quick colours" },
    HUE_PRESETS.map(p => h("button", { type: "button", class: "shade-swatch", "data-hue": p, title: `Hue ${p}`, "aria-label": `Hue ${p}`,
      style: { background: shade(p) }, onclick: () => set(p) })));
  const set = v => {
    hue = v;
    slider.value = v;
    main.style.background = shade(v);
    for (const b of presets.children) b.classList.toggle("active", +b.dataset.hue === v);
    setChildren(shadesBox, subs.length > 1
      ? subs.map((s, i) => h("span", { class: "hue-shade" }, colorDot(shade(v, i, subs.length), s.label), s.label))
      : h("span", { class: "muted small" }, "No categories, so items all use this colour."));
    onChange(v);
  };
  const box = h("div", { class: "hue-picker" },
    h("span", null, label),
    h("div", { class: "shade-row" }, main, presets),
    slider,
    subs.length > 1 && h("div", { class: "muted small" }, "Shades for each category:"),
    shadesBox,
    note && h("p", { class: "muted small" }, note));
  set(hue);
  return box;
}

// Colour of a built-in group (Armor, Gear & Tools…), kept in this device's settings.
function openGroupColour(groupId) {
  const g = groupById(groupId), tpls = groupTemplates(g);
  let hue = groupHue(groupId), close;
  const subs = subcategories(groupId);
  close = openModal(`${g.name} colour`, h("div", { class: "form" },
    huePicker("Hue", hue, subs, v => { hue = v; },
      tpls.length > 1 ? `${g.name} combines ${tpls.map(t => t.name).join(", ")}; each gets its own shade.`
        : "Each category gets its own shade so items are easy to tell apart.")),
  { footer: [
    h("button", { class: "btn", onclick: () => {
      close();
      commit(s => { if (s.settings.groupHues) delete s.settings.groupHues[groupId]; }, `${g.name} colour reset`);
    } }, "Reset"),
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: () => {
      close();
      commit(s => { s.settings.groupHues = { ...(s.settings.groupHues || {}), [groupId]: hue }; }, `${g.name} colour changed`);
    } }, icon("check"), "Save"),
  ] });
}

const FIELD_KINDS = [["text", "Text"], ["textarea", "Long text"], ["number", "Number"], ["checkbox", "Yes / No"],
  ["select", "Choice list"], ["tags", "Tags"], ["dice", "Dice (e.g. 2d6)"]];

// How a template's items start with a feature: without it, with it (it can be turned off per item),
// or always ("main": its fields show with the template's own).
const FEATURE_MODES = [["", "No"], ["on", "Yes"], ["main", "Always"]];

// A template's editor. copy: a new template, from a copy of another (copyTemplate).
function openTemplateEditor(tpl, copy = false) {
  const isNew = !tpl || !tpl.id || copy;
  const draft = tpl ? clone(tpl) : { name: "", group: systemGroups()[0]?.id, fields: [], features: {} };
  delete draft.color; delete draft.shade; delete draft.type; // older templates: replaced by a hue and group
  draft.fields = draft.fields || [];
  draft.features = { ...(draft.features || {}) };
  if (draft.hue == null) draft.hue = templateHue(draft);
  let close;
  const tplTriggers = triggersEditor(draft);
  const fieldsBox = h("div", { class: "tpl-fields" });
  const coreInfo = h("p", { class: "muted small" });
  const shadeBox = h("div", { class: "field full shade-field" });

  const drawCore = () => {
    coreInfo.textContent = "Every item also has: " + [...CORE_HEAD, WEIGHT_FIELD, ...(activeSystem().commonFields || []), ...CORE_TAIL]
      .filter(f => !(draft.hide || []).includes(f.key)).map(fieldLabel).join(", ") + ".";
  };
  // Colour: the template's own hue; its categories show as shades of it.
  const drawShade = () => setChildren(shadeBox, huePicker("Colour", draft.hue, templateSubcategories(draft), hue => { draft.hue = hue; },
    "Items made with this template use this hue. Their categories get different shades of it so they're easy to tell apart."));
  const drawFields = () => setChildren(fieldsBox, draft.fields.map((f, i) => h("div", { class: "tpl-field" },
    h("input", { type: "text", placeholder: "Field label", value: f.label, "aria-label": "Field label",
      oninput: e => { f.label = e.target.value; } }),
    h("select", { "aria-label": "Field kind", onchange: e => { f.kind = e.target.value; drawFields(); } },
      FIELD_KINDS.map(([k, l]) => h("option", { value: k, selected: f.kind === k }, l))),
    f.kind === "select" && h("input", { type: "text", class: "grow", placeholder: "Options, comma separated", value: (f.options || []).join(", "),
      "aria-label": "Options", oninput: e => { f.options = e.target.value.split(",").map(s => s.trim()).filter(Boolean); } }),
    iconBtn("trash", "Remove field", () => { draft.fields.splice(i, 1); drawFields(); }))),
    h("button", { class: "btn", type: "button", onclick: () => { draft.fields.push({ label: "", kind: "text" }); drawFields(); } }, icon("plus"), "Add field"));

  // Features: which its items start with. Stacks is on unless turned off.
  const modeOf = key => {
    const v = draft.features[key];
    return v === "main" ? "main" : v === true || (key === "stacks" && v !== false) ? "on" : "";
  };
  const setMode = (key, m) => {
    if (key === "stacks") { if (m) delete draft.features.stacks; else draft.features.stacks = false; return; }
    if (m === "main") draft.features[key] = "main"; else if (m === "on") draft.features[key] = true; else delete draft.features[key];
  };
  const featureRows = h("div", { class: "tpl-features" }, allFeatures().map(ft => h("label", { class: "tpl-feature" },
    h("span", null, h("b", null, ft.label), ft.hint && h("span", { class: "muted small" }, " " + ft.hint)),
    h("select", { "aria-label": ft.label, onchange: e => setMode(ft.key, e.target.value) },
      FEATURE_MODES.filter(([m]) => m !== "main" || ft.fields.length).map(([m, l]) => h("option", { value: m, selected: modeOf(ft.key) === m }, l))))));

  drawCore(); drawShade(); drawFields();

  const save = () => {
    if (!draft.name.trim()) return toast("Name the template");
    const used = new Set([...CORE_FIELD_KEYS, "category", ...(activeSystem().commonFields || []).map(f => f.key), ...featureFieldKeys()]);
    draft.fields = draft.fields.filter(f => f.label.trim()).map(f => {
      let key = f.key || f.label.trim().toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : "");
      while (used.has(key)) key += "_";
      used.add(key);
      return { ...f, key, label: f.label.trim(), options: f.kind === "select" ? (f.options?.length ? f.options : ["Option"]) : undefined };
    });
    draft.name = draft.name.trim();
    draft.triggers = cleanTriggers(draft.triggers);
    if (!draft.triggers.length) delete draft.triggers;
    if (!draft.categories?.length) { delete draft.categories; delete draft.categoryLabel; }
    delete draft.builtin;
    if (isNew) draft.id = "tpl-" + uid();
    close();
    const pkg = !isNew && store.templatePackage(draft.id);
    commit(() => {
      if (pkg) pkg.templates = pkg.templates.map(t => t.id === draft.id ? draft : t);
      else store.homePackage().templates.push(draft);
    }, `Saved template ${draft.name}`, true);
  };

  const from = templateById(draft.from);
  close = openModal(isNew ? "New template" : `Edit ${tpl.name}`, h("div", { class: "form" },
    from && h("p", { class: "muted small" }, `A copy of ${from.name}: change anything you like.`),
    h("div", { class: "grid" },
      h("label", { class: "field" }, h("span", null, "Template name *"),
        h("input", { type: "text", value: draft.name, placeholder: "e.g. Spell Scroll, Firearm, Vehicle", oninput: e => { draft.name = e.target.value; } })),
      h("label", { class: "field" }, h("span", null, "Group"),
        h("select", { onchange: e => { draft.group = e.target.value; } },
          systemGroups().map(g => h("option", { value: g.id, selected: draft.group === g.id }, g.name)))),
      h("label", { class: "field" }, h("span", null, "Categories"),
        h("input", { type: "text", value: (draft.categories || []).join(", "), placeholder: "Comma separated, e.g. Pistol, Rifle",
          oninput: e => { draft.categories = e.target.value.split(",").map(s => s.trim()).filter(Boolean); drawShade(); } })),
      h("label", { class: "field" }, h("span", null, "Categories are called"),
        h("input", { type: "text", value: draft.categoryLabel || "", placeholder: "Category", oninput: e => { draft.categoryLabel = e.target.value.trim() || undefined; } }))),
    shadeBox,
    h("h4", null, "Fields"),
    coreInfo,
    fieldsBox,
    systemStates().length > 0 && [h("h4", null, "States"),
      h("p", { class: "muted small" }, "Which states its items start with a tab for (fill each in per item: what changes in that state)."),
      h("div", { class: "inline wrap" }, systemStates().map(st => h("label", { class: "check" },
        h("input", { type: "checkbox", checked: !!draft.layers?.[st.key], onchange: e => {
          draft.layers = { ...(draft.layers || {}) };
          if (e.target.checked) draft.layers[st.key] = draft.layers[st.key] || {}; else delete draft.layers[st.key];
          if (!Object.keys(draft.layers).length) delete draft.layers;
        } }), " " + st.label)))],
    systemStates().length > 0 && [h("h4", null, "Triggers"),
      h("p", { class: "muted small" }, "Its items start with these (each item can change them)."), tplTriggers],
    h("h4", null, "Features"),
    h("p", { class: "muted small" }, "What its items can do to begin with. “Yes” can be changed for each item; “Always” can't, and puts the feature's fields with the template's own."),
    featureRows), { wide: true, footer: [
    !isNew && h("button", { class: "btn danger", onclick: () => {
      confirmDialog(`Delete template “${tpl.name}”? Items using it keep their data but lose the extra fields in the editor.`, "Delete", () => {
        close();
        commit(() => {
          const pkg = store.templatePackage(tpl.id);
          if (pkg) pkg.templates = pkg.templates.filter(t => t.id !== tpl.id);
        }, `Deleted template ${tpl.name}`, true);
      });
    } }, icon("trash"), "Delete"),
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: save }, icon("check"), "Save template"),
  ] });
}

// ------------------------------------------------------------------ settings view

function download(filename, data) {
  // Android's WebView can't download blobs; the app shows the system Save dialog instead.
  if (window.PackRatAndroid) return window.PackRatAndroid.saveFile(filename, JSON.stringify(data, null, 2));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = h("a", { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------------------------------------------------------ backups and other files
// Pack Rat files: everything ("packrat-data"), or one campaign, character, rule package or drawing.
// Older backups (one bundle with characters at the top) still import, as a campaign of their own.

const today = () => new Date().toISOString().slice(0, 10);
const safeName = name => (name || "pack-rat").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "pack-rat";
const campaignImageRefs = camps => allImageRefs(camps.flatMap(c => c.characters), [], camps.flatMap(c => c.gmControls.map(g => g.image)));

async function exportAll() {
  const d = store.data;
  download(`pack-rat-${today()}.json`, { kind: "packrat-data", ...d,
    images: await bundleImages(new Set([...campaignImageRefs(d.campaigns), ...allImageRefs([], store.allCustomItems())])) });
}

// Bring in any Pack Rat file. fileName names a campaign made from an older whole backup.
async function importData(data, fileName = "Imported") {
  if (!data || typeof data !== "object") throw new Error("Unrecognised file");
  await storeBundledImages(data.images);
  delete data.images;
  const label = (fileName || "Imported").replace(/\.json$/i, "");
  const takeTemplates = tpls => { for (const t of tpls || []) if (!store.template(t.id)) store.homePackage().templates.push(standardiseTemplate(t)); };
  const takeDrawings = list => { for (const d of list || []) if (!findDrawing(d.id)) store.data.iconLibrary.push(d); };
  if (data.packrat === "system") {
    if (typeof data.id !== "string") throw new Error("Not a Pack Rat system file");
    const had = !!systemById(data.id);
    if (had && bundledSystem(data.id)) throw new Error(`you have ${bundledSystem(data.id).name} already (it comes with Pack Rat). To import your own version, give it an id of its own`);
    let name;
    commit(() => { name = installSystem(data); }, null, true);
    toast(`${had ? "Updated" : "Added"} the game system ${name}`);
  } else if (data.kind === "character" && data.character) {
    commit(s => {
      const c = { ...cleanChar(data.character), id: uid() }; // no party-server fields (owner, rev…)
      reclassifyAll({ characters: [c] });
      s.characters.push(c); s.activeId = c.id;
      takeTemplates(data.templates);
    }, `Imported ${data.character.name}`, true);
  } else if (data.kind === "campaign" && data.campaign) {
    commit(() => {
      const camp = { ...data.campaign, id: "cmp" + uid() };
      for (const p of data.packages || []) if (!store.data.packages.some(x => x.id === p.id)) store.data.packages.push(p);
      // Its game system: the one in the file, or one that comes with Pack Rat (added back if removed).
      if (data.system && !systemById(data.system.id)) installSystem(data.system);
      else if (camp.system && !systemById(camp.system) && bundledSystem(camp.system)) installSystem({ id: camp.system });
      takeDrawings(data.drawings);
      reclassifyAll({ characters: camp.characters || [], shops: camp.shops || [] });
      store.data.campaigns.push(camp);
      normalizeData(store.data);
    }, `Imported the campaign ${data.campaign.name}`, true);
  } else if (data.kind === "package" && data.package) {
    commit(() => {
      const taken = store.data.packages.some(p => p.id === data.package.id);
      const pkg = { ...data.package, id: taken ? "pkg" + uid() : data.package.id };
      takeDrawings(data.drawings);
      store.data.packages.push(pkg);
      store.campaign().packages.push(pkg.id); // this campaign uses it straight away
      normalizeData(store.data);
    }, `Imported the rule package ${data.package.name}`, true);
  } else if (data.kind === "drawing" && data.drawing) {
    commit(() => { store.data.iconLibrary.unshift({ ...data.drawing, id: "d" + uid() }); }, `Imported the drawing ${data.drawing.name}`, true);
  } else if (data.kind === "packrat-data" || Array.isArray(data.campaigns)) {
    if (party.active) throw new Error("leave the party before restoring a full backup (single characters can be imported any time)");
    delete data.kind;
    const d = normalizeData(data);
    d.campaigns.forEach(c => reclassifyAll(c));
    commit(() => { store.data = d; }, "Restored everything from the backup", true);
  } else if (Array.isArray(data.characters)) {
    // A backup from before campaigns: it becomes a campaign (and rule package) of its own.
    if (party.active) throw new Error("leave the party before importing a whole backup (single characters can be imported any time)");
    reclassifyAll(data); // backups from before catalog items moved type
    const d = migrateV1(data, label, `${label} homebrew`);
    commit(() => {
      store.data.packages.push(...d.packages);
      takeDrawings(d.iconLibrary);
      store.data.campaigns.push(d.campaigns[0]);
      store.data.activeCampaign = d.campaigns[0].id;
    }, `Imported the backup as the campaign “${label}”`, true);
  } else throw new Error("Unrecognised file");
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await importData(JSON.parse(reader.result), file.name);
    } catch (e) {
      toast("Import failed: " + e.message);
    }
  };
  reader.readAsText(file);
}

// The user guide: the GitHub project's wiki.
const GUIDE_URL = "https://github.com/jonathansatterthwaite-stack/pack-rat/wiki";

function renderSettings() {
  const s = store.state;
  const setSetting = (k, v) => commit(st => { st.settings[k] = v; });
  const fileInput = h("input", { type: "file", accept: "application/json,.json", hidden: true,
    onchange: e => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ""; } });
  // Player mode: just play. The catalog and custom items are hidden, and items can't be edited
  // (a copy can still get its own display name). Per device.
  const setPlayerMode = on => {
    ui.playerMode = on;
    writePref("packrat-player-mode", on ? "1" : "");
    render();
    toast(on ? "Player mode on: the catalog and custom items are hidden" : "Player mode off");
  };
  // Role: a GM prepares campaigns' shops, GM values and controls without hosting (and gets the GM
  // tab); in a party, the host decides who's GM. Per device.
  const setRole = role => {
    ui.role = role;
    writePref("packrat-role", role);
    render();
    toast(role === "gm" ? "GM role: the GM tab has your GM values and controls" : "Player role");
  };
  const roleBox = h("section", { class: "role-box" },
    h("div", { class: "switch-row" },
      h("span", null, h("b", null, "Role on this device"),
        h("span", { class: "muted small" }, party.active
          ? (party.isGm() ? "You're a GM in this party." : "In a party, the host decides who's a GM.")
          : `As ${term("gm")}, prepare each campaign's shops, GM values and controls without hosting a party. In a party, the host chooses the ${term("gm")}.`)),
      h("div", { class: "seg seg-field", role: "radiogroup", "aria-label": "Role" },
        [["player", "Player"], ["gm", term("gm")]].map(([k, label]) => h("button", { type: "button", role: "radio", class: ui.role === k ? "active" : "",
          "aria-checked": String(ui.role === k), disabled: party.active, onclick: () => setRole(k) }, label)))),
    h("p", { class: "muted small device-line" }, "In parties this device is called ", h("b", null, deviceName()), ". ",
      h("button", { class: "link", onclick: renameDevice }, "Rename")));
  return h("div", { class: "view-settings" },
    roleBox,
    h("section", { class: "help-link" },
      icon("book"),
      h("div", null, h("b", null, "User guide"),
        h("p", { class: "muted small" }, "How everything works, with pictures: containers, sets, drawn icons, parties, shops and GM values.")),
      h("a", { class: "btn", href: GUIDE_URL, target: "_blank", rel: "noopener" }, "Open the guide")),
    ui.role !== "gm" && h("section", null,
      h("label", { class: "switch-row" },
        h("span", null, h("b", null, "Player mode"),
          h("span", { class: "muted small" }, `Hides the Catalog tab and item editing, for players whose gear comes from the ${term("gm")}, shops and trades. Items can still be renamed (Display name) and written in.`)),
        h("input", { type: "checkbox", role: "switch", class: "switch", checked: ui.playerMode, onchange: ev => setPlayerMode(ev.target.checked) }))),
    partySettings(),
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, termCap("characters")),
        h("button", { class: "btn primary", onclick: () => newCharPrompt() }, icon("plus"), "New " + term("character"))),
      h("div", { class: "group" }, s.characters.map(c => h("div", { class: "row" + (c.id === s.activeId ? " equipped" : "") },
        h("button", { class: "row-main", onclick: () => { commit(st => { st.activeId = c.id; }); go("inventory"); } },
          h("div", { class: "row-title" }, c.name, c.id === s.activeId && h("span", { class: "tag on" }, "active")),
          h("div", { class: "row-sub" }, `${entriesLabel(c)} · ${coinSummary(c.coins)}`)),
        iconBtn("edit", "Rename", () => renamePrompt(c)),
        iconBtn("download", "Export character", async () => download(`${c.name.replace(/\W+/g, "_")}.json`,
          { kind: "character", character: c, templates: store.allTemplates().filter(t => c.items.some(e => e.item.template === t.id)),
            images: await bundleImages(allImageRefs([c])) })),
        iconBtn("copy", "Duplicate", () => commit(st => { st.characters.push({ ...clone(c), id: uid(), name: c.name + " (copy)" }); }, `Duplicated ${c.name}`)),
        (s.characters.length > 1 || party.active) && iconBtn("trash", "Delete", () => confirmDialog(
          party.isLinked(c.id) ? `Delete ${c.name} from this device? They also leave the party, and their inventory is deleted from the host.` : `Delete ${c.name} and their whole inventory?`, "Delete",
          () => commit(st => { st.characters = st.characters.filter(x => x.id !== c.id); if (st.activeId === c.id) st.activeId = st.characters[0]?.id; }, `Deleted ${c.name}`, true)), "danger-hover"))))),
    h("section", null,
      h("h2", null, `Rules for ${store.campaign().name}`),
      h("div", { class: "form grid" },
        h("label", { class: "field" }, h("span", null, "Game system"),
          h("button", { class: "btn", type: "button", onclick: () => editCampaign(store.campaign()) }, icon("book"), activeSystem().name)),
        usesSetting("encumbrance") && h("label", { class: "field" }, h("span", null, "Encumbrance"),
          h("select", { onchange: e => setSetting("encumbrance", e.target.value) },
            [["standard", "Standard (capacity = STR × 15)"], ["variant", "Variant (speed penalties at STR × 5 / × 10)"], ["off", "Off"]]
              .map(([v, l]) => h("option", { value: v, selected: s.settings.encumbrance === v }, l)))),
        usesSetting("carryMultiplier") && h("label", { class: "field" }, h("span", null, `Carry multiplier for ${store.char().name}`),
          h("select", { onchange: e => commit((st, c) => { c.stats = { ...statsOf(c), carryMultiplier: +e.target.value }; }) },
            [[0.5, "×½ (Tiny)"], [1, "×1 (Small / Medium)"], [2, "×2 (Large, Powerful Build)"], [4, "×4 (Huge)"], [8, "×8 (Gargantuan)"]]
              .map(([v, l]) => h("option", { value: v, selected: (statsOf(store.char()).carryMultiplier || 1) === v }, l)))),
        currency().perWeight > 0 && h("label", { class: "check field" }, h("input", { type: "checkbox", checked: s.settings.coinWeight, onchange: e => setSetting("coinWeight", e.target.checked) }),
          ` Coins have weight (${currency().perWeight} coins = 1 ${weightUnit()})`))),
    h("section", null,
      h("h2", null, "Data"),
      h("p", { class: "muted small" }, party.app?.localStore
        ? ["Saved on this PC in ", h("code", null, party.app.localDir), ". Every Pack Rat window on this PC shares it — you can also open Pack Rat in any browser here at ",
           h("code", null, `http://localhost:${party.app.appPort}`), " while the app is running."]
        : party.active
        ? "Party characters are saved on the host computer. Custom items, templates and settings stay in this browser."
        : "Everything is saved in this browser only. Export a backup to move data between your PC and phone."),
      h("div", { class: "inline wrap" },
        h("button", { class: "btn", onclick: exportAll }, icon("download"), "Export all"),
        h("button", { class: "btn", onclick: () => fileInput.click() }, icon("upload"), "Import"),
        fileInput,
        !party.active && h("button", { class: "btn danger", onclick: () => confirmDialog("Erase all characters, custom items and templates?", "Erase everything",
          () => commit(() => store.reset(), "All data reset", true)) }, icon("trash"), "Reset"))),
    h("section", { class: "credits muted small" },
      h("p", null, "Includes material from the System Reference Document 5.1 by Wizards of the Coast LLC, licensed under ",
        h("a", { href: "https://creativecommons.org/licenses/by/4.0/legalcode", target: "_blank", rel: "noopener" }, "CC BY 4.0"), "."),
      h("p", null, "Item data from ", h("a", { href: "https://dnd5e.wikidot.com/", target: "_blank", rel: "noopener" }, "dnd5e.wikidot.com"),
        " (CC BY-SA 3.0). Item icons from ", h("a", { href: "https://game-icons.net", target: "_blank", rel: "noopener" }, "game-icons.net"),
        " by " + ICON_CREDITS.join(", ") + " (CC BY 3.0). Dungeons & Dragons is a trademark of Wizards of the Coast; this tool is unofficial.")),
    party.isApp() && quitSection());
}

function partySettings() {
  if (party.active) {
    return h("section", null,
      h("h2", null, "Party"),
      h("p", { class: "muted small" }, party.isHosting() ? "You're hosting a party. Others on this network join by opening:"
        : party.isJoinedElsewhere() ? `You joined the party at ${hostLabel(party.base)}. Others on this network join by opening:`
        : "You're connected to a party server. Others on this network join by opening:"),
      joinAddresses(),
      party.isHosting() && h("button", { class: "btn danger", onclick: stopHosting }, "Stop hosting"),
      party.isJoinedElsewhere() && h("button", { class: "btn", onclick: confirmLeave }, "Leave party"));
  }
  if (party.isApp()) return [hostPartySection(), joinOtherSection()];
  return h("section", null,
    h("h2", null, "Party play"),
    h("p", { class: "muted small" }, "Want everyone at the table to have their own inventory and trade items? On the computer that will host, run ",
      h("code", null, "start-party.bat"), " (or ", h("code", null, "python server.py"), ") from the app folder. It shows an address like ",
      h("code", null, "http://192.168.1.20:8765"), " — anyone on the same Wi-Fi opens it in their browser to join."));
}

function newCharPrompt() {
  let name = "", close;
  close = openModal("New " + term("character"), h("form", { class: "form", onsubmit: e => { e.preventDefault(); ok(); } },
    h("label", { class: "field" }, h("span", null, "Name"), h("input", { type: "text", oninput: e => { name = e.target.value; } }))),
  { footer: [h("button", { class: "btn", onclick: () => close() }, "Cancel"), h("button", { class: "btn primary", onclick: () => ok() }, "Create")] });
  function ok() {
    close();
    commit(s => { const c = newCharacter(name.trim() || "New Character"); s.characters.push(c); s.activeId = c.id; }, "Character created");
    go("inventory");
  }
}

function renamePrompt(c) {
  let name = c.name, close;
  const ok = () => { close(); commit(s => { s.characters.find(x => x.id === c.id).name = name.trim() || c.name; }); };
  close = openModal("Rename", h("form", { class: "form", onsubmit: e => { e.preventDefault(); ok(); } },
    h("label", { class: "field" }, h("span", null, "Name"), h("input", { type: "text", value: name, oninput: e => { name = e.target.value; } }))),
  { footer: [h("button", { class: "btn", onclick: () => close() }, "Cancel"), h("button", { class: "btn primary", onclick: ok }, "Save")] });
}

function openCharSwitcher() {
  if (party.active && !party.linked().length) return;
  let close;
  const s = store.state;
  const row = c => h("button", { class: "row row-main switch" + (c.id === s.activeId ? " equipped" : ""),
    onclick: () => { close(); commit(st => { st.activeId = c.id; }); } },
    icon("user"), h("div", null, h("div", { class: "row-title" }, c.name), h("div", { class: "row-sub" }, entriesLabel(c))));
  const campaignLine = h("button", { class: "campaign-line", type: "button", onclick: () => { close(); openCampaignSwitcher(); } },
    icon("book"), h("span", null, h("span", { class: "muted small" }, "Campaign"), h("b", null, store.campaign().name)),
    !party.active && h("span", { class: "link" }, "Change"));
  if (!party.active) {
    close = openModal(termCap("characters"), h("div", { class: "group" }, campaignLine,
      s.characters.map(row),
      h("button", { class: "btn wide", onclick: () => { close(); newCharPrompt(); } }, icon("plus"), "New " + term("character"))));
    return;
  }
  // In a party: switch between the characters playing; others on this device can be brought in.
  const others = bringableCharacters();
  close = openModal(termCap("characters"), [
    campaignLine,
    h("h4", null, "Playing in this party"),
    h("div", { class: "group" }, party.linked().map(row)),
    others.length > 0 && [h("h4", null, "Also on this device"),
      h("div", { class: "group" }, others.map(c => h("div", { class: "row" },
        icon("user"), h("div", { class: "row-main static" }, h("div", { class: "row-title" }, c.name),
          h("div", { class: "row-sub" }, entriesLabel(c))),
        h("button", { class: "btn", onclick: async () => { close(); await party.bring(c.id); } }, icon("users"), "Bring into party"))))],
    h("button", { class: "btn wide", onclick: () => { close(); openJoinModal(); } }, icon("plus"), `New ${term("character")} or take over`),
  ]);
}

// ------------------------------------------------------------------ finding saved data

// Nothing saved yet in this copy: only blank starter characters, no custom items.
function isFreshData() {
  return store.campaigns().every(c => c.characters.every(isBlankCharacter)) && !store.allCustomItems().length;
}

// A copy with nothing saved (e.g. the web app opened from a file, or a different address) looks
// for Pack Rat running on this device: the Windows app or the phone app, which keep their data in
// a file. Its info endpoint can be read from any page. Found -> offer to open it there.
async function findRunningPackRat() {
  const tries = APP_PORTS_TO_CHECK.map(async port => {
    const url = `http://127.0.0.1:${port}/`;
    if (new URL(url).origin === location.origin) throw new Error("this is it");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    try {
      const info = await (await fetch(url + "api/info", { cache: "no-store", signal: ctrl.signal })).json();
      if (!info.desktop) throw new Error("not the app");
      return { url, android: !!info.android };
    } finally {
      clearTimeout(timer);
    }
  });
  try { return await Promise.any(tries); } catch { return null; }
}

// The ports the Windows and Android apps use for their own window (desktop.py / PartyServer.java).
const APP_PORTS_TO_CHECK = [47651, 47652, 47653, 47654, 47655];

// Opened from this device or the home network (not a public website, where probing this device
// would make the browser ask for local network access).
function isLocalPage() {
  const h = location.hostname;
  return location.protocol === "file:" || h === "localhost" || h.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/.test(h);
}

async function lookForSavedData() {
  if (kv.remote || !isLocalPage() || !isFreshData() || readPref("packrat-found-dismissed", "")) return;
  const found = await findRunningPackRat();
  if (!found || !isFreshData()) return;
  ui.foundElsewhere = found;
  render();
}

function foundElsewhereBanner() {
  const f = ui.foundElsewhere;
  if (!f || !isFreshData()) return null;
  const dismiss = () => { ui.foundElsewhere = null; writePref("packrat-found-dismissed", "1"); render(); };
  return h("section", { class: "found-banner" },
    icon("users"),
    h("div", null,
      h("b", null, `Pack Rat is running on this ${f.android ? "phone" : "PC"}`),
      h("p", { class: "muted small" }, "Your saved characters are probably there. This copy has its own, separate storage and nothing saved yet.")),
    h("a", { class: "btn primary", href: f.url }, "Open my Pack Rat"),
    h("button", { class: "btn", onclick: dismiss }, "Not now"));
}

function pickBackup() {
  const input = h("input", { type: "file", accept: "application/json,.json", hidden: true,
    onchange: () => { if (input.files[0]) importFile(input.files[0]); input.remove(); } });
  document.body.append(input);
  input.click();
}

// ------------------------------------------------------------------ boot

// In the Windows app, links to the web (the user guide, credits) open in the PC's default browser
// rather than another app window. (The Android app sends them to the phone's browser itself.)
document.addEventListener("click", e => {
  const a = e.target.closest?.("a[href]");
  if (!a || !party.isApp() || party.app.android || !a.href.startsWith("https:")) return;
  e.preventDefault();
  fetch("api/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: a.href }) })
    .then(r => { if (!r.ok) throw new Error(); })
    .catch(() => window.open(a.href, "_blank", "noopener"));
});

// Make unexpected errors visible instead of failing silently (e.g. an old phone browser).
window.addEventListener("error", e => { if (e.message) toast("Something went wrong: " + e.message); });
window.addEventListener("unhandledrejection", e => toast("Something went wrong: " + (e.reason?.message || e.reason)));

async function boot() {
  try {
    await party.detect();
  } catch (e) {
    console.warn("Party server found but not reachable; running solo", e);
    party.active = false;
  }
  applyPrefs(); // saved preferences may live in the PC's shared file
  store.load();
  adoptItemDrawings(); // drawn icons from before the drawings library
  adoptAppShops(); // shops the app's own server kept before campaigns
  store.subscribe(render);
  const nav = document.getElementById("nav");
  nav.replaceChildren(...Object.entries(VIEWS).map(([k, v]) =>
    h("button", { class: "nav-btn", "data-view": k, onclick: () => go(k) }, icon(v.icon), h("span", { class: "nav-label" }, viewLabel(k)),
      v.partyOnly && h("span", { class: "badge", hidden: true }))));
  document.getElementById("char-switch").addEventListener("click", openCharSwitcher);
  const hash = location.hash.slice(1);
  if (VIEWS[hash]) ui.view = hash;
  else if (hash === "custom") { ui.view = "catalog"; ui.catTab = "mine"; } // the Custom tab's place before
  if (party.active) {
    if (!party.followCampaign()) party.link(); // play the campaign the GM has loaded
    party.connect();
  }
  render();
  if (!party.active) lookForSavedData();
  if (party.unreachable) party.retryJoin();
  // Closing the host's window ends the party for everyone, so ask first.
  window.addEventListener("beforeunload", e => {
    if (!ui.leaving && party.isHosting() && party.others().some(c => c.online)) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW registration failed", e));
  }
}

boot();
