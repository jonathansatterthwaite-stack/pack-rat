// State, persistence and game-rule calculations.

const STORAGE_KEY = "rpg-inventory-v1"; // the old single bundle: read once to make the first campaign (see DATA_KEY)

// Older phone browsers (iOS < 15.4, Chrome < 98) lack structuredClone and
// (iOS < 14) replaceChildren; all app data is plain JSON, so this is enough.
const clone = v => JSON.parse(JSON.stringify(v));
if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function (...nodes) {
    this.textContent = "";
    this.append(...nodes);
  };
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ------------------------------------------------------------------ storage
//
// Key/value storage for everything the app saves. Normally the browser's
// localStorage; in the Windows app it's a file on the PC (server.py, "this
// PC's own data"), so every Pack Rat window and browser tab on it share the
// same characters.

const MOVED_FLAG = "packrat-moved-to-pc";

// A fresh-start test (fresh-start.bat, or ?fresh in the address): this tab runs as on a
// new device. Everything it saves is kept in memory only, and the real saved data is never read or
// written; leaving the test (or closing the tab) brings it all back.
const FRESH_TEST_KEY = "packrat-fresh-test";
const FRESH_TEST = (() => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has("fresh")) {
      sessionStorage.setItem(FRESH_TEST_KEY, "1");
      q.delete("fresh");
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
    }
    return sessionStorage.getItem(FRESH_TEST_KEY) === "1";
  } catch { return false; }
})();
function setFreshTest(on) {
  try { on ? sessionStorage.setItem(FRESH_TEST_KEY, "1") : sessionStorage.removeItem(FRESH_TEST_KEY); } catch {}
  ui.leaving = true;
  if (on) history.replaceState(null, "", location.pathname + location.search); // a new device starts on the first screen
  location.reload();
}

const kv = {
  remote: false,
  memory: FRESH_TEST ? {} : null, // the fresh-start test's storage
  data: {},
  pending: {},
  timer: null,
  client: Math.random().toString(36).slice(2),

  get(key) {
    if (this.memory) return key in this.memory ? this.memory[key] : null;
    if (this.remote) return key in this.data ? this.data[key] : null;
    try { return localStorage.getItem(key); } catch { return null; }
  },

  set(key, value) {
    value = String(value);
    if (this.memory) { this.memory[key] = value; return; }
    if (!this.remote) {
      try { localStorage.setItem(key, value); } catch (e) { console.warn("Could not save", e); }
      return;
    }
    if (this.data[key] === value) return;
    this.data[key] = value;
    this.pending[key] = value;
    this.schedule();
  },

  remove(key) {
    if (this.memory) { delete this.memory[key]; return; }
    if (!this.remote) {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    delete this.data[key];
    this.pending[key] = null;
    this.schedule();
  },

  schedule(delay = 250) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), delay);
  },

  async flush(keepalive = false) {
    const changes = this.pending;
    if (!Object.keys(changes).length) return;
    this.pending = {};
    try {
      const res = await fetch("api/local", {
        method: "PUT", keepalive, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set: changes, client: this.client }),
      });
      if (!res.ok) throw new Error("save failed (" + res.status + ")");
    } catch (e) {
      this.pending = { ...changes, ...this.pending }; // keep them; try again shortly
      this.schedule(3000);
    }
  },

  // Switch to the PC's shared data file.
  async connect() {
    const res = await fetch("api/local", { cache: "no-store" });
    if (!res.ok) throw new Error("PC data unavailable");
    this.data = (await res.json()).data || {};
    this.remote = true;
    window.addEventListener("pagehide", () => { clearTimeout(this.timer); this.flush(true); });
    await moveBrowserDataToPc();
  },

  // Another window changed the shared data: take theirs, keeping our unsaved edits.
  async refresh() {
    const res = await fetch("api/local", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()).data || {};
    for (const [k, v] of Object.entries(this.pending)) {
      if (v === null) delete data[k]; else data[k] = v;
    }
    this.data = data;
  },
};

// A character nobody has played (the "Adventurer" every new install starts with): nothing but its
// showcase items (js/showcase.js) and its coin purse, no coins or notes, its first name.
function isBlankCharacter(c) {
  return (c.items || []).every(e => e.showcase || e.purse) && !coinTotalCp(c.coins || {}) && !c.notes && ["Adventurer", "New Character"].includes(c.name);
}

// One-time move of this browser's saved data into the PC's shared file. Merges
// rather than replaces (another window may have moved its data first), and
// leaves the browser's copy in place as a backup.
async function moveBrowserDataToPc() {
  let keys = [];
  try {
    if (localStorage.getItem(MOVED_FLAG)) return;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k === STORAGE_KEY || k.startsWith("packrat-")) keys.push(k); // (DATA_KEY starts with packrat- too)
    }
  } catch {
    return; // no browser storage to move
  }
  // This browser's data (either format) is merged into the PC's, which is upgraded first if it's
  // still in the old format. The old key itself is copied as it was, as a backup.
  const parse = raw => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const asData = (v2, v1) => v2 ? normalizeData(v2) : v1 ? migrateV1(v1) : null;
  const mine = asData(parse(localStorage.getItem(DATA_KEY)), parse(localStorage.getItem(STORAGE_KEY)));
  let moved = 0;
  if (mine) {
    const theirs = asData(parse(kv.get(DATA_KEY)), parse(kv.get(STORAGE_KEY)));
    let merged;
    if (!theirs) {
      merged = mine;
      moved = mine.campaigns.reduce((n, c) => n + c.characters.filter(x => !isBlankCharacter(x)).length, 0);
    } else {
      // Old-format browser data has no campaigns of its own: it joins the PC's current campaign
      // and that campaign's home package, rather than arriving as a second "My campaign".
      if (!localStorage.getItem(DATA_KEY)) {
        const camp = theirs.campaigns.find(c => c.id === theirs.activeCampaign) || theirs.campaigns[0];
        mine.campaigns[0].id = camp.id;
        if (camp.home) mine.packages[0].id = camp.home;
      }
      moved = mergeData(theirs, mine);
      merged = theirs;
    }
    kv.set(DATA_KEY, JSON.stringify(merged));
  }
  for (const k of keys) {
    if (k === DATA_KEY) continue;
    if (kv.get(k) == null) kv.set(k, localStorage.getItem(k)); // preferences, party identity, the old data as a backup
  }
  await moveBrowserImagesToPc();
  await kv.flush();
  try { localStorage.setItem(MOVED_FLAG, new Date().toISOString()); } catch {}
  if (moved) setTimeout(() => toast(`Moved this window's saved characters and items into Pack Rat's data on this ${party.app?.android ? "phone" : "PC"}`), 500);
}

function newCharacter(name) {
  return {
    id: uid(), name: name || "New Character", stats: {}, // the system's starting stats until set (statsOf)
    coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }, items: [], notes: "",
  };
}

// ------------------------------------------------------------------ campaigns and rule packages
//
// Everything saved (DATA_KEY):
//   { version: 2, activeCampaign, campaigns: [campaign], packages: [package], iconLibrary: [drawing] }
// A campaign is one game: its characters, shops, the GM's controls and starting values, and its
// rules settings. Rule packages (custom items and templates) and the drawings library are shared;
// each campaign picks the packages it uses, and new custom items go into its home package.
// The old single bundle (STORAGE_KEY) is read once to make the first campaign and left as it was.

const DATA_KEY = "packrat-data-v2";

function newCampaign(name = "My campaign", packages = [], system = defaultSystemId()) {
  const c = newCharacter("Adventurer");
  return { id: "cmp" + uid(), name, notes: "", created: Date.now(), system, packages, home: packages[0] || null,
    settings: { encumbrance: "standard", coinWeight: true }, characters: [c], activeId: c.id,
    shops: [], gmControls: [], gmValues: {}, hoards: [], treasureTables: [] };
}

function newPackage(name = "My homebrew") {
  return { id: "pkg" + uid(), name, notes: "", customItems: [], templates: [] };
}

function defaultData() {
  const pkg = newPackage();
  pkg.templates = clone(DND5E_SYSTEM.starterTemplates);
  const camp = newCampaign("My campaign", [pkg.id], DND5E_SYSTEM.id); // the system list is made below
  // showcase: the Adventurer's example items are added at the first start (js/showcase.js).
  return { version: 2, activeCampaign: camp.id, campaigns: [camp], packages: [pkg], iconLibrary: [],
    systems: DEFAULT_BUNDLED.map(x => ({ id: x.id, bundled: true })), systemsListed: true, triggersSeen: true, showcase: "pending" };
}

// The old single bundle -> one campaign and one package (nothing dropped).
function migrateV1(old, name = "My campaign", pkgName = "My homebrew") {
  const pkg = newPackage(pkgName);
  pkg.customItems = old.customItems || [];
  pkg.templates = old.templates || [];
  const camp = newCampaign(name, [pkg.id]);
  Object.assign(camp, {
    settings: { encumbrance: "standard", coinWeight: true, ...(old.settings || {}) },
    characters: old.characters?.length ? old.characters : camp.characters,
    activeId: old.activeId, shops: old.shops || [], gmControls: old.gmControls || [],
  });
  return normalizeData({ version: 2, activeCampaign: camp.id, campaigns: [camp], packages: [pkg], iconLibrary: old.iconLibrary || [] });
}

// Fill in anything missing (older saves, imports, hand edits), so the rest of the app can rely on it.
// Panels from before Tabs controls had page and section tab bars (panel.tabs): each bar becomes a
// Tabs control where it was (a section bar showing on its page), and a control's page and section
// the tab it shows on (its section, whose bar shows on its page; else its page). A section bar for
// every page keeps its controls' section only.
function panelTabsToControls(panel) {
  if (!Array.isArray(panel.tabs)) return;
  for (const bar of panel.tabs) {
    if (!bar?.id || !Array.isArray(bar.items) || !bar.items.length) continue;
    panel.controls.push({ id: bar.id, type: "tabs", x: bar.x || 0, y: bar.y || 0, w: bar.w || 1, h: bar.h || 1, levels: 1,
      label: bar.kind === "section" ? "Sections" : "Pages",
      items: bar.items.map(t => ({ id: t.id, label: t.label || "", ...(t.icon ? { icon: t.icon } : {}) })),
      ...(bar.kind === "section" && bar.page ? { tab: bar.page } : {}) });
  }
  for (const c of panel.controls) {
    if (c.type === "tabs") continue;
    if (c.section || c.page) c.tab = c.section || c.page;
    delete c.page;
    delete c.section;
  }
  delete panel.tabs;
}

function normalizeData(d) {
  d = d && typeof d === "object" ? d : {};
  d.version = 2;
  if (!Array.isArray(d.packages)) d.packages = [];
  if (!Array.isArray(d.iconLibrary)) d.iconLibrary = [];
  // Imported systems (the built-in ones aren't saved).
  // The systems you have. Saves from before systems could be removed have the bundled ones too.
  d.systems = (Array.isArray(d.systems) ? d.systems : []).filter(x => x && x.id && (x.bundled ? bundledSystem(x.id) : !bundledSystem(x.id)));
  if (!d.systemsListed) {
    d.systems.unshift(...DEFAULT_BUNDLED.filter(b => !d.systems.some(x => x.id === b.id)).map(b => ({ id: b.id, bundled: true })));
    d.systemsListed = true;
  }
  for (const p of d.packages) {
    p.customItems = Array.isArray(p.customItems) ? p.customItems : [];
    p.templates = (Array.isArray(p.templates) ? p.templates : []).map(t => standardiseTemplate(t));
    p.name = p.name || "Rule package";
  }
  if (!Array.isArray(d.campaigns) || !d.campaigns.length) d.campaigns = [newCampaign("My campaign", d.packages.map(p => p.id))];
  for (const c of d.campaigns) {
    c.id = c.id || "cmp" + uid();
    c.name = c.name || "Campaign";
    if (c.system === undefined) c.system = LEGACY_SYSTEM; // from before game systems; null: none
    c.settings = { encumbrance: "standard", coinWeight: true, ...(c.settings || {}) };
    for (const k of ["characters", "shops", "gmControls", "hoards", "treasureTables"]) if (!Array.isArray(c[k])) c[k] = [];
    if (!c.characters.length) c.characters.push(newCharacter("Adventurer"));
    if (!c.characters.some(x => x.id === c.activeId)) c.activeId = c.characters[0].id;
    if (!c.gmValues || typeof c.gmValues !== "object") c.gmValues = {}; // Global and Local values (js/clockwork.js)
    // Boards' pins named GM values (gm_shipX); now values are named without it (shipX).
    // Boards were controls of their own: each becomes a panel holding it (js/control-panels.js).
    c.gmControls = c.gmControls.map(ctl => ctl.kind === "panel" ? ctl : { id: ctl.id, kind: "panel", name: ctl.name || "Board", cols: 6, rows: 6,
      controls: [{ id: "c" + ctl.id, type: "board", x: 0, y: 0, w: 6, h: 6, board: { ...(ctl.image ? { image: ctl.image } : {}), pins: ctl.pins || [] } }] });
    for (const ctl of c.gmControls) if (!Array.isArray(ctl.controls)) ctl.controls = [];
    for (const ctl of c.gmControls) panelTabsToControls(ctl);
    // Pins named GM values (gm_shipX); now values are named without it (shipX).
    for (const ctl of c.gmControls) for (const k of ctl.controls) for (const p of k.board?.pins || []) {
      for (const v of ["xVar", "yVar"]) if (/^gm_./.test(p[v] || "")) p[v] = p[v].slice(3);
    }
    c.packages = (Array.isArray(c.packages) ? c.packages : []).filter(id => d.packages.some(p => p.id === id));
    if (!c.packages.includes(c.home)) c.home = c.packages[0] || null;
  }
  if (!d.campaigns.some(c => c.id === d.activeCampaign)) d.activeCampaign = d.campaigns[0].id;
  // Items from before triggers count as seen: nothing fires for them (see js/triggers.js).
  if (!d.triggersSeen) {
    for (const c of d.campaigns) markEntriesSeen(c.characters);
    d.triggersSeen = true;
  }
  return d;
}

// Merge another device's data into ours: campaigns, their characters, packages and drawings by id.
// Returns how many characters and items came across.
function mergeData(base, extra) {
  let added = 0;
  const addById = (list, more, count = true) => {
    for (const x of more || []) if (!list.some(y => y.id === x.id)) { list.push(x); if (count) added++; }
  };
  for (const c of extra.campaigns) {
    const same = base.campaigns.find(x => x.id === c.id);
    if (!same) { base.campaigns.push(c); added += c.characters.filter(x => !isBlankCharacter(x)).length; continue; }
    addById(same.characters, c.characters.filter(x => !isBlankCharacter(x)));
    addById(same.shops, c.shops, false);
    addById(same.gmControls, c.gmControls, false);
    addById(same.hoards, c.hoards, false);
    addById(same.treasureTables, c.treasureTables, false);
    // A blank starter character is no longer needed once real ones arrive.
    if (same.characters.length > 1) same.characters = same.characters.filter(x => !isBlankCharacter(x));
    if (!same.characters.some(x => x.id === same.activeId)) same.activeId = same.characters[0]?.id;
  }
  for (const p of extra.packages) {
    const same = base.packages.find(x => x.id === p.id);
    if (!same) { base.packages.push(p); added += p.customItems.length; continue; }
    addById(same.customItems, p.customItems);
    addById(same.templates, p.templates, false);
  }
  addById(base.iconLibrary, extra.iconLibrary, false);
  addById(base.systems || (base.systems = []), extra.systems, false);
  normalizeData(base);
  return added;
}

// store.state: the active campaign seen as one flat object, the way the app has always used it
// (characters, activeId, shops, gmControls, gmValues and settings are the campaign's; customItems
// and templates its home package's; iconLibrary the shared library's). Reading and assigning go
// straight through to the saved data, so `s.characters = s.characters.filter(…)` just works.
function campaignView() {
  const view = {};
  const pass = (key, owner) => Object.defineProperty(view, key, {
    enumerable: true, get: () => owner()[key], set: v => { owner()[key] = v; } });
  for (const k of ["characters", "activeId", "shops", "gmControls", "gmValues", "hoards", "treasureTables", "settings"]) pass(k, () => store.campaign());
  for (const k of ["customItems", "templates"]) pass(k, () => store.homePackage());
  pass("iconLibrary", () => store.data);
  return view;
}

const store = {
  data: null,    // everything saved (see above)
  state: null,   // the active campaign's view of it (campaignView)
  listeners: [],

  load() {
    let data = null;
    const raw = kv.get(DATA_KEY);
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("Could not read saved data; keeping a copy and starting again", e);
      kv.set(DATA_KEY + "-unreadable", raw);
    }
    if (!data) {
      let old = null;
      try { old = JSON.parse(kv.get(STORAGE_KEY) || "null"); } catch {}
      data = old ? migrateV1(old) : defaultData();
      this.data = normalizeData(data);
      this.state = this.state || campaignView();
      this.save();
    } else {
      this.data = normalizeData(data);
      this.state = this.state || campaignView();
    }
    // The characters are always this device's own. In a party, the linked ones are also kept
    // in step with the host (party.link / party.sync).
    if (reclassifyAll({ characters: this.data.campaigns.flatMap(c => c.characters), shops: this.data.campaigns.flatMap(c => c.shops) })) this.save();
    if (renameCategories(this.data) + syncCatalog(this.campaign(), this.state.settings)) this.save();
  },

  save() {
    kv.set(DATA_KEY, JSON.stringify(this.data));
    party.sync(this.state.characters);
  },

  // Apply a mutation, persist, and re-render.
  update(fn) {
    fn(this.state);
    this.rev = (this.rev || 0) + 1;
    clearGhostTemplates(this.data);
    clearGhostItems(this.data);
    syncCatalog(this.campaign(), this.state.settings); // (inventory copies follow their catalog items)
    // Coins and coin items kept in step (see syncCoins).
    for (const c of this.state.characters || []) syncCoins(c, this.state.settings, { purse: true });
    for (const hd of this.state.hoards || []) syncCoins(hd, this.state.settings); // (kept like an inventory)
    this.save();
    this.listeners.forEach(l => l());
  },

  subscribe(fn) { this.listeners.push(fn); },

  // ---- campaigns
  campaigns() { return this.data.campaigns; },
  campaign() { return this.data.campaigns.find(c => c.id === this.data.activeCampaign) || this.data.campaigns[0]; },

  // ---- rule packages
  packages() { return this.data.packages; },
  // The packages the active campaign uses, and the one its new custom items and templates go into
  // (made if it has none).
  enabledPackages() { const ids = this.campaign().packages; return this.data.packages.filter(p => ids.includes(p.id)); },
  homePackage() {
    const camp = this.campaign();
    let pkg = this.data.packages.find(p => p.id === camp.home);
    if (!pkg) {
      pkg = this.enabledPackages()[0];
      if (!pkg) { pkg = newPackage(`${camp.name} homebrew`); this.data.packages.push(pkg); camp.packages.push(pkg.id); }
      camp.home = pkg.id;
    }
    return pkg;
  },
  // Custom items: the ones this campaign uses, or every package's (to find one an item came from).
  // (deleted ones still in an inventory, ghosts, aren't listed: see clearGhostItems)
  customItems() { return this.enabledPackages().flatMap(p => p.customItems.filter(i => !i.ghost)); },
  allCustomItems() { return this.data.packages.flatMap(p => p.customItems); },
  findCustom(id) { return this.allCustomItems().find(i => i.id === id); },
  packageOf(itemId) { return this.data.packages.find(p => p.customItems.some(i => i.id === itemId)); },
  templatePackage(tplId) { return this.data.packages.find(p => p.templates.some(t => t.id === tplId)); },

  // The active character; if it's gone (deleted, e.g. in another window), the first one.
  char() { return this.state.characters.find(c => c.id === this.state.activeId) || this.state.characters[0]; },

  // (the coins are treasure items of the catalog too)
  catalog() { return [...this.customItems(), ...(activeSystem().catalog || []), ...coinOrder().map(k => coinItem(k))]; },

  findItem(id) { return this.findCustom(id) || catalogItem(id) || coinCatalogItem(id); },

  // Templates for new items: the system's and those of the packages in use. Any package's
  // template is still found by id, so items made with one keep their fields.
  templates() { return [...systemTemplates().filter(t => !t.hidden), ...this.enabledPackages().flatMap(p => p.templates.filter(t => !t.ghost))]; },
  allTemplates() { return this.data.packages.flatMap(p => p.templates); },
  // Deleted templates still used by items (they show faded until nothing uses them).
  ghostTemplates() { return this.enabledPackages().flatMap(p => p.templates.filter(t => t.ghost)); },

  template(id) { return templateById(id); },

  // Start again: one empty campaign (the drawings library and rule packages go too).
  reset() { this.data = defaultData(); },
};


// Items anywhere (custom items, every campaign's characters, shops and hoards) made with a template.
function templateUses(data, id) {
  const uses = it => it && (it.template === id || it.type === id);
  let n = 0;
  for (const p of data.packages || []) n += (p.customItems || []).filter(uses).length;
  for (const c of data.campaigns || []) {
    for (const ch of c.characters || []) n += (ch.items || []).filter(e => uses(e.item)).length;
    for (const hd of c.hoards || []) n += (hd.items || []).filter(e => uses(e.item)).length;
    for (const sh of c.shops || []) n += (sh.items || []).filter(li => uses(li.item)).length;
  }
  return n;
}
// Inventory copies (characters', hoards', shops') of a catalog item, anywhere.
function itemCopies(data, id) {
  let n = 0;
  for (const c of data.campaigns || []) {
    for (const ch of c.characters || []) n += (ch.items || []).filter(e => e.srcId === id).length;
    for (const hd of c.hoards || []) n += (hd.items || []).filter(e => e.srcId === id).length;
    for (const sh of c.shops || []) n += [...(sh.items || []), ...(sh.backroom || [])].filter(li => li.srcId === id).length;
  }
  return n;
}
// Deleted custom items nothing has a copy of any more go.
function clearGhostItems(data) {
  for (const p of data.packages || []) if (p.customItems?.some(i => i.ghost)) p.customItems = p.customItems.filter(i => !i.ghost || itemCopies(data, i.id));
}

// ------------------------------------------------------------------ the catalog and inventories
// An inventory copy (a character's, a hoard's, a shop's listing) is its catalog item (srcId):
// when the catalog item changes, so does every copy (the catalog comes first). Editing a copy
// makes, or changes, a custom item in the catalog (see saveEntryItem in js/app.js). What's
// written or drawn in it (COPY_KEYS) is the copy's own, as are its name, notes, count, charges,
// states and liquid (the entry's, not the item's).
const COPY_KEYS = ["body", "author"];

// A coin's catalog item (coin-gp…), as the campaign's settings weigh it.
const coinCatalogItem = (id, settings) => id?.startsWith?.(COIN_ID) && coinOrder().includes(id.slice(COIN_ID.length)) ? coinItem(id.slice(COIN_ID.length), settings) : null;

// What a copy of a catalog item is: the item (not its id), saying whether copies stack (as
// addToInventory has it), with what's written in this copy its own.
function syncedItem(src, srcId, own = null) {
  const { id, ghost, showcase, ...s } = clone(src);
  if (stacks(s, srcId)) delete s.noStack; else s.noStack = true;
  for (const k of COPY_KEYS) if (own?.[k]) s[k] = own[k];
  return s;
}
// Has a copy been changed from its catalog item? (Fields it hasn't got, from before the catalog
// had them, don't count.)
const editedCopy = (own, want) => Object.keys(own).some(k => k !== "noStack" && !COPY_KEYS.includes(k) && JSON.stringify(own[k]) !== JSON.stringify(want[k]));

// Keep a campaign's copies in step with the catalog. A copy whose catalog item isn't here (one
// that came from another device, the showcase's) gets one: a custom item, by its id. The first
// time (camp.catalogSynced), copies changed from their catalog item keep their changes as custom
// items of their own. Returns how many copies changed.
function syncCatalog(camp, settings = {}) {
  if (!camp || !store.data) return 0;
  const custom = new Map(store.allCustomItems().map(i => [i.id, i]));
  const find = id => id ? custom.get(id) || catalogItem(id) || coinCatalogItem(id, settings) : null;
  const migrate = !camp.catalogSynced, made = new Map();
  const add = (item, e) => {
    const { noStack, ...rest } = clone(item);
    for (const k of COPY_KEYS) delete rest[k];
    const it = { ...rest, source: rest.source || "Homebrew", ...(e.showcase ? { showcase: true } : {}) };
    store.homePackage().customItems.unshift(it);
    custom.set(it.id, it);
    return it;
  };
  // A copy with changes of its own (or none to go by): a custom item of its own, shared by copies alike.
  const adopt = e => {
    const key = (e.srcId || "") + "|" + JSON.stringify({ ...e.item, body: undefined, author: undefined });
    const it = made.get(key) || add({ ...e.item, id: "custom-" + uid() }, e);
    made.set(key, it);
    e.srcId = it.id;
    return it;
  };
  let changed = 0;
  const visit = (e, own) => {
    if (!e?.item || e.item.card || e.purse) return;
    let src = find(e.srcId);
    if (!src && own) src = e.srcId ? add({ ...e.item, id: e.srcId }, e) : adopt(e);
    if (!src) return;
    let want = syncedItem(src, e.srcId, e.item);
    if (migrate && own && editedCopy(e.item, want)) want = syncedItem(adopt(e), e.srcId, e.item);
    if (JSON.stringify(e.item) !== JSON.stringify(want)) { e.item = want; changed++; }
  };
  for (const c of camp.characters || []) for (const e of c.items || []) visit(e, true);
  for (const hd of camp.hoards || []) for (const e of hd.items || []) visit(e, true);
  for (const sh of camp.shops || []) for (const li of [...(sh.items || []), ...(sh.backroom || [])]) visit(li, false);
  if (migrate) { camp.catalogSynced = true; changed++; }
  return changed;
}

// A system's categories renamed since (renamedCategories: { templateId: { old: new } }): custom
// items with the old name get the new one (copies follow their catalog items).
function renameCategories(data) {
  const ren = activeSystem().renamedCategories || {};
  let n = 0;
  for (const p of data.packages || []) for (const it of p.customItems || []) {
    const to = ren[itemTemplate(it)?.id]?.[it.category];
    if (to) { it.category = to; n++; }
  }
  return n;
}

// Ghosts nothing uses any more go (what was under one goes under its parent).
function clearGhostTemplates(data) {
  for (const p of data.packages || []) {
    if (!p.templates?.some(t => t.ghost)) continue;
    for (const g of p.templates.filter(t => t.ghost && !templateUses(data, t.id))) {
      for (const q of data.packages) for (const t of q.templates) if (t.parent === g.id) { if (g.parent) t.parent = g.parent; else delete t.parent; }
      p.templates = p.templates.filter(t => t !== g);
    }
  }
}

// Catalog items that moved type (see RECLASSIFY in tools/build_srd.py): older inventory
// copies are brought in line when loaded. Returns true if the item changed.
const RECLASSIFIED = {
  "gear-acid-vial": "gear", "gear-alchemist-s-fire-flask": "gear", "gear-antitoxin-vial": "gear",
  "gear-holy-water-flask": "gear", "gear-oil-flask": "gear", "gear-potion-of-healing-common": "gear",
  "gear-rations-1-day": "gear", "gear-poison-basic-vial": "gear",
};

// Every copy in some characters and shops (on load and on import). Returns how many changed.
function reclassifyAll({ characters = [], shops = [] }) {
  return characters.flatMap(c => c.items || [])
    .concat((shops || []).flatMap(sh => [...(sh.items || []), ...(sh.backroom || [])]))
    .filter(e => reclassify(e.item, e.srcId)).length;
}

function reclassify(item, srcId) {
  if (!item || RECLASSIFIED[srcId] !== item.type) return false;
  const now = catalogItem(srcId);
  if (!now || now.type === item.type) return false;
  item.type = now.type;
  for (const k of ["category", "poisonType", "rarity"]) {
    if (now[k] !== undefined) item[k] = now[k]; else delete item[k];
  }
  return true;
}

// ------------------------------------------------------------------ features
// See CORE_FEATURES in templates.js. An item's own `features` flags win; otherwise its template's
// defaults (and for some, what the item is like: paper and books can be written in, an item with
// an AC bonus can be worn…). A template's "main" features can't be turned off.
const WRITABLE_NAME = /\b(paper|parchment|book|spellbook|journal|diary|notebook|ledger)\b/i;

function featureDefault(item, key, srcId) {
  const cat = catalogItem(srcId);
  const field = k => item[k] !== undefined ? item[k] : cat?.[k]; // older copies: the catalog's fields
  const byTpl = !!templateFeatureDefaults(itemTemplate(item))[key];
  switch (key) {
    // The catalog's containers that hold liquid only (bottles, flasks) say so by having no capacity.
    case "holds": return byTpl &&
      (field("capacityLb") > 0 || !!item.weightless || !!item.straps || !!field("holds") || srcId === "container-backpack");
    case "liquid": return +field("liquidPints") > 0;
    case "deck": { const list = field("deckCards"); return Array.isArray(list) && list.length > 0; }
    case "writable": return !item.imageOnly && (byTpl || (!item.card && WRITABLE_NAME.test(item.name || "")));
    case "picture": return !!item.imageOnly;
    case "charges": return item.maxCharges > 0;
    case "worn": return !!item.acBonus;
    case "bundle": return item.bundle > 1 || byTpl;
    case "equippable": return byTpl || !!item.acBonus;
    case "stacks": return templateFeatureDefaults(itemTemplate(item)).stacks !== false;
  }
  // A yes/no field of the item (5e's attunement).
  const flag = featureByKey(key)?.flag;
  return flag ? !!item[flag] : byTpl;
}

function hasFeature(item, key, srcId) {
  if (!item) return false;
  if (templateFeatureDefaults(itemTemplate(item))[key] === "main") return true;
  if (item.features && key in item.features) return !!item.features[key];
  return featureDefault(item, key, srcId);
}

// Whether copies of an item share a row (the party servers go by the `noStack` it's given).
const stacks = (item, srcId) => hasFeature(item, "stacks", srcId) && !deckList(item, srcId)
  && !hasFeature(item, "holds", srcId) && !hasFeature(item, "pack", srcId);

// ------------------------------------------------------------------ inventory

// Inventory entries keep a snapshot of the item so each copy can be edited
// (renamed, enchanted...) without touching the catalog.
// compartment: the id of one of the parent's compartments (its outside, a pocket…), else its main space.
function addToInventory(char, item, qty = null, parent = null, compartment = null) {
  qty = qty || item.bundle || 1;
  compartment = parent && compartment || null;
  const { id, ...snapshot } = item;
  // Decks don't stack: each has its own cards.
  if (deckList(item, id) && qty > 1) {
    let last;
    for (let i = 0; i < qty; i++) last = addToInventory(char, item, 1, parent, compartment);
    return last;
  }
  const stackable = stacks(item, id);
  if (stackable) delete snapshot.noStack; else snapshot.noStack = true;
  const existing = stackable && char.items.find(e => e.srcId === id && e.parent === parent && !e.customName &&
    entryComp(e) === compartment && JSON.stringify(e.item) === JSON.stringify(snapshot));
  if (existing) {
    existing.qty += qty;
    return existing;
  }
  const entry = { uid: uid(), srcId: id, item: clone(snapshot), qty, equipped: false,
    states: {}, parent, notes: "" };
  if (compartment) entry.compartment = compartment;
  if (item.maxCharges) entry.charges = item.maxCharges;
  char.items.push(entry);
  if (deckList(item, id)) fillDeck(char, entry);
  return entry;
}

// ------------------------------------------------------------------ decks
// A deck (a set of playing cards, a tarot deck, a Deck of Many Things…) holds its cards as
// separate items. While they're in it they aren't listed in the inventory: its details show them.
// Taken out, a card is an ordinary item (it remembers its deck, so it can be put back).

// The deck's card names: from the item, or for older inventory copies, from the catalog.
function deckList(item, srcId) {
  if (item.features?.deck === false) return null;
  const list = item.deckCards || catalogItem(srcId)?.deckCards;
  return Array.isArray(list) && list.length ? list : null;
}

const isDeckEntry = e => !!deckList(e.item, e.srcId);

// What one piece of a set is called: its own word, else "card" for decks of cards, else "piece".
function pieceNoun(item) {
  return (item.pieceName || "").trim().toLowerCase() || (/\b(card|cards|deck|tarot)\b/i.test(item.name || "") ? "card" : "piece");
}

// A set's pieces are listed as names, or { name, image } for pieces with a picture (a card's face).
const pieceSpec = p => typeof p === "string" ? { name: p } : { name: p?.name || "", image: p?.image };

function cardItem(name, noun = "card", image = null) {
  const piece = { type: "gear", category: noun[0].toUpperCase() + noun.slice(1), name, weight: 0, cost: 0, card: true };
  if (noun === "card") piece.icon = "cards";
  if (image) piece.image = image;
  return piece;
}

// Put a deck's cards in it (a new deck, or one added before decks had cards).
function fillDeck(char, deck) {
  const noun = pieceNoun(deck.item);
  for (const { name, image } of (deckList(deck.item, deck.srcId) || []).map(pieceSpec).filter(p => p.name)) {
    char.items.push({ uid: uid(), srcId: null, item: cardItem(name, noun, image), qty: 1, equipped: false, states: {},
      parent: deck.uid, strapped: false, notes: "", fromDeck: deck.uid });
  }
  deck.deckFilled = true;
}

// The cards in a deck, and the ones taken out of it (still carried by this character).
const cardsIn = (char, deck) => char.items.filter(e => e.parent === deck.uid && e.item.card);
const cardsOut = (char, deck) => char.items.filter(e => e.fromDeck === deck.uid && e.parent !== deck.uid);

// ------------------------------------------------------------------ container actions
// What an item offers to do with what's in it (item.actions): each its own words (label) and one
// of a few effects, then, if it says, a state of the item switched: "Shake one out" and "Fish one
// out" are both a random one; "Smash it" is everything out, then Broken on.
//   [{ label, effect: "random" | "choose" | "empty" | "fill", state?, on? }]
const CONTAINER_EFFECTS = [["random", "Takes one out, at random"], ["choose", "Takes one out (you choose)"], ["empty", "Takes everything out"], ["fill", "Puts things in"]];
// A set's, unless it has its own: "Draw a card" (one at random) and "Take all out".
function itemActions(it) {
  const own = (Array.isArray(it?.actions) ? it.actions : []).filter(a => a && a.label && CONTAINER_EFFECTS.some(([k]) => k === a.effect));
  if (own.length || Array.isArray(it?.actions) || !deckList(it, it?.id)) return own;
  const noun = pieceNoun(it);
  return [{ label: noun === "card" ? "Draw a card" : "Take one at random", effect: "random" }, { label: "Take all out", effect: "empty" }];
}

// What's in a container that can come out (its main space: not its compartments, nor its outside).
const takeable = (char, holder) => char.items.filter(e => e.parent === holder.uid && !compartmentOf(char, e));

// Take n of an entry out of its container, to where the container is: a stack's split off (and
// joins one there), a single thing just moves. Returns the entry where it landed.
function takeOutOf(char, holder, e, n = e.qty) {
  const parent = holder.parent || null, comp = entryComp(holder);
  n = Math.min(n, e.qty);
  if (isCoinEntry(e) && !comp && !holder.purse) { // (into the purse; out of it, onto where it is)
    const got = addCoins(char, e.item.coin, n, parent);
    e.qty -= n;
    if (e.qty <= 0) char.items = char.items.filter(x => x !== e);
    return got;
  }
  if (stacks(e.item, e.srcId)) {
    const got = addToInventory(char, { ...clone(e.item), id: e.srcId }, n, parent, comp);
    if (e.liquid && !got.liquid) got.liquid = clone(e.liquid);
    e.qty -= n;
    if (e.qty <= 0) char.items = char.items.filter(x => x !== e);
    return got;
  }
  if (n < e.qty) {
    e.qty -= n;
    const part = { ...clone(e), uid: uid(), qty: n };
    placeEntry(part, parent, comp);
    char.items.push(part);
    return part;
  }
  placeEntry(e, parent, comp);
  return e;
}

// One thing out at random (each thing as likely as any other: a stack of 30 coins is 30 chances).
function takeRandom(char, holder, random = Math.random) {
  const list = takeable(char, holder), total = list.reduce((s, e) => s + e.qty, 0);
  if (!total) return null;
  let r = Math.floor(random() * total);
  const e = list.find(x => (r -= x.qty) < 0);
  return takeOutOf(char, holder, e, 1);
}

// Draw pieces at random: out of the set to where the set is (they're then ordinary items).
// Only moves data, so whatever shows the draw (this device's draw window, or later everyone's
// in a party) can work from the piece uids returned. random: for a host doing the drawing.
function drawFromSet(char, setUid, count = 1, random = Math.random) {
  const set = char.items.find(e => e.uid === setUid);
  if (!set) return [];
  const drawn = [];
  for (let i = 0; i < count; i++) {
    const left = cardsIn(char, set);
    if (!left.length) break;
    const piece = left[Math.floor(random() * left.length)];
    placeEntry(piece, set.parent, entryComp(set));
    drawn.push(piece.uid);
  }
  return drawn;
}

// How a container shows what's in it (item.contentsView): "list" (its own section in the
// inventory), "details" (only in its details, as a deck's pieces) or "sealed" (hidden: only the GM
// sees). (item.sealed from before: sealed.)
const contentsView = e => ["list", "details", "sealed"].includes(e?.item?.contentsView) ? e.item.contentsView : e?.item?.sealed ? "sealed" : "list";
// Is what's in it kept from this device? (Sealed, and not the GM.)
const sealedHere = e => contentsView(e) === "sealed" && !(typeof isGmDevice === "function" && isGmDevice());
// Has it a section of its own in the inventory? (Not when its contents show only in its details.)
const hasSection = e => contentsView(e) !== "details" || compartmentsOf(e).some(k => spaceView(e, k) !== "details");

// Kept out of the inventory lists: a deck's pieces, the coins in the purse (the Coins panel
// shows those; see syncCoins), and what's in a container that shows it only in its details (or,
// but to the GM, a sealed one).
function inSealed(char, e) {
  const seen = new Set();
  for (let x = e, p = x.parent && char.items.find(i => i.uid === x.parent); p && !seen.has(p.uid); x = p, p = x.parent && char.items.find(i => i.uid === x.parent)) {
    seen.add(p.uid);
    const view = spaceView(p, compartmentOf(char, x));
    if (view === "details" || (view === "sealed" && !gmHere())) return true;
  }
  return false;
}
const gmHere = () => typeof isGmDevice === "function" && isGmDevice();
function inDeck(char, e) {
  if ((inPurse(char, e) && !purseEntry(char)) || inSealed(char, e)) return true; // (a hoard's loose coins; a character's purse shows its own)
  if (!e.item.card || !e.parent) return false;
  const p = char.items.find(x => x.uid === e.parent);
  return !!p && isDeckEntry(p);
}

// "12 entries": what a character's inventory lists (a deck counts once, not once per card).
const entriesLabel = char => plural((char.items || []).filter(e => !inDeck(char, e)).length, "entry", "entries");

// ------------------------------------------------------------------ equipment packs
// A pack's contents: [{ name, qty, place? }]. place is where the item goes when unpacked:
// "holder" (the container the rest is packed in), "in" (inside it), "strap" (strapped to its
// outside) or "loose" (on person). Left out, it's worked out: the pack's backpack or chest holds
// everything, with bedrolls, rope, tents and the like strapped to a backpack's side.
const STRAPPABLE = /bedroll|blanket|rope|tent|\bpole\b|ladder|shovel|miner's pick|grappling hook|pot, iron|bucket/i;

const PACK_PLACES = [["holder", "Holds the rest"], ["in", "Inside"], ["strap", "Strapped outside"], ["loose", "On person"]];

// Items named in a pack: the player's custom items first, then the catalog.
function findItemByName(name) {
  return store.data && store.customItems().find(i => i.name === name) || systemIndex().byName.get(name) || null;
}

// The rows to unpack, each with its item and place filled in.
function packPlan(pack) {
  const rows = (pack.contents || []).filter(c => c.name).map(c => ({ name: c.name, qty: Math.max(1, c.qty || 1), place: c.place || null,
    item: findItemByName(c.name), include: true }));
  let holder = rows.find(r => r.place === "holder");
  if (!holder) {
    holder = rows.find(r => !r.place && hasFeature(r.item, "holds", r.item?.id) && (r.item.capacityLb > 0 || r.item.weightless));
    if (holder) holder.place = "holder";
  }
  const straps = !!holder && (!!strapSpace({ item: holder.item, srcId: holder.item?.id }) || /backpack/i.test(holder.name));
  for (const r of rows) {
    if (r.place === "holder" && r !== holder) r.place = "in"; // only one container holds the rest
    if (!r.place) r.place = !holder ? "loose" : straps && STRAPPABLE.test(r.name) ? "strap" : "in";
  }
  return rows;
}

// Unpack as planned. into: an existing container (uid) to pack into instead of the pack's own;
// parent/compartment: where the pack's container, and anything loose, goes.
function unpackPack(char, rows, { into = null, parent = null, compartment = null } = {}) {
  const holderRow = rows.find(r => r.place === "holder" && r.include && r.item);
  let holderUid = into;
  if (holderRow) {
    // Packing into another container: the pack's own one still comes along, where the pack goes.
    const entry = addToInventory(char, holderRow.item, holderRow.qty, parent, compartment);
    if (!into) holderUid = entry.uid;
  }
  const holder = holderUid && char.items.find(e => e.uid === holderUid);
  for (const r of rows) {
    if (!r.include || !r.item || r === holderRow) continue;
    if (holder && (r.place === "in" || r.place === "strap")) {
      addToInventory(char, r.item, r.qty, holderUid, r.place === "strap" ? strapSpace(holder)?.id || null : null);
    } else {
      addToInventory(char, r.item, r.qty, parent, compartment);
    }
  }
}

// What an inventory copy is called: the player's own name for it, else the item's.
const entryName = e => (e.customName || "").trim() || currentItem(e).name;

// Inventory copies in order of what they're called.
const byName = entries => [...entries].sort((a, b) => entryName(a).localeCompare(entryName(b)));

function removeEntry(char, entryUid) {
  // Contents of a removed container fall out to wherever it was; a deck's cards go with it.
  const entry = char.items.find(e => e.uid === entryUid);
  if (!entry) return;
  if (isDeckEntry(entry)) char.items = char.items.filter(e => !(e.parent === entryUid && e.item.card));
  char.items.forEach(e => { if (e.parent === entryUid) placeEntry(e, entry.parent, entryComp(entry)); });
  char.items = char.items.filter(e => e.uid !== entryUid);
}

// Items that hold gear (containers, not waterskins or vials; or anything given the "holds" feature),
// or that still have something in them.
function holdsItems(char, e) {
  return hasFeature(currentItem(e), "holds", e.srcId) || char.items.some(x => x.parent === e.uid && !x.item.card);
}

// What a container allows in (item.allows): rules, any of which an item can match; none: anything.
// A rule matches when everything it says does: specific items (by id), a group, a template, a
// category, a feature, words in the name. It can say how many places one takes (size: parchment 2).
// Coins, arrows and maps are only items: a coin pouch allows the coin items, a quiver arrows.
//   { label?, item?: [id], group?, template?, category?: [name], feature?, property?, name?: "words", size? }
// (property: one of its properties starts with it: "Two-handed", "Versatile")
// A container with allowed contents and a count (holdLimit) is counted rather than weighed: a map
// case holds ten sheets of paper or five of parchment, a quiver twenty arrows.
// The "Only holds" choices of before (item.holds: scrolls, arrows, bolts) read as rules:
const HOLDER_RULES = {
  scrolls: { limit: 10, unit: "sheet", rules: [
    { label: "Parchment", name: "parchment", size: 2 },
    { label: "Paper, maps & scrolls", name: "paper map chart scroll letter deed sheet" },
    { template: "document", category: ["Letter", "Note", "Scroll", "Map"] },
    { template: "consumable", category: ["Scroll"] }] },
  arrows: { limit: 20, unit: "arrow", rules: [{ label: "Arrows", feature: "ammunition", name: "arrow" }] },
  bolts: { limit: 20, unit: "bolt", rules: [{ label: "Crossbow bolts", feature: "ammunition", name: "bolt" }] },
};

// Inventory copies made before a container learnt these fields fall back to the catalog's.
function containerField(e, key) {
  return e.item[key] !== undefined ? e.item[key] : catalogItem(e.srcId)?.[key];
}

// A container's rules: its own, else from its old "Only holds" choice.
function containerRules(e) {
  const own = containerField(e, "allows");
  if (Array.isArray(own) && own.length) return own;
  return HOLDER_RULES[containerField(e, "holds")]?.rules || [];
}
const nameWords = words => {
  const list = String(words || "").split(/[\s,]+/).filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return list.length ? new RegExp(`\\b(${list.join("|")})s?\\b`, "i") : null;
};
function ruleMatches(r, it, srcId) {
  if (r.item?.length && !r.item.includes(srcId) && !r.item.includes(it.id)) return false;
  if (r.group && !inTemplate(it, templateAlias(r.group))) return false;
  if (r.template && !inTemplate(it, templateAlias(r.template)) && itemRootId(it) !== r.template) return false; // (a copy counts as its original)
  if (r.category?.length && !r.category.includes(it.category)) return false;
  if (r.feature && !hasFeature(it, r.feature, srcId)) return false;
  if (r.property && !itemHasProperty(it, r.property)) return false;
  if (r.name && !nameWords(r.name)?.test(it.name || "")) return false;
  return true;
}
// How many places an item takes in a container with these rules (0: not allowed in).
function ruleSize(rules, it, srcId) {
  if (!rules.length) return 1;
  // (a container goes in one that allows only certain things only when a rule asks for containers)
  if (hasFeature(it, "holds", srcId) && !rules.some(r => r.feature === "holds")) return 0;
  const r = rules.find(x => ruleMatches(x, it, srcId));
  return r ? r.size || 1 : 0;
}
// "Arrows", "Gold piece, Silver piece": what the rules allow, in words.
function rulesLabel(rules) {
  return [...new Set(rules.map(r => r.label || r.name || (r.item?.length ? r.item.map(id => store.findItem(id)?.name || coinName(id) || id).join(", ") : "")
    || r.category?.join(", ") || ((r.template || r.group) && (templatePlural(store.template(templateAlias(r.template || r.group)) || {}) || r.template || r.group)) || featureByKey(r.feature)?.label || "?"))].join(", ");
}
const coinName = id => id?.startsWith(COIN_ID) ? coinItem(id.slice(COIN_ID.length)).name : null;

// May an item go in a container? (Counted ones also need room: see holderSpec.)
function containerAllows(e, it, srcId) {
  if (!hasFeature(currentItem(e), "holds", e.srcId)) return true;
  return ruleSize(containerRules(e), it, srcId) > 0;
}

// A counted container: { label, limit, unit, size(item, srcId) }, else null (weighed, or anything).
function holderSpec(e) {
  if (!hasFeature(currentItem(e), "holds", e.srcId)) return null;
  const old = HOLDER_RULES[containerField(e, "holds")];
  const rules = containerRules(e), limit = e.item.holdLimit || old?.limit;
  if (!rules.length || !(limit > 0)) return null;
  return { label: rulesLabel(rules), limit, unit: e.item.holdUnit || old?.unit || "item", size: (it, srcId) => ruleSize(rules, it, srcId) };
}

// Places used inside a counted container.
function holderUsed(char, e, spec = holderSpec(e)) {
  return childrenOf(char, e.uid).filter(c => !compartmentOf(char, c)).reduce((s, c) => s + (spec.size(c.item, c.srcId) || 1) * c.qty, 0);
}

// Liquid capacity in pints (0 = not a liquid container).
function liquidCap(e) {
  return hasFeature(currentItem(e), "liquid", e.srcId) ? +containerField(e, "liquidPints") || 0 : 0;
}

function fmtVolume(pints) {
  if (pints >= 8) return `${+(pints / 8).toFixed(1)} gal`;
  if (pints < 1) return `${Math.round(pints * 16)} oz`;
  return `${+pints.toFixed(2)} pint${pints === 1 ? "" : "s"}`;
}

// "Water · 3 / 4 pints", "Empty · holds 4 pints"
function liquidLabel(e) {
  const cap = liquidCap(e);
  if (!cap) return null;
  const l = e.liquid;
  const each = e.qty > 1 ? " each" : "";
  if (!l || !(l.pints > 0)) return `Empty · holds ${fmtVolume(cap)}${each}`;
  return `${l.name || "Liquid"} · ${fmtVolume(l.pints)} / ${fmtVolume(cap)}${each}`;
}

// How full a container is, for the tint behind it: { ratio, over, kind } or null.
function fillLevel(char, e) {
  const spec = holderSpec(e);
  if (spec) {
    const used = holderUsed(char, e, spec);
    return { ratio: used / spec.limit, over: used > spec.limit, kind: "gear", used, limit: spec.limit, unit: spec.unit };
  }
  if (e.item.capacityLb > 0 && hasFeature(currentItem(e), "holds", e.srcId)) {
    const w = contentsWeight(char, e);
    return { ratio: w / e.item.capacityLb, over: w > e.item.capacityLb, kind: "gear" };
  }
  const cap = liquidCap(e);
  if (cap) return { ratio: (e.liquid?.pints || 0) / cap, over: false, kind: "liquid" };
  return null;
}

// Compartments: a container's own spaces besides its main one: a side pocket, a lid, a hidden
// pouch, its outside (gear strapped to it). item.compartments: [{ id, name, capacity, capacityLb?,
// and a container's own options: allows, holdLimit, holdUnit, weightless, coinsApart, contentsView }].
// capacity: "shared" (in the container's capacity; with capacityLb, at most that much of it) or
// "separate" (its own: capacityLb, if any; not in the container's: its outside, for strapped gear).
// contentsView "inherit" (or none): as the container shows its own. An entry in one says so
// (e.compartment; from before, e.strapped: its outside). One that's gone: the main space.
const OUTSIDE = "out";
const outsideCompartment = () => ({ id: OUTSIDE, name: "Strapped outside", capacity: "separate", contentsView: "list" });
function compartmentsOf(e) {
  const it = e?.item;
  if (!it) return [];
  const list = (Array.isArray(it.compartments) ? it.compartments : []).filter(c => c && c.id && c.name)
    .map(c => c.capacity === "separate" || c.capacity === "shared" ? c : { ...c, capacity: "shared" }); // (from before: "portion", or none)
  // Straps, from before (and older copies of the backpack): its outside.
  if (!list.some(c => c.id === OUTSIDE) && (it.straps === true || (e.srcId === "container-backpack" && it.straps === undefined))) list.push(outsideCompartment());
  return list;
}
// Which compartment an entry is in (its id), or null: the main space.
const entryComp = e => e?.parent ? e.compartment || (e.strapped ? OUTSIDE : null) : null;
const compartmentOf = (char, e) => {
  const id = entryComp(e), p = id && char.items.find(x => x.uid === e.parent);
  return p && compartmentsOf(p).find(c => c.id === id) || null;
};
// Put an entry somewhere: in a container (one of its compartments), or on person.
function placeEntry(e, parent, comp = null) {
  e.parent = parent || null;
  delete e.strapped;
  if (e.parent && comp) e.compartment = comp; else delete e.compartment;
}
// A compartment as a container of its own (for its rules and count): { item: compartment }.
const compartmentHolder = comp => ({ item: comp, srcId: null });
// What's in a container's space (comp: a compartment, or null: the main space).
const inSpace = (char, holder, comp) => x => x.parent === holder.uid && (compartmentOf(char, x)?.id || null) === (comp?.id || null);
// May an item go in this space? Its rules (a compartment's own, else the container's).
function spaceAllows(holder, comp, it, srcId) {
  return comp ? ruleSize(containerRules(compartmentHolder(comp)), it, srcId) > 0 : containerAllows(holder, it, srcId);
}
// A counted space: as holderSpec.
function spaceSpec(holder, comp) {
  if (!comp) return holderSpec(holder);
  const rules = containerRules(compartmentHolder(comp));
  if (!rules.length || !(comp.holdLimit > 0)) return null;
  return { label: rulesLabel(rules), limit: comp.holdLimit, unit: comp.holdUnit || "item", size: (it, srcId) => ruleSize(rules, it, srcId) };
}
function spaceUsed(char, holder, comp, spec = spaceSpec(holder, comp)) {
  if (!comp) return holderUsed(char, holder, spec);
  return char.items.filter(inSpace(char, holder, comp)).reduce((s, c) => s + (spec.size(c.item, c.srcId) || 1) * c.qty, 0);
}
// How a space shows what's in it: a compartment's own way, or the container's.
const spaceView = (holder, comp) => comp && comp.contentsView && comp.contentsView !== "inherit" ? comp.contentsView : contentsView(holder);
// Its contents' weight, and its capacity (its capacityLb, if any).
const spaceWeight = (char, holder, comp) => char.items.filter(inSpace(char, holder, comp)).reduce((s, c) => s + entryTotalWeight(char, c), 0);
const spaceCapacity = (holder, comp) => comp ? comp.capacityLb > 0 ? comp.capacityLb : 0 : holder.item.capacityLb || 0;
// "3 / 5 lb", "12 / 20 arrows", or just the weight.
function spaceLoad(char, holder, comp) {
  if (!comp) return contentsLoad(char, holder);
  const spec = spaceSpec(holder, comp);
  if (spec) return `${spaceUsed(char, holder, comp, spec)} / ${spec.limit} ${spec.unit}s`;
  const w = spaceWeight(char, holder, comp), cap = spaceCapacity(holder, comp);
  return cap ? `${+w.toFixed(2)} / ${cap} ${weightUnit()}` : fmtWeight(w);
}
const spaceOver = (char, holder, comp) => {
  const spec = spaceSpec(holder, comp);
  if (spec) return spaceUsed(char, holder, comp, spec) > spec.limit;
  const cap = spaceCapacity(holder, comp);
  return cap > 0 && (comp ? spaceWeight(char, holder, comp) : contentsWeight(char, holder)) > cap;
};

// Where gear strapped to it goes (a pack's bedroll and rope): its outside (backpacks), else a
// compartment with a capacity of its own; none: inside.
const strapSpace = e => { const ks = compartmentsOf(e); return ks.find(c => c.id === OUTSIDE) || ks.find(c => c.capacity === "separate") || null; };
const canStrap = e => !!strapSpace(e);

function childrenOf(char, parentUid) { return char.items.filter(e => e.parent === parentUid); }

function isDescendant(char, maybeChild, ancestorUid) {
  let cur = char.items.find(e => e.uid === maybeChild);
  while (cur && cur.parent) {
    if (cur.parent === ancestorUid) return true;
    cur = char.items.find(e => e.uid === cur.parent);
  }
  return false;
}

// Weight of the entry itself (qty-adjusted; ammunition cost/weight is per bundle).
// Weight and value as the item is now (a curse can make it heavier, identifying it worth more).
function entryOwnWeight(e) {
  const it = currentItem(e);
  return (it.weight || 0) * e.qty / (it.bundle || 1);
}

function entryValue(e) {
  const it = currentItem(e);
  return (it.cost || 0) * e.qty / (it.bundle || 1);
}

// Worth including anything inside or strapped to it (containers).
function entryTotalValue(char, e) {
  return entryValue(e) + childrenOf(char, e.uid).reduce((s, c) => s + entryTotalValue(char, c), 0);
}

// Weight including contents: a weightless space's (Bag of Holding) don't add any. (The main space
// is weightless when the container is; a compartment when it says so.)
function entryTotalWeight(char, e) {
  let w = entryOwnWeight(e);
  for (const c of childrenOf(char, e.uid)) {
    const comp = compartmentOf(char, c);
    if (!(comp ? comp.weightless : e.item.weightless)) w += entryTotalWeight(char, c);
  }
  return w;
}

// Weight in the container's capacity: its main space, and the compartments that share it (or part of it).
function contentsWeight(char, e) {
  return childrenOf(char, e.uid).filter(c => { const k = compartmentOf(char, c); return !k || k.capacity !== "separate"; })
    .reduce((s, c) => s + entryTotalWeight(char, c), 0);
}

// Coins' worth in the smallest coin (the names say cp: D&D 5e's copper).
function coinTotalCp(coins) { return currency().coins.reduce((s, c) => s + (coins[c.key] || 0) * c.value, 0); }

function carriedWeight(char, settings) {
  // (Coins are items: their weight is theirs, see coinItem.)
  return childrenOf(char, null).reduce((s, e) => s + entryTotalWeight(char, e), 0);
}

// ------------------------------------------------------------------ coins as items
// Each of the system's coins is a stackable item (coin: its key). A character's coins are those
// items: in their coin purse (a container of theirs, entry.purse: its details list them), or
// anywhere else they put them. (A hoard has no purse: its loose coins are its coins.) char.coins
// is their total, which shops, trades, the purse and both party servers keep working with: when
// it changes, the change becomes items (into the purse, or out of it first), and when the items
// change, it follows. char.coinsAt is the total when they last matched.

const COIN_ID = "coin-";
const isCoinEntry = e => !!e?.item?.coin;
// A character's coin purse (an entry marked purse), if it has one.
const purseEntry = char => char?.items?.find(e => e.purse) || null;
// In the purse: its coins (no purse, as a hoard: the loose ones). (char.within: a container's
// contents shown on their own, see containerContents: nothing there is the purse's.)
function inPurse(char, e) {
  if (!isCoinEntry(e) || char?.within) return false;
  const p = purseEntry(char);
  return p ? e.parent === p.uid && !entryComp(e) : !e.parent;
}

// The coin purse: a container that takes the coins, showing them in its details.
function purseItem() {
  return { name: "Coin purse", ...(systemIndex().templates.has("container") ? { type: "container" } : {}), weight: 0, cost: 0,
    features: { holds: true }, allows: [{ item: coinOrder().map(k => COIN_ID + k) }], contentsView: "details",
    description: "Where your coins go. Open it to count them, spend or gain some, or move some elsewhere." };
}
// A character gets a coin purse; the first time, the loose coins go in it.
function ensurePurse(char) {
  if (purseEntry(char)) return;
  const p = { uid: uid(), purse: true, item: purseItem(), qty: 1, equipped: false, states: {}, parent: null, notes: "" };
  char.items.unshift(p);
  if (!char.pursed) for (const e of char.items) if (isCoinEntry(e) && !e.parent) e.parent = p.uid;
  char.pursed = true; // (made once: if it's ever gone, a new one doesn't take the loose coins)
}

// Add coins to the purse, or (parent) into a container: to a pile there of the same coin.
function addCoins(char, key, n, parent = null, settings = store.state?.settings || {}) {
  if (!(n > 0)) return null;
  const at = parent || purseEntry(char)?.uid || null;
  const pile = char.items.find(e => isCoinEntry(e) && e.item.coin === key && (e.parent || null) === at && !entryComp(e));
  if (pile) { pile.qty += n; return pile; }
  const { id, ...snapshot } = coinItem(key, settings);
  const entry = { uid: uid(), srcId: id, item: clone(snapshot), qty: n, equipped: false, states: {}, parent: at, notes: "" };
  char.items.push(entry);
  return entry;
}

// The item for one of the system's coins: "Gold piece", worth its value, weighing what the
// currency says (when coins have weight).
function coinItem(key, settings = store.state?.settings || {}) {
  const cur = currency(), c = cur.coins.find(x => x.key === key);
  const name = c ? (c.itemName || `${c.name.charAt(0).toUpperCase()}${c.name.slice(1)} piece`) : key;
  const tpl = systemIndex().templates.has("treasure") ? { type: "treasure" } : {};
  return { id: COIN_ID + key, name, ...tpl, ...(tpl.type ? { category: "Coin" } : {}), coin: key, cost: c?.value || 0,
    weight: settings.coinWeight !== false && cur.perWeight ? Math.round(1e6 / cur.perWeight) / 1e6 : 0,
    features: { stacks: true }, countInPlay: true, description: `One ${c?.name || key} coin (${key}).` };
}

// The purse's coins (loose ones), by key.
function purseTotals(char) {
  const out = {};
  for (const e of char.items || []) if (inPurse(char, e)) out[e.item.coin] = (out[e.item.coin] || 0) + e.qty;
  return out;
}

// The coins a character's items hold, by key (the ones that count: not kept apart).
function coinItemTotals(char) {
  const out = {};
  for (const e of char.items || []) if (isCoinEntry(e) && coinCounts(char, e)) out[e.item.coin] = (out[e.item.coin] || 0) + e.qty;
  return out;
}
// Does a coin count in the character's coins? (Not when it's in a container keeping its coins apart.)
function coinCounts(char, e) {
  const seen = new Set();
  for (let x = e, p = x.parent && char.items.find(i => i.uid === x.parent); p && !seen.has(p.uid); x = p, p = x.parent && char.items.find(i => i.uid === x.parent)) {
    seen.add(p.uid);
    const comp = compartmentOf(char, x); // (a compartment keeps them apart or not by itself)
    if (comp ? comp.coinsApart : p.item?.coinsApart) return false;
  }
  return true;
}

function syncCoins(char, settings = {}, o = {}) {
  const keys = coinOrder();
  if (!keys.length || !Array.isArray(char.items)) return;
  if (o.purse) ensurePurse(char);
  // (No coins recorded, e.g. treasure just taken back: the items are the coins.)
  if (!char.coins) { char.coins = coinItemTotals(char); char.coinsAt = { ...char.coins }; }
  const coins = char.coins;
  // The coin items, as this campaign's settings weigh them.
  for (const e of char.items) if (isCoinEntry(e) && keys.includes(e.item.coin)) {
    const w = coinItem(e.item.coin, settings).weight;
    if (e.item.weight !== w) e.item.weight = w;
  }
  const have = coinItemTotals(char);
  // What changed the total since it last matched (or, the first time, all of it) becomes items.
  const was = char.coinsAt || have;
  for (const k of keys) {
    const d = Math.floor((coins[k] || 0) - (was[k] || 0));
    if (d > 0) addCoins(char, k, d, null, settings);
    else if (d < 0) takeCoins(char, k, -d);
  }
  const now = coinItemTotals(char);
  const total = Object.fromEntries(keys.map(k => [k, now[k] || 0]));
  for (const [k, v] of Object.entries(coins)) if (!keys.includes(k)) total[k] = v; // (another system's coins: as they were)
  char.coins = total;
  char.coinsAt = { ...total };
}

// Take n coins of a kind: from the purse first, then wherever they are (the biggest piles first).
function takeCoins(char, key, n) {
  const piles = char.items.filter(e => isCoinEntry(e) && e.item.coin === key && coinCounts(char, e))
    .sort((a, b) => (inPurse(char, a) ? 0 : 1) - (inPurse(char, b) ? 0 : 1) || b.qty - a.qty);
  for (const e of piles) {
    if (n <= 0) break;
    const t = Math.min(n, e.qty);
    e.qty -= t;
    n -= t;
  }
  char.items = char.items.filter(e => !(isCoinEntry(e) && e.qty <= 0));
}

// ------------------------------------------------------------------ coins
// By the system's currency (D&D 5e: pp gp ep sp cp; shops pay in gp sp cp). The same as payout,
// pay_coins and receive_coins in server.py and PartyServer.java.

// Greedy split of an amount into the allowed coins.
function coinsFor(amount, allowed) {
  const out = {};
  for (const k of allowed) {
    out[k] = Math.floor(amount / coinValue(k));
    amount -= out[k] * coinValue(k);
  }
  return out;
}

// Coins handed over by a shop: mostly the largest change coins up to `top`, but `margin`% of it
// in the next smaller coin, the way a shopkeeper gives some small change.
function payout(amount, margin = 0, top = changeCoins()[0]) {
  const change = changeCoins();
  const allowed = change.slice(change.indexOf(top));
  const small = Math.floor(amount * margin / 100);
  const main = coinsFor(amount - small, allowed);
  const largest = allowed.find(k => main[k] > 0) || allowed[allowed.length - 1];
  const smaller = change.slice(change.indexOf(largest) + 1);
  const extra = coinsFor(small, smaller.length ? smaller : [largest]);
  return Object.fromEntries(change.map(k => [k, (main[k] || 0) + (extra[k] || 0)]));
}

// Pay `cost` from a purse, spending big coins first without overpaying, then breaking the
// smallest coin that covers the remainder. Returns the new purse, or null if it can't.
function payCoins(coins, cost, margin = 0) {
  if (coinTotalCp(coins) < cost) return null;
  const order = coinOrder(), change = changeCoins();
  const c = { ...coins };
  let remaining = cost;
  for (const d of order) {
    const n = Math.min(c[d] || 0, Math.floor(remaining / coinValue(d)));
    c[d] = (c[d] || 0) - n;
    remaining -= n * coinValue(d);
  }
  if (remaining > 0) {
    const d = [...order].reverse().find(k => c[k] > 0 && coinValue(k) > remaining);
    c[d] -= 1;
    // Change comes in coins smaller than the one broken (with a small-change margin at shops).
    const top = change.find(k => coinValue(k) < coinValue(d));
    for (const [k, n] of Object.entries(payout(coinValue(d) - remaining, margin, top))) c[k] = (c[k] || 0) + n;
  }
  return c;
}

// Add an amount to a purse in change coins (see payout for the margin).
function receiveCoins(coins, amount, margin = 0) {
  const c = { ...coins };
  for (const [k, n] of Object.entries(payout(amount, margin))) c[k] = (c[k] || 0) + n;
  return c;
}

// ------------------------------------------------------------------ formatting

function fmtMod(n) { return (n >= 0 ? "+" : "") + n; }

// "1 entry", "3 entries"
function plural(n, one, many = one + "s") { return `${n.toLocaleString()} ${n === 1 ? one : many}`; }

// "12 gp in coin", or "no coin"
function coinSummary(coins) {
  const cp = coinTotalCp(coins || {});
  return cp ? `${fmtCost(cp)} in coin` : "no coin";
}

// An amount in the coin prices are shown in, else the largest smaller change coin it's a whole
// number of (D&D 5e: "15 gp", "1.5 gp", "5 sp", "7 cp"). Money that isn't decimal (12 pence a
// shilling) shows as coins instead of fractions: "4 sh 2 d".
function fmtCost(cp) {
  if (!cp) return "—";
  const cur = currency(), show = showCoin(cur);
  const below = changeCoins(cur).map(k => cur.coins.find(c => c.key === k)).filter(c => c && c.value < show.value);
  const decimal = below.every(c => Number.isInteger(Math.log10(show.value / c.value)));
  if (!decimal && Number.isInteger(cp) && cp % show.value) {
    let left = cp;
    const parts = [show, ...below].map(c => { const n = Math.floor(left / c.value); left -= n * c.value; return n ? `${n.toLocaleString()} ${c.key}` : ""; });
    return parts.filter(Boolean).join(" ") + (left ? ` ${+left.toFixed(2)} ${below.at(-1)?.key || show.key}` : "");
  }
  if (cp >= show.value) return (cp / show.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " " + show.key;
  const exact = below.find(c => cp >= c.value && cp % c.value === 0);
  if (exact) return (cp / exact.value).toLocaleString() + " " + exact.key;
  const small = below[below.length - 1] || show;
  return +(cp / small.value).toFixed(2) + " " + small.key;
}

// An amount of money, "0 gp" rather than a dash when there's none (purses, tills).
const fmtMoney = cp => cp ? fmtCost(cp) : "0 " + showCoin().key;

function fmtWeight(lb) {
  if (!lb) return "—";
  return +lb.toFixed(2) + " " + weightUnitFor(+lb.toFixed(2));
}

// Simple or martial: a weapon template's category (an item of another template that's also a
// weapon, like spiked armor, has its own kind of category).
const weaponCategory = item => mainFeatures(itemTemplate(item)).includes("weapon") ? item.category : null;

function genericSummary(item) {
  if (hasFeature(item, "holds") && (item.capacity || item.capacityLb)) return item.capacity || `${item.capacityLb} ${weightUnitFor(item.capacityLb)} capacity`;
  if (hasFeature(item, "pack")) return plural((item.contents || []).length, "item");
  const main = mainFeatures(itemTemplate(item)).flatMap(k => featureByKey(k)?.fields || []);
  const vals = main.map(f => [f, fieldDisplay(f, item[f.key])]).filter(([, v]) => v != null && v !== "" && v !== "—").slice(0, 3)
    .map(([f, v]) => `${fieldLabel(f)} ${v}`);
  return [item.category, ...vals].filter(Boolean).join(" · ");
}

// "Martial melee", "Simple ranged", ...
function weaponClass(item) {
  const s = [weaponCategory(item), item.kind && item.kind.toLowerCase()].filter(Boolean).join(" ");
  return s && s[0].toUpperCase() + s.slice(1);
}

// "AC 18 · Str 15 · Stealth disadv.", "AC +2"
function armorSummary(item) {
  if (item.category === "Shield") return `AC +${(item.ac || 2) + (item.bonus || 0)}`;
  return `AC ${(item.ac || 10) + (item.bonus || 0)}${item.dex === "full" ? " + Dex" : item.dex === "max2" ? " + Dex (max 2)" : ""}` +
    (item.strength ? ` · Str ${item.strength}` : "") + (item.stealthDisadvantage ? " · Stealth disadv." : "");
}

// The line under an item's name. D&D 5e's are written for it; any other system's say its category
// and what its template's main features hold ("Weapon · d8 · 1").
function itemSummary(item) {
  if (activeSystem() !== DND5E_SYSTEM) return genericSummary(item);
  // What it mainly is: its template's main feature (spiked armor is armor), else weapon or armor if it's either.
  const main = mainFeatures(itemTemplate(item)).find(k => k === "weapon" || k === "armor");
  const kind = main || (hasFeature(item, "weapon") ? "weapon" : hasFeature(item, "armor") ? "armor" : itemRootId(item));
  switch (kind) {
    case "weapon": {
      const dmg = [item.damage, item.damageType].filter(Boolean).join(" ");
      const bonus = item.bonus ? `+${item.bonus} ` : "";
      return [weaponClass(item), bonus + (dmg || "no damage"), ...(item.properties || [])].filter(Boolean).join(" · ");
    }
    case "armor": return armorSummary(item);
    case "ammunition": return `Bundle of ${item.bundle || 1}`;
    case "container": return item.capacity || (item.capacityLb ? `${item.capacityLb} ${weightUnit()} capacity` : "Container");
    case "tool": return item.category || "Tool";
    case "poison": return item.poisonType || "Poison";
    case "document": {
      const words = wordCount(item.body), pics = docImageRefs(item).size;
      if (item.imageOnly) return [item.category || "Document", item.author && `from ${item.author}`,
        pics ? `${pics} picture${pics === 1 ? "" : "s"}` : "no picture yet"].filter(Boolean).join(" · ");
      return [item.category || "Document", item.author && `from ${item.author}`,
        `${words.toLocaleString()} word${words === 1 ? "" : "s"}`, pics && `${pics} image${pics === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
    }
    case "trinket": return item.table ? `${item.table} · ${item.roll}` : "Trinket";
    case "pack": return plural((item.contents || []).length, "item");
    default: return [item.category, item.rarity].filter(Boolean).join(" · ");
  }
}
