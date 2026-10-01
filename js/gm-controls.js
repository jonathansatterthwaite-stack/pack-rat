// GM controls: the GM tab, its Controls tab, and boards for setting values by hand (Clockwork
// controls: see js/clockwork.js; panels, which hold every control, are in js/control-panels.js).
// A board is a picture (a map, a dial, anything) or a blank square, with pins to drag: each pin's
// x and y set a pair of values (e.g. shipX and shipY): Globals, or one player's or one item's
// Locals. Players' drawn icons follow.
//
// A board is a panel's control: { type: "board", board: { image?, pins: [pin] } }, where a pin is
// { id, label, color, xVar, yVar, scope, target, xRange: [from, to], yRange: [from, to] }; xVar
// and yVar are value names, scope "party" (Globals), "character" or "item" (Locals). (Boards were
// controls of their own; normalizeData puts each in a panel.)
// A pin has no position of its own: it shows where its values are, so setting them any other way
// (the Values tab) moves it too.

const PIN_COLORS = ["#c0392b", "#2e86de", "#27ae60", "#e67e22", "#8e44ad", "#16a085", "#d4ac0d", "#34495e"];

const gmControls = () => store.state.gmControls || [];

// ------------------------------------------------------------------ who's the GM
// A device is the GM in a party when the host has made it one (party.isGm); outside a party when
// it's set to the GM role (Settings), to prepare: then values are the campaign's starting ones,
// which go to the party when the campaign is loaded into one.

const isGmDevice = () => party.active ? party.isGm() : ui.role === "gm";

// An axis maps a position across the board (0 at the left or top, 1 at the right or bottom) onto a
// range of values; a range can run backwards (from 10 down to 0).
const clamp01 = v => Math.max(0, Math.min(1, v));
const axisPos = (value, [from, to]) => to === from ? 0.5 : clamp01((value - from) / (to - from));
const axisValue = (pos, [from, to]) => Math.round((from + pos * (to - from)) * 1000) / 1000;

function scopeLabel(pin) {
  if (pin.scope === "party") return "everyone";
  const [charId, entryUid] = pin.target.split("/");
  const c = gmChars().find(x => x.id === charId);
  if (!c) return "a player who has left";
  if (pin.scope === "character") return c.name;
  const e = c.items.find(x => x.uid === entryUid);
  return e ? `${c.name}'s ${entryName(e)}` : `an item ${c.name} no longer has`;
}

// "shipX = 0.42 · shipY = 0.8"
function pinValues(pin) {
  return [pin.xVar, pin.yVar].filter(Boolean).map(n => {
    const v = valueAt(pin.scope, pin.target, valueKey(n));
    return `${n} = ${v === undefined ? "not set" : v}`;
  }).join(" · ");
}

// ------------------------------------------------------------------ the GM tab: Players · Values · Controls · Clockwork
// Controls (panels, then the Global and Local values they set, then Clockwork's connections: what
// drives what), Players (in a party: gmPlayersView), Treasure. Preparing outside a party, values
// are the campaign's starting ones.

const GM_TABS = [["controls", "Controls"], ["players", "Players"], ["treasure", "Treasure"]];

function renderGm() {
  const tabs = party.active ? GM_TABS : GM_TABS.filter(([k]) => k !== "players");
  const tab = tabs.some(([k]) => k === ui.gmTab) ? ui.gmTab : tabs[0][0];
  return h("div", { class: "view-gm view-party" },
    subTabs("GM", tabs, tab, k => { ui.gmTab = k; render(); }),
    tab === "players" ? gmPlayersView() : tab === "treasure" ? treasureView() : gmControlsPage());
}

// ------------------------------------------------------------------ the Controls tab
// A second row of tabs: Panels, Values (the Global and Local values) and Connections (what drives
// what: Clockwork's connections).

const GM_CONTROLS_TABS = [["panels", "Panels"], ["values", "Values"], ["connections", "Connections"]];

function gmControlsPage() {
  const tab = GM_CONTROLS_TABS.some(([k]) => k === ui.gmControlsTab) ? ui.gmControlsTab : "panels";
  return [
    subTabs("Controls", GM_CONTROLS_TABS, tab, k => { ui.gmControlsTab = k; render(); }),
    tab === "values" ? valuesView() : tab === "connections" ? clockworkView() : gmControlsSection(),
  ];
}

function gmControlsSection() {
  const list = gmControls();
  return h("section", { class: "gm-controls" },
    h("div", { class: "section-head" }, h("h2", null, "Panels"),
      h("button", { class: "btn primary", onclick: () => editControlPanel(null) }, icon("plus"), "New panel")),
    h("p", { class: "muted small" }, "What you use to set values in play: panels, grids of sliders, switches, buttons, dropdowns, boards, icons and text, arranged as you like. Each sets a Global value, or a player's or an item's Locals, and players' icons follow. Kept on this device."),
    list.length ? list.map(controlPanelCard)
      : h("div", { class: "empty" }, h("p", null, "No controls yet. Make a panel, then arrange controls on it.")));
}

// ------------------------------------------------------------------ boards
// A board is a control in a panel (js/control-panels.js), ctl.board = { image?, pins: [pin] }: a
// picture (or a blank square) with pins on top, as large as fits the space it has. Expanded, it
// fills the screen to zoom (buttons, Ctrl+wheel, pinch) and scroll.

// zoom: () => the zoom (expanded only: then it scrolls).
function gmBoard(board, { zoom = null } = {}) {
  const el = h("div", { class: "gm-board" + (board.image ? "" : " blank") });
  const inner = h("div", { class: "gm-board-inner" }, el);
  const box = h("div", { class: "gm-board-fit" + (zoom ? " zoomable" : "") }, inner);
  let ratio = 1;
  const fit = () => {
    const w = box.clientWidth, ht = box.clientHeight;
    if (!w || !ht) return;
    const bw = Math.min(w, ht * ratio) * (zoom ? zoom() : 1);
    el.style.width = bw + "px";
    el.style.height = bw / ratio + "px";
  };
  if (board.image) {
    const img = storedImage(board.image, "gm-board-img", img => img.replaceWith(h("div", { class: "gm-board-missing muted small" }, "Picture not on this device")));
    const sized = () => { if (img.naturalWidth) { ratio = img.naturalWidth / img.naturalHeight; fit(); } };
    img.addEventListener("load", sized);
    if (img.complete) sized();
    el.append(img);
  }
  el.append(...(board.pins || []).map(p => gmPin(el, p)));
  new ResizeObserver(fit).observe(box);
  setTimeout(fit); // once it's on the page (the observer waits for a frame, which a hidden window doesn't draw)
  box.refit = fit;
  return box;
}

// The pins' key: each pin's colour, label, what it sets and the values now.
const pinLegend = board => (board.pins || []).length > 0 && h("ul", { class: "gm-pin-legend" }, board.pins.map(p => h("li", null,
  h("span", { class: "gm-pin-swatch", style: { background: p.color } }), h("b", null, p.label || "Pin"),
  h("span", { class: "muted" }, ` for ${scopeLabel(p)}: ${pinValues(p)}`))));

// A board full screen, to zoom and scroll.
function openBoardZoom(board, title) {
  let zoom = 1;
  const view = gmBoard(board, { zoom: () => zoom });
  const pct = h("span", { class: "board-zoom-pct" }, "100%");
  const setZoom = (z, cx = 0.5, cy = 0.5) => {
    // Keep the point under (cx, cy) of the view where it is.
    const ax = view.scrollLeft + view.clientWidth * cx, ay = view.scrollTop + view.clientHeight * cy;
    const fx = ax / Math.max(1, view.scrollWidth), fy = ay / Math.max(1, view.scrollHeight);
    zoom = Math.max(1, Math.min(8, z));
    view.refit();
    view.scrollLeft = fx * view.scrollWidth - view.clientWidth * cx;
    view.scrollTop = fy * view.scrollHeight - view.clientHeight * cy;
    pct.textContent = Math.round(zoom * 100) + "%";
  };
  const at = ev => { const r = view.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]; };
  view.addEventListener("wheel", ev => {
    if (!ev.ctrlKey) return; // plain wheel scrolls
    ev.preventDefault();
    setZoom(zoom * (ev.deltaY < 0 ? 1.15 : 1 / 1.15), ...at(ev));
  }, { passive: false });
  // Pinch (two fingers on the board, not on a pin).
  const touches = new Map();
  let pinch = null;
  view.addEventListener("pointerdown", ev => {
    if (ev.pointerType !== "touch" || ev.target.closest(".gm-pin")) return;
    touches.set(ev.pointerId, ev);
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zoom };
    }
  });
  view.addEventListener("pointermove", ev => {
    if (!touches.has(ev.pointerId)) return;
    touches.set(ev.pointerId, ev);
    if (!pinch || touches.size !== 2) return;
    const [a, b] = [...touches.values()];
    const mid = { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
    setZoom(pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d, ...at(mid));
  });
  const lift = ev => { touches.delete(ev.pointerId); if (touches.size < 2) pinch = null; };
  view.addEventListener("pointerup", lift);
  view.addEventListener("pointercancel", lift);

  // The key shows the values as they are: refreshed when a pin is let go (or moved by keys).
  const legend = h("div", { class: "board-zoom-legend" }, pinLegend(board));
  const refresh = () => setTimeout(() => setChildren(legend, pinLegend(board)), 300);
  view.addEventListener("pointerup", refresh);
  view.addEventListener("keyup", refresh);

  const root = document.getElementById("modal-root");
  const close = () => { overlay.remove(); document.body.classList.toggle("modal-open", root.children.length > 0); };
  const overlay = h("div", { class: "reader board-zoom", role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "reader-bar" },
      h("div", { class: "reader-title" }, title),
      iconBtn("zoomOut", "Zoom out", () => setZoom(zoom / 1.25)), pct, iconBtn("zoomIn", "Zoom in", () => setZoom(zoom * 1.25)),
      h("button", { class: "btn", onclick: () => setZoom(1) }, "Fit"),
      h("button", { class: "btn primary", onclick: close }, "Done")),
    view, legend);
  root.append(overlay);
  document.body.classList.add("modal-open");
}

// A pin: drag it (or select it and use the arrow keys) to set its values.
function gmPin(board, pin) {
  const at = name => name ? valueAt(pin.scope, pin.target, valueKey(name)) : undefined;
  const vx = at(pin.xVar), vy = at(pin.yVar);
  let x = vx === undefined ? 0.5 : axisPos(vx, pin.xRange), y = vy === undefined ? 0.5 : axisPos(vy, pin.yRange);
  const el = h("button", { type: "button", class: "gm-pin" + (vx === undefined && vy === undefined ? " unset" : ""),
    "aria-label": `${pin.label || "Pin"}: drag, or use the arrow keys` },
    h("span", { class: "gm-pin-dot" }), pin.label && h("span", { class: "gm-pin-label" }, pin.label));
  el.style.setProperty("--pin", pin.color || PIN_COLORS[0]);
  const place = () => {
    el.style.left = x * 100 + "%";
    el.style.top = y * 100 + "%";
    el.title = `${pin.label || "Pin"} (${scopeLabel(pin)}): ${[pin.xVar && `${pin.xVar} = ${axisValue(x, pin.xRange)}`, pin.yVar && `${pin.yVar} = ${axisValue(y, pin.yRange)}`].filter(Boolean).join(", ")}`;
  };
  place();

  // Through Clockwork (js/clockwork.js), as the GM: shown on this device's live icons at once while
  // it moves, sent at most every 150 ms, and always once when it stops.
  let timer = null, last = 0;
  const pinValues = () => [[pin.xVar, axisValue(x, pin.xRange)], [pin.yVar, axisValue(y, pin.yRange)]].filter(([n]) => n);
  const send = () => {
    clearTimeout(timer);
    timer = null;
    last = Date.now();
    return Promise.all(pinValues().map(([n, v]) => clockwork.change(...clockwork.at(pin.scope, pin.target, n), v, "gm").done));
  };
  const soon = () => { if (!timer) timer = setTimeout(send, Math.max(0, 150 - (Date.now() - last))); };

  let dragging = false;
  const moveTo = ev => {
    const r = board.getBoundingClientRect();
    // A pin that sets only one value slides along that axis.
    if (pin.xVar) x = clamp01((ev.clientX - r.left) / r.width);
    if (pin.yVar) y = clamp01((ev.clientY - r.top) / r.height);
    el.classList.remove("unset");
    place();
    for (const [n, v] of pinValues()) clockwork.preview(...clockwork.at(pin.scope, pin.target, n), v);
    soon();
  };
  el.addEventListener("pointerdown", ev => {
    ev.preventDefault();
    el.focus();
    try { el.setPointerCapture(ev.pointerId); } catch {} // keeps the drag when the pointer leaves the pin
    dragging = true;
    holdRender(true); // party updates mustn't redraw the board mid-drag
    el.classList.add("dragging");
  });
  el.addEventListener("pointermove", ev => { if (dragging) moveTo(ev); });
  const stop = async () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("dragging");
    await send();
    clockwork.endPreview();
    holdRender(false);
  };
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
  el.addEventListener("keydown", ev => {
    const step = ev.shiftKey ? 0.1 : 0.01;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    if (pin.xVar) x = clamp01(x + d[0]);
    if (pin.yVar) y = clamp01(y + d[1]);
    el.classList.remove("unset");
    place();
    soon();
  });
  return el;
}

// ------------------------------------------------------------------ making and editing a control

// Where a pin can apply: Globals (everyone), a player's Locals, or one of a player's items with a drawn icon.
function pinScopeOptions(current) {
  const opts = [h("option", { value: "party:" }, "Everyone (Global values)")];
  for (const c of gmChars()) {
    const items = c.items.filter(e => e.item.iconDoc);
    opts.push(h("optgroup", { label: c.name },
      h("option", { value: "character:" + c.id }, `${c.name} (their Local values)`),
      items.map(e => h("option", { value: `item:${c.id}/${e.uid}` }, entryName(e)))));
  }
  if (current !== "party:" && !opts.some(o => o.value === current || [...(o.children || [])].some(x => x.value === current))) {
    opts.push(h("option", { value: current }, "(no longer in the party)"));
  }
  return opts;
}

// A value name from a control's name: "Ship's position" -> "ships_position".
const valueSlug = text => {
  const s = (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
  return isValueName(s) ? s : "pin" + (s ? "_" + s : "");
};

// Edit a board's picture and pins: onSave(board) with the changed copy. name: its control's label
// (new pins' value names start from it).
function editBoard(board, onSave, name = "") {
  const draft = clone(board || { pins: [] });
  draft.name = name;
  let close;
  const known = [...new Set([...knownValues().values()].map(v => v.name))].sort();
  const listId = "gm-names-" + uid();

  const bgBox = h("div", { class: "inline wrap gm-bg" });
  const drawBg = () => setChildren(bgBox,
    draft.image ? storedImage(draft.image, "pic-thumb") : h("span", { class: "gm-bg-blank", title: "Blank square" }),
    h("button", { type: "button", class: "btn", onclick: () => pickImageFiles(false, async ([file]) => {
      try { draft.image = await addImageFile(file); drawBg(); } catch (e) { toast(e.message); }
    }) }, icon("image"), draft.image ? "Change picture…" : "Choose a picture…"),
    draft.image && h("button", { type: "button", class: "btn", onclick: () => { delete draft.image; drawBg(); } }, "Blank square instead"));
  drawBg();

  const pinsBox = h("div", { class: "gm-pin-rows" });
  const num = (value, label, onSet) => h("input", { type: "number", step: "any", value, "aria-label": label, class: "gm-range",
    onchange: e => { if (e.target.value !== "") onSet(+e.target.value); } });
  const varInput = (pin, key, label) => h("input", { type: "text", list: listId, value: pin[key] || "", placeholder: "value name", "aria-label": label,
    class: pin[key] && !isValueName(pin[key]) ? "invalid" : "", spellcheck: "false", autocomplete: "off",
    onchange: e => { pin[key] = e.target.value.trim(); e.target.classList.toggle("invalid", !!pin[key] && !isValueName(pin[key])); } });
  const drawPins = () => {
    setChildren(pinsBox, draft.pins.map(pinRow));
    // A select shows its choice only once its options are in it.
    pinsBox.querySelectorAll("select").forEach((s, i) => { s.value = `${draft.pins[i].scope}:${draft.pins[i].target}`; });
  };
  const pinRow = (pin, i) => h("div", { class: "gm-pin-row" },
    h("div", { class: "gm-pin-row-head" },
      h("input", { type: "color", value: pin.color, "aria-label": "Colour", onchange: e => { pin.color = e.target.value; } }),
      h("input", { type: "text", value: pin.label || "", placeholder: "Label", maxlength: 40, "aria-label": "Label", class: "grow",
        oninput: e => { pin.label = e.target.value; } }),
      iconBtn("trash", "Remove pin", () => { draft.pins.splice(i, 1); drawPins(); }, "danger-hover")),
    h("div", { class: "gm-pin-grid" },
      h("span", { class: "muted small" }, "Across (x)"), varInput(pin, "xVar", "Across sets"),
      h("span", { class: "gm-range-pair" }, num(pin.xRange[0], "Left edge", v => { pin.xRange[0] = v; }), "to", num(pin.xRange[1], "Right edge", v => { pin.xRange[1] = v; })),
      h("span", { class: "muted small" }, "Down (y)"), varInput(pin, "yVar", "Down sets"),
      h("span", { class: "gm-range-pair" }, num(pin.yRange[0], "Top edge", v => { pin.yRange[0] = v; }), "to", num(pin.yRange[1], "Bottom edge", v => { pin.yRange[1] = v; }))),
    h("label", { class: "field" }, h("span", null, "Sets the values for"),
      h("select", { onchange: e => { const [scope, target] = e.target.value.split(/:(.*)/); pin.scope = scope; pin.target = target || ""; } },
        pinScopeOptions(`${pin.scope}:${pin.target}`))));
  const addPin = () => {
    const n = draft.pins.length + 1, base = valueSlug(draft.name) + (n > 1 ? n : "");
    draft.pins.push({ id: "p" + uid(), label: `Pin ${n}`, color: PIN_COLORS[(n - 1) % PIN_COLORS.length],
      xVar: base + "_x", yVar: base + "_y", scope: "party", target: "", xRange: [0, 1], yRange: [0, 1] });
    drawPins();
  };
  drawPins();

  const save = () => {
    const bad = draft.pins.flatMap(p => [p.xVar, p.yVar]).filter(n => n && !isValueName(n));
    if (bad.length) return toast(`Not a value name: ${bad.join(", ")} (a letter, then letters, digits or _; not starting gm_, global_, local_ or state_)`);
    if (draft.pins.some(p => !p.xVar && !p.yVar)) return toast("Each pin needs a value to set, across or down");
    close();
    const { name: _, ...out } = draft;
    onSave(out);
  };

  close = openModal(name ? `Board: ${name}` : "Board", h("div", { class: "form" },
    h("div", { class: "field" }, h("span", null, "Background"), bgBox),
    h("div", { class: "section-head" }, h("h4", null, "Pins"), h("button", { type: "button", class: "btn", onclick: addPin }, icon("plus"), "Add pin")),
    h("p", { class: "muted small" }, "Each pin sets up to two values: one from its position across the board, one from its position down it. Choose what each edge is worth (a range can run backwards). Leave one empty to use only the other. Drawings read them as global_name or local_name."),
    pinsBox,
    h("datalist", { id: listId }, known.map(n => h("option", { value: n })))),
  { wide: true, footer: [
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: save }, icon("check"), "Save"),
  ] });
}
