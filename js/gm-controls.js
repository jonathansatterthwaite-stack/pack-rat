// GM controls: boards the GM makes for setting values by hand (Clockwork controls: see
// js/clockwork.js). A board is a picture (a map, a dial, anything) or a blank square, with pins to
// drag: each pin's x and y set a pair of values (e.g. shipX and shipY): Globals, or one player's or
// one item's Locals. Players' drawn icons follow.
//
// Kept on the GM's device (store.state.gmControls): { id, name, image?, pins: [pin] }, where a pin
// is { id, label, color, xVar, yVar, scope, target, xRange: [from, to], yRange: [from, to] }; xVar
// and yVar are value names, scope "party" (Globals), "character" or "item" (Locals).
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

// ------------------------------------------------------------------ the GM tab: Players · Values · Clockwork
// In a party: the players (gmPlayersView). Always: the Global and Local values with the boards
// (valuesView), and Clockwork's connections (clockworkView). Preparing outside a party, values are
// the campaign's starting ones.

const GM_TABS = [["players", "Players"], ["values", "Values"], ["clockwork", "Clockwork"]];

function renderGm() {
  const tabs = party.active ? GM_TABS : GM_TABS.filter(([k]) => k !== "players");
  const tab = tabs.some(([k]) => k === ui.gmTab) ? ui.gmTab : tabs[0][0];
  return h("div", { class: "view-gm view-party" },
    subTabs("GM", tabs, tab, k => { ui.gmTab = k; render(); }),
    tab === "players" ? gmPlayersView() : tab === "values" ? valuesView() : clockworkView());
}

// ------------------------------------------------------------------ the Controls section (Values tab)

function gmControlsSection() {
  const list = gmControls();
  return h("section", { class: "gm-controls" },
    h("div", { class: "section-head" }, h("h2", null, "Controls"),
      h("button", { class: "btn", onclick: () => editGmControl(null) }, icon("plus"), "New control")),
    h("p", { class: "muted small" }, "Boards for setting values by dragging pins: a map, any picture, or a blank square. Each pin's position sets a pair of values, like shipX and shipY (Globals, or a player's or an item's Locals), and players' icons follow as you drag. Kept on this device."),
    list.map(gmControlCard));
}

function gmControlCard(ctl) {
  const key = "gmc:" + ctl.id, closed = ui.collapsed.has(key);
  const toggle = () => { closed ? ui.collapsed.delete(key) : ui.collapsed.add(key); render(); };
  return h("div", { class: "group gm-control-card" },
    h("div", { class: "group-head" },
      h("button", { class: "collapse" + (closed ? " closed" : ""), "aria-expanded": String(!closed), onclick: toggle }, icon("chevron"), h("h3", null, ctl.name)),
      h("span", { class: "muted small" }, plural(ctl.pins.length, "pin")),
      iconBtn("edit", `Edit ${ctl.name}`, () => editGmControl(ctl)),
      iconBtn("trash", `Delete ${ctl.name}`, () => confirmDialog(`Delete the control “${ctl.name}”? The values it set keep their values.`, "Delete",
        () => commit(s => { s.gmControls = s.gmControls.filter(c => c.id !== ctl.id); }, `Deleted ${ctl.name}`, true)), "danger-hover")),
    !closed && [
      ctl.pins.length ? gmBoard(ctl) : h("p", { class: "muted pad" }, "No pins yet: Edit to add some."),
      ctl.pins.length > 0 && h("ul", { class: "gm-pin-legend" }, ctl.pins.map(p => h("li", null,
        h("span", { class: "gm-pin-swatch", style: { background: p.color } }), h("b", null, p.label || "Pin"),
        h("span", { class: "muted" }, ` for ${scopeLabel(p)}: ${pinValues(p)}`)))),
    ]);
}

// The board: the picture (or a blank square) with its pins on top.
function gmBoard(ctl) {
  const board = h("div", { class: "gm-board" + (ctl.image ? "" : " blank") });
  if (ctl.image) board.append(storedImage(ctl.image, "gm-board-img", img => img.replaceWith(h("div", { class: "gm-board-missing muted small" }, "Picture not on this device"))));
  board.append(...ctl.pins.map(p => gmPin(board, p)));
  return h("div", { class: "gm-board-wrap" }, board);
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

  // Send the values at most every 150 ms while moving, and always once when it stops.
  let timer = null, last = 0;
  const send = () => {
    clearTimeout(timer);
    timer = null;
    last = Date.now();
    const sets = [];
    if (pin.xVar) sets.push(putValue(pin.scope, pin.target, valueKey(pin.xVar), axisValue(x, pin.xRange)));
    if (pin.yVar) sets.push(putValue(pin.scope, pin.target, valueKey(pin.yVar), axisValue(y, pin.yRange)));
    return Promise.all(sets).catch(e => toast(e.message));
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

function editGmControl(ctl) {
  const isNew = !ctl;
  const draft = ctl ? clone(ctl) : { id: "gc" + uid(), name: "", pins: [] };
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
    draft.name = (draft.name || "").trim() || "Control";
    const bad = draft.pins.flatMap(p => [p.xVar, p.yVar]).filter(n => n && !isValueName(n));
    if (bad.length) return toast(`Not a value name: ${bad.join(", ")} (a letter, then letters, digits or _; not starting gm_, global_, local_ or state_)`);
    if (draft.pins.some(p => !p.xVar && !p.yVar)) return toast("Each pin needs a value to set, across or down");
    close();
    commit(s => {
      s.gmControls = s.gmControls || [];
      const i = s.gmControls.findIndex(c => c.id === draft.id);
      if (i >= 0) s.gmControls[i] = draft; else s.gmControls.push(draft);
    }, isNew ? `Made ${draft.name}` : `Saved ${draft.name}`);
  };

  close = openModal(isNew ? "New control" : `Edit ${ctl.name}`, h("div", { class: "form" },
    h("label", { class: "field" }, h("span", null, "Name"),
      h("input", { type: "text", value: draft.name, maxlength: 60, placeholder: "e.g. Sea chart, Doom clock, Weather", oninput: e => { draft.name = e.target.value; } })),
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
