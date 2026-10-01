// System packages: what makes Pack Rat a D&D 5e inventory, or any other game's.
//
// Each campaign plays one system (campaign.system): the built-in D&D 5e one (js/systems/dnd5e.js)
// or one imported from a file (store.data.systems). The system supplies the item templates,
// their groups, the features only it has, fields all its templates share, its catalog and its
// roll tables. Rule packages (custom items and templates) add to it, per campaign.
//
// Templates have one shape, built-in or yours:
//   { id, name, plural?, group, hue?, icon?, categories?, categoryLabel?, categorySegmented?,
//     fields?: [field], features?: { key: true | "main" | false }, defaults?: {...}, hide?: [fieldKey],
//     from?: templateId (the template it started as a copy of) }
// An item made from one has `type` = the template's id (older items: `template`, with `type` the
// built-in it extended).

const BUILTIN_SYSTEMS = [DND5E_SYSTEM];
const DEFAULT_SYSTEM = DND5E_SYSTEM.id;

function systems() { return [...BUILTIN_SYSTEMS, ...(store.data?.systems || [])]; }
function systemById(id) { return systems().find(s => s.id === id); }

// The system of the campaign being played (D&D 5e when none is set, or it's gone).
function activeSystem() {
  const id = store.data ? store.campaign()?.system : null;
  return (id && systemById(id)) || DND5E_SYSTEM;
}

// Lookups for a system, worked out once per system.
const systemIndexes = new WeakMap();
function systemIndex(sys = activeSystem()) {
  let ix = systemIndexes.get(sys);
  if (!ix) {
    const templates = sys.templates || [];
    ix = {
      templates: new Map(templates.map(t => [t.id, t])),
      groups: new Map((sys.groups || []).map(g => [g.id, g])),
      catalog: new Map((sys.catalog || []).map(i => [i.id, i])),
      byName: new Map((sys.catalog || []).map(i => [i.name, i])),
      features: new Map((sys.features || []).map(f => [f.key, f])),
    };
    systemIndexes.set(sys, ix);
  }
  return ix;
}

// ------------------------------------------------------------------ templates

const systemTemplates = () => activeSystem().templates || [];

// A template by id: one of the rule packages' (any package, so an item keeps its fields if the
// package is switched off), else the system's.
function templateById(id) {
  if (!id) return null;
  return (store.data && store.allTemplates().find(t => t.id === id)) || systemIndex().templates.get(id) || null;
}

const isSystemTemplate = tpl => !!tpl && systemIndex().templates.get(tpl.id) === tpl;

// The template an item was made from. Older copies made from a custom template say so in
// `template`; others' `type` is their template.
function itemTemplate(item) {
  return templateById(item?.template) || templateById(item?.type)
    || systemIndex().templates.get("gear") || systemTemplates()[0] || { id: "item", name: "Item", group: "", features: {} };
}

// The built-in template a template descends from (copies remember theirs in `from`).
function rootTemplate(tpl) {
  for (let t = tpl, n = 0; t && n < 10; n++) {
    if (isSystemTemplate(t)) return t;
    t = templateById(t.from);
  }
  return tpl;
}

const templatePlural = tpl => tpl.plural || tpl.name;

// ------------------------------------------------------------------ groups

const systemGroups = () => activeSystem().groups || [];
const groupById = id => systemIndex().groups.get(id);
const groupOfTemplate = tpl => groupById(tpl?.group) || groupById(rootTemplate(tpl)?.group) || systemGroups()[0];
const groupOfItem = item => groupOfTemplate(itemTemplate(item));
// The system templates a group lists, in order.
const groupTemplates = g => (g.templates || []).map(id => systemIndex().templates.get(id)).filter(t => t && !t.hidden);

// ------------------------------------------------------------------ features and catalog

// Every feature an item can have: the core ones and the system's own.
const allFeatures = () => [...CORE_FEATURES, ...(activeSystem().features || [])];
const featureByKey = key => CORE_FEATURES.find(f => f.key === key) || systemIndex().features.get(key);

// A catalog item by id (older inventory copies take missing fields from it).
const catalogItem = id => id ? systemIndex().catalog.get(id) : undefined;

// ------------------------------------------------------------------ older custom templates

// Templates made before standardising extended a built-in "base type" and added fields. They become
// complete templates: a copy of that built-in with the extra fields (nothing about their items changes).
function standardiseTemplate(tpl, sys = DND5E_SYSTEM) {
  if (!tpl || !tpl.type || tpl.group) return tpl;
  const base = systemIndex(sys).templates.get(tpl.type) || systemIndex(sys).templates.get("gear");
  const { type, color, shade, builtin, ...rest } = tpl;
  return {
    ...rest,
    group: base.group,
    from: base.id,
    icon: base.icon,
    categories: base.categories, categoryLabel: base.categoryLabel, categorySegmented: base.categorySegmented,
    hide: base.hide,
    features: { ...(base.features || {}) },
    fields: [...(base.fields || []), ...(tpl.fields || [])],
    defaults: { ...(base.defaults || {}), ...(tpl.defaults || {}) },
  };
}

function standardiseTemplates(data) {
  for (const p of data.packages || []) p.templates = (p.templates || []).map(t => standardiseTemplate(t));
}

// ------------------------------------------------------------------ system files

// A system as a file: everything, its catalog included (the built-in one's comes from srd-data.js).
function systemFile(sys) {
  const { builtin, ...rest } = sys;
  return { ...rest, catalog: sys.catalog || [], tables: sys.tables || [], glossary: sys.glossary || {} };
}

// Check an imported system has what Pack Rat needs, and fill in the rest.
function cleanSystem(raw) {
  if (!raw || raw.packrat !== "system" || typeof raw.id !== "string" || !raw.id) throw new Error("Not a Pack Rat system file");
  if (BUILTIN_SYSTEMS.some(s => s.id === raw.id)) throw new Error(`${raw.name || raw.id} is built in: give your version an id of its own`);
  const templates = (Array.isArray(raw.templates) ? raw.templates : []).filter(t => t && typeof t.id === "string" && t.name);
  if (!templates.length) throw new Error("A system needs at least one template");
  let groups = (Array.isArray(raw.groups) ? raw.groups : []).filter(g => g && typeof g.id === "string" && g.name);
  if (!groups.length) groups = [{ id: "items", name: "Items", hue: 210, templates: templates.map(t => t.id) }];
  for (const t of templates) if (!groups.some(g => g.id === t.group)) t.group = groups[0].id;
  return {
    packrat: "system", id: raw.id, name: String(raw.name || raw.id), version: raw.version || 1, description: raw.description || "",
    groups, templates,
    commonFields: Array.isArray(raw.commonFields) ? raw.commonFields : [],
    features: (Array.isArray(raw.features) ? raw.features : []).filter(f => f && f.key && !CORE_FEATURES.some(c => c.key === f.key))
      .map(f => ({ ...f, fields: Array.isArray(f.fields) ? f.fields : [] })),
    starterTemplates: Array.isArray(raw.starterTemplates) ? raw.starterTemplates : [],
    catalog: (Array.isArray(raw.catalog) ? raw.catalog : []).filter(i => i && i.id && i.name),
    tables: Array.isArray(raw.tables) ? raw.tables : [],
    glossary: raw.glossary && typeof raw.glossary === "object" ? raw.glossary : {},
  };
}
