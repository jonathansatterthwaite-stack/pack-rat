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

function typeBadge(type) {
  return h("span", { class: "type-dot", style: { background: typeColor(type) }, title: TYPE_LABELS[type] || type });
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
      store.update(s => Object.assign(s, JSON.parse(undoState)));
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
  const before = undoable ? JSON.stringify(store.state) : null;
  store.update(s => fn(s, store.char()));
  if (msg) toast(msg, before);
}

// ------------------------------------------------------------------ modal

function openModal(title, body, { wide = false, footer = null } = {}) {
  const root = document.getElementById("modal-root");
  const close = () => { overlay.remove(); document.body.classList.toggle("modal-open", root.children.length > 0); };
  const panel = h("div", { class: "modal" + (wide ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "modal-head" }, h("h2", null, title), iconBtn("x", "Close", () => close())),
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
  trinketTable: TRINKET_TABLES[0]?.id,
  views: loadViewPrefs(),
  sort: readPref("packrat-sort", "smart"),
  sortReverse: readPref("packrat-sort-rev", "") === "1",
  combatOpen: readPref("packrat-combat", "1") === "1",
  statsOpen: readPref("packrat-stats", "1") === "1",
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
  ui.combatOpen = readPref("packrat-combat", "1") === "1";
  ui.statsOpen = readPref("packrat-stats", "1") === "1";
  ui.playerMode = readPref("packrat-player-mode", "") === "1";
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
  inventory: { label: "Inventory", icon: "bag", render: renderInventory },
  catalog: { label: "Catalog", icon: "book", render: renderCatalog, builder: true },
  custom: { label: "Custom", icon: "wand", render: renderCustom, builder: true },
  shops: { label: "Shops", icon: "cart", render: renderShops },
  party: { label: "Party", icon: "users", render: renderParty, partyOnly: true },
  settings: { label: "Settings", icon: "sliders", render: renderSettings },
};

function render() {
  const char = store.char();
  // In a party with none of this device's characters playing yet: choose one first.
  const joining = party.active && !party.linked().length;
  if (VIEWS[ui.view].partyOnly && !party.active) ui.view = "inventory";
  if (VIEWS[ui.view].builder && ui.playerMode) ui.view = "inventory"; // player mode: no catalog or custom items
  document.getElementById("char-name").textContent = joining ? "Join the party" : char ? char.name : "";
  document.getElementById("nav").hidden = joining;
  const offers = party.active ? party.incoming().length : 0;
  document.querySelectorAll("[data-view]").forEach(b => {
    b.classList.toggle("active", b.dataset.view === ui.view);
    b.hidden = (VIEWS[b.dataset.view].partyOnly && !party.active) || (VIEWS[b.dataset.view].builder && ui.playerMode);
    const badge = b.querySelector(".badge");
    if (badge) { badge.textContent = offers; badge.hidden = !offers; }
  });
  const main = document.getElementById("view");
  const scroll = window.scrollY;
  tileObserver?.disconnect(); // the grids being replaced; new ones observe themselves
  main.replaceChildren(joining ? renderJoin() : VIEWS[ui.view].render());
  // Tiles are laid out now: size them and shrink names to fit (resizes are handled by each grid's observer).
  syncTileSize(main);
  window.scrollTo(0, scroll);
}

function go(view) {
  ui.view = view;
  history.replaceState(null, "", "#" + view);
  render();
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ inventory view

function renderInventory() {
  const char = store.char();
  const settings = store.state.settings;
  const enc = encumbrance(char, settings);
  const ac = armorClass(char);
  const value = char.items.reduce((s, e) => s + entryValue(e), 0);
  const attuned = char.items.filter(e => e.attuned).length;
  const pct = Math.min(100, (enc.weight / enc.capacity) * 100);

  const statsGrid = h("div", { class: "stats" },
    h("div", { class: "stat", title: ac.breakdown },
      h("div", { class: "stat-label" }, icon("shield"), "Armor Class"),
      h("div", { class: "stat-value" }, ac.ac),
      h("div", { class: "stat-sub" }, ac.breakdown),
      ac.strPenalty && h("div", { class: "stat-warn" }, "Str too low: -10 ft speed"),
      ac.stealth && h("div", { class: "stat-sub" }, "Disadvantage on Stealth")),
    !enc.off && h("div", { class: "stat" },
      h("div", { class: "stat-label" }, icon("weight"), "Carried"),
      h("div", { class: "stat-value" }, +enc.weight.toFixed(1), h("small", null, ` / ${enc.capacity} lb`)),
      h("div", { class: "meter " + enc.status }, h("div", { style: { width: pct + "%" } })),
      h("div", { class: "stat-sub" + (enc.status !== "ok" ? " warn-text" : "") }, enc.label)),
    h("button", { class: "stat clickable", onclick: openCoins },
      h("div", { class: "stat-label" }, icon("coins"), "Coins"),
      h("div", { class: "coins" }, COIN_ORDER.map(k => h("span", { class: "coin " + k }, h("b", null, (char.coins[k] || 0).toLocaleString()), " ", k))),
      h("div", { class: "stat-sub" }, `Worth ${fmtCost(coinTotalCp(char.coins))} · gear ${fmtCost(Math.round(value))}`)),
    h("div", { class: "stat" },
      h("div", { class: "stat-label" }, icon("user"), "Abilities"),
      h("div", { class: "abilities" },
        abilityInput("STR", "str"), abilityInput("DEX", "dex")),
      h("div", { class: "stat-sub" }, `Attuned ${attuned} / 3`)));

  // Collapsible; closed, it still shows the coins (a button to the coin purse) and the weight carried.
  const open = ui.statsOpen;
  const toggleStats = () => { ui.statsOpen = !open; writePref("packrat-stats", ui.statsOpen ? "1" : "0"); render(); };
  const stats = h("section", { class: "group char-panel" + (open ? "" : " closed") },
    h("div", { class: "group-head" },
      h("button", { class: "collapse" + (open ? "" : " closed"), onclick: toggleStats, "aria-expanded": String(open) }, icon("chevron"),
        h("h3", null, open ? "Character" : "")),
      !open && h("button", { class: "purse-btn", type: "button", title: "Open the coin purse", "aria-label": "Coins: open the coin purse", onclick: openCoins },
        icon("coins"), h("span", { class: "coins" }, COIN_ORDER.map(k => h("span", { class: "coin " + k }, h("b", null, (char.coins[k] || 0).toLocaleString()), " ", k)))),
      !open && !enc.off && h("span", { class: "carried-mini" + (enc.status !== "ok" ? " warn-text" : ""), title: enc.label },
        icon("weight"), `${+enc.weight.toFixed(1)} / ${enc.capacity} lb`)),
    open && statsGrid);

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

  return h("div", { class: "view-inventory" }, foundElsewhereBanner(), notInPartyBanner(), party.active && undecidedBanner(), stats, combatPanel(char), toolbar, inventoryTypeChips(char), list);
}

// ------------------------------------------------------------------ combat panel

// Collapsible: the equipped weapons ready to use, with to-hit, damage, range and ammunition.
function combatPanel(char) {
  const open = ui.combatOpen;
  const toggle = () => { ui.combatOpen = !open; writePref("packrat-combat", ui.combatOpen ? "1" : "0"); render(); };
  const weapons = char.items.filter(e => e.item.type === "weapon");
  const ready = weapons.filter(e => e.equipped);
  // Nothing equipped yet: show every weapon so the panel is still useful.
  const shown = ready.length ? ready : weapons;
  const others = ready.length ? weapons.filter(e => !e.equipped) : [];
  const summary = ready.length ? ready.map(e => e.item.name).join(", ")
    : weapons.length ? `${weapons.length} weapon${weapons.length === 1 ? "" : "s"}, none equipped` : "Unarmed";
  const profs = char.weaponProfs || ["Simple", "Martial"];
  const setProf = (cat, on) => commit((s, c) => {
    const cur = c.weaponProfs || ["Simple", "Martial"];
    c.weaponProfs = on ? [...new Set([...cur, cat])] : cur.filter(x => x !== cat);
  });
  return h("section", { class: "group combat" },
    h("div", { class: "group-head" },
      h("button", { class: "collapse" + (open ? "" : " closed"), onclick: toggle, "aria-expanded": String(open) }, icon("chevron"),
        h("h3", null, "Combat")),
      h("span", { class: "muted combat-summary" }, summary)),
    open && [
      h("div", { class: "combat-settings" },
        h("label", { class: "prof-field" }, "Proficiency bonus",
          h("input", { type: "number", inputmode: "numeric", min: 0, max: 10, value: char.prof ?? 2, "aria-label": "Proficiency bonus",
            onchange: ev => commit((s, c) => { c.prof = Math.max(0, Math.min(10, Math.floor(+ev.target.value || 0))); }) })),
        h("span", { class: "muted small" }, "Proficient with"),
        ["Simple", "Martial"].map(cat => h("label", { class: "check" },
          h("input", { type: "checkbox", checked: profs.includes(cat), onchange: ev => setProf(cat, ev.target.checked) }), " ", cat))),
      h("div", { class: "attack-grid" }, shown.map(e => attackCard(char, e)), unarmedCard(char)),
      !weapons.length && h("p", { class: "muted small pad" }, "Add weapons from the catalog and equip them to see them here."),
      !ready.length && weapons.length > 0 && h("p", { class: "muted small pad" }, "Equip weapons (the sword button on an item) to keep just those here."),
      others.length > 0 && h("div", { class: "combat-others muted small" }, "Also carried: ",
        others.map((e, i) => [i > 0 && ", ", h("button", { class: "link", title: "Equip", onclick: () => toggleEquip(e.uid) },
          entryName(e) + (e.qty > 1 ? ` ×${e.qty}` : ""))])),
    ]);
}

function attackCard(char, e) {
  const it = e.item, a = weaponAttack(char, it);
  const abil = mod(char[a.ability]);
  const hitWhy = [`${a.ability.toUpperCase()} ${fmtMod(abil)}`, a.prof ? `proficiency ${fmtMod(char.prof ?? 2)}` : "not proficient",
    it.bonus && `magic ${fmtMod(it.bonus)}`].filter(Boolean).join(", ");
  const where = [a.reach && `Reach ${a.reach}`, a.range && `${a.thrown ? "Thrown" : "Range"} ${a.range}`].filter(Boolean).join(" · ");
  return h("div", { class: "attack" + (e.equipped ? "" : " idle") },
    h("div", { class: "attack-head" },
      itemIcon(it, "attack-icon"),
      h("button", { class: "attack-name", onclick: () => openEntry(e.uid), title: "Details" },
        entryName(e), e.qty > 1 && h("span", { class: "tag" }, "×" + e.qty)),
      h("div", { class: "to-hit", title: hitWhy }, h("b", null, fmtMod(a.toHit)), h("small", null, "to hit"))),
    h("div", { class: "attack-dmg" }, h("b", null, a.damage), a.type && " " + a.type,
      a.twoHanded && h("span", { class: "muted" }, ` · two hands ${a.twoHanded}`)),
    h("div", { class: "attack-meta" }, [where, a.ability.toUpperCase(), !a.prof && "not proficient"].filter(Boolean).join(" · ")),
    // Range and ammunition are spelt out above; the other properties keep their rules as tooltips.
    it.properties?.some(p => !/^(range|ammunition)/i.test(p)) && h("div", { class: "attack-props" }, it.properties.filter(p => !/^(range|ammunition)/i.test(p)).map(p => {
      const key = Object.keys(WEAPON_PROPERTIES).find(k => p.toLowerCase().startsWith(k.toLowerCase()));
      return h("span", { class: "chip", title: key ? WEAPON_PROPERTIES[key] : "" }, p);
    })),
    a.offHand && h("div", { class: "attack-note" }, `Off-hand attack (bonus action): ${a.offHand}${a.type ? " " + a.type : ""}`),
    a.loading && h("div", { class: "attack-note" }, "Loading: one shot per action, bonus action or reaction."),
    a.range && h("div", { class: "attack-note" }, "Beyond the first range: disadvantage. Can't reach past the second."),
    a.ammo && ammoLine(char, it));
}

// The ammunition a weapon uses, where it is, and buttons to use or recover one.
function ammoLine(char, weapon) {
  const stacks = ammoEntries(char, weapon)
    // Quivers and cases first: that's what you shoot from.
    .sort((x, y) => (holderSpec(char.items.find(c => c.uid === y.parent) || { item: {} }) ? 1 : 0)
      - (holderSpec(char.items.find(c => c.uid === x.parent) || { item: {} }) ? 1 : 0));
  if (!stacks.length) return h("div", { class: "ammo out" }, "No ammunition — add some from the catalog.");
  const change = (uid, d) => commit((s, c) => {
    const x = c.items.find(x => x.uid === uid);
    if (!x) return;
    x.qty = Math.max(0, x.qty + d);
    if (x.qty === 0) removeEntry(c, x.uid);
  });
  return h("div", { class: "ammo" }, stacks.map(s => h("div", { class: "ammo-row" },
    itemIcon(s.item, "ammo-icon"),
    h("span", { class: "ammo-count" }, h("b", null, s.qty.toLocaleString()), " ", s.item.name),
    h("span", { class: "muted small ammo-where" }, locationLabel(char, s) || "on person"),
    iconBtn("minus", `Use one ${s.item.name}`, () => change(s.uid, -1)),
    iconBtn("plus", `Recover one ${s.item.name}`, () => change(s.uid, 1)))));
}

function unarmedCard(char) {
  const str = mod(char.str), hit = str + (char.prof ?? 2);
  return h("div", { class: "attack idle" },
    h("div", { class: "attack-head" },
      h("span", { class: "attack-icon unarmed" }, icon("user")),
      h("span", { class: "attack-name static" }, "Unarmed strike"),
      h("div", { class: "to-hit", title: `STR ${fmtMod(str)}, proficiency ${fmtMod(char.prof ?? 2)}` }, h("b", null, fmtMod(hit)), h("small", null, "to hit"))),
    h("div", { class: "attack-dmg" }, h("b", null, String(Math.max(0, 1 + str))), " bludgeoning"),
    h("div", { class: "attack-meta" }, "Reach 5 ft · STR"));
}

// Inventory filter: "all", "equipped", or a group (Gear & Tools…), optionally narrowed to one
// of its subcategories (ui.invSub: a type in a combined group, or a category).
function invTypeMatches(e, group, sub = null) {
  if (group === "all") return true;
  if (group === "equipped") return e.equipped;
  if (GROUP_OF[e.item.type] !== group) return false;
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
  return chipRow("Filter within " + GROUP_BY_ID[groupId].name, [
    chip(null, "All " + GROUP_BY_ID[groupId].name.toLowerCase(), null),
    shown.map(s => chip(s.key, s.label, s.n, colorDot(shade(groupHue(groupId), s.i, subs.length), s.label))),
  ], "sub-chips");
}

// What the inventory lists: everything except the cards inside decks (those show in the deck's details).
const listed = char => char.items.filter(e => !inDeck(char, e));

function inventoryTypeChips(char) {
  const items = listed(char);
  if (!items.length) return null;
  const counts = {};
  for (const e of items) { const g = GROUP_OF[e.item.type] || "gear"; counts[g] = (counts[g] || 0) + 1; }
  const equipped = items.filter(e => e.equipped).length;
  const active = activeInvType(char);
  const chip = (key, label, n, dot) => h("button", {
    class: "chip-btn" + (active === key ? " active" : ""), role: "tab", "aria-selected": String(active === key),
    onclick: () => { ui.invType = key; ui.invSub = null; render(); },
  }, dot, label, h("span", { class: "chip-count" }, n));
  const row = chipRow("Filter by type", [
    chip("all", "All", items.length),
    equipped > 0 && chip("equipped", "Equipped", equipped),
    TYPE_GROUPS.filter(g => counts[g.id]).map(g => chip(g.id, g.name, counts[g.id], colorDot(groupColor(g.id), g.name))),
  ]);
  const sub = GROUP_BY_ID[active] && subChips(active, activeInvSub(char, active),
    s => items.filter(e => invTypeMatches(e, active, s.key)).length,
    key => { ui.invSub = key; render(); });
  return [row, sub];
}

function abilityInput(label, key) {
  const char = store.char();
  return h("label", { class: "ability" }, h("span", null, label),
    h("input", { type: "number", inputmode: "numeric", min: 1, max: 30, value: char[key] || 10,
      onchange: e => commit((s, c) => { c[key] = Math.max(1, Math.min(30, +e.target.value || 10)); }) }),
    h("small", null, fmtMod(mod(char[key]))));
}

function matchesSearch(item, q) {
  if (!q) return true;
  q = q.toLowerCase();
  return [item.name, item.category, item.description, item.body, item.author, item.damageType, TYPE_LABELS[item.type], groupOf(item.type).name, ...(item.properties || [])]
    .some(v => v && String(v).toLowerCase().includes(q));
}

// Each comparator gives the natural order for that sort; "Reverse" flips it.
// Ties always fall back to name so the order is stable.
const INV_SORTS = {
  smart: { label: "Equipped first", cmp: (a, b) => b.equipped - a.equipped },
  name: { label: "Name", cmp: () => 0 },
  type: { label: "Type", cmp: (a, b) => typeOrder(a.item.type) - typeOrder(b.item.type) },
  weight: { label: "Heaviest", cmp: (a, b, char) => entryTotalWeight(char, b) - entryTotalWeight(char, a) },
  value: { label: "Most valuable", cmp: (a, b) => entryValue(b) - entryValue(a) },
  qty: { label: "Quantity", cmp: (a, b) => b.qty - a.qty },
  recent: { label: "Recently added", cmp: (a, b, char) => char.items.indexOf(b) - char.items.indexOf(a) },
};

function sortEntries(char, entries) {
  const cmp = (INV_SORTS[ui.sort] || INV_SORTS.smart).cmp;
  const dir = ui.sortReverse ? -1 : 1;
  return [...entries].sort((a, b) => dir * (cmp(a, b, char) || a.item.name.localeCompare(b.item.name)));
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
      !ui.playerMode && h("button", { class: "btn primary", onclick: () => go("catalog") }, "Browse the catalog"),
      !party.active && isFreshData() && h("p", { class: "muted small" }, "Moving from another device? ",
        h("button", { class: "link", onclick: pickBackup }, "Import a backup"), " exported from Pack Rat's Settings."))];
  }
  const type = activeInvType(char);
  if (q || type !== "all") {
    // Filtered: one flat list, with each item tagged by the container it's in.
    const sub = activeInvSub(char, type);
    const hits = listed(char).filter(e => invTypeMatches(e, type, sub) &&
      (matchesSearch(e.item, q) || [e.notes, e.customName].some(t => (t || "").toLowerCase().includes(q.toLowerCase()))));
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
  const inner = contentsWeight(char, c);
  const cap = c.item.capacityLb;
  const spec = holderSpec(c);
  const fill = fillLevel(char, c);
  const collapsed = ui.collapsed.has(c.uid);
  const toggle = () => { collapsed ? ui.collapsed.delete(c.uid) : ui.collapsed.add(c.uid); render(); };
  const load = spec ? `${fill.used} / ${fill.limit} ${fill.unit}s`
    : cap ? `${+inner.toFixed(2)} / ${cap} lb` : fmtWeight(inner);
  return dropZone(c.uid, h("div", { class: "group container-group", style: { marginLeft: depth ? "12px" : null } },
    withFill(h("div", { class: "group-head" },
      h("button", { class: "collapse" + (collapsed ? " closed" : ""), onclick: toggle, "aria-expanded": String(!collapsed) }, icon("chevron"),
        h("h3", null, entryName(c), c.qty > 1 ? ` ×${c.qty}` : "")),
      h("span", { class: "muted" + (fill?.over ? " warn-text" : ""), title: spec ? `Holds ${spec.label.toLowerCase()}` : null },
        load, c.item.weightless ? " (weightless)" : ""),
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
        addToInventory(c, { ...clone(x.item), id: x.srcId }, room, parentUid);
      }, `Moved ${room} × ${entry.item.name} to ${dest} (it's full)`, true);
    }
  }
  commit((s, c) => {
    const x = c.items.find(x => x.uid === id);
    x.parent = parentUid;
    x.strapped = strapped;
  }, `Moved ${entry.item.name} to ${dest}`, true);
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
  const fill = fillLevel(char, e);
  const load = fill?.unit ? `${fill.used} / ${fill.limit} ${fill.unit}s`
    : e.item.capacityLb > 0 ? `${+contentsWeight(char, e).toFixed(2)} / ${e.item.capacityLb} lb` : fmtWeight(contentsWeight(char, e));
  return `${plural(inside.length, "item")} · ${load}`;
}

// Tile labels: worth top-left, weight top-right, and along the bottom the stack count or, for a
// container, how full it is.
function minimalCorners(worthCp, weightLb, bottom) {
  return [
    // No space before the unit: two labels share the top of a small tile.
    // Worth and weight share the top edge: whichever is shorter leaves the other more room.
    (worthCp > 0 || weightLb > 0) && h("span", { class: "tile-top" },
      worthCp > 0 && h("span", { class: "tile-mini tile-worth", title: "Worth" }, fmtCostShort(worthCp).replace(/^([\d.]+k?) /, "$1")),
      weightLb > 0 && h("span", { class: "tile-mini tile-wt", title: "Weight" }, +weightLb.toFixed(1) + "lb")),
    bottom && h("span", { class: "tile-mini tile-bottom" }, bottom),
  ];
}

// "15 gp", "1.8 gp", "4 sp", "1.5k gp" (for the small corner labels).
function fmtCostShort(cp) {
  cp = Math.round(cp);
  if (cp >= 100000) return `${+(cp / 100000).toFixed(cp >= 1000000 ? 0 : 1)}k gp`;
  if (cp >= 100) return `${+(cp / 100).toFixed(cp >= 1000 ? 0 : 1)} gp`;
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
  return `${+contentsWeight(char, e).toFixed(1)}/${e.item.capacityLb} lb`;
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
  const it = e.item;
  const path = showPath ? locationLabel(char, e) : null;
  const el = h("button", { class: "tile" + (e.equipped ? " equipped" : ""), draggable: "true",
    title: [entryName(e), liquidLabel(e) || containerLoad(char, e) || itemSummary(it), e.equipped && (it.type === "armor" || it.acBonus ? "worn" : "equipped"),
      e.attuned && "attuned", e.charges != null && `${e.charges}/${it.maxCharges} charges`, path].filter(Boolean).join(" · "),
    onclick: () => openEntry(e.uid),
    ondragstart: ev => { ev.dataTransfer.setData("text/entry", e.uid); ev.dataTransfer.effectAllowed = "move"; } },
    itemIcon(it, "tile-icon"),
    h("span", { class: "tile-name" }, entryName(e)),
    minimalCorners(entryTotalValue(char, e), entryTotalWeight(char, e), containerCapacity(char, e) || (e.qty !== 1 ? "×" + e.qty.toLocaleString() : null)));
  el.style.setProperty("--type", itemColor(it));
  return withFill(el, fillLevel(char, e));
}

function entryRow(char, e, showPath = false) {
  const it = e.item;
  const equipable = ["weapon", "armor", "magic"].includes(it.type) || it.acBonus;
  const path = showPath ? locationLabel(char, e) : null;
  const setQty = n => commit((s, c) => {
    const x = c.items.find(x => x.uid === e.uid);
    x.qty = Math.max(0, n);
    if (x.qty === 0) removeEntry(c, x.uid);
  }, n <= 0 ? `Removed ${it.name}` : null, n <= 0);
  return withFill(h("div", { class: "row" + (e.equipped ? " equipped" : ""), draggable: "true",
    ondragstart: ev => { ev.dataTransfer.setData("text/entry", e.uid); ev.dataTransfer.effectAllowed = "move"; } },
    itemIcon(it, "row-icon"),
    h("button", { class: "row-main", onclick: () => openEntry(e.uid) },
      h("div", { class: "row-title" }, entryName(e),
        e.equipped && h("span", { class: "tag on" }, it.type === "armor" || it.acBonus ? "worn" : "equipped"),
        e.attuned && h("span", { class: "tag attuned" }, "attuned"),
        e.charges != null && h("span", { class: "tag" }, `${e.charges}/${it.maxCharges} charges`),
        path && h("span", { class: "tag" }, path)),
      h("div", { class: "row-sub" }, [liquidLabel(e) || containerLoad(char, e) || itemSummary(it), e.notes].filter(Boolean).join(" — "))),
    h("div", { class: "row-weight muted" }, fmtWeight(entryOwnWeight(e))),
    writingButton(e),
    equipable && iconBtn(it.type === "weapon" ? "sword" : "shield", e.equipped ? "Unequip" : "Equip",
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

// On an item's row: read or view what's there, or write in it / add a picture.
function writingButton(e, onDone = () => {}, cls = "equip") {
  const it = e.item, kind = pageKind(it, e.srcId);
  if (!kind) return null;
  const read = hasWriting(it) || (kind === "writing" && it.type === "document");
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

function toggleEquip(entryUid) {
  commit((s, c) => {
    const e = c.items.find(x => x.uid === entryUid);
    e.equipped = !e.equipped;
    // Only one suit of armor and one shield at a time.
    if (e.equipped && e.item.type === "armor") {
      const shield = e.item.category === "Shield";
      c.items.forEach(o => {
        if (o !== e && o.equipped && o.item.type === "armor" && (o.item.category === "Shield") === shield) o.equipped = false;
      });
    }
  });
}

// ------------------------------------------------------------------ entry details

// onIcon(id): when given, the item's icon can be changed from its details.
// srcId: the catalog item an inventory copy came from (older copies take missing fields from it).
function itemDetails(item, onIcon = null, srcId = item.id) {
  const has = key => hasFeature(item, key, srcId);
  const rows = [];
  const add = (k, v) => { if (v !== undefined && v !== null && v !== "" && v !== false) rows.push([k, v]); };
  add("Type", TYPE_LABELS[item.type] + (item.type !== "weapon" && item.category ? ` — ${item.category}` : ""));
  if (item.type === "weapon") {
    add("Simple / martial", item.category || "—");
    add("Melee / ranged", item.kind || "—");
  }
  const tpl = item.template && store.template(item.template);
  if (tpl) add("Template", tpl.name);
  add("Cost", item.cost ? fmtCost(item.cost) + (item.bundle > 1 ? ` per ${item.bundle}` : "") : null);
  add("Weight", item.weight ? fmtWeight(item.weight) + (item.bundle > 1 ? ` per ${item.bundle}` : "") : null);
  add("Rarity", item.rarity);
  add("Attunement", item.attunement && "Required");
  if (item.type === "weapon") {
    add("Damage", [item.damage, item.damageType].filter(Boolean).join(" ") || "—");
    add("Magic bonus", item.bonus && fmtMod(item.bonus));
  }
  if (item.type === "armor" || item.type === "ammunition") add("Magic bonus", item.bonus && fmtMod(item.bonus));
  if (item.type === "armor") {
    add("Armor Class", itemSummary(item).split(" · ")[0]);
    add("Strength", item.strength && `Str ${item.strength}`);
    add("Stealth", item.stealthDisadvantage && "Disadvantage");
  }
  if (has("holds")) {
    add("Capacity", item.capacity || (item.capacityLb && item.capacityLb + " lb"));
    add("Weightless", item.weightless && "Contents don't count toward carried weight");
    add("Straps", item.straps && "Gear can be strapped to the outside");
    const spec = HOLDERS[item.holds];
    add("Holds", spec && `Only ${spec.label.toLowerCase()} — up to ${item.holdLimit || spec.limit} ${spec.unit}s` +
      (item.holds === "scrolls" ? " (parchment takes 2)" : ""));
  }
  if (has("liquid")) add("Liquid", item.liquidPints > 0 && `Holds ${fmtVolume(item.liquidPints)}`);
  add("Writing", has("writable") && item.type !== "document" && (hasWriting(item) ? "Written in" : "Blank — can be written in"));
  add("Picture", has("picture") && item.type !== "document" && (hasWriting(item) ? "Has a picture" : "No picture yet"));
  add("Poison type", item.poisonType);
  add("Save DC", item.saveDC);
  if (has("charges")) {
    add("Max charges", item.maxCharges);
    add("Recharge", item.recharge);
  }
  add("AC bonus", has("worn") && item.acBonus && fmtMod(item.acBonus));
  add("Trinket table", item.table && `${item.table} (${item.roll})`);
  add("Set", has("deck") && item.deckCards?.length && plural(item.deckCards.length, pieceNoun(item)));
  // Fields from user templates.
  if (tpl && !tpl.builtin) for (const f of tpl.fields || []) add(f.label, fieldDisplay(f, item[f.key]));
  add("Source", item.source);

  return h("div", { class: "details" },
    item.image && storedImage(item.image, "details-image", img => img.remove()),
    h("div", { class: "details-icon" }, itemIcon(item, "big-icon"),
      onIcon && h("button", { class: "btn", type: "button", onclick: () => openIconPicker(item.icon, onIcon, item,
        { drawings: drawingLibrary(), onDrawing: d => onIcon(undefined, d) }) }, "Change icon")),
    h("dl", null, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
    item.properties?.length && h("div", { class: "props" }, item.properties.map(p => {
      const key = Object.keys(WEAPON_PROPERTIES).find(k => p.toLowerCase().startsWith(k.toLowerCase()));
      return h("span", { class: "chip", title: key ? WEAPON_PROPERTIES[key] : "" }, p);
    })),
    item.effect && h("p", { class: "desc" }, item.effect),
    item.description && item.description.split("\n\n").map(p => h("p", { class: "desc" }, p)),
    item.activities?.length && h("table", { class: "mini" },
      h("thead", null, h("tr", null, h("th", null, "Activity"), h("th", null, "DC"))),
      h("tbody", null, item.activities.map(a => h("tr", null, h("td", null, a.activity), h("td", null, a.dc))))),
    has("pack") && item.contents?.length && h("div", null, h("h4", null, "Contents"),
      h("ul", { class: "contents" }, packPlan(item).map(r => h("li", null, r.qty > 1 ? `${r.qty} × ` : "", r.name,
        h("span", { class: "muted" }, { holder: " — holds the rest", strap: " — strapped outside", loose: " — on person", in: "" }[r.place]))))));
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
  const it = e.item;
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
        onchange: ev => commit((s, c) => { c.items.find(x => x.uid === e.uid).qty = Math.max(0, Math.floor(+ev.target.value)); }) })),
    (e.qty > 1 || sameStacks(char, e).length > 0) && h("div", { class: "field stack-actions" }, h("span", null, "Stack"),
      h("div", { class: "inline" },
        e.qty > 1 && h("button", { class: "btn", type: "button", onclick: () => { close(); openSplit(e.uid); } }, icon("copy"), "Split stack"),
        sameStacks(char, e).length > 0 && h("button", { class: "btn", type: "button", onclick: () => { close(); combineStacks(e.uid); } },
          icon("plus"), `Combine (${sameStacks(char, e).length + 1} stacks here)`))),
    hasFeature(it, "charges", e.srcId) && it.maxCharges && h("label", { class: "field" }, h("span", null, `Charges (max ${it.maxCharges})`),
      h("input", { type: "number", min: 0, max: it.maxCharges, value: e.charges ?? it.maxCharges,
        onchange: ev => commit((s, c) => { c.items.find(x => x.uid === e.uid).charges = Math.max(0, Math.min(it.maxCharges, +ev.target.value)); }) })),
    (["weapon", "armor", "magic"].includes(it.type) || it.acBonus) && h("label", { class: "check" },
      h("input", { type: "checkbox", checked: e.equipped, onchange: () => toggleEquip(e.uid) }), " Equipped / worn"),
    it.attunement && h("label", { class: "check" },
      h("input", { type: "checkbox", checked: e.attuned, onchange: ev => {
        const count = char.items.filter(x => x.attuned).length;
        if (ev.target.checked && count >= 3) toast("You can attune to at most 3 items (keeping it anyway)");
        commit((s, c) => { c.items.find(x => x.uid === e.uid).attuned = ev.target.checked; });
      } }), " Attuned"),
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
    }, `Unpacked ${it.name}`, true);
  };
  const footer = [
    h("button", { class: "btn danger", onclick: () => { close(); commit((s, c) => removeEntry(c, e.uid), `Removed ${it.name}`, true); } }, icon("trash"), "Remove"),
    planner && h("button", { class: "btn primary", onclick: unpack }, icon("package"), "Unpack"),
    h("button", { class: "btn", onclick: () => { close(); openSell(e.uid); } }, icon("coins"), "Sell"),
    // Player mode: no editing items (a copy can still be renamed with its display name).
    !ui.playerMode && h("button", { class: "btn", onclick: () => { close(); openItemForm(it, { entryUid: e.uid }); } }, icon("edit"), "Edit"),
    !ui.playerMode && h("button", { class: "btn", title: "Save a copy of this item as a reusable custom item", onclick: () => {
      commit(s => s.customItems.unshift({ ...clone(it), id: "custom-" + uid(), source: it.source || "Homebrew" }), `Saved “${it.name}” to custom items`);
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
  const read = !!kind && (hasWriting(it) || (kind === "writing" && it.type === "document"));
  const readBtn = kind && h("div", { class: "inline wrap read-btns" },
    read && h("button", { class: "btn primary read-btn", onclick: () => { close(); readEntry(e.uid); } },
      icon(kind === "picture" ? "image" : "book"), kind === "picture" ? "View" : "Read"),
    h("button", { class: "btn" + (read ? "" : " primary") + " read-btn", onclick: () => { close(); writeEntry(e.uid); } },
      icon(kind === "picture" ? "image" : "edit"), kind === "picture" ? (read ? "Change picture" : "Add a picture") : read ? "Write" : "Write in it"));
  // Older inventory copies of catalog containers get their capacity from the catalog.
  const shown = { ...it, holds: containerField(e, "holds"), liquidPints: containerField(e, "liquidPints") };
  const reopen = () => { close(); openEntry(entryUid); };
  close = openModal(entryName(e), [e.customName && h("p", { class: "muted small" }, it.name),
    readBtn, liquidCap(e) > 0 && liquidControls(e), isDeckEntry(e) && deckSection(e, reopen, () => close()),
    cardBackButton(e, () => close()), controls, planner?.el, itemDetails(shown, changeIcon, e.srcId)], { footer, wide: !!planner });
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
    JSON.stringify(x.item) === json && !char.items.some(k => k.parent === x.uid));
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
      c.items.splice(c.items.indexOf(x) + 1, 0, { ...clone(x), uid: newUid, qty: n, equipped: false, attuned: false });
    }, `Split ${n} × ${e.item.name} into a new stack`, true);
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
  close = openModal(`Split ${e.item.name}`, h("div", { class: "form" },
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
      x.attuned = x.attuned || o.attuned;
    }
    c.items = c.items.filter(o => !ids.has(o.uid));
  }, `Combined ${others.length + 1} stacks of ${e.item.name}`, true);
}

function openSell(entryUid) {
  const char = store.char();
  const e = char.items.find(x => x.uid === entryUid);
  const unit = (e.item.cost || 0) / (e.item.bundle || 1);
  let qty = e.qty, pct = 50, close;
  const out = h("p", { class: "big-num" });
  const upd = () => { out.textContent = fmtCost(Math.floor(unit * qty * pct / 100)) || "0"; };
  const body = h("div", { class: "form" },
    h("label", { class: "field" }, h("span", null, `Quantity (of ${e.qty})`),
      h("input", { type: "number", min: 1, max: e.qty, value: qty, oninput: ev => { qty = Math.max(1, Math.min(e.qty, +ev.target.value || 1)); upd(); } })),
    h("label", { class: "field" }, h("span", null, "Price (% of list)"),
      h("input", { type: "number", min: 0, value: pct, oninput: ev => { pct = Math.max(0, +ev.target.value || 0); upd(); } })),
    h("div", null, h("span", { class: "muted" }, "You receive"), out));
  upd();
  close = openModal(`Sell ${e.item.name}`, body, { footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: () => {
      close();
      commit((s, c) => {
        c.coins = receiveCoins(c.coins, Math.floor(unit * qty * pct / 100));
        const x = c.items.find(x => x.uid === entryUid);
        x.qty -= qty;
        if (x.qty <= 0) removeEntry(c, x.uid);
      }, `Sold ${qty} × ${e.item.name}`, true);
    } }, "Sell"),
  ] });
}

// ------------------------------------------------------------------ coins

function openCoins() {
  const char = store.char();
  const coins = { ...char.coins };
  let close;
  let amt = 0, denom = "gp";
  const body = h("div", { class: "form" },
    h("div", { class: "coin-grid" }, COIN_ORDER.map(k => h("label", { class: "field coin-field " + k },
      h("span", null, k.toUpperCase()),
      h("input", { type: "number", min: 0, inputmode: "numeric", value: coins[k] || 0,
        oninput: ev => { coins[k] = Math.max(0, Math.floor(+ev.target.value || 0)); } })))),
    h("h4", null, "Quick transaction"),
    h("div", { class: "inline" },
      h("input", { type: "number", min: 0, inputmode: "decimal", placeholder: "Amount", oninput: ev => { amt = +ev.target.value || 0; } }),
      h("select", { onchange: ev => { denom = ev.target.value; } }, COIN_ORDER.map(k => h("option", { value: k, selected: k === "gp" }, k))),
      h("button", { class: "btn", onclick: () => txn(1) }, icon("plus"), "Gain"),
      h("button", { class: "btn", onclick: () => txn(-1) }, icon("minus"), "Spend")),
    h("p", { class: "muted small" }, "Spending makes change automatically (e.g. paying 5 sp with only gold returns silver)."),
    h("button", { class: "btn", onclick: () => {
      close();
      commit((s, c) => {
        let total = coinTotalCp(c.coins);
        c.coins = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
        c.coins = receiveCoins(c.coins, total);
      }, "Converted coins to gp/sp/cp", true);
    } }, "Consolidate into gp / sp / cp"));

  function txn(sign) {
    const cp = Math.round(amt * COIN_VALUES[denom]);
    if (!cp) return;
    if (sign > 0) {
      close();
      commit((s, c) => { c.coins = { ...c.coins, [denom]: (c.coins[denom] || 0) + Math.round(amt) }; }, `Gained ${amt} ${denom}`, true);
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
  const has = new Set(store.catalog().map(i => GROUP_OF[i.type]));
  return [["all", "All"], ...TYPE_GROUPS.filter(g => has.has(g.id)).map(g => [g.id, g.name]), ["custom", "Custom"]];
}

function catalogFiltered(sub = ui.catSub) {
  const q = ui.catSearch.trim();
  const t = ui.catType;
  const subMatch = sub && GROUP_BY_ID[t] ? subcategories(t).find(s => s.key === sub)?.match : null;
  return store.catalog().filter(i => {
    if (t === "custom") { if (!i.id.startsWith("custom-")) return false; }
    else if (t !== "all" && GROUP_OF[i.type] !== t) return false;
    if (subMatch && !subMatch(i)) return false;
    return matchesSearch(i, q);
  });
}

function renderCatalog() {
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
      GROUP_BY_ID[k] && colorDot(groupColor(k), label), label)));
  // Within a group: its subcategories (Gear / Tools, Light / Medium / Heavy…), each in its shade.
  const all = GROUP_BY_ID[ui.catType] ? catalogFiltered(null) : [];
  const subs = GROUP_BY_ID[ui.catType] && subChips(ui.catType, ui.catSub, s => all.filter(s.match).length,
    key => { ui.catSub = key; ui.catLimit = 150; render(); });
  return h("div", { class: "view-catalog" },
    h("div", { class: "toolbar" },
      h("label", { class: "search" }, icon("search"),
        h("input", { type: "search", placeholder: "Search items, properties, descriptions…", value: ui.catSearch,
          oninput: e => { ui.catSearch = e.target.value; ui.catLimit = 150; draw(); } })),
      TRINKET_TABLES.length > 0 && h("button", { class: "btn", onclick: openTrinketRoller }, icon("dice"), h("span", null, "Roll trinket")),
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
  let qty = item.bundle || 1, parent = null, strapped = false, close;
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
  let payForPack = false;
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
    commit(s => {
      const x = s.customItems.find(i => i.id === item.id);
      if (drawing) return setItemDrawing(x, drawing);
      if (id) x.icon = id; else delete x.icon;
      setItemDrawing(x, null); // a chosen icon replaces a drawing
    }, "Icon changed");
    openCatalogItem(store.state.customItems.find(i => i.id === item.id));
  } : null;
  const readBtn = item.type === "document" && h("button", { class: "btn primary read-btn", onclick: () => {
    close();
    openReader(item, isCustom ? { onEdit: () => openItemForm(store.state.customItems.find(i => i.id === item.id) || item) } : {});
  } }, icon(item.imageOnly ? "image" : "book"), item.imageOnly ? "View" : "Read");
  close = openModal(item.name, [readBtn, controls, planner?.el, itemDetails(item, changeIcon)], { footer, wide: !!planner });
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
  return h("button", { class: "btn primary read-btn", type: "button", onclick: () => { close(); putCardsBack(deck.uid, [e.uid], `Put ${e.item.name} back in the ${entryName(deck)}`); } },
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
      theirs.map(e => h("option", { value: e.uid, selected: into === e.uid }, `My ${e.item.name}${e.parent ? " (nested)" : ""}`)));
    intoSel.value = into;
    const target = into ? char.items.find(e => e.uid === into)?.item.name : holder?.name;
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
      } }, PACK_PLACES.filter(([k]) => k !== "holder" || r.item?.type === "container")
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
    () => commit(s => { s.customItems = s.customItems.filter(i => i.id !== item.id); }, `Deleted ${item.name}`, true));
}

// ------------------------------------------------------------------ trinket roller

function openTrinketRoller() {
  let close, current = null;
  const result = h("div", { class: "trinket-result" }, h("p", { class: "muted" }, "Pick a table and roll."));
  const sel = h("select", { onchange: e => { ui.trinketTable = e.target.value; } },
    TRINKET_TABLES.map(t => h("option", { value: t.id, selected: t.id === ui.trinketTable }, `${t.name} (${t.die})`)));
  const roll = () => {
    const t = TRINKET_TABLES.find(t => t.id === ui.trinketTable);
    const entry = t.entries[Math.floor(Math.random() * t.entries.length)];
    current = SRD_BY_ID.get(entry.id);
    result.replaceChildren(
      h("div", { class: "die" }, entry.roll),
      h("p", { class: "trinket-text" }, current.name),
      h("p", { class: "muted small" }, `${t.name} — ${t.book}`));
    result.classList.remove("pop"); void result.offsetWidth; result.classList.add("pop");
  };
  close = openModal("Roll a trinket", h("div", { class: "form" },
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
  if (!item) return chooseTemplate(tpl => openItemForm({ type: tpl.type, template: tpl.builtin ? undefined : tpl.id, ...(tpl.defaults || {}) }, { ...opts, isNew: true }));
  const draft = clone(item);
  const tpl = (draft.template && store.template(draft.template)) || store.template(draft.type) || store.template("gear");
  const fields = templateFields(tpl);
  // The catalog item this is (or is a copy of): older copies take missing feature fields from it.
  const srcId = opts.entryUid ? store.char()?.items.find(x => x.uid === opts.entryUid)?.srcId : item.id;
  const cat = srcId && SRD_BY_ID.get(srcId);
  // The saved item this form edits (not saved with it): lets a drawing tell "this item" from others.
  Object.defineProperty(draft, "_self", { enumerable: false, value: opts.entryUid
    ? store.char()?.items.find(x => x.uid === opts.entryUid)?.item
    : store.state.customItems.find(i => i.id === draft.id) });
  for (const k of FEATURE_FIELD_KEYS) if (draft[k] === undefined && cat?.[k] !== undefined) draft[k] = clone(cat[k]);
  const chosen = {}; // features ticked or unticked here
  const isOn = key => key in chosen ? chosen[key] : hasFeature(draft, key, srcId);
  const features = featuresPanel(draft, isOn, chosen);
  // The features go above the description (a document has none: then above the source).
  const els = fields.map(f => [f.key, fieldInput(f, draft)]);
  let at = els.findIndex(([k]) => k === "description");
  if (at < 0) at = els.findIndex(([k]) => k === "source");
  els.splice(at < 0 ? els.length : at, 0, ["features", features]);
  const form = h("form", { class: "form grid", onsubmit: e => { e.preventDefault(); save(); } }, els.map(([, el]) => el));
  let close;

  function save() {
    if (!draft.name?.trim()) return toast("Give the item a name");
    draft.name = draft.name.trim();
    // Unticked features lose their settings; the item keeps which features it has only where
    // that differs from the default for its kind.
    const on = Object.fromEntries(FEATURES.map(ft => [ft.key, isOn(ft.key)]));
    const kept = new Set(FEATURES.filter(ft => on[ft.key]).flatMap(ft => ft.fields.map(f => f.key))); // shared fields (the body)
    for (const ft of FEATURES) if (!on[ft.key]) for (const f of ft.fields) if (!kept.has(f.key)) delete draft[f.key];
    for (const ft of FEATURES) if (ft.flag) { if (on[ft.key]) draft[ft.flag] = true; else delete draft[ft.flag]; }
    delete draft.features;
    const flags = Object.fromEntries(FEATURES.filter(ft => !ft.flag && on[ft.key] !== featureDefault(draft, ft.key, srcId)).map(ft => [ft.key, on[ft.key]]));
    if (Object.keys(flags).length) draft.features = flags;
    if (on.pack) draft.contents = (draft.contents || []).filter(c => c.name);
    for (const k of Object.keys(draft)) if (draft[k] === "" || draft[k] == null) delete draft[k];
    if (opts.entryUid) {
      const { id, ...snap } = draft;
      commit((s, c) => { c.items.find(x => x.uid === opts.entryUid).item = snap; }, `Updated ${draft.name}`, true);
    } else if (opts.forInventory) {
      commit((s, c) => addToInventory(c, { ...draft, id: "custom-" + uid(), source: draft.source || "Homebrew" }), `Added ${draft.name}`, true);
    } else {
      const isEdit = draft.id && store.state.customItems.some(i => i.id === draft.id);
      if (!draft.id || !isEdit) draft.id = "custom-" + uid();
      draft.source = draft.source || "Homebrew";
      commit(s => {
        if (isEdit) s.customItems = s.customItems.map(i => i.id === draft.id ? draft : i);
        else s.customItems.unshift(draft);
      }, `${isEdit ? "Saved" : "Created"} ${draft.name}`, true);
    }
    close();
  }

  const title = opts.entryUid ? `Edit ${item.name}` : opts.copyOf ? `Customize ${item.name}` :
    opts.forInventory ? `Quick ${tpl.name.toLowerCase()}` : draft.id ? `Edit ${item.name}` : `New ${tpl.name.toLowerCase()}`;
  close = openModal(title, [
    h("p", { class: "muted small" }, typeBadge(tpl.type), ` Template: ${tpl.name}`,
      opts.entryUid ? " — changes apply only to this copy in the inventory." : "",
      opts.forInventory ? " — goes straight into the inventory." : ""),
    form,
  ], { wide: true, footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: save }, icon("check"), "Save"),
  ] });
}

// ------------------------------------------------------------------ drawing icons (svg-lay-tool)

// The icon editor is a separate library, loaded the first time it's needed.
function loadSvgLay() {
  if (window.SvgLayTool) return Promise.resolve();
  return new Promise((ok, fail) => {
    const script = h("script", { src: "js/vendor/svg-lay-tool.js" });
    script.onload = ok;
    script.onerror = () => fail(new Error("Couldn't load the icon editor"));
    document.head.append(script);
  });
}

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
  let editor;
  const close = () => {
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
    h("button", { class: "btn", onclick: () => pickDrawing("Start from a drawing", d => editor?.loadDocument(clone(d.doc))) }, icon("copy"), h("span", { class: "hide-sm" }, "Start from…"));
  // No Escape-to-close: the editor uses Escape itself, and closing would lose the drawing.
  const overlay = h("div", { class: "reader icon-drawer", role: "dialog", "aria-modal": "true", "aria-label": "Draw an icon" },
    h("div", { class: "reader-bar" },
      h("div", { class: "reader-title" }, opts.title || `Draw an icon${opts.name ? ` for ${opts.name}` : ""}`),
      startFrom,
      h("button", { class: "btn", onclick: close }, "Cancel"),
      h("button", { class: "btn primary", onclick: save }, icon("check"), opts.saveLabel || "Use this icon")),
    h("p", { class: "icon-drawer-hint muted small" },
      "Build the icon from shapes on layers: add shapes from the library and pick a layer in the strip beside the canvas. Press and hold a shape to move it; drag its handles to resize or rotate it. Modifiers add outlines, effects and masks (a layer that cuts the ones below it). It's drawn in one colour; the app colours it like its other icons."),
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
    });
    // Fit the canvas once the window has its final size.
    requestAnimationFrame(() => requestAnimationFrame(() => editor?.fitToView()));
  } catch (e) {
    close();
    toast("The icon editor couldn't start: " + e.message);
  }
}

// A drawing as the SVG the app shows: one colour (currentColor, so it's tinted like the other
// icons), no background, ids that drawnIcon() makes unique per copy. Needs the editor loaded.
function drawingSvg(doc) {
  return window.SvgLayTool.renderDocumentToString(doc, { background: false, colorMode: "monochrome", monoColor: "currentColor", idPrefix: DRAWN_ID_PREFIX });
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

// Custom items and every inventory copy (all characters) that use a library drawing.
function drawingUsers(s, id) {
  return [...s.customItems, ...s.characters.flatMap(c => c.items.map(e => e.item))].filter(it => it.iconLib === id);
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
    for (const it of drawingUsers(s, id)) { setItemDrawing(it, d); n++; }
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
  openIconDrawer({ doc: d?.doc || it.iconDoc, name: it.name, color: itemColor(it) }, (doc, svg) => {
    if (!doc) { setItemDrawing(it, null); return done(); }
    const others = d ? drawingUsers(store.state, d.id).filter(u => u !== it._self).length : 0;
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
  const loose = store.state.customItems.filter(it => it.iconSvg && it.iconDoc && !findDrawing(it.iconLib));
  if (!loose.length) return;
  commit(s => {
    for (const it of loose) {
      const d = { id: "d" + uid(), name: it.name, doc: it.iconDoc, svg: it.iconSvg, updated: Date.now() };
      (s.iconLibrary ||= []).push(d);
      it.iconLib = d.id;
    }
  }, null);
}

// The library, in the Custom tab: draw new ones, edit (updating the items that use them), rename,
// start a new drawing from a copy, delete (items keep their copies).
function drawingsSection() {
  const lib = drawingLibrary();
  const used = id => drawingUsers(store.state, id).length;
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
    () => commit(s => { s.iconLibrary = s.iconLibrary.filter(x => x.id !== d.id); for (const it of drawingUsers(s, d.id)) delete it.iconLib; }, `Deleted “${d.name}”`, true));
  const newOne = () => openIconDrawer({ title: "New drawing", color: "var(--accent)", templates: true, saveLabel: "Save" }, (doc, svg) => {
    if (doc) { addDrawing("", doc, svg); toast("Saved a new drawing"); }
  });
  return h("section", null,
    h("div", { class: "section-head" }, h("h2", null, "Drawings"),
      h("button", { class: "btn", onclick: newOne }, icon("plus"), "New drawing")),
    h("p", { class: "muted small" }, "Icons you've drawn. Give one to an item from its Icon (Choose…), edit one (items using it can update too), or start a new one from a copy."),
    lib.length ? h("div", { class: "drawing-grid" }, lib.map(d => h("div", { class: "drawing-tile" },
      h("button", { class: "drawing-art", type: "button", title: `Edit “${d.name}”`, onclick: () => edit(d) }, drawnIcon(d.svg, "drawing-svg") || icon("image")),
      h("b", null, d.name),
      h("small", { class: "muted" }, used(d.id) ? `Used by ${plural(used(d.id), "item")}` : "Not used yet"),
      h("div", { class: "tpl-actions" },
        h("button", { class: "link", onclick: () => edit(d) }, "Edit"),
        h("button", { class: "link", onclick: () => copy(d) }, "Use as template"),
        h("button", { class: "link", onclick: () => rename(d) }, "Rename"),
        h("button", { class: "link danger-link", onclick: () => remove(d) }, "Delete")))))
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
function featuresPanel(draft, isOn, chosen) {
  let open = readPref("packrat-features-open", "") === "1";
  const summary = h("span", { class: "muted small features-summary" });
  const drawSummary = () => { summary.textContent = FEATURES.filter(ft => isOn(ft.key)).map(ft => ft.label).join(" · ") || "None"; };
  const rows = {};
  const set = (key, v) => {
    chosen[key] = v;
    rows[key].input.checked = v;
    rows[key].box.hidden = !v;
  };
  const list = FEATURES.map(ft => {
    const box = h("div", { class: "form grid feature-fields" }, ft.fields.map(f => fieldInput(f, draft)));
    box.hidden = !isOn(ft.key) || !ft.fields.length;
    const input = h("input", { type: "checkbox", checked: isOn(ft.key), onchange: ev => {
      set(ft.key, ev.target.checked);
      if (!ft.fields.length) box.hidden = true;
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
  const label = h("span", null, f.label, f.required ? " *" : "");
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
    case "lines": { // a list, one entry per line
      return h("label", { class: cls + " full" }, label, h("textarea", { rows: 5, placeholder: f.placeholder || "", value: (draft[f.key] || []).join("\n"),
        oninput: e => { const list = e.target.value.split("\n").map(x => x.trim()).filter(Boolean); if (list.length) set(list); else delete draft[f.key]; } }));
    }
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
        openIconDrawer({ name: draft.name, color: itemColor(draft), templates: true }, (doc, svg) => {
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
      // Stored in cp; edited as amount + denomination.
      const cp = draft.cost || 0;
      let denom = cp && cp % 100 === 0 ? "gp" : cp && cp % 10 === 0 ? "sp" : cp ? "cp" : "gp";
      let amount = cp ? cp / COIN_VALUES[denom] : "";
      const upd = () => set(amount === "" ? 0 : Math.round(amount * COIN_VALUES[denom]));
      return h("label", { class: cls }, label, h("div", { class: "inline" },
        h("input", { type: "number", min: 0, step: "any", inputmode: "decimal", value: amount, oninput: e => { amount = e.target.value === "" ? "" : +e.target.value; upd(); } }),
        h("select", { onchange: e => { denom = e.target.value; upd(); } }, COIN_ORDER.map(k => h("option", { value: k, selected: k === denom }, k)))));
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
  const names = [...new Set(store.catalog().filter(i => i.type !== "pack").map(i => i.name))].sort();
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

function chooseTemplate(onPick) {
  let close;
  const tile = t => h("button", { class: "tpl-tile", onclick: () => { close(); onPick(t); } },
    h("span", { class: "tpl-swatch", style: { background: templateColor(t) } }),
    h("b", null, t.name),
    h("small", { class: "muted" }, t.builtin ? groupOf(t.type).name : `Based on ${TYPE_LABELS[t.type]}`));
  // Built-ins in group order, so Gear sits next to Tools, Ammunition next to Consumables…
  const order = t => TYPE_GROUPS.findIndex(g => g.types.includes(t.type));
  const builtins = store.templates().filter(t => t.builtin).sort((a, b) => order(a) - order(b));
  close = openModal("Choose a template", [
    h("div", { class: "tpl-grid" }, [...builtins, ...store.state.templates].map(tile)),
    h("p", { class: "muted small" }, "Need different fields? ",
      h("button", { class: "link", onclick: () => { close(); openTemplateEditor(null); } }, "Create a template"), "."),
  ], { wide: true });
}

// ------------------------------------------------------------------ custom view

function renderCustom() {
  const items = store.state.customItems;
  const usage = id => store.state.customItems.filter(i => i.template === id).length;
  return h("div", { class: "view-custom" },
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "My items"),
        h("button", { class: "btn primary", onclick: () => openItemForm(null) }, icon("plus"), "New item")),
      items.length ? h("div", { class: "group" }, items.map(catalogRow))
        : h("div", { class: "empty" }, h("p", null, "No custom items yet. Make a homebrew weapon, a family heirloom, or a +1 version of an existing item (open any catalog item → Customize)."))),
    drawingsSection(),
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "Templates"),
        h("button", { class: "btn", onclick: () => openTemplateEditor(null) }, icon("plus"), "New template")),
      h("p", { class: "muted small" }, "Templates decide which fields an item has. Your templates build on a base type (which controls how the app treats the item — e.g. Armor counts toward AC, Containers can hold things) and add your own fields."),
      h("div", { class: "tpl-grid" },
        // Built-in types, by group: each group has a hue, its subcategories are shades of it.
        TYPE_GROUPS.map(g => {
          const tpls = g.types.map(t => BUILTIN_TEMPLATES.find(b => b.id === t)).filter(t => t && !t.hidden);
          if (!tpls.length) return null;
          const subs = subcategories(g.id);
          const multi = tpls.length > 1;
          return h("div", { class: "tpl-tile static" },
            h("span", { class: "tpl-swatch tpl-shades" }, subs.length > 1
              ? subs.map((sc, i) => h("span", { style: { background: shade(groupHue(g.id), i, subs.length) }, title: sc.label }))
              : h("span", { style: { background: groupColor(g.id) } })),
            h("b", null, g.name),
            h("small", { class: "muted" }, multi ? "Built-in" : `Built-in · ${templateFields(tpls[0]).length} fields`),
            // A combined group lists its types, each in its shade, with its own New / Extend.
            multi && h("div", { class: "tpl-types" }, tpls.map(t => h("div", { class: "tpl-type" },
              colorDot(typeColor(t.type), t.name), h("span", null, t.name),
              h("button", { class: "link", onclick: () => openItemForm({ type: t.type, ...(t.defaults || {}) }, { isNew: true }) }, "New"),
              h("button", { class: "link", onclick: () => openTemplateEditor({ ...clone(t), id: null, builtin: false, name: t.name + " (custom)", fields: [] }) }, "Extend")))),
            h("div", { class: "tpl-actions" },
              h("button", { class: "link", onclick: () => openGroupColour(g.id) }, "Colour"),
              !multi && [
                h("button", { class: "link", onclick: () => openItemForm({ type: tpls[0].type, ...(tpls[0].defaults || {}) }, { isNew: true }) }, "New item"),
                h("button", { class: "link", onclick: () => openTemplateEditor({ ...clone(tpls[0]), id: null, builtin: false, name: tpls[0].name + " (custom)", fields: [] }) }, "Extend"),
              ]));
        }),
        store.state.templates.map(t => h("div", { class: "tpl-tile static" },
          h("span", { class: "tpl-swatch", style: { background: templateColor(t) } }),
          h("b", null, t.name),
          h("small", { class: "muted" }, `Based on ${TYPE_LABELS[t.type]} · +${plural((t.fields || []).length, "field")} · ${plural(usage(t.id), "item")}`),
          h("div", { class: "tpl-actions" },
            h("button", { class: "link", onclick: () => openItemForm({ type: t.type, template: t.id, ...(t.defaults || {}) }, { isNew: true }) }, "New item"),
            h("button", { class: "link", onclick: () => openTemplateEditor(t) }, "Edit")))))));
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
  const g = GROUP_BY_ID[groupId];
  let hue = groupHue(groupId), close;
  const subs = subcategories(groupId);
  close = openModal(`${g.name} colour`, h("div", { class: "form" },
    huePicker("Hue", hue, subs, v => { hue = v; },
      g.types.length > 1 ? `${g.name} combines ${g.types.map(t => TYPE_LABELS[t]).join(", ")}; each gets its own shade.`
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

function openTemplateEditor(tpl) {
  const isNew = !tpl || !tpl.id;
  const draft = tpl ? clone(tpl) : { name: "", type: "gear", fields: [] };
  delete draft.color; delete draft.shade; // replaced by a hue (see templateHue)
  draft.fields = draft.fields || [];
  let close;
  const fieldsBox = h("div", { class: "tpl-fields" });
  const baseInfo = h("p", { class: "muted small" });

  const shadeBox = h("div", { class: "field full shade-field" });
  const drawBase = () => {
    const base = BUILTIN_TEMPLATES.find(t => t.id === draft.type);
    baseInfo.textContent = "Inherited fields: " + [...COMMON_FIELDS, ...base.fields].map(f => f.label).join(", ");
    drawShade();
  };
  // Colour: the template's own hue; its categories show as shades of it.
  const drawShade = () => {
    if (draft.hue == null) draft.hue = groupHue(groupOf(draft.type).id);
    setChildren(shadeBox, huePicker("Colour", draft.hue, templateSubcategories(draft), hue => { draft.hue = hue; },
      "Items made with this template use this hue. Their categories get different shades of it so they're easy to tell apart."));
  };
  const drawFields = () => setChildren(fieldsBox, draft.fields.map((f, i) => h("div", { class: "tpl-field" },
    h("input", { type: "text", placeholder: "Field label", value: f.label, "aria-label": "Field label",
      oninput: e => { f.label = e.target.value; } }),
    h("select", { "aria-label": "Field kind", onchange: e => { f.kind = e.target.value; drawFields(); } },
      FIELD_KINDS.map(([k, l]) => h("option", { value: k, selected: f.kind === k }, l))),
    f.kind === "select" && h("input", { type: "text", class: "grow", placeholder: "Options, comma separated", value: (f.options || []).join(", "),
      "aria-label": "Options", oninput: e => { f.options = e.target.value.split(",").map(s => s.trim()).filter(Boolean); } }),
    iconBtn("trash", "Remove field", () => { draft.fields.splice(i, 1); drawFields(); }))),
    h("button", { class: "btn", type: "button", onclick: () => { draft.fields.push({ label: "", kind: "text" }); drawFields(); } }, icon("plus"), "Add field"));
  drawBase(); drawFields();

  const save = () => {
    if (!draft.name.trim()) return toast("Name the template");
    const used = new Set([...COMMON_FIELDS, ...BUILTIN_TEMPLATES.find(t => t.id === draft.type).fields].map(f => f.key));
    draft.fields = draft.fields.filter(f => f.label.trim()).map(f => {
      let key = f.key || f.label.trim().toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : "");
      while (used.has(key)) key += "_";
      used.add(key);
      return { ...f, key, label: f.label.trim(), options: f.kind === "select" ? (f.options?.length ? f.options : ["Option"]) : undefined };
    });
    draft.name = draft.name.trim();
    delete draft.builtin;
    if (isNew) draft.id = "tpl-" + uid();
    close();
    commit(s => {
      s.templates = isNew ? [...s.templates, draft] : s.templates.map(t => t.id === draft.id ? draft : t);
    }, `Saved template ${draft.name}`, true);
  };

  close = openModal(isNew ? "New template" : `Edit ${tpl.name}`, h("div", { class: "form" },
    h("div", { class: "grid" },
      h("label", { class: "field" }, h("span", null, "Template name *"),
        h("input", { type: "text", value: draft.name, placeholder: "e.g. Spell Scroll, Firearm, Vehicle", oninput: e => { draft.name = e.target.value; } })),
      h("label", { class: "field" }, h("span", null, "Base type"),
        h("select", { onchange: e => { draft.type = e.target.value; drawBase(); } },
          TYPE_GROUPS.map(g => {
            const opts = g.types.map(t => BUILTIN_TEMPLATES.find(b => b.id === t)).filter(t => t && !t.hidden)
              .map(t => h("option", { value: t.id, selected: draft.type === t.id }, t.name));
            return opts.length > 1 ? h("optgroup", { label: g.name }, opts) : opts;
          })))),
    shadeBox,
    baseInfo,
    h("h4", null, "Extra fields"),
    fieldsBox), { wide: true, footer: [
    !isNew && h("button", { class: "btn danger", onclick: () => {
      confirmDialog(`Delete template “${tpl.name}”? Items using it keep their data but lose the extra fields in the editor.`, "Delete", () => {
        close();
        commit(s => { s.templates = s.templates.filter(t => t.id !== tpl.id); }, `Deleted template ${tpl.name}`, true);
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

function importFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      await storeBundledImages(data.images);
      delete data.images;
      if (data.kind === "character" && data.character) {
        commit(s => {
          const c = { ...cleanChar(data.character), id: uid() }; // no party-server fields (owner, rev…)
          reclassifyAll({ characters: [c] });
          s.characters.push(c); s.activeId = c.id;
          for (const t of data.templates || []) if (!s.templates.some(x => x.id === t.id)) s.templates.push(t);
        }, `Imported ${data.character.name}`, true);
      } else if (Array.isArray(data.characters)) {
        if (party.active) throw new Error("leave the party before restoring a full backup (single characters can be imported any time)");
        reclassifyAll(data); // backups from before catalog items moved type
        commit(s => Object.assign(s, data), "Imported all data", true);
      } else throw new Error("Unrecognised file");
    } catch (e) {
      toast("Import failed: " + e.message);
    }
  };
  reader.readAsText(file);
}

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
  return h("div", { class: "view-settings" },
    h("section", null,
      h("label", { class: "switch-row" },
        h("span", null, h("b", null, "Player mode"),
          h("span", { class: "muted small" }, "Hides the Catalog and Custom tabs and item editing, for players whose gear comes from the DM, shops and trades. Items can still be renamed (Display name) and written in.")),
        h("input", { type: "checkbox", role: "switch", class: "switch", checked: ui.playerMode, onchange: ev => setPlayerMode(ev.target.checked) }))),
    partySettings(),
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "Characters"),
        h("button", { class: "btn primary", onclick: () => newCharPrompt() }, icon("plus"), "New character")),
      h("div", { class: "group" }, s.characters.map(c => h("div", { class: "row" + (c.id === s.activeId ? " equipped" : "") },
        h("button", { class: "row-main", onclick: () => { commit(st => { st.activeId = c.id; }); go("inventory"); } },
          h("div", { class: "row-title" }, c.name, c.id === s.activeId && h("span", { class: "tag on" }, "active")),
          h("div", { class: "row-sub" }, `${plural(c.items.length, "entry", "entries")} · ${coinSummary(c.coins)} · STR ${c.str}`)),
        iconBtn("edit", "Rename", () => renamePrompt(c)),
        iconBtn("download", "Export character", async () => download(`${c.name.replace(/\W+/g, "_")}.json`,
          { kind: "character", character: c, templates: s.templates.filter(t => c.items.some(e => e.item.template === t.id)),
            images: await bundleImages(allImageRefs([c])) })),
        iconBtn("copy", "Duplicate", () => commit(st => { st.characters.push({ ...clone(c), id: uid(), name: c.name + " (copy)" }); }, `Duplicated ${c.name}`)),
        (s.characters.length > 1 || party.active) && iconBtn("trash", "Delete", () => confirmDialog(
          party.isLinked(c.id) ? `Delete ${c.name} from this device? They also leave the party, and their inventory is deleted from the host.` : `Delete ${c.name} and their whole inventory?`, "Delete",
          () => commit(st => { st.characters = st.characters.filter(x => x.id !== c.id); if (st.activeId === c.id) st.activeId = st.characters[0]?.id; }, `Deleted ${c.name}`, true)), "danger-hover"))))),
    h("section", null,
      h("h2", null, "Rules"),
      h("div", { class: "form grid" },
        h("label", { class: "field" }, h("span", null, "Encumbrance"),
          h("select", { onchange: e => setSetting("encumbrance", e.target.value) },
            [["standard", "Standard (capacity = STR × 15)"], ["variant", "Variant (speed penalties at STR × 5 / × 10)"], ["off", "Off"]]
              .map(([v, l]) => h("option", { value: v, selected: s.settings.encumbrance === v }, l)))),
        h("label", { class: "field" }, h("span", null, `Carry multiplier for ${store.char().name}`),
          h("select", { onchange: e => commit((st, c) => { c.carryMultiplier = +e.target.value; }) },
            [[0.5, "×½ (Tiny)"], [1, "×1 (Small / Medium)"], [2, "×2 (Large, Powerful Build)"], [4, "×4 (Huge)"], [8, "×8 (Gargantuan)"]]
              .map(([v, l]) => h("option", { value: v, selected: (store.char().carryMultiplier || 1) === v }, l)))),
        h("label", { class: "check field" }, h("input", { type: "checkbox", checked: s.settings.coinWeight, onchange: e => setSetting("coinWeight", e.target.checked) }),
          " Coins have weight (50 coins = 1 lb)"))),
    h("section", null,
      h("h2", null, "Data"),
      h("p", { class: "muted small" }, party.app?.localStore
        ? ["Saved on this PC in ", h("code", null, party.app.localDir), ". Every Pack Rat window on this PC shares it — you can also open Pack Rat in any browser here at ",
           h("code", null, `http://localhost:${party.app.appPort}`), " while the app is running."]
        : party.active
        ? "Party characters are saved on the host computer. Custom items, templates and settings stay in this browser."
        : "Everything is saved in this browser only. Export a backup to move data between your PC and phone."),
      h("div", { class: "inline wrap" },
        h("button", { class: "btn", onclick: async () => download(`rpg-inventory-${new Date().toISOString().slice(0, 10)}.json`,
          { ...s, images: await bundleImages(allImageRefs(s.characters, s.customItems)) }) }, icon("download"), "Export all"),
        h("button", { class: "btn", onclick: () => fileInput.click() }, icon("upload"), "Import"),
        fileInput,
        !party.active && h("button", { class: "btn danger", onclick: () => confirmDialog("Erase all characters, custom items and templates?", "Erase everything",
          () => commit(st => Object.assign(st, defaultState()), "All data reset", true)) }, icon("trash"), "Reset"))),
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
  close = openModal("New character", h("form", { class: "form", onsubmit: e => { e.preventDefault(); ok(); } },
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
    icon("user"), h("div", null, h("div", { class: "row-title" }, c.name), h("div", { class: "row-sub" }, plural(c.items.length, "entry", "entries"))));
  if (!party.active) {
    close = openModal("Characters", h("div", { class: "group" },
      s.characters.map(row),
      h("button", { class: "btn wide", onclick: () => { close(); newCharPrompt(); } }, icon("plus"), "New character")));
    return;
  }
  // In a party: switch between the characters playing; others on this device can be brought in.
  const others = bringableCharacters();
  close = openModal("Characters", [
    h("h4", null, "Playing in this party"),
    h("div", { class: "group" }, party.linked().map(row)),
    others.length > 0 && [h("h4", null, "Also on this device"),
      h("div", { class: "group" }, others.map(c => h("div", { class: "row" },
        icon("user"), h("div", { class: "row-main static" }, h("div", { class: "row-title" }, c.name),
          h("div", { class: "row-sub" }, plural(c.items.length, "entry", "entries"))),
        h("button", { class: "btn", onclick: async () => { close(); await party.bring(c.id); } }, icon("users"), "Bring into party"))))],
    h("button", { class: "btn wide", onclick: () => { close(); openJoinModal(); } }, icon("plus"), "New character or take over"),
  ]);
}

// ------------------------------------------------------------------ finding saved data

// Nothing saved yet in this copy: only blank starter characters, no custom items.
function isFreshData() {
  return store.state.characters.every(isBlankCharacter) && !store.state.customItems.length;
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
  store.subscribe(render);
  const nav = document.getElementById("nav");
  nav.replaceChildren(...Object.entries(VIEWS).map(([k, v]) =>
    h("button", { class: "nav-btn", "data-view": k, onclick: () => go(k) }, icon(v.icon), h("span", null, v.label),
      v.partyOnly && h("span", { class: "badge", hidden: true }))));
  document.getElementById("char-switch").addEventListener("click", openCharSwitcher);
  const hash = location.hash.slice(1);
  if (VIEWS[hash]) ui.view = hash;
  if (party.active) {
    party.link();
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
