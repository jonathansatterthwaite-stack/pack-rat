// Item templates. A template is a named set of fields; every item has a
// `type` (which drives app behaviour: AC, containers, bundles...) and may
// have a `template` pointing at a user template that adds extra fields.
//
// Field kinds: text, textarea, number, checkbox, select, tags, dice

const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
  "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

const RARITIES = ["", "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];

// Shown for every item regardless of type.
const COMMON_FIELDS = [
  { key: "name", label: "Name", kind: "text", required: true },
  { key: "icon", label: "Icon", kind: "icon" },
  { key: "image", label: "Image", kind: "image" },
  { key: "cost", label: "Cost", kind: "cost" },
  { key: "weight", label: "Weight (lb)", kind: "number", step: 0.01 },
  { key: "rarity", label: "Rarity", kind: "select", options: RARITIES },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "source", label: "Source", kind: "text", placeholder: "Homebrew" },
];

const BUILTIN_TEMPLATES = [
  {
    id: "weapon", type: "weapon", name: "Weapon", color: "#e2694f", builtin: true,
    fields: [
      { key: "category", label: "Simple or martial", kind: "select", options: ["Simple", "Martial"], segmented: true },
      { key: "kind", label: "Melee or ranged", kind: "select", options: ["Melee", "Ranged"], segmented: true },
      { key: "damage", label: "Damage dice", kind: "dice", placeholder: "1d8" },
      { key: "damageType", label: "Damage type", kind: "select", options: ["", ...DAMAGE_TYPES] },
      { key: "properties", label: "Properties", kind: "tags",
        suggestions: ["Ammunition", "Finesse", "Heavy", "Light", "Loading", "Range (80/320)", "Reach",
          "Special", "Thrown (20/60)", "Two-handed", "Versatile (1d10)"] },
      { key: "bonus", label: "Magic bonus (+N)", kind: "number" },
    ],
  },
  {
    id: "armor", type: "armor", name: "Armor", color: "#5b8def", builtin: true,
    fields: [
      { key: "category", label: "Category", kind: "select", options: ["Light", "Medium", "Heavy", "Shield"] },
      { key: "ac", label: "Base AC (shield: bonus)", kind: "number" },
      { key: "dex", label: "Dex modifier", kind: "select", options: ["full", "max2", "none"],
        labels: { full: "Full Dex", max2: "Dex (max 2)", none: "No Dex" } },
      { key: "strength", label: "Strength required", kind: "number" },
      { key: "stealthDisadvantage", label: "Stealth disadvantage", kind: "checkbox" },
      { key: "bonus", label: "Magic bonus (+N)", kind: "number" },
    ],
  },
  {
    id: "ammunition", type: "ammunition", name: "Ammunition", color: "#c7925a", builtin: true,
    fields: [
      { key: "bonus", label: "Magic bonus (+N)", kind: "number" },
    ],
  },
  {
    id: "gear", type: "gear", name: "Adventuring Gear", color: "#8fa85a", builtin: true,
    fields: [
      { key: "category", label: "Category", kind: "select",
        options: ["Common", "Usable", "Clothes", "Arcane Focus", "Druidic Focus", "Holy Symbol", "Other"] },
    ],
  },
  {
    id: "container", type: "container", name: "Container", color: "#b98a4a", builtin: true,
    fields: [],
  },
  {
    id: "tool", type: "tool", name: "Tool", color: "#6fb3a8", builtin: true,
    fields: [
      { key: "category", label: "Category", kind: "select",
        options: ["Artisan's Tools", "Gaming Set", "Musical Instrument", "Other"] },
    ],
  },
  {
    id: "poison", type: "poison", name: "Poison", color: "#9b6fd0", builtin: true,
    fields: [
      { key: "poisonType", label: "Poison type", kind: "select", options: ["Contact", "Ingested", "Inhaled", "Injury"] },
      { key: "saveDC", label: "Save DC", kind: "number" },
      { key: "effect", label: "Effect", kind: "textarea" },
    ],
  },
  {
    id: "consumable", type: "consumable", name: "Consumable", color: "#e0a93b", builtin: true,
    fields: [
      { key: "category", label: "Category", kind: "select", options: ["Potion", "Scroll", "Food", "Alchemical", "Other"] },
      { key: "effect", label: "Effect", kind: "textarea" },
    ],
  },
  {
    id: "magic", type: "magic", name: "Magic Item", color: "#d05fa0", builtin: true,
    fields: [
      { key: "category", label: "Category", kind: "select",
        options: ["Wondrous Item", "Ring", "Rod", "Staff", "Wand", "Other"] },
    ],
  },
  {
    id: "trinket", type: "trinket", name: "Trinket", color: "#a0a0a0", builtin: true,
    fields: [],
  },
  {
    id: "treasure", type: "treasure", name: "Treasure / Valuable", color: "#e8c44a", builtin: true,
    fields: [
      { key: "category", label: "Category", kind: "select", options: ["Gem", "Art Object", "Trade Good", "Other"] },
    ],
  },
  {
    id: "document", type: "document", name: "Document", color: "#2f9e8f", builtin: true,
    defaults: { weight: 0 },
    fields: [
      { key: "category", label: "Kind", kind: "select", options: ["Letter", "Note", "Book", "Journal", "Scroll", "Map", "Other"] },
    ],
  },
  {
    id: "pack", type: "pack", name: "Equipment Pack", color: "#7a8c99", builtin: true,
    fields: [],
  },
];

// ------------------------------------------------------------------ features
// What an item can do, whatever its type: hold other items, hold liquid, unpack into items, hold
// cards, be written in… Each is a checkbox when editing an item, and its fields only show while
// it's ticked. Items say which they have in `features` ({ holds: true, deck: false }); anything
// not listed follows the default for that kind of item (featureDefault in store.js). A feature with
// a `flag` is that yes/no field of the item itself (attunement, imageOnly). Two features that
// `exclude` each other can't both be ticked.
const FEATURES = [
  { key: "holds", label: "Container", hint: "Other items go inside it. Set how much it holds, whether gear can be strapped outside, or that it only holds certain things.", fields: [
    { key: "capacity", label: "Capacity (text)", kind: "text", placeholder: "1 cubic foot/30 pounds of gear" },
    { key: "capacityLb", label: "Capacity (lb)", kind: "number" },
    { key: "weightless", label: "Contents don't add weight (e.g. Bag of Holding)", kind: "checkbox" },
    { key: "straps", label: "Gear can be strapped to the outside", kind: "checkbox" },
    { key: "holds", label: "Only holds (counted)", kind: "select", options: ["", "scrolls", "arrows", "bolts"],
      labels: { "": "Anything, by weight", scrolls: "Paper, parchment, maps & scrolls", arrows: "Arrows", bolts: "Crossbow bolts" } },
    { key: "holdLimit", label: "How many it holds (counted)", kind: "number", placeholder: "20" },
  ] },
  { key: "liquid", label: "Liquid", hint: "Holds a liquid: record what's in it and how much.", fields: [
    { key: "liquidPints", label: "Liquid capacity (pints)", kind: "number", step: "any" },
  ] },
  { key: "deck", label: "Set", hint: "Made of pieces kept together, like the cards of a deck or the pieces of a chess set. They don't clutter the inventory; take them out (or draw one at random) and put them back.", fields: [
    { key: "pieceName", label: "One piece is called", kind: "text", placeholder: "card, piece, tile…" },
    { key: "deckCards", label: "Pieces", kind: "pieces" },
  ] },
  { key: "pack", label: "Pack", hint: "An equipment pack: unpacks into the items listed, packed the way you choose.", fields: [
    { key: "contents", label: "Contents", kind: "packContents" },
  ] },
  { key: "writable", label: "Writing", hint: "Can be written in and read: paper, books, letters, journals.", excludes: "picture", fields: [
    { key: "author", label: "Author / from", kind: "text", placeholder: "e.g. Captain Varra" },
    { key: "body", label: "Text", kind: "markdown" },
  ] },
  { key: "picture", label: "Picture", hint: "Just an image (a map, a portrait, a sketch), viewed full screen with zoom.", flag: "imageOnly", excludes: "writable", fields: [
    { key: "body", label: "Picture", kind: "picture" },
  ] },
  { key: "charges", label: "Charges", hint: "Has charges that get used up and recharge.", fields: [
    { key: "maxCharges", label: "Max charges", kind: "number" },
    { key: "recharge", label: "Recharge", kind: "text", placeholder: "1d6+1 at dawn" },
  ] },
  { key: "attunement", label: "Attunement", hint: "Requires attunement to use (a character can attune to 3 items).", flag: "attunement", fields: [] },
  { key: "worn", label: "Armor bonus", hint: "Adds to Armor Class while worn.", fields: [
    { key: "acBonus", label: "AC bonus while worn", kind: "number" },
  ] },
  { key: "bundle", label: "Bundle", hint: "Sold in bundles (like 20 arrows): cost and weight are per bundle.", fields: [
    { key: "bundle", label: "Bundle size", kind: "number", min: 1 },
  ] },
];
const FEATURE_FIELD_KEYS = new Set(FEATURES.flatMap(f => f.fields.map(x => x.key)));

const TYPE_LABELS = Object.fromEntries(BUILTIN_TEMPLATES.map(t => [t.id, t.name]));
// For lists and filters ("Tools", not "Tool").
const TYPE_PLURALS = {
  weapon: "Weapons", armor: "Armor", ammunition: "Ammunition", gear: "Adventuring gear", container: "Containers",
  tool: "Tools", poison: "Poisons", consumable: "Potions & supplies", magic: "Magic items", trinket: "Trinkets",
  treasure: "Treasure", document: "Documents", pack: "Equipment packs",
};

// ------------------------------------------------------------------ groups & colours
// Groups are what the filters, tabs and colours show. Several base types can share a group
// (their behaviour stays their own). Every group, and every custom template, has a hue.
// Its subcategories are shades of that hue: the types in a combined group (Gear / Tools),
// or the categories of a single type (Light / Medium / Heavy armor).

const TYPE_GROUPS = [
  { id: "weapon", name: "Weapons", types: ["weapon"], hue: 5 },
  { id: "armor", name: "Armor", types: ["armor"], hue: 225 },
  { id: "gear", name: "Gear & Tools", types: ["gear", "tool", "pack"], hue: 95 },
  { id: "consumable", name: "Consumables", types: ["consumable", "ammunition", "poison"], hue: 268 },
  { id: "container", name: "Containers", types: ["container"], hue: 28 },
  { id: "magic", name: "Magic Items", types: ["magic"], hue: 318 },
  // Treasure is split by category: gemstones and trade goods get their own subcategories.
  { id: "treasure", name: "Treasure & Trinkets", types: ["treasure", "trinket"], hue: 48,
    split: { treasure: { Gem: "Gemstones", "Trade Good": "Trade goods", rest: "Other valuables" } } },
  { id: "document", name: "Documents", types: ["document"], hue: 165 },
];
const GROUP_BY_ID = Object.fromEntries(TYPE_GROUPS.map(g => [g.id, g]));
const GROUP_OF = Object.fromEntries(TYPE_GROUPS.flatMap(g => g.types.map(t => [t, g.id])));
const groupOf = type => GROUP_BY_ID[GROUP_OF[type]] || GROUP_BY_ID.gear;

// A hue chosen in the app (Custom → Templates → Colour), else the group's default.
function groupHue(groupId) {
  const chosen = typeof store !== "undefined" ? store.state?.settings?.groupHues?.[groupId] : undefined;
  return chosen ?? GROUP_BY_ID[groupId]?.hue ?? 0;
}

// The subcategories of a group: its types if it combines several, else the type's categories.
function subcategories(groupId) {
  const g = GROUP_BY_ID[groupId];
  if (!g) return [];
  if (g.types.length > 1) return g.types.flatMap(t => {
    const split = g.split?.[t];
    if (!split) return [{ key: t, label: TYPE_PLURALS[t] || TYPE_LABELS[t], match: it => it.type === t }];
    // Some categories of this type get their own subcategory; the rest share one.
    const cats = Object.keys(split).filter(c => c !== "rest");
    return [...cats.map(c => ({ key: `${t}:${c}`, label: split[c], match: it => it.type === t && it.category === c })),
      { key: t, label: split.rest, match: it => it.type === t && !cats.includes(it.category) }];
  });
  const field = BUILTIN_TEMPLATES.find(t => t.id === g.types[0])?.fields.find(f => f.key === "category" && f.options);
  return (field?.options || []).filter(Boolean).map(c => ({ key: c, label: c, match: it => it.category === c }));
}

// Custom templates: shades by the base type's categories.
function templateSubcategories(tpl) {
  const field = BUILTIN_TEMPLATES.find(t => t.id === tpl.type)?.fields.find(f => f.key === "category" && f.options);
  return (field?.options || []).filter(Boolean).map(c => ({ key: c, label: c, match: it => it.category === c }));
}

// Shade i of n. Neighbours contrast rather than forming a gradient: lightness levels are dealt
// out alternately from the lighter and darker halves (for 4: 2nd lightest, darkest, lightest,
// 2nd darkest), saturation alternates high/low, and the hue leans a few degrees either way.
// Lightness stays between 34% and 66% so icons read in light and dark mode.
function shadeLevels(n) {
  const half = Math.ceil(n / 2), order = [];
  for (let k = 0; k < half; k++) {
    order.push(half - 1 - k);
    if (n - 1 - k >= half) order.push(n - 1 - k);
  }
  return order;
}

function shade(hue, i = -1, n = 1) {
  if (i < 0 || n < 2) return `hsl(${hue} 62% 50%)`;
  const level = shadeLevels(n)[i];
  const l = 66 - level * (32 / (n - 1));
  const s = i % 2 ? 46 : 76;
  const h = (hue + (i % 2 ? 7 : -7) + 360) % 360;
  return `hsl(${h} ${s}% ${Math.round(l)}%)`;
}

const groupColor = groupId => shade(groupHue(groupId));

// Sort position of a type: by group, then its place within the group.
const typeOrder = type => { const g = groupOf(type); return TYPE_GROUPS.indexOf(g) * 10 + g.types.indexOf(type); };

// A type's own colour: its shade within a combined group, else the group colour.
function typeColor(type) {
  const g = groupOf(type);
  if (g.types.length < 2) return groupColor(g.id);
  const subs = subcategories(g.id);
  return shade(groupHue(g.id), subs.findIndex(s => s.key === type), subs.length);
}

const templateHue = tpl => tpl.hue ?? groupHue(groupOf(tpl.type).id);
function templateColor(tpl) {
  return tpl.builtin ? typeColor(tpl.type) : shade(templateHue(tpl));
}

// The colour an item shows (icon, tile edge): its template's hue (custom templates) or its
// group's, in the shade of its subcategory.
function itemColor(item) {
  const tpl = item.template && typeof store !== "undefined" && store.template(item.template);
  if (tpl && !tpl.builtin) {
    const subs = templateSubcategories(tpl);
    return shade(templateHue(tpl), subs.findIndex(s => s.match(item)), subs.length);
  }
  const g = groupOf(item.type);
  const subs = subcategories(g.id);
  return shade(groupHue(g.id), subs.findIndex(s => s.match(item)), subs.length);
}

// Starter user templates, created on first run so people can see how
// custom templates extend a base type.
const STARTER_TEMPLATES = [
  {
    id: "tpl-spell-scroll", type: "consumable", name: "Spell Scroll", color: "#e0a93b",
    fields: [
      { key: "spell", label: "Spell", kind: "text" },
      { key: "spellLevel", label: "Spell level", kind: "select", options: ["Cantrip", "1", "2", "3", "4", "5", "6", "7", "8", "9"] },
      { key: "saveDC", label: "Save DC", kind: "number" },
      { key: "attackBonus", label: "Attack bonus", kind: "number" },
    ],
    defaults: { category: "Scroll", weight: 0 },
  },
  {
    id: "tpl-gemstone", type: "treasure", name: "Gemstone", color: "#e8c44a",
    fields: [
      { key: "gemValue", label: "Gem tier", kind: "select", options: ["10 gp", "50 gp", "100 gp", "500 gp", "1000 gp", "5000 gp"] },
      { key: "gemColor", label: "Color", kind: "text" },
    ],
    defaults: { category: "Gem", weight: 0 },
  },
];

// Returns the full field list for a template (common + base type + extras).
function templateFields(tpl) {
  const base = BUILTIN_TEMPLATES.find(t => t.id === tpl.type) || BUILTIN_TEMPLATES.find(t => t.id === "gear");
  const extra = tpl.builtin ? [] : tpl.fields || [];
  const seen = new Set();
  // Name/cost/weight first, then the type's own fields, then rarity, description, etc.
  let [head, tail] = [COMMON_FIELDS.slice(0, 4), COMMON_FIELDS.slice(4)];
  // A document's text is its body; a separate description would just be confusing.
  if (tpl.type === "document") tail = tail.filter(f => f.key !== "description");
  // Fields that belong to a feature are shown with it instead (see FEATURES).
  return [...head, ...base.fields, ...extra, ...tail].filter(f => !FEATURE_FIELD_KEYS.has(f.key) && !seen.has(f.key) && seen.add(f.key));
}
