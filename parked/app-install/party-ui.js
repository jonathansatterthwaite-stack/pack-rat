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
          typeof qrcode === "function" && h("button", { class: "btn", onclick: () => showBigQr(url) }, "Show QR")),
        party.info?.securePort && h("span", { class: "muted small" },
          "Players can install the app from Settings → Install (one-time setup on each device).")))));
}

// ------------------------------------------------------------------ joining

// Ways to get a character into the party: new, brought from this device, or taken over.
function joinOptions(onDone = () => {}) {
  let name = "";
  const create = () => {
    if (!joinAs(name)) return;
    onDone();
  };
  const solo = (store.solo?.characters || []).filter(c => c.items.length || c.name !== "Adventurer");
  const others = party.others();
  return [
    h("section", { class: "join-card" },
      h("h3", null, "New character"),
      h("form", { class: "inline", onsubmit: e => { e.preventDefault(); create(); } },
        h("input", { type: "text", placeholder: "Character name", "aria-label": "Character name", oninput: e => { name = e.target.value; } }),
        h("button", { class: "btn primary", type: "submit" }, icon("plus"), "Create"))),
    solo.length > 0 && h("section", { class: "join-card" },
      h("h3", null, "Bring a character from this device"),
      h("p", { class: "muted small" }, "Copies them into the party. Your solo copy stays on this device."),
      h("div", { class: "group" }, solo.map(c => h("div", { class: "row" },
        h("div", { class: "row-main" }, h("div", { class: "row-title" }, c.name),
          h("div", { class: "row-sub" }, `${c.items.length} entries · ${fmtCost(coinTotalCp(c.coins))}`)),
        h("button", { class: "btn", onclick: () => {
          commit(s => {
            const copy = { ...clone(c), id: uid() };
            s.characters.push(copy);
            s.activeId = copy.id;
          }, `${c.name} joined the party`);
          onDone();
        } }, "Bring"))))),
    others.length > 0 && h("section", { class: "join-card" },
      h("h3", null, "Take over a party character"),
      h("p", { class: "muted small" }, "For when you switch devices. Characters that are open on another device can't be taken."),
      h("div", { class: "group" }, others.map(c => h("div", { class: "row" },
        onlineDot(c.online),
        h("div", { class: "row-main" }, h("div", { class: "row-title" }, c.name),
          h("div", { class: "row-sub" }, c.online ? "Being played right now" : `${c.items.length} entries`)),
        h("button", { class: "btn", disabled: c.online, onclick: () => party.claim(c.id).then(onDone) }, "Take over"))))),
  ];
}

// Create a party character. Returns false (and says why) if the name is empty.
function joinAs(name) {
  name = (name || "").trim();
  if (!name) {
    toast("Enter a name for your character");
    return false;
  }
  commit(s => {
    const c = newCharacter(name);
    s.characters.push(c);
    s.activeId = c.id;
  });
  return true;
}

// First thing a new player sees: just ask for a name.
function promptForName() {
  let name = "", close;
  const ok = () => { if (joinAs(name)) close(); };
  const others = (store.solo?.characters || []).some(c => c.items.length || c.name !== "Adventurer") ||
    party.others().some(c => !c.online);
  close = openModal("Welcome to the party!", h("form", { class: "form", onsubmit: e => { e.preventDefault(); ok(); } },
    h("p", null, "What's your character's name?"),
    h("label", { class: "field" }, h("span", null, "Character name"),
      h("input", { type: "text", maxlength: 60, autocomplete: "off", placeholder: "e.g. Thistle Underbough",
        oninput: e => { name = e.target.value; } })),
    others && h("p", { class: "muted small" }, "Already have a character? ",
      h("button", { type: "button", class: "link", onclick: () => close() }, "See other options"), ".")),
  { footer: [h("button", { class: "btn primary", onclick: ok }, icon("check"), "Join")] });
  // Phones don't focus automatically from openModal; the name is the only thing to do here.
  setTimeout(() => document.querySelector("#modal-root .overlay:last-child input")?.focus(), 50);
}

function renderJoin() {
  if (!ui.joinPrompted) {
    ui.joinPrompted = true;
    setTimeout(promptForName, 0);
  }
  return h("div", { class: "view-join" },
    h("div", { class: "join-hero" },
      icon("users", "big"),
      h("h2", null, "You've joined a party"),
      h("p", { class: "muted" }, "Everyone on this network shares one party. Pick who you're playing — your inventory is saved on the host computer and you can trade with the others.")),
    joinOptions());
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
        h("div", { class: "row-sub" }, `${c.items.length} entries · ${fmtCost(coinTotalCp(c.coins || {}))} in coin`)),
      iconBtn("chevron", open ? "Hide inventory" : "Show inventory", toggle, open ? "flip" : ""),
      h("button", { class: "btn primary", disabled: !store.char(), onclick: () => openTradeBuilder(c.id) }, icon("move"), "Trade")),
    open && (c.items.length
      ? h("ul", { class: "member-items" }, [...c.items].sort((a, b) => a.item.name.localeCompare(b.item.name)).map(e =>
        h("li", null, typeBadge(e.item.type), e.qty > 1 ? `${e.qty} × ` : "", e.item.name, h("span", { class: "muted" }, where(e)))))
      : h("p", { class: "muted pad" }, "Nothing carried.")));
}

function renderParty() {
  const incoming = party.trades.filter(t => t.status === "pending" && t.toMine);
  const outgoing = party.trades.filter(t => t.status === "pending" && t.fromMine);
  const history = party.trades.filter(t => t.status !== "pending").slice(0, 10);
  const others = party.others();
  return h("div", { class: "view-party" },
    h("section", { class: "party-banner" },
      h("div", { class: "section-head" },
        h("h2", null, "Party"),
        h("span", { class: "status" }, onlineDot(party.connected), party.connected ? "Live" : "Reconnecting…")),
      h("p", { class: "muted small" }, "Others on this network join by opening:"),
      joinAddresses(),
      party.isDesktopHost() && h("div", { class: "inline wrap host-actions" },
        h("span", { class: "muted small" }, "You're hosting this party."),
        h("button", { class: "btn danger", onclick: stopHosting }, "Stop hosting"))),
    incoming.length > 0 && h("section", null, h("h2", null, "Offers for you"), incoming.map(tradeCard)),
    outgoing.length > 0 && h("section", null, h("h2", null, "Your offers"), outgoing.map(tradeCard)),
    h("section", null,
      h("h2", null, "Party members"),
      others.length ? others.map(memberCard)
        : h("div", { class: "empty" }, h("p", null, "Nobody else has joined yet. Share the address above."))),
    h("section", null,
      h("div", { class: "section-head" }, h("h2", null, "Your characters"),
        h("button", { class: "btn", onclick: openJoinModal }, icon("plus"), "Add character")),
      h("div", { class: "group" }, store.state.characters.map(c => h("div", { class: "row" + (c.id === store.state.activeId ? " equipped" : "") },
        onlineDot(true),
        h("button", { class: "row-main", onclick: () => { commit(s => { s.activeId = c.id; }); go("inventory"); } },
          h("div", { class: "row-title" }, c.name, c.id === store.state.activeId && h("span", { class: "tag on" }, "active")),
          h("div", { class: "row-sub" }, `${c.items.length} entries`)))))),
    history.length > 0 && h("section", null, h("h2", null, "Recent trades"), history.map(tradeCard)));
}

// ------------------------------------------------------------------ hosting (desktop app)

function reloadApp() {
  ui.leaving = true;
  location.reload();
}

async function startHosting(port) {
  try {
    await party.host(true, port);
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
  let port = party.info.defaultPort || 8765;
  return h("section", null,
    h("h2", null, "Host a party"),
    h("p", { class: "muted small" }, "Let everyone at the table use Pack Rat on their own phone or laptop, with their own inventory, and trade items with each other. Players on the same Wi-Fi join by opening the address shown once the party starts. Nothing to install for them."),
    h("div", { class: "inline wrap" },
      h("label", { class: "field port-field" }, h("span", null, "Port"),
        h("input", { type: "number", min: 1024, max: 65535, value: port, inputmode: "numeric", oninput: e => { port = +e.target.value; } })),
      h("button", { class: "btn primary", onclick: () => startHosting(port) }, icon("users"), "Start hosting")),
    h("p", { class: "muted small" }, "If Windows asks whether Pack Rat may use the network, allow it on private networks. ",
      "Pack Rat also opens a secure (HTTPS) address on the next port up so players can install it as an app.")); 
}

function quitSection() {
  return h("section", null,
    h("h2", null, "App"),
    h("button", { class: "btn", onclick: async () => {
      if (party.active && party.others().some(c => c.online) &&
          !confirm("Players are connected. Quitting stops the party for everyone. Quit anyway?")) return;
      ui.leaving = true;
      try { await party.quit(); } catch {}
      document.body.replaceChildren(h("div", { class: "empty" }, h("h2", null, "Pack Rat has closed"), h("p", null, "You can close this window.")));
      window.close();
    } }, icon("x"), "Quit Pack Rat"));
}

// ------------------------------------------------------------------ install on this device
//
// A full "Install app" (beforeinstallprompt) only exists on secure pages (HTTPS
// or localhost). Players join the party over plain http://192.168.x.x, so on
// their phones we explain "Add to Home Screen" for their browser instead.

let installEvent = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installEvent = e;
  if (store.state) render();
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  writePref("packrat-install-dismissed", "1");
  toast("Pack Rat is installed");
});

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

// Not in the desktop app's own window, and not already running from the home screen.
function canOfferInstall() {
  return !isStandalone() && !party.isDesktopHost();
}

// Step-by-step "Add to Home Screen" instructions for the current device and browser.
function installSteps(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  if (ios && /CriOS|FxiOS|EdgiOS/.test(ua)) {
    return { device: "iPhone / iPad", steps: ["Tap the Share button in the address bar (the square with an arrow).",
      "Scroll down and tap “Add to Home Screen”.", "Tap “Add”."] };
  }
  if (ios) {
    return { device: "iPhone / iPad (Safari)", steps: ["Tap the Share button (the square with an arrow) at the bottom of the screen.",
      "Scroll down and tap “Add to Home Screen”.", "Tap “Add”. Pack Rat opens full-screen from the new icon."] };
  }
  if (/Android/.test(ua) && /SamsungBrowser/.test(ua)) {
    return { device: "Samsung Internet", steps: ["Tap the menu button (☰) at the bottom.", "Tap “Add page to”, then “Home screen”.", "Tap “Add”."] };
  }
  if (/Android/.test(ua) && /Firefox/.test(ua)) {
    return { device: "Firefox for Android", steps: ["Tap the menu button (⋮).", "Tap “Add to Home screen”.", "Tap “Add”."] };
  }
  if (/Android/.test(ua)) {
    return { device: "Android (Chrome)", steps: ["Tap the menu button (⋮) at the top right.", "Tap “Add to Home screen” (or “Install app”).",
      "Tap “Add” (or “Install”)."] };
  }
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) {
    return { device: "Safari on Mac", steps: ["In the menu bar, choose File → “Add to Dock…” (macOS Sonoma or later).", "Click “Add”."] };
  }
  if (/Edg\//.test(ua)) {
    return { device: "Microsoft Edge", steps: ["Open the menu (…) at the top right.", "Choose “Apps”, then “Install this site as an app”.",
      "If that option isn't there, choose “More tools” → “Pin to taskbar” or “Pin to Start” instead."] };
  }
  if (/Chrome\//.test(ua)) {
    return { device: "Google Chrome", steps: ["Open the menu (⋮) at the top right.", "Choose “Cast, save, and share”, then “Install page as app…” or “Create shortcut…”.",
      "Tick “Open as window” if it's offered, then confirm."] };
  }
  return { device: "this browser", steps: ["Look in the browser's menu or Share button for “Add to Home Screen”, “Install” or “Create shortcut”."] };
}

// On the plain-HTTP address with HTTPS available, installing starts with trusting the host.
function needsSecureSetup() {
  return party.active && !window.isSecureContext && !!party.info?.securePort;
}

async function openInstall() {
  if (needsSecureSetup()) return openSecureSetup();
  if (installEvent) {
    const e = installEvent;
    installEvent = null;
    e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") writePref("packrat-install-dismissed", "1");
    render();
    return;
  }
  const { device, steps } = installSteps();
  openModal("Put Pack Rat on your home screen", h("div", { class: "install-help" },
    h("p", null, "Get back into the party with one tap next session. On ", h("b", null, device), ":"),
    h("ol", null, steps.map(s => h("li", null, s))),
    party.active && !window.isSecureContext && h("p", { class: "muted small" },
      "The icon opens ", h("code", null, location.host), ", this party's address. If the host's address is different next time, scan the new QR code and add it again. ",
      "Your character is saved on the host, so nothing is lost."),
    !party.active && h("p", { class: "muted small" }, "Your inventory stays saved in this browser.")));
}

// One-time nudge after joining a party on a phone or another computer.
function installBanner() {
  if (!party.active || !canOfferInstall() || readPref("packrat-install-dismissed", "")) return null;
  const dismiss = () => { writePref("packrat-install-dismissed", "1"); render(); };
  const secure = needsSecureSetup();
  return h("div", { class: "install-banner", role: "note" },
    icon("download"),
    h("div", { class: "grow" },
      h("b", null, secure ? "Install Pack Rat as an app" : "Put Pack Rat on this device"),
      h("div", { class: "muted small" }, secure ? "Full-screen, loads instantly, one tap from your home screen. About 2 minutes, once per device."
        : "One tap to get back into the party next session.")),
    h("button", { class: "btn primary", onclick: openInstall }, secure ? "Set it up" : installEvent ? "Install" : "Show me how"),
    iconBtn("x", "Not now", dismiss));
}

// Steps to trust the host's certificate authority on this device.
function certSteps(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  if (ios) {
    return { device: "iPhone / iPad", safariOnly: /CriOS|FxiOS|EdgiOS/.test(ua), steps: [
      "Tap “Download certificate” below, then “Allow” and “Close”.",
      "Open the Settings app, tap “Profile Downloaded” near the top (or General → VPN & Device Management), tap “Install” and enter your passcode.",
      "In Settings → General → About → Certificate Trust Settings, switch on “Pack Rat Local CA”.",
    ] };
  }
  if (/Android/.test(ua)) {
    return { device: "Android", steps: [
      "Tap “Download certificate” below. If Chrome says it must be installed from Settings, tap OK — the file is saved in Downloads.",
      "Open Settings and search for “CA certificate” (usually Security → More security settings → Encryption & credentials → Install a certificate → CA certificate).",
      "Tap “Install anyway” and pick PackRat-CA.crt from Downloads.",
      "Use Chrome or Samsung Internet for Pack Rat — Firefox ignores these certificates.",
    ] };
  }
  if (/Windows/.test(ua)) {
    return { device: "Windows", steps: [
      "Download the certificate below and open PackRat-CA.crt.",
      "Click “Install Certificate…”, choose “Current User”, then “Place all certificates in the following store” → Browse → “Trusted Root Certification Authorities”.",
      "Click Finish and “Yes” on the warning, then restart the browser.",
    ] };
  }
  if (/Macintosh/.test(ua)) {
    return { device: "Mac", steps: [
      "Download the certificate below and open PackRat-CA.crt — Keychain Access adds it to your login keychain.",
      "Double-click “Pack Rat Local CA”, open “Trust”, and set “When using this certificate” to “Always Trust”.",
      "Close the window and enter your password.",
    ] };
  }
  return { device: "this device", steps: ["Download the certificate below and add it to the device's trusted certificate authorities."] };
}

function openSecureSetup() {
  const { device, steps, safariOnly } = certSteps();
  let close;
  const status = h("p", { class: "muted small", role: "status" });
  const check = async () => {
    status.textContent = "Checking…";
    if (await party.secureReachable()) {
      status.textContent = "Trusted! Opening the secure version…";
      ui.leaving = true;
      party.goSecure();
    } else {
      status.textContent = "Not trusted yet. Check the last step above — on some phones you need to close and reopen the browser afterwards.";
    }
  };
  close = openModal("Install Pack Rat as an app", h("div", { class: "install-help" },
    h("p", null, "Phones only install apps from secure addresses. This party's host has its own certificate — ",
      "this device needs to trust it once. On ", h("b", null, device), ":"),
    safariOnly && h("p", { class: "warn-text" }, "On iPhone the certificate has to be installed from Safari. Open this page in Safari first."),
    h("ol", null, steps.map(s => h("li", null, s))),
    h("div", { class: "inline wrap" },
      h("a", { class: "btn", href: "packrat-ca.crt", download: "PackRat-CA.crt" }, icon("download"), "Download certificate"),
      h("button", { class: "btn primary", onclick: check }, icon("check"), "I've done this — continue")),
    status,
    h("details", { class: "muted small" },
      h("summary", null, "Is this safe?"),
      h("p", null, "The certificate is made by the host's copy of Pack Rat and only works for addresses on home networks ",
        "(like 192.168.x.x and names ending in .local). It can't be used to fake real websites such as your bank. ",
        "You can remove it any time in the same settings where you installed it.")),
    h("p", { class: "muted small" }, "Rather not? You can keep playing at this address — it just can't be installed as a full app.")),
  { wide: true });
}

function installSection() {
  if (!canOfferInstall()) return null;
  return h("section", null,
    h("h2", null, "Install"),
    h("p", { class: "muted small" }, "Add Pack Rat to this device's home screen or desktop so it opens like an app."),
    h("button", { class: "btn", onclick: openInstall }, icon("download"),
      needsSecureSetup() ? "Set up app install" : installEvent ? "Install Pack Rat" : "Install on this device"));
}

function openJoinModal() {
  let close;
  close = openModal("Add a character", joinOptions(() => close()), { wide: true });
}

// ------------------------------------------------------------------ trade builder

function openTradeBuilder(targetId = null, preselectUid = null) {
  const me = store.char();
  const others = party.others();
  if (!me) return;
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
  const drawPicker = (box, char, map) => {
    const items = [...char.items].sort((a, b) => a.item.name.localeCompare(b.item.name));
    box.replaceChildren(...(items.length ? items.map(e => {
      const included = insideSelected(char, e, map);
      const checked = map.has(e.uid);
      const loc = e.parent ? char.items.find(x => x.uid === e.parent)?.item.name : null;
      return h("div", { class: "pick" + (checked ? " on" : "") + (included ? " included" : "") },
        h("label", { class: "check" },
          h("input", { type: "checkbox", checked: checked || included, disabled: included,
            onchange: ev => { ev.target.checked ? map.set(e.uid, e.qty > 1 ? 1 : e.qty) : map.delete(e.uid); drawPicker(box, char, map); } }),
          h("span", null, e.item.name,
            h("small", { class: "muted" }, e.qty > 1 ? ` ×${e.qty}` : "", included ? " — included with its container" : loc ? ` — ${e.strapped ? "on" : "in"} ${loc}` : ""))),
        checked && e.qty > 1 && h("input", { type: "number", min: 1, max: e.qty, value: map.get(e.uid), inputmode: "numeric",
          "aria-label": `How many ${e.item.name}`,
          onchange: ev => map.set(e.uid, Math.max(1, Math.min(e.qty, Math.floor(+ev.target.value || 1)))) }));
    }) : [h("p", { class: "muted small pad" }, "No items.")]));
  };
  const coinInputs = (obj, have) => h("div", { class: "coin-grid small" }, COIN_ORDER.map(k =>
    h("label", { class: "field coin-field " + k },
      h("span", null, k.toUpperCase() + (have ? ` (${(have[k] || 0).toLocaleString()})` : "")),
      h("input", { type: "number", min: 0, max: have?.[k], inputmode: "numeric", value: obj[k] || "",
        oninput: ev => { obj[k] = Math.max(0, Math.floor(+ev.target.value || 0)); } }))));

  const drawAsk = () => {
    for (const k of COIN_ORDER) delete askCoins[k];
    ask.clear();
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
      h("div", { class: "trade-col" }, h("h4", null, `${me.name} gives`), giveBox, h("h4", null, "Coins"), coinInputs(giveCoins, me.coins)),
      h("div", { class: "trade-col" }, h("h4", null, "In return, ask for"), askBox, h("h4", null, "Coins"), askCoinBox)),
    h("label", { class: "field" }, h("span", null, "Note (optional)"),
      h("input", { type: "text", maxlength: 500, placeholder: "e.g. For the rope you lent me", oninput: ev => { note = ev.target.value; } })),
    h("p", { class: "muted small" }, "Nothing moves until they accept. Giving a container also gives what's in it."));
  close = openModal("Offer a trade", body, { wide: true, footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: send }, icon("move"), "Send offer"),
  ] });
}
