// Item icons: automatic picks from the item's name/type, rendering, and the
// icon picker. The shapes come from js/icons-data.js (game-icons.net, CC BY 3.0).

const ICON_BY_ID = new Map(ICON_LIBRARY.map(i => [i.id, i]));

// Name keyword -> icon, checked in order; the first match wins.
const WEAPON_ICON_RULES = [
  [/scimitar/, "sword-curved"], [/rapier/, "rapier"], [/greatsword/, "greatsword"],
  [/shortsword/, "shortsword"], [/sword/, "sword"], [/dagger|knife/, "dagger"], [/greataxe/, "greataxe"],
  [/handaxe|hatchet/, "handaxe"], [/axe/, "axe"], [/morningstar/, "morningstar"], [/mace/, "mace"],
  [/flail/, "flail"], [/light hammer/, "light-hammer"], [/warhammer|maul/, "hammer"], [/war pick/, "war-pick"],
  [/club/, "club"], [/quarterstaff|staff/, "staff"], [/javelin/, "javelin"], [/trident/, "trident"],
  [/halberd|pike/, "halberd"], [/glaive/, "glaive"], [/lance/, "lance"], [/spear/, "spear"],
  [/sickle/, "sickle"], [/scythe/, "scythe"], [/whip/, "whip"], [/crossbow/, "crossbow"], [/\bbow\b|longbow|shortbow/, "bow"],
  [/sling/, "sling"], [/blowgun/, "blowgun"], [/dart/, "dart"], [/\bnet\b/, "net"], [/boomerang/, "boomerang"],
  [/pistol|musket|rifle|gun/, "gun"], [/bomb|grenade/, "bomb"],
];

const AMMO_ICON_RULES = [[/arrow/, "arrows"], [/bolt/, "bolts"], [/bullet|stone/, "bullets"], [/needle/, "needles"]];

const ARMOR_ICON_RULES = [
  [/shield/, "shield"], [/padded|studded|leather|hide/, "armor-leather"], [/chain|ring mail/, "armor-chain"],
  [/scale/, "armor-scale"], [/spiked/, "armor-spiked"], [/breastplate|half ?plate/, "armor-breastplate"], [/splint|plate/, "armor-plate"],
  [/helm/, "helmet"], [/gauntlet|glove/, "gauntlets"], [/boot/, "boots"],
];

// Gear, containers, tools, packs, consumables, magic items and treasure.
const GEAR_ICON_RULES = [
  // packs
  [/burglar's pack/, "lockpicks"], [/diplomat's pack/, "letter"], [/dungeoneer's pack/, "torch"],
  [/entertainer's pack/, "mask"], [/explorer's pack/, "backpack"], [/priest's pack/, "holy-symbol"], [/scholar's pack/, "book"],
  // containers
  [/backpack/, "backpack"], [/barrel/, "barrel"], [/basket/, "basket"], [/bucket/, "bucket"], [/crossbow bolt|quiver/, "quiver"],
  [/case/, "case"], [/chest/, "chest"], [/flask|tankard/, "flask"], [/bottle/, "bottle"], [/jug|pitcher/, "jug"],
  [/\bpot\b/, "pot"], [/component pouch|pouch|purse/, "pouch"], [/sack|bag of sand/, "sack"], [/vial/, "vial"], [/waterskin|canteen/, "waterskin"],
  // tools and instruments
  [/alchemist's supplies/, "alchemy"], [/brewer/, "brewer"], [/calligrapher/, "calligraphy"], [/carpenter/, "saw"],
  [/cartographer/, "cartography"], [/cobbler/, "boot-tool"], [/cook's/, "cook"], [/glassblower/, "glassblow"],
  [/jeweler/, "gem-tools"], [/leatherworker/, "leatherwork"], [/mason/, "chisel"], [/painter/, "brush"],
  [/potter/, "pottery"], [/smith's/, "anvil"], [/tinker/, "gear-cog"], [/weaver/, "loom"], [/woodcarver/, "knife-carve"],
  [/dice/, "dice"], [/dragonchess|chess/, "chess"], [/playing card|three-dragon ante|cards/, "cards"],
  [/bagpipes/, "bagpipes"], [/dulcimer/, "dulcimer"], [/pan flute/, "pan-flute"], [/flute|shawm/, "flute"], [/drum/, "drum"],
  [/lute/, "lute"], [/lyre|harp/, "harp"], [/horn/, "horn"], [/viol/, "violin"],
  [/disguise/, "disguise"], [/forgery/, "forgery"], [/herbalism/, "herbs"], [/navigator/, "navigator"],
  [/poisoner/, "poisoner"], [/thieves' tools|lockpick/, "lockpicks"],
  // adventuring gear
  [/abacus/, "abacus"], [/bedroll|blanket|sleeping/, "bedroll"], [/bell/, "bell"], [/block and tackle|rope|string/, "rope"],
  [/spellbook/, "spellbook"], [/book/, "book"], [/candle/, "candle"], [/chain/, "chain"], [/chalk/, "chalk"],
  [/fishing/, "fishing"], [/grappling|climber/, "grappling-hook"], [/sledgehammer/, "sledgehammer"], [/hammer/, "hammer-tool"],
  [/hourglass/, "hourglass"], [/ink/, "ink"], [/ladder/, "ladder"], [/manacle|shackle/, "manacles"], [/\block\b/, "lock"],
  [/magnifying/, "magnifier"], [/mess kit/, "mess-kit"], [/miner's pick|pick\b/, "pickaxe"], [/paper|parchment/, "paper"],
  [/perfume/, "perfume"], [/piton|spikes/, "piton"], [/pole/, "pole"], [/\bram\b/, "ram"], [/rations|jerky/, "rations"],
  [/sealing wax|wax/, "seal"], [/shovel|spade/, "shovel"], [/whistle/, "whistle"], [/signet|ring\b/, "ring"],
  [/spyglass|telescope/, "spyglass"], [/tent/, "tent"], [/whetstone|stone/, "stone"], [/acid/, "acid"],
  [/alchemist's fire/, "alchemist-fire"], [/antitoxin|antidote/, "antitoxin"], [/ball bearings/, "ball-bearings"],
  [/caltrops/, "caltrops"], [/crowbar/, "crowbar"], [/healer's kit|bandage/, "healer-kit"], [/holy water/, "holy-water"],
  [/trap/, "trap"], [/lantern/, "lantern"], [/lamp/, "lamp"], [/\boil\b/, "oil"], [/poison/, "poison"],
  [/potion of healing|healing/, "potion-red"], [/potion|elixir|philter/, "potion"], [/tinderbox|flint/, "tinderbox"], [/torch/, "torch"],
  [/costume|mask/, "mask"], [/fine clothes/, "fine-clothes"], [/robe|vestments/, "robe"], [/clothes/, "shirt"],
  [/cloak|cape/, "cloak"], [/boots/, "boots"], [/hat\b/, "hat"], [/belt|girdle/, "belt"],
  [/crystal/, "crystal"], [/\borb\b/, "orb"], [/\brod\b|scepter/, "rod"], [/staff/, "magic-staff"], [/wand/, "wand"],
  [/mistletoe/, "mistletoe"], [/totem/, "totem"], [/amulet|necklace|pendant/, "amulet"], [/emblem|holy symbol/, "holy-symbol"],
  [/reliquary/, "reliquary"], [/soap/, "soap"], [/alms box/, "alms-box"], [/incense|censer/, "incense"],
  [/small knife|knife/, "dagger"], [/key/, "key"], [/mirror/, "mirror"], [/scroll/, "scroll"], [/map/, "map"],
  [/letter|envelope/, "letter"], [/crown|tiara/, "crown"], [/coin|gold piece/, "coins"],
  [/diamond|ruby|emerald|sapphire|gem|jewel/, "gem"], [/ingot|bar of/, "gold-bar"], [/goblet|chalice/, "goblet"],
  [/statue|figurine|painting|tapestry/, "art"], [/wine/, "wine"],
  [/\bale\b|beer|mead/, "drink"], [/bread/, "bread"], [/cheese/, "cheese"], [/meat/, "meat"], [/apple|fruit/, "apple"],
  [/herb|leaf/, "herbs"], [/mushroom/, "mushroom"],
];

// Trinkets are sentences ("A mummified goblin hand"): look for the object in them.
const TRINKET_ICON_RULES = [
  [/skull/, "skull"], [/tentacle/, "tentacle"], [/tooth|teeth|fang/, "tooth"], [/bone|finger|skeleton/, "bone"],
  [/\bhand\b/, "hand"], [/\beye\b|eyeball/, "eye"], [/feather|quill/, "feather"], [/doll|puppet/, "doll"],
  [/figurine|statuette|carving|carved/, "figurine"], [/shell/, "shell"], [/egg/, "egg"], [/music box/, "music-box"],
  [/watch|clock/, "clock"], [/flower|petal|rose/, "flower"], [/candy|sweet|cookie/, "candy"], [/heart|locket/, "heart"],
  [/paw|claw/, "paw"], [/\bkey\b/, "key"], [/coin/, "coins"], [/\bring\b/, "ring"], [/book|diary|journal/, "book"],
  [/\bmap\b/, "map"], [/dice|\bdie\b/, "dice"], [/\bcards?\b/, "cards"], [/bottle|vial|jar/, "vial"],
  [/crystal/, "crystal"], [/gem|jewel|diamond/, "gem"], [/mask/, "mask"], [/crown|tiara/, "crown"],
  [/mirror/, "mirror"], [/bell/, "bell"], [/candle/, "candle"], [/dagger|knife|blade/, "dagger"],
  [/letter|note|scroll|paper/, "letter"], [/stone|rock|pebble|pearl/, "stone"], [/puzzle|cube/, "puzzle"],
  [/pipe|flute|whistle/, "flute"], [/amulet|pendant|necklace|medallion/, "amulet"],
];

// Treasure: trade goods, livestock and gemstones (anything else falls back to the gear rules).
const TREASURE_ICON_RULES = [
  [/wheat|grain|barley|oats/, "wheat"], [/flour/, "flour"], [/salt/, "salt"],
  [/ginger|cinnamon|pepper|cloves|saffron|spice|nutmeg/, "spices"], [/canvas|cloth|linen|silk|cotton|wool|velvet/, "cloth"],
  [/chicken|\bhen\b|rooster|goose|duck/, "chicken"], [/goat/, "goat"], [/sheep|lamb/, "sheep"], [/\bpig\b|hog|swine/, "pig"],
  [/\bcow\b|cattle|calf/, "cow"], [/\box\b|oxen|\bbull\b/, "ox"],
  [/^gold\b.*\(1 lb\)|gold (bar|ingot)/, "gold-bar"], [/^(iron|copper|silver|platinum|mithral|adamantine)\b.*\(1 lb\)|ingot|bar of/, "metal-bar"],
  [/pearl/, "pearl"],
  [/emerald|jade|peridot|malachite|chrysoprase|chrysoberyl|alexandrite|aquamarine|turquoise|moss agate|tourmaline/, "gem-emerald"],
  [/ruby|garnet|fire opal|jacinth|carnelian|coral|spinel|bloodstone|rhodochrosite|amber|citrine|topaz/, "gem-fire"],
  [/diamond|sapphire|quartz|zircon|amethyst|moonstone|chalcedony/, "gem"],
  [/agate|opal|onyx|jasper|obsidian|hematite|lapis|azurite|tiger|sardonyx|jet\b/, "gems"],
];

// Poisons look alike by name; tell them apart by how they're delivered.
const POISON_TYPE_ICON = { Inhaled: "poisoner", Contact: "acid", Injury: "venom", Ingested: "poison" };

const DOCUMENT_KIND_ICON = { Letter: "letter", Note: "paper", Book: "book", Journal: "spellbook", Scroll: "scroll", Map: "map" };

const TYPE_ICON = {
  document: "paper",
  weapon: "swords", armor: "armor-breastplate", ammunition: "arrows", gear: "sack", container: "chest",
  pack: "backpack", tool: "toolbox", poison: "poison", trinket: "trinket", consumable: "potion",
  magic: "sparkles", treasure: "gem",
};

const autoIconCache = new Map();

function autoIconId(item) {
  const key = item.type + "|" + item.name + "|" + (item.category || "");
  if (autoIconCache.has(key)) return autoIconCache.get(key);
  const name = (item.name || "").toLowerCase();
  const rules = item.type === "weapon" ? WEAPON_ICON_RULES
    : item.type === "ammunition" ? AMMO_ICON_RULES
    : item.type === "armor" ? ARMOR_ICON_RULES
    : item.type === "trinket" ? TRINKET_ICON_RULES
    : item.type === "poison" ? [[/venom|wyvern|purple worm/, "venom"], [/vial/, "poison"]]
    : item.type === "document" ? [[/map|chart/, "map"], [/letter|note from|message/, "letter"], [/journal|diary/, "book"]]
    : item.type === "treasure" ? TREASURE_ICON_RULES.concat(GEAR_ICON_RULES)
    : GEAR_ICON_RULES;
  let id = rules.find(([re]) => re.test(name))?.[1];
  if (!id && item.type === "poison") id = POISON_TYPE_ICON[item.poisonType];
  if (!id && item.type === "document") id = DOCUMENT_KIND_ICON[item.category];
  if (!id && item.category) id = GEAR_ICON_RULES.find(([re]) => re.test(item.category.toLowerCase()))?.[1];
  if (!id || !ICON_BY_ID.has(id)) id = TYPE_ICON[item.type] || "question";
  autoIconCache.set(key, id);
  return id;
}

// The icon an item shows: the one chosen for it, or an automatic pick.
function itemIconId(item) {
  return item.icon && ICON_BY_ID.has(item.icon) ? item.icon : autoIconId(item);
}

function iconSvg(id, cls = "") {
  const icon = ICON_BY_ID.get(id) || ICON_BY_ID.get("question");
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 512 512");
  s.setAttribute("class", "item-icon " + cls);
  s.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(s.namespaceURI, "path");
  p.setAttribute("d", icon.d);
  s.append(p);
  return s;
}

// Icon tinted with the item type's colour.
function itemIcon(item, cls = "") {
  const el = iconSvg(itemIconId(item), cls);
  el.style.color = itemColor(item);
  return el;
}

// Searchable grid of every icon. onPick(id) — id is null for "Automatic".
function openIconPicker(current, onPick, sample) {
  let close, query = "";
  const grid = h("div", { class: "icon-grid", role: "listbox", "aria-label": "Icons" });
  const tile = (id, label, el) => h("button", {
    type: "button", class: "icon-tile" + ((current || null) === id ? " active" : ""), title: label, role: "option",
    "aria-selected": String((current || null) === id), onclick: () => { close(); onPick(id); },
  }, el, h("span", null, label));
  const draw = () => {
    const q = query.trim().toLowerCase();
    const matches = ICON_LIBRARY.filter(i => !q || i.n.toLowerCase().includes(q) || i.t.includes(q) || i.id.includes(q));
    setChildren(grid,
      !q && sample && tile(null, "Automatic", itemIcon({ ...sample, icon: undefined })),
      matches.map(i => tile(i.id, i.n, iconSvg(i.id))),
      !matches.length && h("p", { class: "muted pad" }, "No icons match."));
  };
  draw();
  close = openModal("Choose an icon", [
    h("label", { class: "search" }, icon("search"),
      h("input", { type: "search", placeholder: "Search icons: sword, potion, lute…", oninput: e => { query = e.target.value; draw(); } })),
    grid,
    h("p", { class: "muted small" }, "Icons from ", h("a", { href: "https://game-icons.net", target: "_blank", rel: "noopener" }, "game-icons.net"), " (CC BY 3.0)."),
  ], { wide: true });
}
