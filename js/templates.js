// Item templates, features and colours. The templates themselves come from the campaign's system
// package (js/system.js, js/systems/dnd5e.js) and its rule packages; here are the fields every
// item has, the features any item can have, and how templates become forms and colours.
//
// Field kinds: text, textarea, number, checkbox, select, tags, dice (and the special kinds the item
// form knows: icon, image, cost, markdown, picture, pieces, packContents).

// Every item has these, whatever its template: name, icon, image and cost first, then the
// template's own fields, then weight, the system's common fields, description and source.
const CORE_HEAD = [
  { key: "name", label: "Name", kind: "text", required: true },
  { key: "icon", label: "Icon", kind: "icon" },
  { key: "image", label: "Image", kind: "image" },
  { key: "cost", label: "Cost", kind: "cost" },
];
const WEIGHT_FIELD = { key: "weight", label: "Weight (lb)", kind: "number", step: 0.01 };
const CORE_TAIL = [
  { key: "description", label: "Description", kind: "textarea" },
  { key: "source", label: "Source", kind: "text", placeholder: "Homebrew" },
];
const CORE_FIELD_KEYS = new Set([...CORE_HEAD, WEIGHT_FIELD, ...CORE_TAIL].map(f => f.key));

// ------------------------------------------------------------------ features
// What an item can do, whatever its template: hold other items, hold liquid, unpack into items,
// hold cards, be written in… Each is a checkbox when editing an item, and its fields only show while
// it's ticked. A template says which features its items start with (a "main" one's fields show with
// the template's own); an item says only where it differs, in `features` ({ holds: true, deck: false }).
// See featureDefault in store.js. A feature with a `flag` is that yes/no field of the item itself
// (imageOnly; 5e's attunement). Two features that `exclude` each other can't both be ticked. Systems
// add features of their own (D&D 5e: Weapon, Armor, Ammunition, Attunement).
const CORE_FEATURES = [
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
  { key: "equippable", label: "Equippable", hint: "Can be equipped, or worn.", fields: [] },
  { key: "stacks", label: "Stacks", hint: "Identical copies share one row with a count (5 rations), rather than a row each.", fields: [
    { key: "countInPlay", label: "Counts up and down in Play mode (ammunition, rations, potions…)", kind: "checkbox" },
  ] },
  { key: "charges", label: "Charges", hint: "Has charges that get used up and recharge.", fields: [
    { key: "maxCharges", label: "Max charges", kind: "number" },
    { key: "recharge", label: "Recharge", kind: "text", placeholder: "1d6+1 at dawn" },
  ] },
  { key: "bundle", label: "Bundle", hint: "Sold in bundles (like 20 arrows): cost and weight are per bundle.", fields: [
    { key: "bundle", label: "Bundle size", kind: "number", min: 1 },
  ] },
];

// Every field that belongs to a feature (the item form shows them with it).
const featureFieldKeys = () => new Set(allFeatures().flatMap(f => f.fields.map(x => x.key)));

// The features a template's items start with, and the "main" ones (their fields show in the form itself).
const templateFeatureDefaults = tpl => tpl?.features || {};
const mainFeatures = tpl => Object.entries(templateFeatureDefaults(tpl)).filter(([, v]) => v === "main").map(([k]) => k);

// ------------------------------------------------------------------ forms

// A template's category list as a field.
function categoryField(tpl) {
  if (!tpl.categories?.length) return null;
  return { key: "category", label: tpl.categoryLabel || "Category", kind: "select", options: tpl.categories, segmented: !!tpl.categorySegmented };
}

// Every field of an item made with a template, in order: name, icon, image and cost; its category;
// its main features' fields; its own fields; weight; the system's common fields; description, source.
function templateFields(tpl) {
  const main = mainFeatures(tpl).flatMap(k => featureByKey(k)?.fields || []);
  // Fields of the other features show with their feature (under Features), not here.
  const seen = new Set([...featureFieldKeys()].filter(k => !main.some(f => f.key === k)));
  const tail = CORE_TAIL.filter(f => !(tpl.hide || []).includes(f.key));
  return [...CORE_HEAD, categoryField(tpl), ...main, ...(tpl.fields || []), WEIGHT_FIELD, ...(activeSystem().commonFields || []), ...tail]
    .filter(f => f && !seen.has(f.key) && seen.add(f.key));
}

// A field's label, in the system's weight unit ("Weight (lb)", "Capacity (kg)").
function fieldLabel(f) {
  return f.label.replace("(lb)", `(${weightUnit()})`);
}

// ------------------------------------------------------------------ groups & colours
// Groups are what the filters, tabs and colours show. A group can hold several templates (Gear &
// Tools). Every group, and every custom template, has a hue; its subcategories are shades of it:
// the templates of a combined group, or the categories of a single template (Light / Medium /
// Heavy armor).

// A hue chosen in the app (Catalog → Templates → Colour), else the group's default.
function groupHue(groupId) {
  const chosen = typeof store !== "undefined" ? store.state?.settings?.groupHues?.[groupId] : undefined;
  return chosen ?? groupById(groupId)?.hue ?? 0;
}

// The built-in template an item comes from (copies count as their original).
const itemRootId = it => rootTemplate(itemTemplate(it))?.id;

// The subcategories of a group: its templates if it combines several, else the template's categories.
function subcategories(groupId) {
  const g = groupById(groupId);
  if (!g) return [];
  const tpls = groupTemplates(g);
  if (tpls.length > 1) return tpls.flatMap(t => {
    const split = g.split?.[t.id];
    if (!split) return [{ key: t.id, label: templatePlural(t), match: it => itemRootId(it) === t.id }];
    // Some categories of this template get their own subcategory; the rest share one.
    const cats = Object.keys(split).filter(c => c !== "rest");
    return [...cats.map(c => ({ key: `${t.id}:${c}`, label: split[c], match: it => itemRootId(it) === t.id && it.category === c })),
      { key: t.id, label: split.rest, match: it => itemRootId(it) === t.id && !cats.includes(it.category) }];
  });
  return templateSubcategories(tpls[0] || {});
}

// A template's categories as subcategories (shades of its colour).
function templateSubcategories(tpl) {
  return (tpl.categories || []).filter(Boolean).map(c => ({ key: c, label: c, match: it => it.category === c }));
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

// Sort position of an item: by group, then its template's place in the group.
function templateOrder(item) {
  const root = rootTemplate(itemTemplate(item)), g = groupOfTemplate(root);
  return systemGroups().indexOf(g) * 100 + Math.max(0, (g?.templates || []).indexOf(root?.id));
}

// A template's own hue: its own (custom templates), else its group's.
const templateHue = tpl => tpl.hue ?? groupHue(groupOfTemplate(tpl)?.id);

// A template's colour: a built-in one's shade within its group (if the group combines several),
// else the group colour; a custom template's own hue.
function templateColor(tpl) {
  if (!isSystemTemplate(tpl)) return shade(templateHue(tpl));
  const g = groupOfTemplate(tpl);
  if (!g || groupTemplates(g).length < 2) return groupColor(g?.id);
  const subs = subcategories(g.id);
  return shade(groupHue(g.id), subs.findIndex(s => s.key === tpl.id), subs.length);
}

// The colour an item shows (icon, tile edge): its template's hue (custom templates) or its
// group's, in the shade of its subcategory.
function itemColor(item) {
  const tpl = itemTemplate(item);
  if (!isSystemTemplate(tpl)) {
    const subs = templateSubcategories(tpl);
    return shade(templateHue(tpl), subs.findIndex(s => s.match(item)), subs.length);
  }
  const g = groupOfTemplate(tpl);
  const subs = subcategories(g?.id);
  return shade(groupHue(g?.id), subs.findIndex(s => s.match(item)), subs.length);
}
