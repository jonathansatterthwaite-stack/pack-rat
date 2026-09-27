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

const ICONS = {
  bag: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"/><path d="M8 10h8"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  wand: '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  weight: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.9 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.93-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  move: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  sort: '<path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
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
  return h("span", { class: "type-dot", style: { background: TYPE_COLORS[type] || "#888" }, title: TYPE_LABELS[type] || type });
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

const ui = {
  view: "inventory",
  invSearch: "",
  invType: "all",
  collapsed: new Set(),
  catSearch: "",
  catType: "all",
  catLimit: 150,
  trinketTable: TRINKET_TABLES[0].id,
  layout: readPref("packrat-layout", "list"),
  sort: readPref("packrat-sort", "smart"),
  sortReverse: readPref("packrat-sort-rev", "") === "1",
};

function writePref(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

// Per-device display preferences (phone and PC can differ), kept out of the synced data.
function readPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function layoutToggle() {
  const set = v => {
    ui.layout = v;
    writePref("packrat-layout", v);
    render();
  };
  return h("div", { class: "seg", role: "group", "aria-label": "Layout" },
    [["list", "list", "List view"], ["tiles", "grid", "Tile view"]].map(([v, ic, label]) =>
      h("button", { type: "button", class: ui.layout === v ? "active" : "", title: label, "aria-label": label,
        "aria-pressed": String(ui.layout === v), onclick: () => set(v) }, icon(ic))));
}

const VIEWS = {
  inventory: { label: "Inventory", icon: "bag", render: renderInventory },
  catalog: { label: "Catalog", icon: "book", render: renderCatalog },
  custom: { label: "Custom", icon: "wand", render: renderCustom },
  party: { label: "Party", icon: "users", render: renderParty, partyOnly: true },
  settings: { label: "Settings", icon: "sliders", render: renderSettings },
};

function render() {
  const char = store.char();
  // In party mode a player with no character yet gets the join screen.
  const joining = party.active && !char;
  if (VIEWS[ui.view].partyOnly && !party.active) ui.view = "inventory";
  document.getElementById("char-name").textContent = char ? char.name : "Join the party";
  document.getElementById("nav").hidden = joining;
  const offers = party.active ? party.incoming().length : 0;
  document.querySelectorAll("[data-view]").forEach(b => {
    b.classList.toggle("active", b.dataset.view === ui.view);
    if (VIEWS[b.dataset.view].partyOnly) b.hidden = !party.active;
    const badge = b.querySelector(".badge");
    if (badge) { badge.textContent = offers; badge.hidden = !offers; }
  });
  const main = document.getElementById("view");
  const scroll = window.scrollY;
  main.replaceChildren(joining ? renderJoin() : VIEWS[ui.view].render());
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

  const stats = h("section", { class: "stats" },
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

  const list = h("div", { class: "inv-list" });
  const drawList = () => list.replaceChildren(...inventoryTree(char));
  drawList();

  const toolbar = h("div", { class: "toolbar" },
    h("label", { class: "search" }, icon("search"),
      h("input", { type: "search", placeholder: "Search inventory", value: ui.invSearch,
        oninput: e => { ui.invSearch = e.target.value; drawList(); } })),
    h("button", { class: "btn primary", onclick: () => go("catalog") }, icon("plus"), h("span", null, "Add items")),
    h("button", { class: "btn", onclick: () => openItemForm(null, { forInventory: true }) }, icon("wand"), h("span", { class: "hide-sm" }, "Quick custom")),
    sortControl(),
    layoutToggle());

  return h("div", { class: "view-inventory" }, installBanner(), stats, toolbar, inventoryTypeChips(char), list);
}

// Inventory type filter: "all", "equipped", or an item type.
function invTypeMatches(e, type) {
  if (type === "all") return true;
  if (type === "equipped") return e.equipped;
  return e.item.type === type;
}

// The active filter, falling back to "all" once nothing of that type is left.
function activeInvType(char) {
  const t = ui.invType;
  return t !== "all" && !char.items.some(e => invTypeMatches(e, t)) ? "all" : t;
}

function inventoryTypeChips(char) {
  if (!char.items.length) return null;
  const counts = {};
  for (const e of char.items) counts[e.item.type] = (counts[e.item.type] || 0) + 1;
  const equipped = char.items.filter(e => e.equipped).length;
  const active = activeInvType(char);
  const chip = (key, label, n, withDot) => h("button", {
    class: "chip-btn" + (active === key ? " active" : ""), role: "tab", "aria-selected": String(active === key),
    onclick: () => { ui.invType = key; render(); },
  }, withDot && typeBadge(key), label, h("span", { class: "chip-count" }, n));
  const types = [...BUILTIN_TEMPLATES.map(t => t.id), ...Object.keys(counts)]
    .filter((t, i, all) => counts[t] && all.indexOf(t) === i);
  const row = h("div", { class: "chips", role: "tablist", "aria-label": "Filter by type" },
    chip("all", "All", char.items.length),
    equipped > 0 && chip("equipped", "Equipped", equipped),
    types.map(t => chip(t, TYPE_LABELS[t] || t, counts[t], true)));
  // On narrow screens the row scrolls sideways; keep the selected chip visible.
  setTimeout(() => {
    const el = row.querySelector(".active");
    if (el && (el.offsetLeft + el.offsetWidth > row.scrollLeft + row.clientWidth || el.offsetLeft < row.scrollLeft)) {
      row.scrollLeft = el.offsetLeft - row.offsetLeft - 16;
    }
  });
  return row;
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
  return [item.name, item.category, item.description, item.damageType, TYPE_LABELS[item.type], ...(item.properties || [])]
    .some(v => v && String(v).toLowerCase().includes(q));
}

// Each comparator gives the natural order for that sort; "Reverse" flips it.
// Ties always fall back to name so the order is stable.
const INV_SORTS = {
  smart: { label: "Equipped first", cmp: (a, b) => b.equipped - a.equipped },
  name: { label: "Name", cmp: () => 0 },
  type: { label: "Type", cmp: (a, b) => (TYPE_LABELS[a.item.type] || "").localeCompare(TYPE_LABELS[b.item.type] || "") },
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
      h("button", { class: "btn primary", onclick: () => go("catalog") }, "Browse the catalog"))];
  }
  const type = activeInvType(char);
  if (q || type !== "all") {
    // Filtered: one flat list, with each item tagged by the container it's in.
    const hits = char.items.filter(e => invTypeMatches(e, type) &&
      (matchesSearch(e.item, q) || e.notes.toLowerCase().includes(q.toLowerCase())));
    if (!hits.length) return [h("p", { class: "muted pad" }, "Nothing matches.")];
    const weight = hits.reduce((sum, e) => sum + entryOwnWeight(e), 0);
    return [h("div", { class: "group" },
      h("div", { class: "group-head" },
        h("h3", null, `${hits.length} ${hits.length === 1 ? "entry" : "entries"}`),
        h("span", { class: "muted" }, fmtWeight(weight))),
      entryList(char, sortEntries(char, hits), true))];
  }
  const top = childrenOf(char, null);
  const loose = top.filter(e => !holdsItems(char, e));
  const containers = top.filter(e => holdsItems(char, e));
  return [
    dropZone(null, h("div", { class: "group" },
      h("div", { class: "group-head" }, h("h3", null, "On person"),
        h("span", { class: "muted" }, fmtWeight(loose.reduce((s, e) => s + entryTotalWeight(char, e), 0)))),
      loose.length ? entryList(char, sortEntries(char, loose)) : h("p", { class: "muted pad" }, "Nothing carried loose."))),
    ...sortEntries(char, containers).map(c => containerGroup(char, c, 0)),
  ];
}

function containerGroup(char, c, depth) {
  const all = sortEntries(char, childrenOf(char, c.uid));
  const kids = all.filter(k => !k.strapped);
  const outside = all.filter(k => k.strapped);
  const inner = contentsWeight(char, c);
  const cap = c.item.capacityLb;
  const collapsed = ui.collapsed.has(c.uid);
  const toggle = () => { collapsed ? ui.collapsed.delete(c.uid) : ui.collapsed.add(c.uid); render(); };
  return dropZone(c.uid, h("div", { class: "group container-group", style: { marginLeft: depth ? "12px" : null } },
    h("div", { class: "group-head" },
      h("button", { class: "collapse" + (collapsed ? " closed" : ""), onclick: toggle, "aria-expanded": String(!collapsed) }, icon("chevron"),
        h("h3", null, c.item.name, c.qty > 1 ? ` ×${c.qty}` : "")),
      h("span", { class: "muted" + (cap && inner > cap ? " warn-text" : "") },
        cap ? `${+inner.toFixed(2)} / ${cap} lb` : fmtWeight(inner), c.item.weightless ? " (weightless)" : ""),
      iconBtn("more", "Container details", () => openEntry(c.uid))),
    !collapsed && [
      entryList(char, kids.filter(k => !holdsItems(char, k))),
      kids.filter(k => holdsItems(char, k)).map(k => containerGroup(char, k, depth + 1)),
      !kids.length && h("p", { class: "muted pad" }, "Empty — drag items here or use Location."),
      (canStrap(c) || outside.length > 0) && dropZone(c.uid, h("div", { class: "strapped" },
        h("div", { class: "strapped-head" }, icon("link"), h("h4", null, "Strapped outside"),
          h("span", { class: "muted" }, outside.length ? fmtWeight(strappedWeight(char, c)) : "")),
        outside.length
          ? [entryList(char, outside.filter(k => !holdsItems(char, k))),
             outside.filter(k => holdsItems(char, k)).map(k => containerGroup(char, k, depth + 1))]
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
  const name = parentUid ? char.items.find(x => x.uid === parentUid).item.name : null;
  const dest = !name ? "on person" : strapped ? `the outside of ${name}` : name;
  commit((s, c) => {
    const x = c.items.find(x => x.uid === id);
    x.parent = parentUid;
    x.strapped = strapped;
  }, `Moved ${entry.item.name} to ${dest}`, true);
}

// "in Backpack" / "on Backpack" for filtered lists.
function locationLabel(char, e) {
  if (!e.parent) return null;
  const name = char.items.find(x => x.uid === e.parent)?.item.name;
  return name && (e.strapped ? "on " : "in ") + name;
}

// Rows or a tile grid, depending on the layout preference.
function entryList(char, entries, showPath = false) {
  if (!entries.length) return null;
  if (ui.layout !== "tiles") return entries.map(e => entryRow(char, e, showPath));
  return h("div", { class: "tiles" }, entries.map(e => entryTile(char, e, showPath)));
}

function entryTile(char, e, showPath) {
  const it = e.item;
  const path = showPath ? locationLabel(char, e) : null;
  const el = h("button", { class: "tile" + (e.equipped ? " equipped" : ""), draggable: "true",
    title: `${it.name} — ${itemSummary(it)}`, onclick: () => openEntry(e.uid),
    ondragstart: ev => { ev.dataTransfer.setData("text/entry", e.uid); ev.dataTransfer.effectAllowed = "move"; } },
    e.qty !== 1 && h("span", { class: "tile-qty" }, "×" + e.qty.toLocaleString()),
    h("span", { class: "tile-name" }, it.name),
    h("span", { class: "tile-sub" }, itemSummary(it)),
    h("span", { class: "tile-foot" },
      h("span", null, fmtWeight(entryOwnWeight(e))),
      e.equipped && h("span", { class: "tag on" }, it.type === "armor" || it.acBonus ? "worn" : "equipped"),
      e.attuned && h("span", { class: "tag attuned" }, "attuned"),
      e.charges != null && h("span", { class: "tag" }, `${e.charges}/${it.maxCharges}`),
      path && h("span", { class: "tag" }, path)));
  el.style.setProperty("--type", TYPE_COLORS[it.type] || "#888");
  return el;
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
  return h("div", { class: "row" + (e.equipped ? " equipped" : ""), draggable: "true",
    ondragstart: ev => { ev.dataTransfer.setData("text/entry", e.uid); ev.dataTransfer.effectAllowed = "move"; } },
    typeBadge(it.type),
    h("button", { class: "row-main", onclick: () => openEntry(e.uid) },
      h("div", { class: "row-title" }, it.name,
        e.equipped && h("span", { class: "tag on" }, it.type === "armor" || it.acBonus ? "worn" : "equipped"),
        e.attuned && h("span", { class: "tag attuned" }, "attuned"),
        e.charges != null && h("span", { class: "tag" }, `${e.charges}/${it.maxCharges} charges`),
        path && h("span", { class: "tag" }, path)),
      h("div", { class: "row-sub" }, [itemSummary(it), e.notes].filter(Boolean).join(" — "))),
    h("div", { class: "row-weight muted" }, fmtWeight(entryOwnWeight(e))),
    equipable && iconBtn(it.type === "weapon" ? "sword" : "shield", e.equipped ? "Unequip" : "Equip",
      () => toggleEquip(e.uid), "equip" + (e.equipped ? " on" : "")),
    h("div", { class: "qty" },
      iconBtn("minus", "Decrease", () => setQty(e.qty - 1)),
      h("input", { type: "number", inputmode: "numeric", value: e.qty, min: 0, "aria-label": "Quantity",
        onchange: ev => setQty(Math.floor(+ev.target.value || 0)) }),
      iconBtn("plus", "Increase", () => setQty(e.qty + 1))));
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

function itemDetails(item) {
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
  if (item.type === "container") {
    add("Capacity", item.capacity || (item.capacityLb && item.capacityLb + " lb"));
    add("Weightless", item.weightless && "Contents don't count toward carried weight");
    add("Straps", item.straps && "Gear can be strapped to the outside");
  }
  add("Poison type", item.poisonType);
  add("Save DC", item.saveDC);
  add("Max charges", item.maxCharges);
  add("Recharge", item.recharge);
  add("AC bonus", item.acBonus && fmtMod(item.acBonus));
  add("Trinket table", item.table && `${item.table} (${item.roll})`);
  // Fields from user templates.
  if (tpl && !tpl.builtin) for (const f of tpl.fields || []) add(f.label, fieldDisplay(f, item[f.key]));
  add("Source", item.source);

  return h("div", { class: "details" },
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
    item.contents?.length && h("div", null, h("h4", null, "Contents"),
      h("ul", { class: "contents" }, item.contents.map(c => h("li", null, c.qty > 1 ? `${c.qty} × ` : "", c.name)))));
}

function fieldDisplay(f, v) {
  if (v == null || v === "") return null;
  if (f.kind === "checkbox") return v ? "Yes" : null;
  if (f.kind === "tags") return (v || []).join(", ");
  return String(v);
}

// Option values: "" = on person, "<uid>" = inside, "<uid>:out" = strapped to the outside.
function containerOptions(char, exclude) {
  return [h("option", { value: "" }, "On person"),
    ...char.items.filter(c => holdsItems(char, c) && c.uid !== exclude && !(exclude && isDescendant(char, c.uid, exclude)))
      .flatMap(c => {
        const name = c.item.name + (c.parent ? " (nested)" : "");
        return [h("option", { value: c.uid }, "In " + name),
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
  const it = e.item;
  let close;
  const moveSel = h("select", { onchange: ev => {
    const loc = parseLocation(ev.target.value);
    moveEntry(e.uid, loc.parent, loc.strapped);
    close();
  } }, containerOptions(char, e.uid));
  moveSel.value = e.parent ? e.parent + (e.strapped ? ":out" : "") : "";

  const controls = h("div", { class: "entry-controls" },
    h("label", { class: "field" }, h("span", null, "Location"), moveSel),
    h("label", { class: "field" }, h("span", null, "Quantity"),
      h("input", { type: "number", min: 0, value: e.qty, inputmode: "numeric",
        onchange: ev => commit((s, c) => { c.items.find(x => x.uid === e.uid).qty = Math.max(0, Math.floor(+ev.target.value)); }) })),
    it.maxCharges && h("label", { class: "field" }, h("span", null, `Charges (max ${it.maxCharges})`),
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

  const footer = [
    h("button", { class: "btn danger", onclick: () => { close(); commit((s, c) => removeEntry(c, e.uid), `Removed ${it.name}`, true); } }, icon("trash"), "Remove"),
    h("button", { class: "btn", onclick: () => { close(); openSell(e.uid); } }, icon("coins"), "Sell"),
    h("button", { class: "btn", onclick: () => { close(); openItemForm(it, { entryUid: e.uid }); } }, icon("edit"), "Edit"),
    h("button", { class: "btn", title: "Save a copy of this item as a reusable custom item", onclick: () => {
      commit(s => s.customItems.unshift({ ...clone(it), id: "custom-" + uid(), source: it.source || "Homebrew" }), `Saved “${it.name}” to custom items`);
    } }, icon("copy"), "Save as custom"),
    party.active && party.others().length > 0 &&
      h("button", { class: "btn", onclick: () => { close(); openTradeBuilder(null, e.uid); } }, icon("move"), "Trade"),
  ];
  close = openModal(it.name, [controls, itemDetails(it)], { footer });
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

const CAT_TYPES = [
  ["all", "All"], ["weapon", "Weapons"], ["armor", "Armor"], ["ammunition", "Ammo"], ["gear", "Gear"],
  ["container", "Containers"], ["pack", "Packs"], ["tool", "Tools"], ["poison", "Poisons"],
  ["trinket", "Trinkets"], ["custom", "Custom"],
];

function catalogFiltered() {
  const q = ui.catSearch.trim();
  const t = ui.catType;
  return store.catalog().filter(i => {
    if (t === "custom") { if (!i.id.startsWith("custom-")) return false; }
    else if (t !== "all" && i.type !== t) return false;
    // Trinkets are numerous; only show them in "All" when searching.
    if (t === "all" && i.type === "trinket" && !q) return false;
    return matchesSearch(i, q);
  });
}

function renderCatalog() {
  const tiles = ui.layout === "tiles";
  const list = h("div", { class: tiles ? "tiles cat-tiles" : "cat-list" });
  const count = h("span", { class: "muted small" });
  const draw = () => {
    const items = catalogFiltered();
    count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}` + (ui.catType === "all" && !ui.catSearch ? " (trinkets hidden — pick Trinkets or search)" : "");
    list.replaceChildren(...items.slice(0, ui.catLimit).map(tiles ? catalogTile : catalogRow),
      items.length > ui.catLimit ? h("button", { class: "btn wide", onclick: () => { ui.catLimit += 300; draw(); } }, `Show more (${items.length - ui.catLimit} left)`) : null,
      !items.length ? h("p", { class: "muted pad" }, "No items found. ", h("button", { class: "link", onclick: () => openItemForm(null) }, "Create a custom item?")) : null);
  };
  draw();
  const chips = h("div", { class: "chips", role: "tablist" }, CAT_TYPES.map(([k, label]) =>
    h("button", { class: "chip-btn" + (ui.catType === k ? " active" : ""), role: "tab", "aria-selected": String(ui.catType === k),
      onclick: () => { ui.catType = k; ui.catLimit = 150; render(); } },
      k !== "all" && k !== "custom" && typeBadge(k), label)));
  return h("div", { class: "view-catalog" },
    h("div", { class: "toolbar" },
      h("label", { class: "search" }, icon("search"),
        h("input", { type: "search", placeholder: "Search items, properties, descriptions…", value: ui.catSearch,
          oninput: e => { ui.catSearch = e.target.value; ui.catLimit = 150; draw(); } })),
      h("button", { class: "btn", onclick: openTrinketRoller }, icon("dice"), h("span", null, "Roll trinket")),
      h("button", { class: "btn primary", onclick: () => openItemForm(null) }, icon("plus"), h("span", { class: "hide-sm" }, "New custom item")),
      layoutToggle()),
    chips, count, list);
}

function quickAdd(item) {
  if (item.type === "pack") return openCatalogItem(item);
  commit((s, c) => addToInventory(c, item), `Added ${item.name}${item.bundle > 1 ? ` ×${item.bundle}` : ""}`, true);
}

function catalogTile(item) {
  const el = h("div", { class: "tile" },
    h("button", { class: "tile-hit", onclick: () => openCatalogItem(item), "aria-label": item.name }),
    h("span", { class: "tile-name" }, item.name),
    h("span", { class: "tile-sub" }, itemSummary(item)),
    h("span", { class: "tile-foot" },
      h("span", null, fmtCost(item.cost)),
      item.weight ? h("span", null, fmtWeight(item.weight)) : null,
      item.id.startsWith("custom-") && h("span", { class: "tag custom" }, "custom")),
    iconBtn("plus", "Add to inventory", () => quickAdd(item), "add tile-add"));
  el.style.setProperty("--type", TYPE_COLORS[item.type] || "#888");
  return el;
}

function catalogRow(item) {
  const isCustom = item.id.startsWith("custom-");
  return h("div", { class: "row cat-row" },
    typeBadge(item.type),
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
  let qty = item.bundle || 1, parent = null, strapped = false, close;
  const unit = (item.cost || 0) / (item.bundle || 1);
  const priceEl = h("span", { class: "muted" });
  const updPrice = () => { priceEl.textContent = item.cost ? `Total ${fmtCost(Math.round(unit * qty))}` : ""; };
  updPrice();
  const controls = h("div", { class: "entry-controls" },
    item.type !== "pack" && h("label", { class: "field" }, h("span", null, item.bundle > 1 ? `Quantity (bundle of ${item.bundle})` : "Quantity"),
      h("input", { type: "number", min: 1, value: qty, inputmode: "numeric", oninput: e => { qty = Math.max(1, Math.floor(+e.target.value || 1)); updPrice(); } })),
    h("label", { class: "field" }, h("span", null, "Put in"),
      h("select", { onchange: e => { ({ parent, strapped } = parseLocation(e.target.value)); } }, containerOptions(char))),
    h("div", { class: "field" }, h("span", null, `Purse: ${fmtCost(coinTotalCp(char.coins))}`), priceEl),
    item.type === "pack" && item.cost && h("label", { class: "check" },
      h("input", { type: "checkbox", onchange: e => { payForPack = e.target.checked; } }), ` Pay ${fmtCost(item.cost)} from purse`));
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
    item.type === "pack" ? [
      h("button", { class: "btn", onclick: () => {
        const purse = packPurse(); if (!purse) return;
        close();
        commit((s, c) => { c.coins = purse; addToInventory(c, item, 1, parent, strapped); }, `Added ${item.name}`, true);
      } }, "Add as one item"),
      h("button", { class: "btn primary", onclick: () => {
        const purse = packPurse(); if (!purse) return;
        close();
        commit((s, c) => { c.coins = purse; addPackContents(c, item); }, `Unpacked ${item.name}`, true);
      } }, icon("package"), "Add contents"),
    ] : [
      item.cost ? h("button", { class: "btn", onclick: () => add(true) }, icon("cart"), "Buy") : null,
      h("button", { class: "btn primary", onclick: () => add(false) }, icon("plus"), "Add"),
    ],
  ];
  close = openModal(item.name, [controls, itemDetails(item)], { footer });
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
  const form = h("form", { class: "form grid", onsubmit: e => { e.preventDefault(); save(); } }, fields.map(f => fieldInput(f, draft)));
  let close;

  function save() {
    if (!draft.name?.trim()) return toast("Give the item a name");
    draft.name = draft.name.trim();
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

function chooseTemplate(onPick) {
  let close;
  const tile = t => h("button", { class: "tpl-tile", onclick: () => { close(); onPick(t); } },
    h("span", { class: "tpl-swatch", style: { background: t.color || TYPE_COLORS[t.type] } }),
    h("b", null, t.name),
    h("small", { class: "muted" }, t.builtin ? "Built-in" : `Based on ${TYPE_LABELS[t.type]}`));
  close = openModal("Choose a template", [
    h("div", { class: "tpl-grid" }, store.templates().map(tile)),
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
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "Templates"),
        h("button", { class: "btn", onclick: () => openTemplateEditor(null) }, icon("plus"), "New template")),
      h("p", { class: "muted small" }, "Templates decide which fields an item has. Your templates build on a base type (which controls how the app treats the item — e.g. Armor counts toward AC, Containers can hold things) and add your own fields."),
      h("div", { class: "tpl-grid" },
        store.templates().map(t => h("div", { class: "tpl-tile static" },
          h("span", { class: "tpl-swatch", style: { background: t.color || TYPE_COLORS[t.type] } }),
          h("b", null, t.name),
          h("small", { class: "muted" }, t.builtin ? `${templateFields(t).length} fields · built-in` :
            `Based on ${TYPE_LABELS[t.type]} · +${(t.fields || []).length} fields · ${usage(t.id)} items`),
          h("div", { class: "tpl-actions" },
            h("button", { class: "link", onclick: () => openItemForm({ type: t.type, template: t.builtin ? undefined : t.id, ...(t.defaults || {}) }, { isNew: true }) }, "New item"),
            !t.builtin && h("button", { class: "link", onclick: () => openTemplateEditor(t) }, "Edit"),
            t.builtin && h("button", { class: "link", onclick: () => openTemplateEditor({ ...clone(t), id: null, builtin: false, name: t.name + " (custom)", fields: [] }) }, "Extend")))))));
}

const FIELD_KINDS = [["text", "Text"], ["textarea", "Long text"], ["number", "Number"], ["checkbox", "Yes / No"],
  ["select", "Choice list"], ["tags", "Tags"], ["dice", "Dice (e.g. 2d6)"]];

function openTemplateEditor(tpl) {
  const isNew = !tpl || !tpl.id;
  const draft = tpl ? clone(tpl) : { name: "", type: "gear", color: "#8fa85a", fields: [] };
  draft.fields = draft.fields || [];
  let close;
  const fieldsBox = h("div", { class: "tpl-fields" });
  const baseInfo = h("p", { class: "muted small" });

  const drawBase = () => {
    const base = BUILTIN_TEMPLATES.find(t => t.id === draft.type);
    baseInfo.textContent = "Inherited fields: " + [...COMMON_FIELDS, ...base.fields].map(f => f.label).join(", ");
  };
  const drawFields = () => fieldsBox.replaceChildren(...draft.fields.map((f, i) => h("div", { class: "tpl-field" },
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
          BUILTIN_TEMPLATES.filter(t => !t.hidden).map(t => h("option", { value: t.id, selected: draft.type === t.id }, t.name)))),
      h("label", { class: "field" }, h("span", null, "Color"),
        h("input", { type: "color", value: draft.color || "#888888", oninput: e => { draft.color = e.target.value; } }))),
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
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = h("a", { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.kind === "character" && data.character) {
        commit(s => {
          const c = { ...data.character, id: uid() };
          s.characters.push(c); s.activeId = c.id;
          for (const t of data.templates || []) if (!s.templates.some(x => x.id === t.id)) s.templates.push(t);
        }, `Imported ${data.character.name}`, true);
      } else if (Array.isArray(data.characters)) {
        if (party.active) throw new Error("full backups can only be imported in solo mode — import single characters here");
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
  return h("div", { class: "view-settings" },
    partySettings(),
    installSection(),
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "Characters"),
        h("button", { class: "btn primary", onclick: () => newCharPrompt() }, icon("plus"), "New character")),
      h("div", { class: "group" }, s.characters.map(c => h("div", { class: "row" + (c.id === s.activeId ? " equipped" : "") },
        h("button", { class: "row-main", onclick: () => { commit(st => { st.activeId = c.id; }); go("inventory"); } },
          h("div", { class: "row-title" }, c.name, c.id === s.activeId && h("span", { class: "tag on" }, "active")),
          h("div", { class: "row-sub" }, `${c.items.length} entries · ${fmtCost(coinTotalCp(c.coins))} in coin · STR ${c.str}`)),
        iconBtn("edit", "Rename", () => renamePrompt(c)),
        iconBtn("download", "Export character", () => download(`${c.name.replace(/\W+/g, "_")}.json`,
          { kind: "character", character: c, templates: s.templates.filter(t => c.items.some(e => e.item.template === t.id)) })),
        iconBtn("copy", "Duplicate", () => commit(st => { st.characters.push({ ...clone(c), id: uid(), name: c.name + " (copy)" }); }, `Duplicated ${c.name}`)),
        (s.characters.length > 1 || party.active) && iconBtn("trash", "Delete", () => confirmDialog(
          party.active ? `Remove ${c.name} from the party? Their inventory is deleted from the host.` : `Delete ${c.name} and their whole inventory?`, "Delete",
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
      h("p", { class: "muted small" }, party.active
        ? "Party characters are saved on the host computer. Custom items, templates and settings stay in this browser."
        : "Everything is saved in this browser only. Export a backup to move data between your PC and phone."),
      h("div", { class: "inline wrap" },
        h("button", { class: "btn", onclick: () => download(`rpg-inventory-${new Date().toISOString().slice(0, 10)}.json`, s) }, icon("download"), "Export all"),
        h("button", { class: "btn", onclick: () => fileInput.click() }, icon("upload"), "Import"),
        fileInput,
        !party.active && h("button", { class: "btn danger", onclick: () => confirmDialog("Erase all characters, custom items and templates?", "Erase everything",
          () => commit(st => Object.assign(st, defaultState()), "All data reset", true)) }, icon("trash"), "Reset"))),
    h("section", { class: "credits muted small" },
      h("p", null, "Item data from ", h("a", { href: "https://dnd5e.wikidot.com/", target: "_blank", rel: "noopener" }, "dnd5e.wikidot.com"),
        " (CC BY-SA 3.0). Dungeons & Dragons is a trademark of Wizards of the Coast; this tool is unofficial.")),
    party.isDesktopHost() && quitSection());
}

function partySettings() {
  if (party.active) {
    return h("section", null,
      h("h2", null, "Party"),
      h("p", { class: "muted small" }, party.isDesktopHost() ? "You're hosting a party. Others on this network join by opening:"
        : "You're connected to a party server. Others on this network join by opening:"),
      joinAddresses(),
      party.isDesktopHost() && h("button", { class: "btn danger", onclick: stopHosting }, "Stop hosting"));
  }
  if (party.isDesktopHost()) return hostPartySection();
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
  if (party.active && !store.char()) return;
  let close;
  const s = store.state;
  close = openModal("Characters", h("div", { class: "group" },
    s.characters.map(c => h("button", { class: "row row-main switch" + (c.id === s.activeId ? " equipped" : ""),
      onclick: () => { close(); commit(st => { st.activeId = c.id; }); } },
      icon("user"), h("div", null, h("div", { class: "row-title" }, c.name), h("div", { class: "row-sub" }, `${c.items.length} entries`)))),
    h("button", { class: "btn wide", onclick: () => { close(); newCharPrompt(); } }, icon("plus"), "New character")));
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
  store.load();
  store.subscribe(render);
  const nav = document.getElementById("nav");
  nav.replaceChildren(...Object.entries(VIEWS).map(([k, v]) =>
    h("button", { class: "nav-btn", "data-view": k, onclick: () => go(k) }, icon(v.icon), h("span", null, v.label),
      v.partyOnly && h("span", { class: "badge", hidden: true }))));
  document.getElementById("char-switch").addEventListener("click", openCharSwitcher);
  const hash = location.hash.slice(1);
  if (VIEWS[hash]) ui.view = hash;
  render();
  if (party.active) party.connect();
  // Closing the host's window ends the party for everyone, so ask first.
  window.addEventListener("beforeunload", e => {
    if (!ui.leaving && party.active && party.isDesktopHost() && party.others().some(c => c.online)) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW registration failed", e));
  }
}

boot();
