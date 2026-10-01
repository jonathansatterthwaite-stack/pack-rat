// The built-in system package: D&D 5e, with the System Reference Document 5.1's equipment.
//
// A system package says what a game's items are: its templates (each with its fields, categories,
// group and the features it starts with), its groups (what the filters and colours show), the
// features only it has (here: Weapon, Armor, Ammunition), fields every template of it shares,
// its catalog and its roll tables. See js/system.js. Packages from files have the same shape.
// (Later releases add terminology, money and panels.)

const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
  "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

const RARITIES = ["", "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];

const DND5E_SYSTEM = {
  packrat: "system",
  id: "dnd5e-srd",
  name: "D&D 5e (SRD 5.1)",
  version: 1,
  description: "Dungeons & Dragons fifth edition, with the equipment of the System Reference Document 5.1.",

  // What the filters, catalog tabs and colours show. A group with several templates shows them as
  // its subcategories (split: some categories of a template get subcategories of their own).
  groups: [
    { id: "weapon", name: "Weapons", hue: 5, templates: ["weapon"] },
    { id: "armor", name: "Armor", hue: 225, templates: ["armor"] },
    { id: "gear", name: "Gear & Tools", hue: 95, templates: ["gear", "tool", "pack"] },
    { id: "consumable", name: "Consumables", hue: 268, templates: ["consumable", "ammunition", "poison"] },
    { id: "container", name: "Containers", hue: 28, templates: ["container"] },
    { id: "magic", name: "Magic Items", hue: 318, templates: ["magic"] },
    { id: "treasure", name: "Treasure & Trinkets", hue: 48, templates: ["treasure", "trinket"],
      split: { treasure: { Gem: "Gemstones", "Trade Good": "Trade goods", rest: "Other valuables" } } },
    { id: "document", name: "Documents", hue: 165, templates: ["document"] },
  ],

  // Templates. features: on by default ("main": its fields show with the template's own rather
  // than under Features); icon: the automatic icon when no rule matches its name.
  templates: [
    { id: "weapon", name: "Weapon", plural: "Weapons", group: "weapon", icon: "swords",
      categories: ["Simple", "Martial"], categoryLabel: "Simple or martial", categorySegmented: true,
      features: { weapon: "main", equippable: true, stacks: false } },
    { id: "armor", name: "Armor", plural: "Armor", group: "armor", icon: "armor-breastplate",
      categories: ["Light", "Medium", "Heavy", "Shield"],
      features: { armor: "main", equippable: true, stacks: false } },
    { id: "ammunition", name: "Ammunition", plural: "Ammunition", group: "consumable", icon: "arrows",
      features: { ammunition: "main", bundle: true } },
    { id: "gear", name: "Adventuring Gear", plural: "Adventuring gear", group: "gear", icon: "sack",
      categories: ["Common", "Usable", "Clothes", "Arcane Focus", "Druidic Focus", "Holy Symbol", "Other"] },
    { id: "container", name: "Container", plural: "Containers", group: "container", icon: "chest",
      features: { holds: true, stacks: false } },
    { id: "tool", name: "Tool", plural: "Tools", group: "gear", icon: "toolbox",
      categories: ["Artisan's Tools", "Gaming Set", "Musical Instrument", "Other"] },
    { id: "poison", name: "Poison", plural: "Poisons", group: "consumable", icon: "poison",
      fields: [
        { key: "poisonType", label: "Poison type", kind: "select", options: ["Contact", "Ingested", "Inhaled", "Injury"] },
        { key: "saveDC", label: "Save DC", kind: "number" },
        { key: "effect", label: "Effect", kind: "textarea" },
      ] },
    { id: "consumable", name: "Consumable", plural: "Potions & supplies", group: "consumable", icon: "potion",
      categories: ["Potion", "Scroll", "Food", "Alchemical", "Other"],
      fields: [{ key: "effect", label: "Effect", kind: "textarea" }] },
    { id: "magic", name: "Magic Item", plural: "Magic items", group: "magic", icon: "sparkles",
      categories: ["Wondrous Item", "Ring", "Rod", "Staff", "Wand", "Other"],
      features: { equippable: true, stacks: false } },
    { id: "trinket", name: "Trinket", plural: "Trinkets", group: "treasure", icon: "trinket" },
    { id: "treasure", name: "Treasure / Valuable", plural: "Treasure", group: "treasure", icon: "gem",
      categories: ["Gem", "Art Object", "Trade Good", "Other"] },
    { id: "document", name: "Document", plural: "Documents", group: "document", icon: "paper",
      categories: ["Letter", "Note", "Book", "Journal", "Scroll", "Map", "Other"], categoryLabel: "Kind",
      defaults: { weight: 0 }, hide: ["description"], features: { writable: true } },
    { id: "pack", name: "Equipment Pack", plural: "Equipment packs", group: "gear", icon: "backpack",
      features: { pack: true, stacks: false } },
  ],

  // Money: prices are in copper; shops pay out and give change in gold, silver and copper; 50 coins
  // weigh a pound.
  currency: {
    coins: [{ key: "pp", name: "platinum", value: 1000 }, { key: "gp", name: "gold", value: 100 }, { key: "ep", name: "electrum", value: 50 },
      { key: "sp", name: "silver", value: 10 }, { key: "cp", name: "copper", value: 1 }],
    change: ["gp", "sp", "cp"], show: "gp", perWeight: 50,
  },
  weight: { unit: "lb" },

  // The campaign rules settings it uses (Settings → Rules, a campaign's Edit).
  campaignSettings: ["encumbrance", "carryMultiplier"],

  // Fields every template of this system has (after weight, before the description).
  commonFields: [
    { key: "rarity", label: "Rarity", kind: "select", options: RARITIES },
  ],

  // What an inventory item can be (see js/system.js): attuned to (items that need it; 3 at most,
  // unless the GM changes a character's slots), identified, cursed.
  states: [
    { key: "attuned", label: "Attuned", who: "player", requires: "attunement",
      limit: { gmValue: "gm_attuneSlots", default: 3, mode: "warn", text: "You can attune to at most {limit} items", label: "Attunement slots" } },
    { key: "identified", label: "Identified", who: "gm" },
    { key: "cursed", label: "Cursed", who: "gm" },
  ],

  // Words on the app's own screens (see TERMS in js/system.js).
  terminology: { rollTable: "Roll trinket", rollTitle: "Roll a trinket" },

  // Features only this system has (the core ones are in templates.js).
  features: [
    { key: "attunement", label: "Attunement", hint: "Requires attunement to use (a character can attune to 3 items).", flag: "attunement", fields: [] },
    { key: "worn", label: "Armor bonus", hint: "Adds to Armor Class while worn.", fields: [
      { key: "acBonus", label: "AC bonus while worn", kind: "number" },
    ] },
    { key: "weapon", label: "Weapon", equip: "wielded", hint: "Used to attack: its damage, properties and reach or range show in the Combat panel.", fields: [
      { key: "kind", label: "Melee or ranged", kind: "select", options: ["Melee", "Ranged"], segmented: true },
      { key: "damage", label: "Damage dice", kind: "dice", placeholder: "1d8" },
      { key: "damageType", label: "Damage type", kind: "select", options: ["", ...DAMAGE_TYPES] },
      { key: "properties", label: "Properties", kind: "tags",
        suggestions: ["Ammunition", "Finesse", "Heavy", "Light", "Loading", "Range (80/320)", "Reach",
          "Special", "Thrown (20/60)", "Two-handed", "Versatile (1d10)"] },
      { key: "bonus", label: "Magic bonus (+N)", kind: "number" },
    ] },
    { key: "armor", label: "Armor", equip: "worn", hint: "Worn for Armor Class: a suit of armor, or a shield (the Shield category).", fields: [
      { key: "ac", label: "Base AC (shield: bonus)", kind: "number" },
      { key: "dex", label: "Dex modifier", kind: "select", options: ["full", "max2", "none"],
        labels: { full: "Full Dex", max2: "Dex (max 2)", none: "No Dex" } },
      { key: "strength", label: "Strength required", kind: "number" },
      { key: "stealthDisadvantage", label: "Stealth disadvantage", kind: "checkbox" },
      { key: "bonus", label: "Magic bonus (+N)", kind: "number" },
    ] },
    { key: "ammunition", label: "Ammunition", hint: "Fired by a weapon: shows with it in the Combat panel, and goes in quivers and cases.", fields: [
      { key: "bonus", label: "Magic bonus (+N)", kind: "number" },
    ] },
  ],

  // The starter templates a new campaign's rule package gets, to show what templates can do.
  starterTemplates: [
    { id: "tpl-spell-scroll", name: "Spell Scroll", group: "consumable", from: "consumable",
      categories: ["Potion", "Scroll", "Food", "Alchemical", "Other"],
      fields: [
        { key: "spell", label: "Spell", kind: "text" },
        { key: "spellLevel", label: "Spell level", kind: "select", options: ["Cantrip", "1", "2", "3", "4", "5", "6", "7", "8", "9"] },
        { key: "saveDC", label: "Save DC", kind: "number" },
        { key: "attackBonus", label: "Attack bonus", kind: "number" },
        { key: "effect", label: "Effect", kind: "textarea" },
      ],
      defaults: { category: "Scroll", weight: 0 } },
    { id: "tpl-gemstone", name: "Gemstone", group: "treasure", from: "treasure",
      categories: ["Gem", "Art Object", "Trade Good", "Other"],
      fields: [
        { key: "gemValue", label: "Gem tier", kind: "select", options: ["10 gp", "50 gp", "100 gp", "500 gp", "1000 gp", "5000 gp"] },
        { key: "gemColor", label: "Color", kind: "text" },
      ],
      defaults: { category: "Gem", weight: 0 } },
    // States, layers and triggers at work: it seems an ordinary magic item until it's attuned to;
    // then the curse takes hold, and only the GM can end the attunement (by lifting the curse).
    { id: "tpl-cursed-item", name: "Cursed Item", group: "magic", from: "magic",
      categories: ["Wondrous Item", "Ring", "Rod", "Staff", "Wand", "Other"],
      features: { equippable: true, stacks: false },
      layers: { identified: {}, attuned: {}, cursed: { locks: ["attuned"], description: "Cursed: it can't be removed, and only the GM can end the attunement." } },
      triggers: [{ on: "on:attuned", do: [{ set: "cursed", to: true }], message: "Something is wrong: it won't let go." }],
      defaults: { category: "Wondrous Item", attunement: true } },
  ],

  // Panels (js/systems/dnd5e-panels.js): Character and Combat above the inventory, the GM's
  // player summaries; the rules they share; and the character stats they use, with starting values.
  get panels() { return DND5E_PANELS.panels; },
  get panelLib() { return DND5E_PANELS.lib; },
  get stats() { return DND5E_PANELS.stats; },

  // The catalog, the roll tables and the rules behind weapon properties (js/srd-data.js).
  get catalog() { return SRD_ITEMS; },
  get tables() { return TRINKET_TABLES; },
  get glossary() { return WEAPON_PROPERTIES; },
};
