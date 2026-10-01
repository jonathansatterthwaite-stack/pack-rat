// Clockwork: Pack Rat's interactive layer. Values, what changes them (rules, controls) and what they
// drive (layers, live icons, panels). See docs/clockwork-plan.md.
//
// Every value has an address, read with clockwork.get(ctx, address), ctx being { char, entry }:
//   item.state.<key>   1 when the item's state is on (the GM's override applied), else 0
//   item.qty  item.equipped  item.charges  item.fill  item.worth  item.weight
//   char.stat.<key>    a system stat          char.carried
//   char.count.<state> items with it on       char.limit.<state>  how many may have it on
//   global.<name>      a Global value: one for the campaign, the same for everyone
//   local.<name>       an item's Local value, else its character's
//   char.local.<name>  a character's Local value
// Built-ins are registered (clockwork.value); a later piece adds a line and everything can read it.
//
// Global and Local values are kept as GM values were, which the party servers check:
//   { party: { gm_<name>: n }, characters: { charId: { … } }, items: { "charId/uid": { … } } }
// so a value's key is "gm_" + its name, and the "party" set holds the Globals. In a party the host
// keeps them (party.gm); outside one, the campaign (its starting values, sent when it's loaded).
// The GM's state overrides are item values named state_<key>: internal, not a name anyone uses.
// Drawn icons read them as global_<name> and local_<name>; older drawings' gm_<name> reads the
// item's, else its character's, else the Global.

const VALUE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const RESERVED_VALUE = /^(state_|gm_|global_|local_)/;
const isValueName = n => typeof n === "string" && VALUE_NAME.test(n) && !RESERVED_VALUE.test(n);
const valueKey = name => "gm_" + name;
const keyName = key => key.replace(/^gm_/, "");

// ------------------------------------------------------------------ where values are kept

const valueSet = () => party.active ? party.gm || {} : store.state.gmValues || {};

// Set (or, with value null, clear) one value by its stored key. scope: "party" (a Global),
// "character" or "item" (Locals); target: "" | charId | "charId/uid".
async function putValue(scope, target, key, value) {
  if (party.active) return party.setGm(scope, target, key, value);
  store.update(s => { s.gmValues = putGmValue(s.gmValues || {}, scope, target, key, value); });
}
const setGlobal = (name, value) => putValue("party", "", valueKey(name), value);
const setLocal = (charId, entryUid, name, value) =>
  entryUid ? putValue("item", `${charId}/${entryUid}`, valueKey(name), value) : putValue("character", charId, valueKey(name), value);

const globalValue = name => valueSet().party?.[valueKey(name)];
const charLocal = (charId, name) => valueSet().characters?.[charId]?.[valueKey(name)];
const itemLocal = (charId, entryUid, name) => valueSet().items?.[`${charId}/${entryUid}`]?.[valueKey(name)];
const localValue = (charId, entryUid, name) => itemLocal(charId, entryUid, name) ?? charLocal(charId, name);

// A stored value where a control (a board's pin) sets it: that level's own, else the levels above.
function valueAt(scope, target, key) {
  const g = valueSet();
  const charId = scope === "item" ? target.split("/")[0] : target;
  for (const level of [scope === "item" && g.items?.[target], scope !== "party" && g.characters?.[charId], g.party]) {
    if (level && key in level) return level[key];
  }
  return undefined;
}

// The values a drawn icon on an item gets: global_<name>, local_<name> (its own, else its
// character's) and the older gm_<name> (its own, its character's, else the Global).
function iconValueVars(charId, entryUid) {
  const g = valueSet(), out = {};
  const put = (bucket, prefix) => { for (const [k, v] of Object.entries(bucket || {})) if (!k.startsWith("gm_state_")) out[prefix + keyName(k)] = v; };
  put(g.party, "global_");
  put(g.party, "gm_");
  put(g.characters?.[charId], "local_");
  put(g.characters?.[charId], "gm_");
  put(g.items?.[`${charId}/${entryUid}`], "local_");
  put(g.items?.[`${charId}/${entryUid}`], "gm_");
  return out;
}

// ------------------------------------------------------------------ addresses

const clockwork = {
  addresses: [], // { pattern: "item.qty" | "item.state.*", label, get(ctx, rest) }
  value(pattern, def) { this.addresses.push({ pattern, ...def }); },
  find(address) {
    for (const a of this.addresses) {
      if (a.pattern === address) return { def: a, rest: "" };
      if (a.pattern.endsWith(".*") && address.startsWith(a.pattern.slice(0, -1))) return { def: a, rest: address.slice(a.pattern.length - 1) };
    }
    return null;
  },
  // A value as a number (yes/no as 1/0); undefined when it doesn't apply or isn't set.
  get(ctx, address) {
    const f = this.find(address);
    if (!f) return undefined;
    let v;
    try { v = f.def.get(ctx || {}, f.rest); } catch { return undefined; }
    return typeof v === "boolean" ? +v : v;
  },
};

const ctxHas = (ctx, ...keys) => keys.every(k => ctx[k]);
clockwork.value("item.state.*", { label: "On when the item is in this state", get: (c, key) => ctxHas(c, "char", "entry") ? stateOn(c.char, c.entry, key) : undefined });
clockwork.value("item.qty", { label: "How many in the stack", get: c => c.entry?.qty });
clockwork.value("item.equipped", { label: "1 when equipped or worn", get: c => c.entry && !!c.entry.equipped });
clockwork.value("item.charges", { label: "Charges left", get: c => {
  if (!c.entry) return undefined;
  const it = currentItem(c.entry, c.char);
  return hasFeature(it, "charges", c.entry.srcId) && it.maxCharges ? c.entry.charges ?? it.maxCharges : undefined;
} });
clockwork.value("item.fill", { label: "How full it is, 0 to 1", get: c => ctxHas(c, "char", "entry") ? fillLevel(c.char, c.entry)?.ratio : undefined });
clockwork.value("item.worth", { label: "Worth, with anything inside", get: c => ctxHas(c, "char", "entry") ? entryTotalValue(c.char, c.entry) : undefined });
clockwork.value("item.weight", { label: "Weight, with anything inside", get: c => ctxHas(c, "char", "entry") ? entryTotalWeight(c.char, c.entry) : undefined });
clockwork.value("char.stat.*", { label: "A character stat", get: (c, key) => c.char ? statsOf(c.char)[key] : undefined });
clockwork.value("char.carried", { label: "Weight carried", get: c => c.char ? carriedWeight(c.char, store.state.settings) : undefined });
clockwork.value("char.count.*", { label: "Items in this state", get: (c, key) => c.char ? stateCount(c.char, key) : undefined });
clockwork.value("char.limit.*", { label: "How many may be in this state", get: (c, key) => c.char ? stateLimit(c.char, stateByKey(key)) ?? undefined : undefined });
clockwork.value("char.local.*", { label: "A character's Local value", get: (c, name) => c.char ? charLocal(c.char.id, name) : undefined });
clockwork.value("local.*", { label: "An item's Local value, else its character's", get: (c, name) => c.char ? localValue(c.char.id, c.entry?.uid, name) : undefined });
clockwork.value("global.*", { label: "A Global value", get: (c, name) => globalValue(name) });

// ------------------------------------------------------------------ what values there are

// The values a drawing uses: declared (with a slider: its default and range) or only in formulas
// (0, from 0 to 1). variable name -> { name, scope: "global" | "local" | "any" (an older gm_ one), spec }.
const DRAWING_VALUE_RE = /\b(gm|global|local)_([A-Za-z][A-Za-z0-9_]*)\b/g;
const DRAWING_SCOPE = { gm: "any", global: "global", local: "local" };
// Cached per saved drawing (they're replaced, not changed, when edited); the editor's own
// document changes as you draw, so it's read fresh (live: true).
const drawingRefsCache = new WeakMap();
function drawingValueRefs(doc, live = false) {
  if (!doc) return new Map();
  const cached = !live && drawingRefsCache.get(doc);
  if (cached) return cached;
  const refs = new Map();
  const add = (varName, prefix, name, spec) => {
    if (!refs.has(varName) && isValueName(name)) refs.set(varName, { varName, name, scope: DRAWING_SCOPE[prefix], spec });
  };
  for (const v of doc?.variables || []) {
    const m = /^(gm|global|local)_([A-Za-z][A-Za-z0-9_]*)$/.exec(v.name || "");
    if (m && !(v.expression || "").trim()) add(v.name, m[1], m[2], v);
  }
  for (const m of drawingFormulas(doc).join(" ").matchAll(DRAWING_VALUE_RE)) {
    add(m[0], m[1], m[2], { name: m[0], value: 0, min: 0, max: 1, step: 0.01 });
  }
  if (!live) drawingRefsCache.set(doc, refs);
  return refs;
}

// The characters the GM looks after: the party's, else this campaign's.
const gmChars = () => party.active ? party.chars : store.state.characters;

// A system's declared values: [{ name, scope: "global" | "local", label, default, min, max, step, choices }].
function cleanValueDecls(list) {
  return (Array.isArray(list) ? list : []).filter(v => v && isValueName(v.name)).slice(0, 100).map(v => {
    const choices = Array.isArray(v.choices) ? v.choices.map(c => String(c).slice(0, 40)).slice(0, 20) : null;
    const num = (x, d) => typeof x === "number" && Number.isFinite(x) ? x : d;
    return { name: v.name, scope: v.scope === "global" ? "global" : "local", label: v.label ? String(v.label).slice(0, 60) : undefined,
      ...(choices?.length ? { choices, default: num(v.default, 0), min: 0, max: choices.length - 1, step: 1 }
        : { default: num(v.default, 0), min: num(v.min, 0), max: num(v.max, 1), step: num(v.step, 0.01) }) };
  });
}

// Every Global and Local value Pack Rat knows of, with its shape: declared by the system, a state's
// limit, used by a drawing (the library, custom items, characters' items), set by a board's pin,
// or just set. "global:name" / "local:name" -> { name, scope, label, value, min, max, step, choices, legacy }.
// An older gm_ value is listed both ways (items use their own, their character's, else the Global).
function knownValues() {
  const out = new Map();
  const add = (scope, name, spec = {}, legacy = false) => {
    if (!isValueName(name)) return;
    for (const s of scope === "any" ? ["global", "local"] : [scope]) {
      const k = `${s}:${name}`, have = out.get(k);
      if (have) { have.legacy ||= legacy; continue; }
      out.set(k, { name, scope: s, label: spec.label, value: spec.default ?? spec.value ?? 0, min: spec.min ?? 0, max: spec.max ?? 1,
        step: spec.step ?? 0.01, choices: spec.choices, legacy });
    }
  };
  for (const v of activeSystem().values || []) add(v.scope, v.name, v);
  for (const st of systemStates()) {
    const name = limitValueName(st);
    if (name) add("local", name, { label: st.limit.label || `${st.label} limit`, default: st.limit.default ?? 0, min: 0, max: 99, step: 1 });
  }
  const docs = [...drawingLibrary().map(d => d.doc), ...store.allCustomItems().map(i => i.iconDoc),
    ...store.state.characters.flatMap(c => c.items.map(e => e.item.iconDoc)), ...(party.active ? party.chars.flatMap(c => c.items.map(e => e.item.iconDoc)) : [])];
  for (const doc of docs) if (doc) for (const r of drawingValueRefs(doc).values()) add(r.scope, r.name, r.spec, r.scope === "any");
  for (const c of store.state.gmControls || []) for (const p of c.pins) {
    [[p.xVar, p.xRange], [p.yVar, p.yRange]].forEach(([n, r]) => n && add(p.scope === "party" ? "global" : "local", n,
      { value: Math.min(...r), min: Math.min(...r), max: Math.max(...r), step: "any" }));
  }
  const g = valueSet();
  for (const k of Object.keys(g.party || {})) add("global", keyName(k));
  for (const b of [...Object.values(g.characters || {}), ...Object.values(g.items || {})]) {
    for (const k of Object.keys(b || {})) if (!k.startsWith("gm_state_")) add("local", keyName(k));
  }
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)));
}

// The name of the Local value holding a state's limit (5e: attuneSlots). Older systems said
// gmValue: "gm_attuneSlots".
const limitValueName = st => st?.limit ? st.limit.value || (st.limit.gmValue || "").replace(/^gm_/, "") || null : null;

// ------------------------------------------------------------------ connections
// What joins an item to Clockwork, for the GM's Clockwork tab and the cog beside its name.

const layerHasContent = L => !!L && Object.entries(L).some(([, v]) => v !== "" && v != null && (typeof v !== "object" || Object.keys(v).length));

function itemConnections(char, e) {
  const it = e.item, ctx = { char, entry: e };
  const triggers = Array.isArray(it.triggers) ? it.triggers : [];
  const layers = systemStates().filter(st => layerHasContent(it.layers?.[st.key]));
  const doc = it.iconDoc, refs = doc ? drawingValueRefs(doc) : new Map();
  const live = !!doc && isLiveDrawing(doc);
  // The states it reacts to (its triggers) and that change it (its layers).
  const stateKeys = new Set(layers.map(st => st.key));
  for (const t of triggers) {
    const m = /^(on|off):(.+)$/.exec(t.on || "");
    if (m) stateKeys.add(m[2]);
    if (t.if?.state) stateKeys.add(t.if.state);
    for (const a of t.do || []) if (a?.set) stateKeys.add(a.set);
  }
  const reads = [
    ...[...stateKeys].filter(stateByKey).map(k => ({ address: `item.state.${k}`, label: stateByKey(k).label, value: clockwork.get(ctx, `item.state.${k}`) })),
    ...[...refs.values()].map(r => ({ address: r.scope === "global" ? `global.${r.name}` : `local.${r.name}`, label: r.varName,
      value: r.scope === "any" ? localValue(char.id, e.uid, r.name) ?? globalValue(r.name) : clockwork.get(ctx, r.scope === "global" ? `global.${r.name}` : `local.${r.name}`),
      fallback: r.spec?.value })),
  ];
  // Set on this item itself: its Locals, and the GM's overrides of its states.
  const own = valueSet().items?.[`${char.id}/${e.uid}`] || {};
  const setHere = Object.entries(own).filter(([k]) => !k.startsWith("gm_state_")).map(([k, v]) => ({ name: keyName(k), value: v }));
  const overrides = Object.entries(own).filter(([k]) => k.startsWith("gm_state_"))
    .map(([k, v]) => ({ state: stateByKey(k.slice(9)), on: !!v })).filter(o => o.state);
  const pins = (store.state.gmControls || []).flatMap(ctl => ctl.pins.filter(p =>
    (p.scope === "item" && p.target === `${char.id}/${e.uid}`) ||
    (p.scope !== "item" && [p.xVar, p.yVar].some(n => n && [...refs.values()].some(r => r.name === n &&
      (p.scope === "party" ? r.scope !== "local" : p.target === char.id && r.scope !== "global")))))
    .map(p => ({ control: ctl, pin: p })));
  return { triggers, layers, refs, live, reads, setHere, overrides, pins,
    uses: triggers.length > 0 || layers.length > 0 || live || refs.size > 0 || setHere.length > 0 || overrides.length > 0 };
}

const usesClockwork = (char, e) => {
  const it = e.item;
  return (it.triggers || []).length > 0 || (!!it.iconDoc && (isLiveDrawing(it.iconDoc) || drawingValueRefs(it.iconDoc).size > 0))
    || systemStates().some(st => layerHasContent(it.layers?.[st.key]))
    || Object.keys(valueSet().items?.[`${char.id}/${e.uid}`] || {}).length > 0;
};

// A trigger in words: "When Attuned turns on, if Identified is off: turn Cursed on. “The ring tightens…”"
function ruleWords(t) {
  const label = k => stateByKey(k)?.label || k;
  const m = /^(on|off):(.+)$/.exec(t.on || "");
  const when = m ? `${label(m[2])} turns ${m[1]}` : { acquired: "it enters the inventory", equipped: "it's equipped", unequipped: "it's unequipped" }[t.on] || t.on;
  const cond = t.if?.state ? `, if ${label(t.if.state)} is ${t.if.is === false ? "off" : "on"}` : "";
  const acts = (t.do || []).filter(a => a?.set).map(a => `turn ${label(a.set)} ${a.to === false ? "off" : "on"}`);
  return `When ${when}${cond}: ${acts.join(", ") || "nothing"}.` + (t.message ? ` “${t.message}”` : "");
}
