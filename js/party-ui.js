// Party-mode screens: joining, the Party tab, and trading. Uses the helpers
// from app.js (h, icon, openModal, commit, toast...) at call time.

function onlineDot(online) {
  return h("span", { class: "online-dot" + (online ? " on" : ""), title: online ? "Online" : "Offline" });
}

function copyText(text) {
  const done = () => toast("Copied " + text);
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done, () => toast(text));
  const ta = h("textarea", { style: { position: "fixed", opacity: "0" } }, text);
  document.body.append(ta);
  ta.select();
  try { document.execCommand("copy"); done(); } catch { toast(text); }
  ta.remove();
}

// QR code as an SVG. Always dark-on-white with a quiet zone so phone cameras can read it.
function qrSvg(text, size = 168) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), q = 4, total = n + q * 2;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${total} ${total}`);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("class", "qr");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "QR code for " + text);
  svg.setAttribute("shape-rendering", "crispEdges");
  const bg = document.createElementNS(svg.namespaceURI, "rect");
  bg.setAttribute("width", total);
  bg.setAttribute("height", total);
  bg.setAttribute("fill", "#fff");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "#000");
  svg.append(bg, path);
  return svg;
}

function showBigQr(url) {
  openModal("Scan to join", h("div", { class: "qr-big" }, qrSvg(url, 320), h("code", null, url),
    h("p", { class: "muted small" }, "Point a phone camera at the code, then tap the link it shows.")));
}

function joinAddresses() {
  return h("div", { class: "join-urls" }, party.joinUrls().map(url =>
    h("div", { class: "join-url" },
      typeof qrcode === "function" && h("button", { class: "qr-btn", title: "Show bigger", "aria-label": "Show a bigger QR code", onclick: () => showBigQr(url) }, qrSvg(url, 132)),
      h("div", { class: "join-url-text" },
        h("code", null, url),
        h("div", { class: "inline" },
          h("button", { class: "btn", onclick: () => copyText(url) }, icon("copy"), "Copy"),
          typeof qrcode === "function" && h("button", { class: "btn", onclick: () => showBigQr(url) }, "Show QR"))))));
}

// ------------------------------------------------------------------ joining

// This device's characters that aren't in the party yet (blank starter characters left out).
function bringableCharacters() {
  return store.state.characters.filter(c => !party.isLinked(c.id) && !isBlankCharacter(c));
}

// Ways to play in the party: one of this device's characters, a new one, or taking over one of
// the party's (for when you switch devices).
function joinOptions(onDone = () => {}) {
  let name = "";
  const create = async () => {
    if (await joinAs(name)) onDone();
  };
  const mine = bringableCharacters();
  const others = party.others();
  return [
    mine.length > 0 && h("section", { class: "join-card" },
      h("h3", null, "Play one of your characters"),
      h("p", { class: "muted small" }, `Saved on this ${party.app?.android ? "phone" : "device"}. The party gets a live copy: trades and purchases update it here too.`),
      h("div", { class: "group" }, mine.map(c => h("div", { class: "row" },
        h("div", { class: "row-main" }, h("div", { class: "row-title" }, c.name),
          h("div", { class: "row-sub" }, `${plural(c.items.length, "entry", "entries")} · ${coinSummary(c.coins)}`)),
        h("button", { class: "btn primary", onclick: async () => { if (await party.bring(c.id)) onDone(); } }, icon("users"), "Play"))))),
    h("section", { class: "join-card" },
      h("h3", null, "New character"),
      h("form", { class: "inline", onsubmit: e => { e.preventDefault(); create(); } },
        h("input", { type: "text", placeholder: "Character name", "aria-label": "Character name", oninput: e => { name = e.target.value; } }),
        h("button", { class: "btn" + (mine.length ? "" : " primary"), type: "submit" }, icon("plus"), "Create"))),
    others.length > 0 && h("section", { class: "join-card" },
      h("h3", null, "Take over a party character"),
      h("p", { class: "muted small" }, "For when you switch devices: it's saved on this device from now on. Characters that are open on another device can't be taken."),
      h("div", { class: "group" }, others.map(c => h("div", { class: "row" },
        onlineDot(c.online),
        h("div", { class: "row-main" }, h("div", { class: "row-title" }, c.name),
          h("div", { class: "row-sub" }, c.online ? "Being played right now" : plural(c.items.length, "entry", "entries"))),
        h("button", { class: "btn", disabled: c.online, onclick: async () => { if (await party.bring(c.id)) onDone(); } }, "Take over"))))),
  ];
}

// Create a character on this device and play it in the party. Returns false (and says why)
// if the name is empty. A blank starter character on a fresh device is replaced.
async function joinAs(name) {
  name = (name || "").trim();
  if (!name) {
    toast("Enter a name for your character");
    return false;
  }
  const c = newCharacter(name);
  commit(s => {
    s.characters = s.characters.filter(x => !isBlankCharacter(x) || party.isLinked(x.id));
    s.characters.push(c);
    s.activeId = c.id;
  });
  return party.active ? party.bring(c.id) : true;
}

// First thing a new player on a fresh device sees: just ask for a name.
function promptForName() {
  let name = "", close;
  const ok = async () => { if (await joinAs(name)) close(); };
  const others = party.others().some(c => !c.online);
  close = openModal("Welcome to the party!", h("form", { class: "form", onsubmit: e => { e.preventDefault(); ok(); } },
    h("p", null, "What's your character's name?"),
    h("label", { class: "field" }, h("span", null, "Character name"),
      h("input", { type: "text", maxlength: 60, autocomplete: "off", placeholder: "e.g. Thistle Underbough",
        oninput: e => { name = e.target.value; } })),
    others && h("p", { class: "muted small" }, "Already have a character in this party? ",
      h("button", { type: "button", class: "link", onclick: () => close() }, "See other options"), ".")),
  { footer: [h("button", { class: "btn primary", onclick: ok }, icon("check"), "Join")] });
  // Phones don't focus automatically from openModal; the name is the only thing to do here.
  setTimeout(() => document.querySelector("#modal-root .overlay:last-child input")?.focus(), 50);
}

// In a party with none of this device's characters playing yet: choose one.
function renderJoin() {
  if (!ui.joinPrompted && !bringableCharacters().length) {
    ui.joinPrompted = true;
    setTimeout(promptForName, 0);
  }
  return h("div", { class: "view-join" },
    h("div", { class: "join-hero" },
      icon("users", "big"),
      h("h2", null, "You've joined a party"),
      h("p", { class: "muted" }, "Choose who you're playing. Your characters stay saved on this device; the party shares a live copy so everyone can trade.")),
    joinOptions(),
    party.isJoinedElsewhere() && h("p", { class: "muted small center" },
      h("button", { class: "link", onclick: confirmLeave }, "Leave this party")));
}

// Characters changed both here and in the party while this device was away.
function undecidedBanner() {
  return [...party.undecided].map(id => {
    const c = store.state.characters.find(x => x.id === id);
    const p = party.owned().find(x => x.id === id);
    if (!c || !p) return null;
    return h("section", { class: "found-banner" },
      icon("users"),
      h("div", null,
        h("b", null, `${c.name} changed in two places`),
        h("p", { class: "muted small" }, `This device has ${plural(c.items.length, "entry", "entries")} and ${coinSummary(c.coins)}; the party's copy has ${plural(p.items.length, "entry", "entries")} and ${coinSummary(p.coins)}. Which should the party use?`)),
      h("button", { class: "btn", onclick: () => party.resolve(id, "party") }, "The party's"),
      h("button", { class: "btn primary", onclick: () => party.resolve(id, "device") }, "This device's"));
  });
}

function confirmLeave() {
  confirmDialog("Leave this party? Your characters stay saved on this device, and the party keeps its copy of them (the host can remove it). You can join again any time.",
    "Leave party", () => party.leave());
}

// ------------------------------------------------------------------ party tab

function describeSide(side) {
  const parts = [
    ...side.items.map(i => (i.qty > 1 ? `${i.qty} × ` : "") + i.name),
    ...COIN_ORDER.filter(k => side.coins[k]).map(k => `${side.coins[k].toLocaleString()} ${k}`),
  ];
  return parts.length ? parts.join(", ") : "nothing";
}

function tradeCard(t) {
  const iGive = t.fromMine ? t.give : t.ask;
  const iGet = t.fromMine ? t.ask : t.give;
  const who = t.fromMine ? `${t.fromName} → ${t.toName}` : `${t.fromName} → ${t.toName}`;
  const status = {
    accepted: "Completed", declined: "Declined", cancelled: "Cancelled", failed: "Failed",
  }[t.status];
  return h("div", { class: "trade-card " + t.status },
    h("div", { class: "trade-head" }, icon("move"), h("b", null, who), status && h("span", { class: "tag" }, status)),
    h("dl", { class: "trade-sides" },
      h("dt", null, t.fromMine || t.status !== "pending" ? "You give" : "You'd give"), h("dd", null, describeSide(iGive)),
      h("dt", null, t.fromMine || t.status !== "pending" ? "You get" : "You'd get"), h("dd", null, describeSide(iGet))),
    t.note && h("p", { class: "trade-note" }, "“", t.note, "”"),
    t.reason && h("p", { class: "muted small" }, t.reason),
    t.status === "pending" && h("div", { class: "trade-actions" },
      t.toMine ? [
        h("button", { class: "btn", onclick: () => party.act(t.id, "decline") }, "Decline"),
        h("button", { class: "btn primary", onclick: () => party.act(t.id, "accept") }, icon("check"), "Accept"),
      ] : h("button", { class: "btn", onclick: () => party.act(t.id, "cancel") }, "Cancel offer")));
}

function memberCard(c) {
  const open = ui.partyOpen?.has(c.id);
  const toggle = () => {
    ui.partyOpen = ui.partyOpen || new Set();
    open ? ui.partyOpen.delete(c.id) : ui.partyOpen.add(c.id);
    render();
  };
  const where = e => {
    if (!e.parent) return "";
    const p = c.items.find(x => x.uid === e.parent);
    return p ? ` (${e.strapped ? "on" : "in"} ${p.item.name})` : "";
  };
  return h("div", { class: "group member" },
    h("div", { class: "row" },
      onlineDot(c.online),
      h("button", { class: "row-main", onclick: toggle, "aria-expanded": String(!!open) },
        h("div", { class: "row-title" }, c.name),
        h("div", { class: "row-sub" }, `${plural(c.items.length, "entry", "entries")} · ${coinSummary(c.coins)}`)),
      iconBtn("chevron", open ? "Hide inventory" : "Show inventory", toggle, open ? "flip" : ""),
      h("button", { class: "btn primary", disabled: !store.char(), onclick: () => openTradeBuilder(c.id) }, icon("move"), "Trade"),
      // The host can clear out players who have left (only while they're away).
      party.info?.canManageShops && !c.online && iconBtn("trash", `Remove ${c.name} from the party`, () => removeMember(c), "danger-hover")),
    open && (c.items.length
      ? h("ul", { class: "member-items" }, [...c.items].sort((a, b) => a.item.name.localeCompare(b.item.name)).map(e =>
        h("li", null, itemIcon(e.item, "row-icon small"), e.qty > 1 ? `${e.qty} × ` : "", entryName(e), h("span", { class: "muted" }, where(e)))))
      : h("p", { class: "muted pad" }, "Nothing carried.")));
}

function renderParty() {
  // The GM (the host) has a second tab: GM values.
  const gmTabs = party.isGm() && h("div", { class: "seg party-tabs", role: "tablist", "aria-label": "Party screen" },
    [["party", "Party"], ["gm", "GM values"]].map(([k, label]) => h("button", { type: "button", role: "tab",
      class: ui.partyTab === k ? "active" : "", "aria-selected": String(ui.partyTab === k), onclick: () => { ui.partyTab = k; render(); } }, label)));
  if (gmTabs && ui.partyTab === "gm") return h("div", { class: "view-party" }, gmTabs, gmValuesView());
  const incoming = party.trades.filter(t => t.status === "pending" && t.toMine);
  const outgoing = party.trades.filter(t => t.status === "pending" && t.fromMine);
  const history = party.trades.filter(t => t.status !== "pending").slice(0, 10);
  const others = party.others();
  return h("div", { class: "view-party" },
    gmTabs,
    h("section", { class: "party-banner" },
      h("div", { class: "section-head" },
        h("h2", null, "Party"),
        h("span", { class: "status" }, onlineDot(party.connected), party.connected ? "Live" : "Reconnecting…")),
      h("p", { class: "muted small" }, "Others on this network join by opening:"),
      joinAddresses(),
      party.isHosting() && h("div", { class: "inline wrap host-actions" },
        h("span", { class: "muted small" }, "You're hosting this party."),
        h("button", { class: "btn danger", onclick: stopHosting }, "Stop hosting")),
      party.isJoinedElsewhere() && h("div", { class: "inline wrap host-actions" },
        h("span", { class: "muted small" }, `You joined the party at ${hostLabel(party.base)}.`),
        h("button", { class: "btn", onclick: confirmLeave }, "Leave party"))),
    undecidedBanner(),
    incoming.length > 0 && h("section", null, h("h2", null, "Offers for you"), incoming.map(tradeCard)),
    outgoing.length > 0 && h("section", null, h("h2", null, "Your offers"), outgoing.map(tradeCard)),
    h("section", null,
      h("h2", null, "Party members"),
      others.length ? others.map(memberCard)
        : h("div", { class: "empty" }, h("p", null, "Nobody else has joined yet. Share the address above."))),
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "Playing in this party"),
        h("button", { class: "btn", onclick: openJoinModal }, icon("plus"), "Bring a character")),
      h("div", { class: "group" }, party.linked().map(c => h("div", { class: "row" + (c.id === store.state.activeId ? " equipped" : "") },
        onlineDot(true),
        h("button", { class: "row-main", onclick: () => { commit(s => { s.activeId = c.id; }); go("inventory"); } },
          h("div", { class: "row-title" }, c.name, c.id === store.state.activeId && h("span", { class: "tag on" }, "active")),
          h("div", { class: "row-sub" }, plural(c.items.length, "entry", "entries")))))),
      h("p", { class: "muted small" }, `Saved on this ${party.app?.android ? "phone" : "device"} and shared live with the party.`)),
    history.length > 0 && h("section", null, h("h2", null, "Recent trades"), history.map(tradeCard)));
}

// ------------------------------------------------------------------ GM values

// The gm_… variables of the drawn icons carried in the party (declared, or only used in formulas):
// name → { spec, chars: charId → { char, items } }.
function gmVariablesInParty() {
  const vars = new Map();
  for (const c of party.chars) {
    for (const e of c.items || []) {
      if (!e.item.iconDoc) continue;
      for (const v of drawingGmSpecs(e.item.iconDoc).values()) {
        let g = vars.get(v.name);
        if (!g) vars.set(v.name, g = { spec: v, chars: new Map() });
        let cg = g.chars.get(c.id);
        if (!cg) g.chars.set(c.id, cg = { char: c, items: [] });
        cg.items.push({ e, spec: v });
      }
    }
  }
  return new Map([...vars].sort(([a], [b]) => a.localeCompare(b)));
}

// A value at one level: a slider and a number, or "inherited" (the level above applies) until set.
function gmValueControl(spec, own, inherited, onSet) {
  const shown = own ?? inherited;
  const min = Math.min(spec.min ?? 0, shown), max = Math.max(spec.max ?? 1, shown);
  const num = h("input", { type: "number", class: "gm-num", step: spec.step || "any", value: shown, "aria-label": "Value",
    onchange: ev => { if (ev.target.value !== "") onSet(+ev.target.value); } });
  const range = h("input", { type: "range", min, max, step: spec.step || "any", value: shown, "aria-label": "Value",
    oninput: ev => { num.value = ev.target.value; }, onchange: ev => onSet(+ev.target.value) });
  return h("div", { class: "gm-control" + (own === undefined ? " inherits" : "") }, range, num,
    own !== undefined ? iconBtn("x", "Clear (use the value above)", () => onSet(null))
      : h("span", { class: "muted small gm-inherit" }, "inherited"));
}

// The GM values tab: every gm_ value in use, then the players whose items use it, then those items.
// Each level can be set; an item uses the most specific value (item, player, party, the drawing's own).
function gmValuesView() {
  const vars = gmVariablesInParty();
  const gm = party.gm || {};
  const set = (scope, target, name) => async value => {
    try { await party.setGm(scope, target, name, value); } catch (e) { toast(e.message); }
  };
  const fold = key => {
    const closed = ui.collapsed.has(key);
    return [closed, h("button", { class: "collapse" + (closed ? " closed" : ""), "aria-expanded": String(!closed),
      onclick: () => { closed ? ui.collapsed.delete(key) : ui.collapsed.add(key); render(); } }, icon("chevron"))];
  };
  const source = (item, player, all) => item !== undefined ? "this item" : player !== undefined ? "the player" : all !== undefined ? "the party" : "the drawing";
  return h("section", { class: "gm-values" },
    h("h2", null, "GM values"),
    h("p", { class: "muted small" }, "Numbers you set for drawn icons, e.g. how cursed a blade is. Set a value for the whole party, for a player, or for one item: each item uses the most specific one. Players see the change straight away."),
    !vars.size ? h("div", { class: "empty" }, h("p", null, "No GM values yet. In the icon editor, add a variable whose name starts with ",
      h("code", null, "gm_"), " (e.g. ", h("code", null, "gm_curse"), ") and bind layers to it. Items with that icon show up here."))
      : [...vars].map(([name, g]) => {
        const all = gm.party?.[name];
        const [closed, toggle] = fold(`gm:${name}`);
        const users = [...g.chars.values()].reduce((n, cg) => n + cg.items.length, 0);
        return h("div", { class: "group gm-var" },
          h("div", { class: "group-head" }, toggle,
            h("h3", null, h("code", null, name)),
            h("span", { class: "muted small" }, `${plural(users, "item")} · ${plural(g.chars.size, "player")}`)),
          !closed && [
            h("div", { class: "row gm-level" }, h("div", { class: "row-main static" }, h("div", { class: "row-title" }, "Everyone"),
              h("div", { class: "row-sub" }, `The drawing's own value is ${g.spec.value}`)),
              gmValueControl(g.spec, all, g.spec.value, set("party", "", name))),
            [...g.chars.values()].map(({ char, items }) => {
              const player = gm.characters?.[char.id]?.[name];
              const [cClosed, cToggle] = fold(`gm:${name}:${char.id}`);
              return h("div", { class: "gm-player" },
                h("div", { class: "row gm-level" }, cToggle,
                  h("div", { class: "row-main static" }, h("div", { class: "row-title" }, char.name, char.mine && h("span", { class: "tag" }, "yours")),
                    h("div", { class: "row-sub" }, plural(items.length, "item"))),
                  gmValueControl(g.spec, player, all ?? g.spec.value, set("character", char.id, name))),
                !cClosed && items.map(({ e, spec }) => {
                  const own = gm.items?.[`${char.id}/${e.uid}`]?.[name];
                  const effective = own ?? player ?? all ?? spec.value;
                  return h("div", { class: "row gm-level gm-item" },
                    itemIcon(e.item, "row-icon", () => entryIconVars(char, e)),
                    h("div", { class: "row-main static" }, h("div", { class: "row-title" }, entryName(e)),
                      h("div", { class: "row-sub" }, `Uses ${effective} (from ${source(own, player, all)})`)),
                    gmValueControl(spec, own, player ?? all ?? spec.value, set("item", `${char.id}/${e.uid}`, name)));
                }));
            }),
          ]);
      }));
}

// Host: remove a player's character who isn't connected. Offers a backup file first.
function removeMember(c) {
  let close;
  const backup = async () => {
    const char = cleanChar(c);
    download(`${c.name.replace(/\W+/g, "_")}.json`, { kind: "character", character: char, templates: [],
      images: await bundleImages(allImageRefs([char])) });
  };
  const remove = async () => {
    close();
    try {
      await party.api("POST", `api/characters/${encodeURIComponent(c.id)}/remove`);
      toast(`${c.name} was removed from the party`);
    } catch (e) {
      toast(e.message);
    }
  };
  close = openModal(`Remove ${c.name}?`, h("div", { class: "form" },
    h("p", null, `${c.name} and everything they carry (${plural(c.items.length, "entry", "entries")}, ${coinSummary(c.coins)}) will be removed from the party. Any trades waiting on them are cancelled.`),
    h("p", { class: "muted small" }, "Their own device keeps its copy of the character. You can also download a backup here, which can be imported from Settings."),
    h("button", { class: "btn", type: "button", onclick: backup }, icon("download"), "Download a backup")),
  { footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn danger", onclick: remove }, icon("trash"), "Remove from party"),
  ] });
}

// ------------------------------------------------------------------ hosting (desktop app)

function reloadApp() {
  ui.leaving = true;
  location.reload();
}

async function startHosting(port) {
  try {
    await party.host(true, port);
    party.forgetJoined();
    toast("Party started");
    reloadApp();
  } catch (e) {
    toast(e.message);
  }
}

function stopHosting() {
  const online = party.others().filter(c => c.online).length;
  confirmDialog(online ? `Stop the party? ${online} player${online === 1 ? " is" : "s are"} connected and will be disconnected. Everyone's inventory stays saved for next time.`
    : "Stop hosting the party? Everyone's inventory stays saved for next time.", "Stop hosting", async () => {
    try {
      await party.host(false);
      reloadApp();
    } catch (e) {
      toast(e.message);
    }
  });
}

function hostPartySection() {
  let port = party.app.defaultPort || 8765;
  return h("section", null,
    h("h2", null, "Host a party"),
    h("p", { class: "muted small" }, "Let everyone at the table use Pack Rat on their own phone or laptop, with their own inventory, and trade items with each other. Players on the same Wi-Fi join by opening the address shown once the party starts. Nothing to install for them."),
    h("div", { class: "inline wrap" },
      h("label", { class: "field port-field" }, h("span", null, "Port"),
        h("input", { type: "number", min: 1024, max: 65535, value: port, inputmode: "numeric", oninput: e => { port = +e.target.value; } })),
      h("button", { class: "btn primary", onclick: () => startHosting(port) }, icon("users"), "Start hosting")),
    h("p", { class: "muted small" }, party.app.android
      ? "Keep Pack Rat running while you host — a notification shows while the party is on. Players need to be on the same Wi-Fi as this phone, or connected to its hotspot."
      : "If Windows asks whether Pack Rat may use the network, allow it on private networks."));
}

// ------------------------------------------------------------------ joining another host (desktop & Android app)

// "192.168.1.27:8765", "192.168.1.27" or a full URL -> "http://192.168.1.27:8765/"
function partyUrl(text) {
  let t = (text || "").trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) t = "http://" + t;
  try {
    const u = new URL(t);
    if (!u.port && u.protocol === "http:") u.port = "8765";
    return u.origin + "/";
  } catch {
    return null;
  }
}

// Is there a Pack Rat party at this address? Returns null if so, or what's wrong.
async function checkPartyAddress(url) {
  const where = new URL(url).host;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url + "api/info", { cache: "no-store", signal: ctrl.signal });
    const info = await res.json();
    if (info.party) return null;
    return `Pack Rat is open at ${where}, but it isn't hosting a party. Ask the host to start one on their Party tab.`;
  } catch {
    return `There's no Pack Rat party at ${where}. Check the address on the host's Party tab, including the number after the colon, and that you're on the same Wi-Fi.`;
  } finally {
    clearTimeout(timer);
  }
}

// "http://192.168.1.27:8765/" -> "192.168.1.27:8765"
function hostLabel(url) { return (url || "").replace(/^https?:\/\//, "").replace(/\/$/, ""); }

function joinOtherSection() {
  let addr = readPref("packrat-last-join", "");
  let busy = false;
  const join = async (scanned = null) => {
    if (scanned) addr = hostLabel(scanned);
    const url = scanned || partyUrl(addr);
    if (!url) return toast("Enter the address from the host's Party tab, like 192.168.1.27:8765");
    if (busy) return;
    writePref("packrat-last-join", addr.trim());
    busy = true;
    try {
      const problem = await checkPartyAddress(url);
      if (problem) return toast(problem);
      // Stay on this page (and this device's saved characters): talk to the host from here.
      await party.join(url, await fetchInfo(url));
    } catch (e) {
      toast(`Couldn't join: ${e.message}`);
    } finally {
      busy = false;
    }
  };
  return h("section", null,
    h("h2", null, "Join someone else's party"),
    h("p", { class: "muted small" }, "Type the address shown on the host's Party tab (or under the QR code). Your characters stay saved here; you choose which to play."),
    party.unreachable && h("p", { class: "warn-text small" }, `Couldn't reach the party you joined at ${hostLabel(party.unreachable)}. `,
      h("button", { class: "link", onclick: () => { addr = hostLabel(party.unreachable); join(); } }, "Try again"), " · ",
      h("button", { class: "link", onclick: () => party.leave() }, "Forget it")),
    h("form", { class: "inline wrap", onsubmit: e => { e.preventDefault(); join(); } },
      h("input", { type: "text", inputmode: "url", autocomplete: "off", placeholder: "192.168.1.27:8765", value: addr,
        "aria-label": "Party address", style: { maxWidth: "260px" }, oninput: e => { addr = e.target.value; } }),
      h("button", { class: "btn primary", type: "submit" }, icon("users"), "Join"),
      h("button", { class: "btn", type: "button", onclick: () => openQrScanner(url => join(url)) }, icon("qr"), "Scan QR code")));
}

// ------------------------------------------------------------------ scanning a join code

// The QR reader (jsQR) is only loaded when it's needed.
function loadQrReader() {
  if (window.jsQR) return Promise.resolve();
  return new Promise((ok, fail) => {
    const script = h("script", { src: "js/vendor/jsQR.js" });
    script.onload = ok;
    script.onerror = () => fail(new Error("Couldn't load the QR reader"));
    document.head.append(script);
  });
}

// A party address from a QR code: the host's join code is a plain http address.
function partyUrlFromQr(text) {
  return /^https?:\/\/[^\s]+$/i.test((text || "").trim()) ? partyUrl(text) : null;
}

// Read a QR code from pixels (a camera frame or a picture), scaled down so it stays quick.
function readQr(source, width, height, canvas) {
  const scale = Math.min(1, 800 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data || null;
}

// Point the camera at the host's QR code (on their Party tab), or pick a photo / screenshot of it.
// onUrl(url) gets the party address.
async function openQrScanner(onUrl) {
  try {
    await loadQrReader();
  } catch (e) {
    return toast(e.message);
  }
  let stream = null, finished = false, close;
  const canvas = document.createElement("canvas");
  const video = h("video", { class: "qr-video", autoplay: true, muted: true, playsinline: true });
  const status = h("p", { class: "muted small center" }, "Starting the camera…");
  const stop = () => { stream?.getTracks().forEach(t => t.stop()); stream = null; };
  const found = text => {
    const url = partyUrlFromQr(text);
    if (!url) {
      status.textContent = "That QR code isn't a party address. Scan the one on the host's Party tab.";
      return false;
    }
    finished = true;
    stop();
    close();
    onUrl(url);
    return true;
  };
  // Every frame: stop the camera as soon as the dialog is gone (closed any way), else look for a code.
  const tick = () => {
    if (finished) return;
    if (!video.isConnected) return stop();
    if (video.readyState >= 2 && video.videoWidth) {
      const text = readQr(video, video.videoWidth, video.videoHeight, canvas);
      if (text && found(text)) return;
    }
    requestAnimationFrame(tick);
  };
  const picture = h("input", { type: "file", accept: "image/*", hidden: true, onchange: () => {
    const file = picture.files[0];
    picture.value = "";
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const text = readQr(img, img.naturalWidth, img.naturalHeight, canvas);
      URL.revokeObjectURL(img.src);
      if (!text) status.textContent = "No QR code found in that picture. Try a closer, sharper one.";
      else found(text);
    };
    img.onerror = () => { status.textContent = "Couldn't open that picture."; };
    img.src = URL.createObjectURL(file);
  } });
  close = openModal("Scan the host's QR code", h("div", { class: "qr-scan" },
    h("div", { class: "qr-frame" }, video),
    status,
    h("p", { class: "muted small center" }, "It's on the host's Party tab (and in their Settings)."),
    picture), { footer: [
      h("button", { class: "btn", onclick: () => picture.click() }, icon("image"), "Use a picture"),
      h("button", { class: "btn", onclick: () => { stop(); close(); } }, "Cancel"),
    ] });
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera support");
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    if (!video.isConnected) return stop(); // closed while the camera was starting
    video.srcObject = stream;
    await video.play().catch(() => {});
    status.textContent = "Point the camera at the code.";
    requestAnimationFrame(tick);
  } catch (e) {
    const denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
    status.textContent = denied ? "Pack Rat isn't allowed to use the camera. Allow it, or use a picture of the code instead."
      : "No camera found. Use a picture of the code instead (a photo or screenshot).";
    video.parentElement.hidden = true;
  }
}

function openJoinModal() {
  let close;
  close = openModal("Bring a character", joinOptions(() => close()), { wide: true });
}

// Settings, in the app's own window: quit the app (and stop its server).
function quitSection() {
  return h("section", null,
    h("h2", null, "App"),
    h("button", { class: "btn", onclick: async () => {
      if (party.isHosting() && party.others().some(c => c.online) &&
          !confirm("Players are connected. Quitting stops the party for everyone. Quit anyway?")) return;
      ui.leaving = true;
      try { await party.quit(); } catch {}
      document.body.replaceChildren(h("div", { class: "empty" }, h("h2", null, "Pack Rat has closed"), h("p", null, "You can close this window.")));
      window.close();
    } }, icon("x"), "Quit Pack Rat"));
}

// ------------------------------------------------------------------ trade builder

// In a party, trading and shopping need the character to be one that's playing in it.
function requireLinked(c = store.char()) {
  if (!party.active || !c || party.isLinked(c.id)) return true;
  toast(`${c.name} is only on this device — bring them into the party first`);
  return false;
}

// Shown on the inventory of a character that's on this device but not playing in the party.
function notInPartyBanner() {
  const c = store.char();
  if (!party.active || !c || party.isLinked(c.id)) return null;
  return h("section", { class: "found-banner" },
    icon("users"),
    h("div", null, h("b", null, `${c.name} isn't in the party`),
      h("p", { class: "muted small" }, "They're saved on this device only. Bring them in to trade and shop with the party.")),
    h("button", { class: "btn primary", onclick: () => party.bring(c.id) }, "Bring into party"));
}

function openTradeBuilder(targetId = null, preselectUid = null) {
  const me = store.char();
  const others = party.others();
  if (!me || !requireLinked(me)) return;
  if (!others.length) return toast("Nobody else is in the party yet");
  let target = others.find(c => c.id === targetId) || others[0];
  const give = new Map(), ask = new Map();
  const giveCoins = {}, askCoins = {};
  let note = "", close;
  if (preselectUid) give.set(preselectUid, 1);

  const giveBox = h("div", { class: "picker" });
  const askBox = h("div", { class: "picker" });
  const askCoinBox = h("div");

  // Items inside a selected container travel with it, so they can't be picked separately.
  const insideSelected = (char, e, map) => {
    let p = e.parent;
    while (p) {
      if (map.has(p)) return true;
      p = char.items.find(x => x.uid === p)?.parent;
    }
    return false;
  };
  // Each side has a search box; picked items stay listed whatever the search.
  const queries = new Map();
  const matches = (char, e, q) => {
    if (!q) return true;
    const loc = e.parent ? char.items.find(x => x.uid === e.parent)?.item.name || "" : "";
    return [entryName(e), e.item.name, e.item.category, e.item.type, loc].some(t => t && t.toLowerCase().includes(q));
  };
  const drawPicker = (box, char, map) => {
    const q = (queries.get(box) || "").trim().toLowerCase();
    // Cards in a deck go with the deck, like a container's contents.
    const all = char.items.filter(e => !inDeck(char, e));
    const items = all.filter(e => map.has(e.uid) || matches(char, e, q)).sort((a, b) => a.item.name.localeCompare(b.item.name));
    setChildren(box, (items.length ? items.map(e => {
      const included = insideSelected(char, e, map);
      const checked = map.has(e.uid);
      const loc = e.parent ? char.items.find(x => x.uid === e.parent)?.item.name : null;
      return h("div", { class: "pick" + (checked ? " on" : "") + (included ? " included" : "") },
        h("label", { class: "check" },
          itemIcon(e.item, "row-icon small"),
          h("input", { type: "checkbox", checked: checked || included, disabled: included,
            onchange: ev => { ev.target.checked ? map.set(e.uid, e.qty > 1 ? 1 : e.qty) : map.delete(e.uid); drawPicker(box, char, map); } }),
          h("span", null, entryName(e),
            h("small", { class: "muted" }, e.qty > 1 ? ` ×${e.qty}` : "", included ? " — included with its container" : loc ? ` — ${e.strapped ? "on" : "in"} ${loc}` : ""))),
        checked && e.qty > 1 && h("input", { type: "number", min: 1, max: e.qty, value: map.get(e.uid), inputmode: "numeric",
          "aria-label": `How many ${entryName(e)}`,
          onchange: ev => map.set(e.uid, Math.max(1, Math.min(e.qty, Math.floor(+ev.target.value || 1)))) }));
    }) : [h("p", { class: "muted small pad" }, all.length ? `Nothing matches “${q}”.` : "No items.")]));
  };
  const searchBox = (box, getChar, map) => h("label", { class: "search trade-search" }, icon("search"),
    h("input", { type: "search", placeholder: "Search items…", "aria-label": "Search items",
      oninput: ev => { queries.set(box, ev.target.value); drawPicker(box, getChar(), map); } }));
  const askSearch = searchBox(askBox, () => target, ask);
  const coinInputs = (obj, have) => h("div", { class: "coin-grid small" }, COIN_ORDER.map(k =>
    h("label", { class: "field coin-field " + k },
      h("span", null, k.toUpperCase() + (have ? ` (${(have[k] || 0).toLocaleString()})` : "")),
      h("input", { type: "number", min: 0, max: have?.[k], inputmode: "numeric", value: obj[k] || "",
        oninput: ev => { obj[k] = Math.max(0, Math.floor(+ev.target.value || 0)); } }))));

  const drawAsk = () => {
    for (const k of COIN_ORDER) delete askCoins[k];
    ask.clear();
    queries.delete(askBox);
    askSearch.querySelector("input").value = "";
    drawPicker(askBox, target, ask);
    askCoinBox.replaceChildren(coinInputs(askCoins, target.coins || {}));
  };
  drawPicker(giveBox, me, give);
  drawAsk();

  const side = (map, char) => ({
    items: [...map].filter(([u]) => { const e = char.items.find(x => x.uid === u); return e && !insideSelected(char, e, map); })
      .map(([u, qty]) => ({ uid: u, qty })),
  });
  const send = async () => {
    const offer = {
      from: me.id, to: target.id, note,
      give: { ...side(give, me), coins: { ...giveCoins } },
      ask: { ...side(ask, target), coins: { ...askCoins } },
    };
    if (!offer.give.items.length && !offer.ask.items.length &&
        !COIN_ORDER.some(k => giveCoins[k] || askCoins[k])) return toast("Pick something to trade");
    const short = COIN_ORDER.find(k => (giveCoins[k] || 0) > (me.coins[k] || 0));
    if (short) return toast(`You don't have ${giveCoins[short]} ${short}`);
    try {
      // Make sure the server has our latest inventory before referencing it.
      await party.put(me.id);
      await party.offer(offer);
      close();
      toast(`Offer sent to ${target.name}`);
    } catch (e) {
      toast(e.message);
    }
  };

  const body = h("div", { class: "form" },
    h("label", { class: "field" }, h("span", null, "Trade with"),
      h("select", { onchange: ev => { target = others.find(c => c.id === ev.target.value); drawAsk(); } },
        others.map(c => h("option", { value: c.id, selected: c === target }, c.name + (c.online ? "" : " (offline)"))))),
    h("div", { class: "trade-grid" },
      h("div", { class: "trade-col" }, h("h4", null, `${me.name} gives`), searchBox(giveBox, () => me, give), giveBox, h("h4", null, "Coins"), coinInputs(giveCoins, me.coins)),
      h("div", { class: "trade-col" }, h("h4", null, "In return, ask for"), askSearch, askBox, h("h4", null, "Coins"), askCoinBox)),
    h("label", { class: "field" }, h("span", null, "Note (optional)"),
      h("input", { type: "text", maxlength: 500, placeholder: "e.g. For the rope you lent me", oninput: ev => { note = ev.target.value; } })),
    h("p", { class: "muted small" }, "Nothing moves until they accept. Giving a container also gives what's in it."));
  close = openModal("Offer a trade", body, { wide: true, footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: send }, icon("move"), "Send offer"),
  ] });
}
