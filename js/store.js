// State, persistence and game-rule calculations.

const STORAGE_KEY = "rpg-inventory-v1";
const COIN_VALUES = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };
const COIN_ORDER = ["pp", "gp", "ep", "sp", "cp"];

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

const kv = {
  remote: false,
  data: {},
  pending: {},
  timer: null,
  client: Math.random().toString(36).slice(2),

  get(key) {
    if (this.remote) return key in this.data ? this.data[key] : null;
    try { return localStorage.getItem(key); } catch { return null; }
  },

  set(key, value) {
    value = String(value);
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

// A character nobody has touched (the blank "Adventurer" every new install starts with).
function isBlankCharacter(c) {
  return !(c.items || []).length && !coinTotalCp(c.coins || {}) && !c.notes && ["Adventurer", "New Character"].includes(c.name);
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
      if (k === STORAGE_KEY || k.startsWith("packrat-")) keys.push(k);
    }
  } catch {
    return; // no browser storage to move
  }
  let moved = 0;
  for (const k of keys) {
    const value = localStorage.getItem(k);
    if (k === STORAGE_KEY) {
      const theirs = kv.get(STORAGE_KEY);
      const mine = JSON.parse(value);
      if (!theirs) {
        mine.characters = (mine.characters || []).filter(c => !isBlankCharacter(c) || mine.characters.length === 1);
        kv.set(k, JSON.stringify(mine));
        moved += mine.characters.filter(c => !isBlankCharacter(c)).length;
      } else {
        const base = JSON.parse(theirs);
        const addById = (list, extra) => {
          for (const x of extra || []) if (!list.some(y => y.id === x.id)) { list.push(x); moved++; }
        };
        addById(base.characters, (mine.characters || []).filter(c => !isBlankCharacter(c)));
        addById(base.customItems = base.customItems || [], mine.customItems);
        addById(base.templates = base.templates || [], mine.templates);
        // A blank starter character is no longer needed once real ones arrive.
        if (base.characters.length > 1) base.characters = base.characters.filter(c => !isBlankCharacter(c));
        if (!base.characters.some(c => c.id === base.activeId)) base.activeId = base.characters[0]?.id;
        kv.set(k, JSON.stringify(base));
      }
    } else if (kv.get(k) == null) {
      kv.set(k, value); // preferences and party identity, unless the PC already has its own
    }
  }
  await moveBrowserImagesToPc();
  await kv.flush();
  try { localStorage.setItem(MOVED_FLAG, new Date().toISOString()); } catch {}
  if (moved) setTimeout(() => toast(`Moved this window's saved characters and items into Pack Rat's data on this ${party.app?.android ? "phone" : "PC"}`), 500);
}

function newCharacter(name) {
  return {
    id: uid(), name: name || "New Character", str: 10, dex: 10, carryMultiplier: 1,
    coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }, items: [], notes: "",
  };
}

function defaultState() {
  const c = newCharacter("Adventurer");
  return {
    version: 1,
    characters: [c],
    activeId: c.id,
    customItems: [],
    templates: STARTER_TEMPLATES.map(t => ({ ...t })),
    settings: { encumbrance: "standard", coinWeight: true },
  };
}

const store = {
  state: null,
  listeners: [],

  load() {
    try {
      const raw = kv.get(STORAGE_KEY);
      this.state = raw ? JSON.parse(raw) : defaultState();
    } catch (e) {
      console.warn("Could not load saved data", e);
      this.state = defaultState();
    }
    if (!this.state.characters.length) this.state.characters.push(newCharacter());
    if (!this.char()) this.state.activeId = this.state.characters[0].id;

    // The characters are always this device's own. In a party, the linked ones are also kept
    // in step with the host (party.link / party.sync).
    if (reclassifyAll({ characters: this.state.characters, shops: this.state.shops })) this.save();
  },

  save() {
    kv.set(STORAGE_KEY, JSON.stringify(this.state));
    party.sync(this.state.characters);
  },

  // Apply a mutation, persist, and re-render.
  update(fn) {
    fn(this.state);
    this.save();
    this.listeners.forEach(l => l());
  },

  subscribe(fn) { this.listeners.push(fn); },

  // The active character; if it's gone (deleted, e.g. in another window), the first one.
  char() { return this.state.characters.find(c => c.id === this.state.activeId) || this.state.characters[0]; },

  catalog() { return [...this.state.customItems, ...SRD_ITEMS]; },

  findItem(id) { return this.state.customItems.find(i => i.id === id) || SRD_BY_ID.get(id); },

  templates() { return [...BUILTIN_TEMPLATES.filter(t => !t.hidden), ...this.state.templates]; },

  template(id) {
    return this.state.templates.find(t => t.id === id) || BUILTIN_TEMPLATES.find(t => t.id === id);
  },
};

const SRD_BY_ID = new Map(SRD_ITEMS.map(i => [i.id, i]));

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
  const now = SRD_BY_ID.get(srcId);
  if (!now || now.type === item.type) return false;
  item.type = now.type;
  for (const k of ["category", "poisonType", "rarity"]) {
    if (now[k] !== undefined) item[k] = now[k]; else delete item[k];
  }
  return true;
}
const SRD_BY_NAME = new Map(SRD_ITEMS.map(i => [i.name, i]));

// ------------------------------------------------------------------ features
// See FEATURES in templates.js. An item's own `features` flags win; otherwise the default for
// its kind: containers hold items (or liquid), packs unpack, paper and books can be written in…
const WRITABLE_NAME = /\b(paper|parchment|book|spellbook|journal|diary|notebook|ledger)\b/i;

function featureDefault(item, key, srcId) {
  const cat = srcId ? SRD_BY_ID.get(srcId) : null;
  const field = k => item[k] !== undefined ? item[k] : cat?.[k]; // older copies: the catalog's fields
  switch (key) {
    case "holds": return item.type === "container" &&
      (field("capacityLb") > 0 || !!item.weightless || !!item.straps || !!field("holds") || srcId === "container-backpack");
    case "liquid": return +field("liquidPints") > 0;
    case "pack": return item.type === "pack";
    case "deck": { const list = field("deckCards"); return Array.isArray(list) && list.length > 0; }
    case "writable": return !item.imageOnly && (item.type === "document" || (!item.card && WRITABLE_NAME.test(item.name || "")));
    case "picture": return !!item.imageOnly;
    case "attunement": return !!item.attunement;
    case "charges": return item.maxCharges > 0;
    case "worn": return !!item.acBonus;
    case "bundle": return item.bundle > 1 || item.type === "ammunition";
  }
  return false;
}

function hasFeature(item, key, srcId) {
  if (!item) return false;
  if (item.features && key in item.features) return !!item.features[key];
  return featureDefault(item, key, srcId);
}

// ------------------------------------------------------------------ inventory

// Inventory entries keep a snapshot of the item so each copy can be edited
// (renamed, enchanted...) without touching the catalog.
// `strapped` = hanging off the outside of `parent` rather than inside it.
function addToInventory(char, item, qty = null, parent = null, strapped = false) {
  qty = qty || item.bundle || 1;
  strapped = !!(parent && strapped);
  const { id, ...snapshot } = item;
  // Decks don't stack: each has its own cards.
  if (deckList(item, id) && qty > 1) {
    let last;
    for (let i = 0; i < qty; i++) last = addToInventory(char, item, 1, parent, strapped);
    return last;
  }
  const stackable = !["weapon", "armor", "container", "magic", "pack"].includes(item.type) && !deckList(item, id)
    && !hasFeature(item, "holds", id) && !hasFeature(item, "pack", id);
  const existing = stackable && char.items.find(e => e.srcId === id && e.parent === parent && !e.customName &&
    !!e.strapped === strapped && JSON.stringify(e.item) === JSON.stringify(snapshot));
  if (existing) {
    existing.qty += qty;
    return existing;
  }
  const entry = { uid: uid(), srcId: id, item: clone(snapshot), qty, equipped: false,
    attuned: false, parent, strapped, notes: "" };
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
  const list = item.deckCards || (srcId && SRD_BY_ID.get(srcId)?.deckCards);
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
    char.items.push({ uid: uid(), srcId: null, item: cardItem(name, noun, image), qty: 1, equipped: false, attuned: false,
      parent: deck.uid, strapped: false, notes: "", fromDeck: deck.uid });
  }
  deck.deckFilled = true;
}

// The cards in a deck, and the ones taken out of it (still carried by this character).
const cardsIn = (char, deck) => char.items.filter(e => e.parent === deck.uid && e.item.card);
const cardsOut = (char, deck) => char.items.filter(e => e.fromDeck === deck.uid && e.parent !== deck.uid);

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
    piece.parent = set.parent;
    piece.strapped = !!set.strapped;
    drawn.push(piece.uid);
  }
  return drawn;
}

// In a deck: kept out of the inventory lists.
function inDeck(char, e) {
  if (!e.item.card || !e.parent) return false;
  const p = char.items.find(x => x.uid === e.parent);
  return !!p && isDeckEntry(p);
}

// ------------------------------------------------------------------ equipment packs
// A pack's contents: [{ name, qty, place? }]. place is where the item goes when unpacked:
// "holder" (the container the rest is packed in), "in" (inside it), "strap" (strapped to its
// outside) or "loose" (on person). Left out, it's worked out: the pack's backpack or chest holds
// everything, with bedrolls, rope, tents and the like strapped to a backpack's side.
const STRAPPABLE = /bedroll|blanket|rope|tent|pole|ladder|shovel|miner's pick|grappling hook|pot, iron|bucket/i;

const PACK_PLACES = [["holder", "Holds the rest"], ["in", "Inside"], ["strap", "Strapped outside"], ["loose", "On person"]];

// Items named in a pack: the player's custom items first, then the catalog.
function findItemByName(name) {
  return store.state?.customItems.find(i => i.name === name) || SRD_BY_NAME.get(name) || null;
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
  const straps = !!holder && (holder.item?.straps || /backpack/i.test(holder.name));
  for (const r of rows) {
    if (r.place === "holder" && r !== holder) r.place = "in"; // only one container holds the rest
    if (!r.place) r.place = !holder ? "loose" : straps && STRAPPABLE.test(r.name) ? "strap" : "in";
  }
  return rows;
}

// Unpack as planned. into: an existing container (uid) to pack into instead of the pack's own;
// parent/strapped: where the pack's container, and anything loose, goes.
function unpackPack(char, rows, { into = null, parent = null, strapped = false } = {}) {
  const holderRow = rows.find(r => r.place === "holder" && r.include && r.item);
  let holderUid = into;
  if (holderRow) {
    // Packing into another container: the pack's own one still comes along, where the pack goes.
    const entry = addToInventory(char, holderRow.item, holderRow.qty, parent, strapped);
    if (!into) holderUid = entry.uid;
  }
  const holder = holderUid && char.items.find(e => e.uid === holderUid);
  for (const r of rows) {
    if (!r.include || !r.item || r === holderRow) continue;
    if (holder && (r.place === "in" || r.place === "strap")) {
      addToInventory(char, r.item, r.qty, holderUid, r.place === "strap" && canStrap(holder));
    } else {
      addToInventory(char, r.item, r.qty, parent, strapped);
    }
  }
}

// What an inventory copy is called: the player's own name for it, else the item's.
const entryName = e => (e.customName || "").trim() || e.item.name;

function removeEntry(char, entryUid) {
  // Contents of a removed container fall out to wherever it was; a deck's cards go with it.
  const entry = char.items.find(e => e.uid === entryUid);
  if (!entry) return;
  if (isDeckEntry(entry)) char.items = char.items.filter(e => !(e.parent === entryUid && e.item.card));
  char.items.forEach(e => { if (e.parent === entryUid) { e.parent = entry.parent; e.strapped = entry.strapped; } });
  char.items = char.items.filter(e => e.uid !== entryUid);
}

// Items that hold gear (containers, not waterskins or vials; or anything given the "holds" feature),
// or that still have something in them.
function holdsItems(char, e) {
  return hasFeature(e.item, "holds", e.srcId) || char.items.some(x => x.parent === e.uid && !x.item.card);
}

// Containers that take only certain things, counted rather than weighed: a map case holds ten
// rolled-up sheets of paper or five of parchment, a quiver twenty arrows. size(item) is how many
// places one of the item takes up (0 = doesn't fit).
const ROLLED_DOCS = ["Letter", "Note", "Scroll", "Map"];
const HOLDERS = {
  scrolls: { label: "Paper, parchment, maps & scrolls", limit: 10, unit: "sheet",
    size: it => hasFeature(it, "holds") ? 0
      : /parchment/i.test(it.name) ? 2
      : (it.type === "document" && ROLLED_DOCS.includes(it.category)) || (it.type === "consumable" && it.category === "Scroll")
        || /\b(paper|map|chart|scroll|letter|deed|sheet)s?\b/i.test(it.name) ? 1 : 0 },
  arrows: { label: "Arrows", limit: 20, unit: "arrow", size: it => it.type === "ammunition" && /arrow/i.test(it.name) ? 1 : 0 },
  bolts: { label: "Crossbow bolts", limit: 20, unit: "bolt", size: it => it.type === "ammunition" && /bolt/i.test(it.name) ? 1 : 0 },
};

// Inventory copies made before a container learnt these fields fall back to the catalog's.
function containerField(e, key) {
  return e.item[key] !== undefined ? e.item[key] : SRD_BY_ID.get(e.srcId)?.[key];
}

function holderSpec(e) {
  if (!hasFeature(e.item, "holds", e.srcId)) return null;
  const key = containerField(e, "holds");
  const spec = HOLDERS[key];
  return spec ? { ...spec, key, limit: e.item.holdLimit || spec.limit } : null;
}

// Places used inside a counted container.
function holderUsed(char, e, spec = holderSpec(e)) {
  return childrenOf(char, e.uid).filter(c => !c.strapped).reduce((s, c) => s + (spec.size(c.item) || 1) * c.qty, 0);
}

// Liquid capacity in pints (0 = not a liquid container).
function liquidCap(e) {
  return hasFeature(e.item, "liquid", e.srcId) ? +containerField(e, "liquidPints") || 0 : 0;
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
  if (e.item.capacityLb > 0 && hasFeature(e.item, "holds", e.srcId)) {
    const w = contentsWeight(char, e);
    return { ratio: w / e.item.capacityLb, over: w > e.item.capacityLb, kind: "gear" };
  }
  const cap = liquidCap(e);
  if (cap) return { ratio: (e.liquid?.pints || 0) / cap, over: false, kind: "liquid" };
  return null;
}

// Backpacks (and custom containers with the option) can have gear strapped to the outside.
// Older inventory copies of the backpack predate the `straps` flag, hence the srcId check.
function canStrap(e) {
  return hasFeature(e.item, "holds", e.srcId) && !!(e.item.straps || e.srcId === "container-backpack");
}

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
function entryOwnWeight(e) {
  return (e.item.weight || 0) * e.qty / (e.item.bundle || 1);
}

function entryValue(e) {
  return (e.item.cost || 0) * e.qty / (e.item.bundle || 1);
}

// Worth including anything inside or strapped to it (containers).
function entryTotalValue(char, e) {
  return entryValue(e) + childrenOf(char, e.uid).reduce((s, c) => s + entryTotalValue(char, c), 0);
}

// Weight including contents (unless the container is weightless).
// Weightless containers only exempt what's inside; strapped-on gear always counts.
function entryTotalWeight(char, e) {
  let w = entryOwnWeight(e);
  for (const c of childrenOf(char, e.uid)) {
    if (c.strapped || !e.item.weightless) w += entryTotalWeight(char, c);
  }
  return w;
}

// Weight inside the container (what counts against its capacity).
function contentsWeight(char, e) {
  return childrenOf(char, e.uid).filter(c => !c.strapped).reduce((s, c) => s + entryTotalWeight(char, c), 0);
}

function strappedWeight(char, e) {
  return childrenOf(char, e.uid).filter(c => c.strapped).reduce((s, c) => s + entryTotalWeight(char, c), 0);
}

function coinCount(coins) { return COIN_ORDER.reduce((s, k) => s + (coins[k] || 0), 0); }
function coinTotalCp(coins) { return COIN_ORDER.reduce((s, k) => s + (coins[k] || 0) * COIN_VALUES[k], 0); }

function carriedWeight(char, settings) {
  let w = childrenOf(char, null).reduce((s, e) => s + entryTotalWeight(char, e), 0);
  if (settings.coinWeight) w += coinCount(char.coins) / 50;
  return w;
}

function encumbrance(char, settings) {
  const str = char.str || 10, mult = char.carryMultiplier || 1;
  const weight = carriedWeight(char, settings);
  const capacity = str * 15 * mult;
  let status = "ok", label = "Unencumbered";
  if (settings.encumbrance === "variant") {
    if (weight > str * 10 * mult) { status = "heavy"; label = "Heavily encumbered (-20 ft, disadv.)"; }
    else if (weight > str * 5 * mult) { status = "warn"; label = "Encumbered (-10 ft speed)"; }
  }
  if (weight > capacity) { status = "over"; label = "Over carrying capacity"; }
  return { weight, capacity, status, label, off: settings.encumbrance === "off" };
}

const mod = score => Math.floor(((score || 10) - 10) / 2);

function armorClass(char) {
  const dex = mod(char.dex);
  const worn = char.items.filter(e => e.equipped);
  const armor = worn.find(e => e.item.type === "armor" && e.item.category !== "Shield");
  const shield = worn.find(e => e.item.type === "armor" && e.item.category === "Shield");
  let ac = 10 + dex, parts = [`10 + Dex ${fmtMod(dex)}`];
  if (armor) {
    const d = armor.item.dex === "full" ? dex : armor.item.dex === "max2" ? Math.min(dex, 2) : 0;
    ac = (armor.item.ac || 10) + d + (armor.item.bonus || 0);
    parts = [`${armor.item.name} ${(armor.item.ac || 10) + (armor.item.bonus || 0)}`];
    if (armor.item.dex !== "none") parts.push(`Dex ${fmtMod(d)}`);
  }
  if (shield) { ac += (shield.item.ac || 2) + (shield.item.bonus || 0); parts.push(`Shield +${(shield.item.ac || 2) + (shield.item.bonus || 0)}`); }
  for (const e of worn) {
    if (e.item.acBonus && (!e.item.attunement || e.attuned)) { ac += e.item.acBonus; parts.push(`${e.item.name} ${fmtMod(e.item.acBonus)}`); }
  }
  const strPenalty = !!(armor && armor.item.strength && (char.str || 10) < armor.item.strength);
  const stealth = worn.some(e => e.item.stealthDisadvantage);
  return { ac, breakdown: parts.join(" + ").replace(/\+ -/g, "- "), strPenalty, stealth };
}

// ------------------------------------------------------------------ attacks

const hasProp = (item, name) => (item.properties || []).some(p => p.toLowerCase().startsWith(name));
const propArg = (item, name) => (item.properties || []).find(p => p.toLowerCase().startsWith(name))?.match(/\(([^)]*)\)/)?.[1];

// Characters are proficient with simple and martial weapons unless told otherwise.
function weaponProficient(char, item) {
  return (char.weaponProfs || ["Simple", "Martial"]).includes(item.category || "Simple");
}

// "1d8" + 3 -> "1d8 + 3"; "1" + 3 -> "4"
function damageText(dice, bonus) {
  if (!dice) return "—";
  if (/^\d+$/.test(dice)) return String(Math.max(0, +dice + bonus));
  return bonus ? `${dice} ${bonus > 0 ? "+" : "−"} ${Math.abs(bonus)}` : dice;
}

// Everything needed to attack with a weapon: to-hit, damage, reach or range.
function weaponAttack(char, item) {
  const str = mod(char.str), dex = mod(char.dex);
  // Finesse uses the better of Str and Dex; ranged weapons use Dex, melee (and thrown melee) Str.
  const ability = hasProp(item, "finesse") ? (dex > str ? "dex" : "str") : item.kind === "Ranged" ? "dex" : "str";
  const abil = ability === "dex" ? dex : str;
  const magic = item.bonus || 0;
  const prof = weaponProficient(char, item);
  const toHit = abil + (prof ? (char.prof ?? 2) : 0) + magic;
  const dmgBonus = abil + magic;
  const type = item.damageType || "";
  const range = propArg(item, "range") || propArg(item, "ammunition")?.replace(/^range\s*/i, "");
  const thrown = propArg(item, "thrown");
  const reach = item.kind === "Ranged" ? null : hasProp(item, "reach") ? 10 : 5;
  const versatile = propArg(item, "versatile");
  return {
    ability, prof, toHit,
    damage: damageText(item.damage, dmgBonus), type,
    twoHanded: versatile && damageText(versatile, dmgBonus),
    // Off-hand (two-weapon fighting): no ability bonus to damage unless it's negative.
    offHand: hasProp(item, "light") && damageText(item.damage, Math.min(0, abil) + magic),
    reach: reach && `${reach} ft`,
    range: (range || thrown) && `${(range || thrown).trim()} ft`,
    thrown: !!thrown,
    ammo: hasProp(item, "ammunition"),
    loading: hasProp(item, "loading"),
  };
}

// Which ammunition a weapon fires (by name); unknown launchers accept any ammunition.
const AMMO_FOR = [[/crossbow/, /bolt/], [/blowgun/, /needle/], [/sling/, /sling|bullet/], [/bow/, /arrow/],
  [/pistol|musket|rifle|gun|revolver/, /bullet|cartridge|shot/]];

function ammoEntries(char, item) {
  const rule = AMMO_FOR.find(([w]) => w.test(item.name.toLowerCase()));
  return char.items.filter(e => e.item.type === "ammunition" && (!rule || rule[1].test(e.item.name.toLowerCase())));
}

// ------------------------------------------------------------------ coins

// Pay `cost` cp from a purse, spending big coins first without overpaying,
// then breaking the smallest coin that covers the remainder. Returns the
// new purse, or null if the character can't afford it.
const PAYOUT_COINS = ["gp", "sp", "cp"];

// Greedy split of copper into the allowed denominations.
function coinsFor(amount, allowed) {
  const out = {};
  for (const k of allowed) {
    out[k] = Math.floor(amount / COIN_VALUES[k]);
    amount -= out[k] * COIN_VALUES[k];
  }
  return out;
}

// Coins handed over by a shop (same as payout() in server.py / PartyServer.java):
// mostly the largest coins up to `top`, but `margin`% of it in the next smaller
// coin, the way a shopkeeper gives some small change.
function payout(amount, margin = 0, top = "gp") {
  const allowed = PAYOUT_COINS.slice(PAYOUT_COINS.indexOf(top));
  const small = Math.floor(amount * margin / 100);
  const main = coinsFor(amount - small, allowed);
  const largest = allowed.find(k => main[k] > 0) || allowed[allowed.length - 1];
  const smaller = PAYOUT_COINS.slice(PAYOUT_COINS.indexOf(largest) + 1);
  const extra = coinsFor(small, smaller.length ? smaller : [largest]);
  return Object.fromEntries(PAYOUT_COINS.map(k => [k, (main[k] || 0) + (extra[k] || 0)]));
}

function payCoins(coins, cost, margin = 0) {
  if (coinTotalCp(coins) < cost) return null;
  const c = { ...coins };
  let remaining = cost;
  for (const d of COIN_ORDER) {
    const n = Math.min(c[d] || 0, Math.floor(remaining / COIN_VALUES[d]));
    c[d] = (c[d] || 0) - n;
    remaining -= n * COIN_VALUES[d];
  }
  if (remaining > 0) {
    const d = [...COIN_ORDER].reverse().find(k => c[k] > 0 && COIN_VALUES[k] > remaining);
    c[d] -= 1;
    // Change comes in coins smaller than the one broken (with a small-change margin at shops).
    const top = PAYOUT_COINS.find(k => COIN_VALUES[k] < COIN_VALUES[d]);
    for (const [k, n] of Object.entries(payout(COIN_VALUES[d] - remaining, margin, top))) c[k] = (c[k] || 0) + n;
  }
  return c;
}

// Add cp to a purse as gp/sp/cp (see payout for the margin).
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

function fmtCost(cp) {
  if (!cp) return "—";
  if (cp >= 100 && cp % 100 === 0) return (cp / 100).toLocaleString() + " gp";
  if (cp >= 100) return (cp / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " gp";
  if (cp >= 10 && cp % 10 === 0) return cp / 10 + " sp";
  return +cp.toFixed(2) + " cp";
}

function fmtWeight(lb) {
  if (!lb) return "—";
  return +lb.toFixed(2) + " lb";
}

// "Martial melee", "Simple ranged", ...
function weaponClass(item) {
  const s = [item.category, item.kind && item.kind.toLowerCase()].filter(Boolean).join(" ");
  return s && s[0].toUpperCase() + s.slice(1);
}

function itemSummary(item) {
  switch (item.type) {
    case "weapon": {
      const dmg = [item.damage, item.damageType].filter(Boolean).join(" ");
      const bonus = item.bonus ? `+${item.bonus} ` : "";
      return [weaponClass(item), bonus + (dmg || "no damage"), ...(item.properties || [])].filter(Boolean).join(" · ");
    }
    case "armor":
      if (item.category === "Shield") return `AC +${(item.ac || 2) + (item.bonus || 0)}`;
      return `AC ${(item.ac || 10) + (item.bonus || 0)}${item.dex === "full" ? " + Dex" : item.dex === "max2" ? " + Dex (max 2)" : ""}` +
        (item.strength ? ` · Str ${item.strength}` : "") + (item.stealthDisadvantage ? " · Stealth disadv." : "");
    case "ammunition": return `Bundle of ${item.bundle || 1}`;
    case "container": return item.capacity || (item.capacityLb ? `${item.capacityLb} lb capacity` : "Container");
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
