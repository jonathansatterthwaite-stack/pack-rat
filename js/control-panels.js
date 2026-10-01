// Control panels: the GM's own panels of controls, laid out on a grid (boards with pins are in
// js/gm-controls.js; both are Clockwork controls, see js/clockwork.js). Each control sets a
// Global or Local value, or is just an icon or text.
//
// Kept with the boards in store.state.gmControls (the GM's device):
//   { id, kind: "panel", name, cols, rows, controls: [ctl], tabs?: [tab bar] }
//   ctl: { id, type, x, y, w, h,           its place on the grid (square cells, from 0 at the top left)
//          label?, color?, icon?,
//          page?, section?                 where it shows (see pages and sections below); none: every
//          reverse?                        slider and switch: more (on) is left or down, not right
//                                          or up (taller than wide, they stand upright)
//          scope, target, name,            the value it sets: scope "party" (a Global), "character"
//                                          or "item" (Locals), as boards' pins do
//          min, max, step                  slider and range slider (default: the value's own range)
//          name2                           range slider: the upper value (name is the lower)
//          vertices: [{ label, name, amount }], at: { x, y }
//                                          polygon: a corner per value; the handle (at, 0 to 1 across
//                                          and down) gives each corner's value amount × closeness
//          off, on                         switch (default 0 and 1)
//          action: "set" | "add", amount   button
//          options: [{ label, value }]     dropdown (default: the value's choices, else Off and On)
//          board: { image?, pins } }       board: a picture with pins (see gmBoard, js/gm-controls.js)

const CONTROL_TYPES = [["slider", "Slider"], ["range", "Range slider"], ["toggle", "Switch"], ["button", "Button"], ["dropdown", "Dropdown"],
  ["polygon", "Polygon"], ["board", "Board"], ["icon", "Icon"], ["text", "Text"]];
const SETS_VALUE = new Set(["slider", "toggle", "button", "dropdown"]); // one value, `name`
const isPanel = ctl => ctl?.kind === "panel";
const isUpright = ctl => ctl.h > ctl.w;
// The pictures a panel's boards use (so exports carry them).
const panelImages = panel => (panel.controls || []).map(c => c.board?.image).filter(Boolean);

// The value a control shows: as it's set where the control applies, else the value's default.
const specOfControl = (ctl, specs) => specs.get(`${ctl.scope === "party" ? "global" : "local"}:${ctl.name}`);
function controlValue(ctl, specs) {
  const v = ctl.name ? valueAt(ctl.scope, ctl.target, valueKey(ctl.name)) : undefined;
  return v ?? specOfControl(ctl, specs)?.value ?? 0;
}
const sendControl = (ctl, value) => sendNamed(ctl, ctl.name, value);
// Through Clockwork (js/clockwork.js), as the GM: set (resolves when the party has it), or shown on
// this device's live icons at once while it's dragged (preview), until it's let go (settle).
const sendNamed = (ctl, name, value) => clockwork.change(...clockwork.at(ctl.scope, ctl.target, name), value, "gm").done;
const previewNamed = (ctl, name, value) => clockwork.preview(...clockwork.at(ctl.scope, ctl.target, name), value);
const settle = sending => Promise.resolve(sending).finally(() => clockwork.endPreview());
// Another of a control's values (a range slider's upper, a polygon's corners): as set, else its default.
const namedSpec = (ctl, name, specs) => specs.get(`${ctl.scope === "party" ? "global" : "local"}:${name}`);
const namedValue = (ctl, name, specs, fallback) => (name ? valueAt(ctl.scope, ctl.target, valueKey(name)) : undefined) ?? namedSpec(ctl, name, specs)?.value ?? fallback;

// A drag on a control of Pack Rat's own (the range slider, the polygon): party updates wait until
// it's let go. start(ev) when pressed, move(ev) for the press and each move, end() when let go.
function dragOn(el, start, move, end) {
  el.addEventListener("pointerdown", ev => {
    if (ev.button > 0) return;
    ev.preventDefault();
    try { el.setPointerCapture(ev.pointerId); } catch {}
    holdRender(true);
    // Whatever happens, letting go ends it (and lets party updates through again).
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      try { end(); } finally { holdRender(false); }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    start?.(ev);
    move(ev);
  });
}
// Sending while something moves: at most every 150 ms (soon), and at once when it stops (now).
function throttled(send) {
  let timer = null, last = 0;
  const now = () => { clearTimeout(timer); timer = null; last = Date.now(); return send(); };
  return { now, soon: () => { if (!timer) timer = setTimeout(now, Math.max(0, 150 - (Date.now() - last))); } };
}
// Keep a square as large as its box allows (a polygon's).
function fitSquare(box, sq) {
  const fit = () => { const s = Math.min(box.clientWidth, box.clientHeight); if (s) { sq.style.width = s + "px"; sq.style.height = s + "px"; } };
  new ResizeObserver(fit).observe(box);
  setTimeout(fit); // the observer waits for a frame, which a hidden window doesn't draw
}

// ------------------------------------------------------------------ the range slider

function rangeControl(ctl, specs, label) {
  const spec = namedSpec(ctl, ctl.name, specs);
  const a0 = ctl.min ?? spec?.min ?? 0, b0 = ctl.max ?? spec?.max ?? 1, step = ctl.step ?? spec?.step;
  const from = Math.min(a0, b0), to = Math.max(a0, b0), span = to - from || 1;
  const snap = v => {
    v = Math.max(from, Math.min(to, v));
    if (typeof step === "number" && step > 0) v = from + Math.round((v - from) / step) * step;
    return Math.round(v * 1000) / 1000;
  };
  let lo = snap(namedValue(ctl, ctl.name, specs, from)), hi = snap(namedValue(ctl, ctl.name2, specs, to));
  if (lo > hi) [lo, hi] = [hi, lo];
  const up = isUpright(ctl), rev = !!ctl.reverse;
  const thumbLo = h("button", { type: "button", class: "cp-thumb", "aria-label": `${label || "Range"}: from` });
  const thumbHi = h("button", { type: "button", class: "cp-thumb", "aria-label": `${label || "Range"}: to` });
  const fill = h("div", { class: "cp-fill" });
  const track = h("div", { class: "cp-track" + (up ? " upright" : "") }, fill, thumbLo, thumbHi);
  const out = h("output", { class: "cp-out" });
  // Where a value sits along the track: 0 at the left (or bottom), 1 at the right (or top).
  const posOf = v => { const t = (v - from) / span; return rev ? 1 - t : t; };
  const place = () => {
    const a = posOf(lo), b = posOf(hi), s = Math.min(a, b), e = Math.max(a, b);
    for (const [el, p] of [[thumbLo, a], [thumbHi, b]]) el.style[up ? "bottom" : "left"] = p * 100 + "%";
    fill.style[up ? "bottom" : "left"] = s * 100 + "%";
    fill.style[up ? "height" : "width"] = (e - s) * 100 + "%";
    out.textContent = `${fmtNum(lo)} – ${fmtNum(hi)}`;
  };
  place();
  const sender = throttled(() => Promise.all([sendNamed(ctl, ctl.name, lo), sendNamed(ctl, ctl.name2, hi)]));
  const valueAtPointer = ev => {
    const r = track.getBoundingClientRect();
    if (!r.width || !r.height) return up ? hi : lo; // not on screen
    let t = up ? 1 - (ev.clientY - r.top) / r.height : (ev.clientX - r.left) / r.width;
    t = Math.max(0, Math.min(1, t));
    return snap(from + (rev ? 1 - t : t) * span);
  };
  // Which handle a press takes: the one pressed, else the nearer; with both in one place, the
  // way it's then dragged decides.
  let which = null;
  dragOn(track, ev => {
    const v = valueAtPointer(ev);
    which = lo === hi && (v === lo || ev.target.classList.contains("cp-thumb")) ? null
      : ev.target === thumbLo ? "lo" : ev.target === thumbHi ? "hi" : v > hi ? "hi" : v < lo ? "lo" : v - lo <= hi - v ? "lo" : "hi";
  }, ev => {
    const v = valueAtPointer(ev);
    if (!which) { if (v === lo) return; which = v > lo ? "hi" : "lo"; }
    if (which === "lo") lo = Math.min(v, hi); else hi = Math.max(v, lo);
    place();
    previewNamed(ctl, ctl.name, lo);
    previewNamed(ctl, ctl.name2, hi);
    sender.soon();
  }, () => settle(sender.now()));
  // Arrow keys move a handle the way the arrow points.
  const keys = end => ev => {
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key];
    if (!d) return;
    ev.preventDefault();
    const by = (rev ? -d : d) * (typeof step === "number" && step > 0 ? step : span / 100);
    if (end === "lo") lo = Math.min(snap(lo + by), hi); else hi = Math.max(snap(hi + by), lo);
    place();
    sender.now();
  };
  thumbLo.addEventListener("keydown", keys("lo"));
  thumbHi.addEventListener("keydown", keys("hi"));
  return h("div", { class: "cp-dual" + (up ? " upright" : "") }, track, out);
}

// ------------------------------------------------------------------ the polygon
// A corner per value. The handle moves anywhere inside; each corner's value is its amount times
// how close the handle is: all of it at the corner, shared with the next corner along an edge,
// shared by all at the middle (Wachspress coordinates: they always add up to 1).

// A regular polygon's corners, from the top, clockwise, in a 1 × 1 square.
const polyPoints = n => Array.from({ length: n }, (_, i) => {
  const a = -Math.PI / 2 + i * 2 * Math.PI / n;
  return [0.5 + 0.42 * Math.cos(a), 0.5 + 0.42 * Math.sin(a)];
});
const triArea = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
const pdist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function polyWeights(pts, p) {
  const n = pts.length, w = new Array(n).fill(0);
  const corner = pts.findIndex(q => pdist(p, q) < 1e-6);
  if (corner >= 0) { w[corner] = 1; return w; }
  for (let i = 0; i < n; i++) { // on an edge: shared by its two corners
    const j = (i + 1) % n;
    if (Math.abs(triArea(pts[i], pts[j], p)) < 1e-7) {
      const t = pdist(p, pts[i]) / pdist(pts[i], pts[j]);
      if (t >= 0 && t <= 1) { w[i] = 1 - t; w[j] = t; return w; }
    }
  }
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
    w[i] = triArea(a, b, c) / (triArea(p, a, b) * triArea(p, b, c));
  }
  const sum = w.reduce((x, y) => x + y, 0);
  return w.map(x => x / sum);
}

// The nearest point inside the polygon (it's convex: inside is the same side of every edge).
function clampToPoly(pts, p) {
  const n = pts.length, o = Math.sign(triArea(pts[0], pts[1], pts[2]));
  if (pts.every((q, i) => triArea(q, pts[(i + 1) % n], p) * o >= 0)) return p;
  let best = [0.5, 0.5], bd = Infinity;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    const q = [a[0] + t * dx, a[1] + t * dy], d = pdist(p, q);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

function polygonControl(ctl, specs, label, panel) {
  const verts = (ctl.vertices || []).slice(0, 8);
  if (verts.length < 3) return h("p", { class: "muted small" }, "A polygon needs 3 corners or more");
  const pts = polyPoints(verts.length);
  let at = clampToPoly(pts, ctl.at ? [ctl.at.x, ctl.at.y] : [0.5, 0.5]);
  const values = () => polyWeights(pts, at).map((w, i) => Math.round(w * (verts[i].amount ?? 1) * 1000) / 1000);
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  for (const q of pts) {
    const spoke = document.createElementNS(NS, "line");
    Object.entries({ x1: 50, y1: 50, x2: q[0] * 100, y2: q[1] * 100, class: "cp-poly-spoke" }).forEach(([k, v]) => spoke.setAttribute(k, v));
    svg.append(spoke);
  }
  const shape = document.createElementNS(NS, "polygon");
  shape.setAttribute("points", pts.map(q => `${q[0] * 100},${q[1] * 100}`).join(" "));
  shape.setAttribute("class", "cp-poly-shape");
  svg.append(shape);
  const knob = h("span", { class: "cp-poly-knob" });
  // Each corner's name and value, just inside it.
  const labels = verts.map((v, i) => {
    const el = h("span", { class: "cp-poly-label" });
    el.style.left = (0.5 + (pts[i][0] - 0.5) * 0.78) * 100 + "%";
    el.style.top = (0.5 + (pts[i][1] - 0.5) * 0.78) * 100 + "%";
    return el;
  });
  const sq = h("div", { class: "cp-poly-sq", tabindex: 0, role: "group",
    "aria-label": `${label || "Polygon"}: drag inside, or use the arrow keys` }, svg, ...labels, knob);
  const box = h("div", { class: "cp-poly" }, sq);
  fitSquare(box, sq);
  const place = () => {
    const vals = values();
    knob.style.left = at[0] * 100 + "%";
    knob.style.top = at[1] * 100 + "%";
    labels.forEach((el, i) => setChildren(el, verts[i].label || verts[i].name, " ", h("b", null, fmtNum(vals[i]))));
  };
  place();
  const sender = throttled(() => { const vals = values(); return Promise.all(verts.map((v, i) => sendNamed(ctl, v.name, vals[i]))); });
  // Where the handle is, kept with the control (on this device).
  const keep = () => updatePanel(panel.id, p => { const c = p.controls.find(c => c.id === ctl.id); if (c) c.at = { x: Math.round(at[0] * 1e4) / 1e4, y: Math.round(at[1] * 1e4) / 1e4 }; });
  dragOn(sq, null, ev => {
    const r = sq.getBoundingClientRect();
    if (!r.width || !r.height) return; // not on screen
    at = clampToPoly(pts, [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]);
    place();
    const vals = values();
    verts.forEach((v, i) => previewNamed(ctl, v.name, vals[i]));
    sender.soon();
  }, () => { settle(sender.now()); keep(); });
  sq.addEventListener("keydown", ev => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    const by = ev.shiftKey ? 0.1 : 0.02;
    at = clampToPoly(pts, [at[0] + d[0] * by, at[1] + d[1] * by]);
    place();
    sender.now();
    keep();
  });
  return box;
}
const fmtNum = v => String(Math.round(v * 1000) / 1000);
const dropdownOptions = (ctl, spec) => ctl.options?.length ? ctl.options
  : spec?.choices?.length ? spec.choices.map((label, value) => ({ label, value })) : [{ label: "Off", value: 0 }, { label: "On", value: 1 }];

// ------------------------------------------------------------------ a control, working

function controlLive(ctl, specs, panel) {
  const spec = specOfControl(ctl, specs), v = controlValue(ctl, specs);
  const label = ctl.label || ctl.name || "";
  const caption = label && h("span", { class: "cp-label" }, label);
  switch (ctl.type) {
    case "slider": {
      const min = ctl.min ?? spec?.min ?? 0, max = ctl.max ?? spec?.max ?? 1, step = ctl.step ?? spec?.step ?? "any";
      const out = h("output", { class: "cp-out" }, fmtNum(v));
      // Shown here at once while it moves, sent at most every 150 ms (players' icons follow), and
      // once when let go.
      let timer = null, last = 0, latest = v;
      const send = () => { clearTimeout(timer); timer = null; last = Date.now(); return sendControl(ctl, latest); };
      // Party updates mustn't redraw it mid-drag: held from pressing to letting go (a press that
      // doesn't move it fires no change).
      const release = () => { window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release); setTimeout(() => holdRender(false)); };
      const range = h("input", { type: "range", class: "cp-range" + (isUpright(ctl) ? " upright" : "") + (ctl.reverse ? " reverse" : ""),
        min: Math.min(min, max), max: Math.max(min, max), step, value: v, "aria-label": label || "Value",
        ...(isUpright(ctl) ? { "aria-orientation": "vertical" } : {}),
        onpointerdown: () => { holdRender(true); window.addEventListener("pointerup", release); window.addEventListener("pointercancel", release); },
        oninput: ev => {
          latest = +ev.target.value;
          out.textContent = fmtNum(latest);
          previewNamed(ctl, ctl.name, latest);
          if (!timer) timer = setTimeout(send, Math.max(0, 150 - (Date.now() - last)));
        },
        onchange: ev => { latest = +ev.target.value; settle(send()); } });
      return [caption, h("div", { class: "cp-slider" + (isUpright(ctl) ? " upright" : "") }, range, out)];
    }
    case "range":
      return [caption, rangeControl(ctl, specs, label)];
    case "polygon":
      return [caption, polygonControl(ctl, specs, label, panel)];
    case "toggle": {
      const on = ctl.on ?? 1, off = ctl.off ?? 0, isOn = v === on;
      return h("button", { type: "button", class: "cp-switch" + (isOn ? " on" : "") + (isUpright(ctl) ? " upright" : "") + (ctl.reverse ? " reverse" : ""),
        role: "switch", "aria-checked": String(isOn),
        onclick: () => sendControl(ctl, isOn ? off : on) }, h("span", { class: "cp-knob" }), h("span", null, label));
    }
    case "button":
      return h("button", { type: "button", class: "btn cp-btn", title: ctl.name ? `${ctl.action === "add" ? `Adds ${ctl.amount ?? 1} to` : `Sets`} ${ctl.name}${ctl.action === "add" ? "" : ` to ${ctl.amount ?? 1}`}` : "",
        onclick: () => sendControl(ctl, ctl.action === "add" ? Math.round((v + (ctl.amount ?? 1)) * 1000) / 1000 : ctl.amount ?? 1) },
        ctl.icon && iconSvg(ctl.icon, "cp-btn-icon"), label);
    case "dropdown":
      return [caption, h("select", { class: "cp-select", "aria-label": label || "Value", onchange: ev => sendControl(ctl, +ev.target.value) },
        dropdownOptions(ctl, spec).map(o => h("option", { value: o.value, selected: o.value === v }, o.label)))];
    case "icon":
      return [iconSvg(ctl.icon || "question", "cp-icon"), caption];
    case "board":
      return [caption, gmBoard(ctl.board || { pins: [] }),
        iconBtn("expand", "Expand: zoom and scroll", () => openBoardZoom(ctl.board || { pins: [] }, ctl.label || "Board"), "cp-expand")];
    default: // text: words, and the value it shows (if any)
      return [caption, ctl.name && h("b", { class: "cp-readout" }, showValue(spec, v))];
  }
}

// ------------------------------------------------------------------ pages and sections
// Tab bars are grid items like controls (panel.tabs): page tabs (text) choose the page, section
// tabs (icons) choose a section within it.
//   { id, kind: "page" | "section", page?, x, y, w, h, items: [{ id, label, icon? }] }
// Page tab bars show on every page; a section tab bar shows on its page (`page`; none: every page).
// A tab bar wider than it's tall lays its tabs along a row, else down a column.
// A control shows on its page and section (`page`, `section`; none: every page, every section).
// Only items that can show together can't overlap, so pages can use the same cells.

const panelItems = panel => [...(panel.tabs || []), ...panel.controls];
const isTabBar = item => item.kind === "page" || item.kind === "section";
const canShowTogether = (a, b) => (a.page == null || b.page == null || a.page === b.page)
  && (a.section == null || b.section == null || a.section === b.section);
const overlaps = (a, r) => a.x < r.x + r.w && r.x < a.x + a.w && a.y < r.y + r.h && r.y < a.y + a.h;

// The pages and sections there are, and which are showing (chosen on this device, by tab).
function panelView(panel) {
  const tabs = panel.tabs || [];
  const pages = tabs.filter(b => b.kind === "page").flatMap(b => b.items);
  const page = pages.find(t => t.id === ui.panelPage[panel.id])?.id ?? pages[0]?.id ?? null;
  const sections = tabs.filter(b => b.kind === "section" && (b.page == null || b.page === page)).flatMap(b => b.items);
  const section = sections.find(t => t.id === ui.panelSection[`${panel.id}/${page}`])?.id ?? sections[0]?.id ?? null;
  return { pages, page, sections, section };
}
const showing = (item, view) => (item.page == null || item.page === view.page) && (item.section == null || item.section === view.section);

// A tab bar, working: its tabs, the chosen one marked.
function tabBarLive(panel, bar, view) {
  const pageTabs = bar.kind === "page", active = pageTabs ? view.page : view.section;
  const pick = t => () => {
    if (pageTabs) ui.panelPage[panel.id] = t.id; else ui.panelSection[`${panel.id}/${view.page}`] = t.id;
    render();
  };
  return h("div", { class: `cp-tabs ${pageTabs ? "pages" : "sections"} ${bar.w >= bar.h ? "across" : "down"}`, role: "tablist",
    "aria-label": pageTabs ? "Pages" : "Sections" },
    bar.items.map((t, i) => h("button", { type: "button", role: "tab", class: t.id === active ? "active" : "", "aria-selected": String(t.id === active),
      title: t.label || `${pageTabs ? "Page" : "Section"} ${i + 1}`, onclick: pick(t) },
      pageTabs ? h("span", null, t.label || `Page ${i + 1}`)
        : t.icon ? iconSvg(t.icon, "cp-tab-icon") : h("span", { class: "cp-tab-letter" }, (t.label || "?").slice(0, 1).toUpperCase()))));
}

// ------------------------------------------------------------------ the grid

const placeCell = (el, r) => { el.style.gridColumn = `${r.x + 1} / span ${r.w}`; el.style.gridRow = `${r.y + 1} / span ${r.h}`; };
// Would `item` at r overlap something it can show with?
const clashes = (panel, item, r) => panelItems(panel).some(o => o.id !== item.id && canShowTogether(o, item) && overlaps(o, r));
const fitsPanel = (panel, r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= panel.cols && r.y + r.h <= panel.rows;

// Change one of this campaign's panels (found again by id: the data may have been replaced).
function updatePanel(panelId, fn, msg) {
  commit(s => { const p = (s.gmControls || []).find(c => c.id === panelId); if (p) fn(p); }, msg);
}
const findItem = (p, id) => panelItems(p).find(c => c.id === id);

function panelGrid(panel, editing) {
  const specs = knownValues(), view = panelView(panel);
  const grid = h("div", { class: "cp-grid" + (editing ? " editing" : "") });
  grid.style.setProperty("--cols", panel.cols);
  grid.style.setProperty("--rows", panel.rows);
  if (editing) {
    // What's being arranged: the page and section showing.
    const here = { id: null, page: view.page, section: view.section };
    for (let y = 0; y < panel.rows; y++) for (let x = 0; x < panel.cols; x++) {
      if (clashes(panel, here, { x, y, w: 1, h: 1 })) continue;
      const cell = h("button", { type: "button", class: "cp-empty", title: "Add a control here", "aria-label": `Add a control at column ${x + 1}, row ${y + 1}`,
        onclick: () => editPanelControl(panel, null, { x, y, page: view.page, section: view.section }) }, icon("plus"));
      placeCell(cell, { x, y, w: 1, h: 1 });
      grid.append(cell);
    }
  }
  for (const item of panelItems(panel)) if (showing(item, view)) grid.append(controlCell(panel, item, specs, editing, grid, view));
  return h("div", { class: "cp-wrap" }, grid);
}

function controlCell(panel, ctl, specs, editing, grid, view) {
  const tabs = isTabBar(ctl);
  const el = h("div", { class: tabs ? "cp-cell cp-type-tabs" : `cp-cell cp-type-${ctl.type}` });
  placeCell(el, ctl);
  if (ctl.color) el.style.setProperty("--cp", ctl.color);
  const live = () => tabs ? tabBarLive(panel, ctl, view) : controlLive(ctl, specs, panel);
  if (!editing) { el.append(...[live()].flat().filter(Boolean)); return el; }

  // Arranging: drag it to move, drag its corner to resize (or arrow keys; Shift+arrows resize).
  // A tab bar's tabs still work, to arrange each page and section in turn.
  const body = tabs ? live() : h("div", { class: "cp-inert", inert: true }, live());
  let draft = { x: ctl.x, y: ctl.y, w: ctl.w, h: ctl.h }, mode = null, start = null;
  const cellAt = ev => {
    const r = grid.getBoundingClientRect();
    return { x: Math.floor((ev.clientX - r.left) / (r.width / panel.cols)), y: Math.floor((ev.clientY - r.top) / (r.height / panel.rows)) };
  };
  const bad = r => clashes(panel, ctl, r) || !fitsPanel(panel, r);
  const show = () => { placeCell(el, draft); el.classList.toggle("clash", bad(draft)); };
  const finish = () => {
    const ok = !bad(draft);
    const moved = ["x", "y", "w", "h"].some(k => draft[k] !== ctl[k]);
    if (!ok) { draft = { x: ctl.x, y: ctl.y, w: ctl.w, h: ctl.h }; show(); }
    holdRender(false);
    if (ok && moved) updatePanel(panel.id, p => { const c = findItem(p, ctl.id); if (c) Object.assign(c, draft); });
  };
  const name = tabs ? (ctl.kind === "page" ? "Page tabs" : "Section tabs") : ctl.label || CONTROL_TYPES.find(t => t[0] === ctl.type)[1];
  const handle = h("button", { type: "button", class: "cp-handle" + (tabs ? " cp-handle-corner" : ""), "aria-label": `${name}: drag to move, or arrow keys (Shift to resize)`,
    title: tabs ? "Drag to move the tabs" : "",
    onkeydown: ev => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      if (!d) return;
      ev.preventDefault();
      draft = ev.shiftKey ? { ...draft, w: Math.max(1, draft.w + d[0]), h: Math.max(1, draft.h + d[1]) } : { ...draft, x: draft.x + d[0], y: draft.y + d[1] };
      if (bad(draft)) { draft = { x: ctl.x, y: ctl.y, w: ctl.w, h: ctl.h }; return; }
      finish();
    } }, tabs && icon("move"));
  const grip = h("span", { class: "cp-grip", "aria-hidden": "true" });
  const down = (ev, m) => {
    ev.preventDefault();
    ev.stopPropagation();
    mode = m;
    start = cellAt(ev);
    try { ev.target.setPointerCapture(ev.pointerId); } catch {}
    holdRender(true);
    el.classList.add("dragging");
  };
  const move = ev => {
    if (!mode) return;
    const c = cellAt(ev), dx = c.x - start.x, dy = c.y - start.y;
    draft = mode === "move" ? { ...draft, x: Math.max(0, Math.min(panel.cols - ctl.w, ctl.x + dx)), y: Math.max(0, Math.min(panel.rows - ctl.h, ctl.y + dy)) }
      : { ...draft, w: Math.max(1, Math.min(panel.cols - ctl.x, ctl.w + dx)), h: Math.max(1, Math.min(panel.rows - ctl.y, ctl.h + dy)) };
    show();
  };
  const up = () => { if (!mode) return; mode = null; el.classList.remove("dragging"); finish(); };
  handle.addEventListener("pointerdown", ev => down(ev, "move"));
  grip.addEventListener("pointerdown", ev => down(ev, "size"));
  for (const t of [handle, grip]) {
    t.addEventListener("pointermove", move);
    t.addEventListener("pointerup", up);
    t.addEventListener("pointercancel", up);
  }
  el.classList.add("arranging");
  el.classList.toggle("clash", bad(ctl)); // e.g. moved here when a tab was removed
  el.append(body, handle, grip,
    iconBtn("edit", tabs ? "Edit these tabs" : "Edit this control", () => tabs ? editTabBar(panel, ctl) : editPanelControl(panel, ctl), "cp-edit"));
  return el;
}

// ------------------------------------------------------------------ a panel's card

function controlPanelCard(panel) {
  const key = "gmc:" + panel.id, closed = ui.collapsed.has(key), editing = ui.panelEdit === panel.id;
  const toggle = () => { closed ? ui.collapsed.delete(key) : ui.collapsed.add(key); render(); };
  const view = panelView(panel);
  const where = [view.pages.find(t => t.id === view.page)?.label, view.sections.find(t => t.id === view.section)?.label].filter(Boolean).join(" › ");
  return h("div", { class: "group gm-control-card cp-card" },
    h("div", { class: "group-head" },
      h("button", { class: "collapse" + (closed ? " closed" : ""), "aria-expanded": String(!closed), onclick: toggle }, icon("chevron"), h("h3", null, panel.name)),
      h("span", { class: "muted small" }, plural(panel.controls.length, "control")),
      !closed && h("button", { class: "btn" + (editing ? " primary" : ""), onclick: () => { ui.panelEdit = editing ? null : panel.id; render(); } },
        icon(editing ? "check" : "grid"), editing ? "Done" : "Arrange"),
      iconBtn("edit", `Edit ${panel.name}`, () => editControlPanel(panel)),
      iconBtn("trash", `Delete ${panel.name}`, () => confirmDialog(`Delete the panel “${panel.name}”? The values it set keep their values.`, "Delete",
        () => commit(s => { s.gmControls = s.gmControls.filter(c => c.id !== panel.id); }, `Deleted ${panel.name}`, true)), "danger-hover")),
    !closed && [
      editing && h("div", { class: "cp-arrange-bar" },
        h("p", { class: "muted small" }, "Click + to add a control. Drag a control to move it, or its corner to resize it; or select it and use the arrow keys (Shift to resize). The pencil edits it.",
          where && [" Arranging ", h("b", null, where), ": choose another tab to arrange it."]),
        h("div", { class: "inline wrap" },
          h("button", { class: "btn", onclick: () => addTabBar(panel, "page", view) }, icon("plus"), "Page tabs"),
          h("button", { class: "btn", onclick: () => addTabBar(panel, "section", view) }, icon("plus"), "Section tabs"))),
      !panelItems(panel).length && !editing ? h("p", { class: "muted pad" }, "No controls yet: Arrange to add some.") : panelGrid(panel, editing),
    ]);
}

// ------------------------------------------------------------------ tab bars: adding and editing

// A new tab bar where there's room: page tabs along a top or bottom row, section tabs down a side.
function addTabBar(panel, kind, view) {
  const pageTabs = kind === "page";
  const bar = { id: "t" + uid(), kind, ...(pageTabs ? {} : { page: view.page }) };
  const pagesSoFar = view.pages.length, sectionsSoFar = view.sections.length;
  bar.items = pageTabs
    ? (pagesSoFar ? [{ id: "pg" + uid(), label: `Page ${pagesSoFar + 1}` }] : [{ id: "pg" + uid(), label: "Page 1" }, { id: "pg" + uid(), label: "Page 2" }])
    : (sectionsSoFar ? [{ id: "sc" + uid(), label: `Section ${sectionsSoFar + 1}` }] : [{ id: "sc" + uid(), label: "Section 1" }, { id: "sc" + uid(), label: "Section 2" }]);
  // Edges first: page tabs the top row then the bottom one; section tabs the left column then the right.
  const sizes = pageTabs ? [Math.min(panel.cols, 3), 2, 1].map(w => ({ w, h: 1 })) : [Math.min(panel.rows, 3), 2, 1].map(h => ({ w: 1, h }));
  const lines = (n, first, last) => [first, last, ...Array.from({ length: n }, (_, i) => i).filter(i => i !== first && i !== last)];
  for (const s of sizes) {
    const spots = pageTabs
      ? lines(panel.rows - s.h + 1, 0, panel.rows - s.h).flatMap(y => Array.from({ length: panel.cols - s.w + 1 }, (_, x) => ({ x, y })))
      : lines(panel.cols - s.w + 1, 0, panel.cols - s.w).flatMap(x => Array.from({ length: panel.rows - s.h + 1 }, (_, y) => ({ x, y })));
    const spot = spots.find(p => fitsPanel(panel, { ...p, ...s }) && !clashes(panel, bar, { ...p, ...s }));
    if (spot) {
      Object.assign(bar, spot, s);
      return updatePanel(panel.id, p => { p.tabs = [...(p.tabs || []), bar]; }, pageTabs ? "Added page tabs" : "Added section tabs");
    }
  }
  toast("There's no room for them: make some space on the grid first");
}

// A tab bar's tabs: rename, choose icons (sections), reorder, add and remove. A removed tab's
// controls are removed, or moved to another tab (or to every page or section).
function editTabBar(panel, bar) {
  const pageTabs = bar.kind === "page";
  const word = pageTabs ? "page" : "section";
  const rows = bar.items.map(t => ({ ...t, keep: true, to: "" })); // to: "" removes its controls, "*" every, else a tab id
  const others = pageTabs ? panelView(panel).pages.filter(t => !bar.items.some(x => x.id === t.id))
    : (panel.tabs || []).filter(b => b.kind === "section" && b.id !== bar.id && b.page === bar.page).flatMap(b => b.items);
  const onIt = id => panel.controls.filter(c => (pageTabs ? c.page : c.section) === id).length;
  let close;
  const box = h("div", { class: "cp-tab-rows" });
  const draw = () => setChildren(box, rows.map((r, i) => {
    const n = onIt(r.id);
    const iconBox = !pageTabs && h("button", { type: "button", class: "btn cp-tab-pick", title: "Choose its icon",
      onclick: () => openIconPicker(r.icon, id => { r.icon = id || undefined; draw(); }) },
      r.icon ? iconSvg(r.icon, "cp-tab-icon") : h("span", { class: "cp-tab-letter" }, (r.label || "?").slice(0, 1).toUpperCase()));
    return h("div", { class: "cp-tab-row" + (r.keep ? "" : " removed") },
      iconBox,
      h("input", { type: "text", value: r.label || "", maxlength: 30, placeholder: `${pageTabs ? "Page" : "Section"} ${i + 1}`, disabled: !r.keep,
        "aria-label": `${pageTabs ? "Page" : "Section"} ${i + 1}: name`, oninput: e => { r.label = e.target.value; } }),
      iconBtn("up", "Earlier", () => { if (i > 0) { [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; draw(); } }),
      iconBtn("down", "Later", () => { if (i < rows.length - 1) { [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; draw(); } }),
      r.keep ? iconBtn("trash", `Remove this ${word}`, () => { r.keep = false; draw(); }, "danger-hover")
        : iconBtn("undo", "Keep it", () => { r.keep = true; draw(); }),
      !r.keep && n > 0 && h("label", { class: "cp-tab-moveto small" }, `Its ${plural(n, "control")}: `,
        h("select", { onchange: e => { r.to = e.target.value; } },
          h("option", { value: "", selected: r.to === "" }, "Remove them"),
          h("option", { value: "*", selected: r.to === "*" }, `Show them on every ${word}`),
          [...others, ...rows.filter(x => x.keep && x !== r)].map(t => h("option", { value: t.id, selected: r.to === t.id }, `Move them to ${t.label || "an unnamed " + word}`)))));
  }));
  draw();
  const add = () => { rows.push({ id: (pageTabs ? "pg" : "sc") + uid(), label: `${pageTabs ? "Page" : "Section"} ${rows.length + 1}`, keep: true, to: "" }); draw(); };
  const save = () => {
    close();
    updatePanel(panel.id, p => {
      const b = (p.tabs || []).find(x => x.id === bar.id);
      if (!b) return;
      const key = pageTabs ? "page" : "section";
      for (const r of rows.filter(r => !r.keep)) {
        for (const c of p.controls.filter(c => c[key] === r.id)) {
          if (r.to === "") p.controls = p.controls.filter(x => x !== c);
          else if (r.to === "*") { delete c[key]; if (pageTabs) delete c.section; }
          else { c[key] = r.to; if (pageTabs) delete c.section; } // a page's sections don't go with it
        }
        // A removed page's section tabs go too (their controls were the page's).
        if (pageTabs) p.tabs = p.tabs.filter(x => !(x.kind === "section" && x.page === r.id));
      }
      b.items = rows.filter(r => r.keep).map(({ id, label, icon }) => ({ id, label: (label || "").trim().slice(0, 30), ...(icon ? { icon } : {}) }));
      if (!b.items.length) p.tabs = p.tabs.filter(x => x.id !== b.id);
    }, rows.some(r => r.keep) ? "Saved the tabs" : "Removed the tabs");
  };
  close = openModal(pageTabs ? "Page tabs" : "Section tabs", h("div", { class: "form" },
    h("p", { class: "muted small" }, pageTabs ? "Each page has its own controls; these tabs choose the page. They show on every page."
      : "Each section is part of a page with controls of its own; these tabs choose it. They show by their icon, with the name as a tooltip."),
    box,
    h("button", { type: "button", class: "btn", onclick: add }, icon("plus"), `Add a ${word}`)),
  { footer: [
    h("button", { class: "btn danger", onclick: () => { rows.forEach(r => { r.keep = false; }); draw(); } }, icon("trash"), "Remove all"),
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: save }, icon("check"), "Save"),
  ] });
}

// ------------------------------------------------------------------ making and editing

function editControlPanel(panel) {
  const isNew = !panel;
  const draft = panel ? { name: panel.name, cols: panel.cols, rows: panel.rows } : { name: "", cols: 6, rows: 4 };
  let close;
  const num = (key, label, min, max) => h("label", { class: "field" }, h("span", null, label),
    h("input", { type: "number", min, max, step: 1, value: draft[key], onchange: e => { draft[key] = Math.max(min, Math.min(max, Math.round(+e.target.value || min))); e.target.value = draft[key]; } }));
  const save = () => {
    const name = draft.name.trim() || "Panel";
    if (panel && panelItems(panel).some(c => !fitsPanel(draft, c))) return toast("Some controls or tabs would be outside the grid: move or remove them first");
    close();
    if (isNew) {
      const p = { id: "gc" + uid(), kind: "panel", name, cols: draft.cols, rows: draft.rows, controls: [] };
      ui.panelEdit = p.id;
      commit(s => { s.gmControls = [...(s.gmControls || []), p]; }, `Made ${name}`);
    } else updatePanel(panel.id, p => Object.assign(p, { name, cols: draft.cols, rows: draft.rows }), `Saved ${name}`);
  };
  close = openModal(isNew ? "New panel" : `Edit ${panel.name}`, h("div", { class: "form" },
    h("label", { class: "field" }, h("span", null, "Name"),
      h("input", { type: "text", value: draft.name, maxlength: 60, placeholder: "e.g. Ship's helm, Weather, Doom clock", oninput: e => { draft.name = e.target.value; } })),
    h("div", { class: "form grid" }, num("cols", "Columns", 1, 12), num("rows", "Rows", 1, 24)),
    h("p", { class: "muted small" }, "A grid for your controls: sliders, range sliders, switches, buttons, dropdowns, polygons, boards, icons and text. Each sets a Global value or a player's or item's Local value.")),
  { footer: [h("button", { class: "btn", onclick: () => close() }, "Cancel"), h("button", { class: "btn primary", onclick: save }, icon("check"), isNew ? "Make it" : "Save")] });
}

// A dropdown's choices: a label and a value per row, with + and − for more or fewer. Either can
// be left empty: the value is then the label (when it's a number), else the choice's place
// (0, 1, 2…: values are numbers); the label is then the value. The placeholders show what an
// empty one becomes.
const choiceValue = (r, i) => r.value.trim() !== "" ? +r.value : r.label.trim() !== "" && Number.isFinite(+r.label) ? +r.label : i;
function choicesEditor(rows) {
  const box = h("div", { class: "cp-choices" });
  const draw = () => setChildren(box,
    h("span", { class: "muted small" }, "Label"), h("span", { class: "muted small" }, "Value"),
    rows.map((r, i) => {
      const val = h("input", { type: "number", step: "any", value: r.value, "aria-label": `Value ${i + 1}`, placeholder: String(choiceValue({ ...r, value: "" }, i)),
        oninput: e => { r.value = e.target.value; lab.placeholder = r.value || `Choice ${i + 1}`; } });
      const lab = h("input", { type: "text", maxlength: 40, value: r.label, "aria-label": `Label ${i + 1}`, placeholder: r.value || `Choice ${i + 1}`,
        oninput: e => { r.label = e.target.value; val.placeholder = String(choiceValue({ ...r, value: "" }, i)); } });
      return [lab, val];
    }),
    h("div", { class: "cp-choices-buttons" },
      iconBtn("minus", "One choice fewer", () => { if (rows.length > 1) { rows.pop(); draw(); } }),
      iconBtn("plus", "One choice more", () => { if (rows.length < 30) { rows.push({ label: "", value: "" }); draw(); } }),
      h("span", { class: "muted small" }, "Leave them all empty to use the value's own choices.")));
  draw();
  return h("div", { class: "field" }, h("span", null, "Choices"), box);
}
function choicesFromRows(rows) {
  const used = rows.map((r, i) => [r, i]).filter(([r]) => r.label.trim() !== "" || r.value.trim() !== "");
  if (used.some(([r]) => r.value.trim() !== "" && !Number.isFinite(+r.value))) return { error: "Choice values are numbers" };
  return { list: used.map(([r, i]) => { const value = choiceValue(r, i); return { label: (r.label.trim() || String(value)).slice(0, 40), value }; }) };
}

// Add (at: the empty cell clicked) or edit one control.
function editPanelControl(panel, ctl, at) {
  const isNew = !ctl;
  const draft = ctl ? clone(ctl) : { id: "c" + uid(), type: "slider", x: at.x, y: at.y, w: 1, h: 1, scope: "party", target: "", name: "",
    ...(at.page ? { page: at.page } : {}), ...(at.section ? { section: at.section } : {}) };
  // The dropdown's choices as typed: [{ label, value }] of strings (see choicesFromRows).
  const rows = (draft.options?.length ? draft.options : [{ label: "", value: "" }, { label: "", value: "" }])
    .map(o => ({ label: String(o.label ?? ""), value: String(o.value ?? "") }));
  const specs = knownValues();
  const listId = "cp-names-" + uid();
  let close;
  const fields = h("div", { class: "form" });
  const text = (key, label, placeholder = "") => h("label", { class: "field" }, h("span", null, label),
    h("input", { type: "text", value: draft[key] || "", placeholder, maxlength: 60, oninput: e => { draft[key] = e.target.value; } }));
  const num = (key, label, placeholder) => h("label", { class: "field" }, h("span", null, label),
    h("input", { type: "number", step: "any", value: draft[key] ?? "", placeholder: placeholder ?? "", onchange: e => { draft[key] = e.target.value === "" ? undefined : +e.target.value; } }));
  const iconPick = () => {
    const box = h("div", { class: "inline wrap" });
    const drawBox = () => setChildren(box, draft.icon ? iconSvg(draft.icon, "cp-pick-icon") : h("span", { class: "muted small" }, "None"),
      h("button", { type: "button", class: "btn", onclick: () => openIconPicker(draft.icon, id => { draft.icon = id || undefined; drawBox(); }) }, icon("image"), "Choose…"),
      draft.icon && h("button", { type: "button", class: "btn", onclick: () => { delete draft.icon; drawBox(); } }, "No icon"));
    drawBox();
    return h("div", { class: "field" }, h("span", null, "Icon"), box);
  };
  const nameInput = (obj, key, aria, placeholder = "value name, e.g. storm") => h("input", { type: "text", list: listId, value: obj[key] || "", placeholder,
    spellcheck: "false", autocomplete: "off", "aria-label": aria, onchange: e => { obj[key] = e.target.value.trim(); } });
  const nameField = (key, label) => h("label", { class: "field" }, h("span", null, label), nameInput(draft, key, label));
  const forField = () => {
    const sel = h("select", { onchange: e => { const [scope, target] = e.target.value.split(/:(.*)/); draft.scope = scope; draft.target = target || ""; } },
      pinScopeOptions(`${draft.scope}:${draft.target}`));
    setTimeout(() => { sel.value = `${draft.scope}:${draft.target}`; });
    return [h("label", { class: "field" }, h("span", null, "For"), sel),
      h("datalist", { id: listId }, [...new Set([...specs.values()].map(v => v.name))].sort().map(n => h("option", { value: n })))];
  };
  const valueFields = () => [nameField("name", draft.type === "text" ? "Shows the value (optional)" : "Sets the value"), forField()];
  // A polygon's corners: a row each (label, the value it sets, its amount at the corner), 3 to 8.
  const cornersEditor = () => {
    const box = h("div", { class: "cp-corners" });
    const draw = () => setChildren(box,
      h("span", { class: "muted small" }, "Label"), h("span", { class: "muted small" }, "Sets the value"), h("span", { class: "muted small" }, "At the corner"),
      draft.vertices.map((v, i) => [
        h("input", { type: "text", maxlength: 30, value: v.label || "", placeholder: `Corner ${i + 1}`, "aria-label": `Corner ${i + 1}: label`, oninput: e => { v.label = e.target.value; } }),
        nameInput(v, "name", `Corner ${i + 1}: value`, "value name"),
        h("input", { type: "number", step: "any", value: v.amount ?? "", placeholder: "1", "aria-label": `Corner ${i + 1}: amount`,
          onchange: e => { v.amount = e.target.value === "" ? undefined : +e.target.value; } })]),
      h("div", { class: "cp-choices-buttons" },
        iconBtn("minus", "One corner fewer", () => { if (draft.vertices.length > 3) { draft.vertices.pop(); draw(); } }),
        iconBtn("plus", "One corner more", () => { if (draft.vertices.length < 8) { draft.vertices.push({ label: "", name: "" }); draw(); } }),
        h("span", { class: "muted small" }, "3 to 8 corners. Each value is its amount × how close the handle is to its corner.")));
    draw();
    return h("div", { class: "field" }, h("span", null, "Corners"), box);
  };
  // Which page and section it shows on (when the panel has tabs).
  const view = panelView(panel);
  const whereFields = () => {
    if (!view.pages.length && !(panel.tabs || []).some(b => b.kind === "section")) return null;
    const sectionsOf = page => (panel.tabs || []).filter(b => b.kind === "section" && (b.page == null || b.page === page)).flatMap(b => b.items);
    const secSel = h("select", { onchange: e => { if (e.target.value) draft.section = e.target.value; else delete draft.section; } });
    const fillSections = () => setChildren(secSel, h("option", { value: "" }, "Every section"),
      sectionsOf(draft.page ?? null).map(t => h("option", { value: t.id, selected: draft.section === t.id }, t.label || "Unnamed section")));
    fillSections();
    return h("div", { class: "form grid" },
      view.pages.length > 0 && h("label", { class: "field" }, h("span", null, "Page"),
        h("select", { onchange: e => { if (e.target.value) draft.page = e.target.value; else delete draft.page; delete draft.section; fillSections(); } },
          h("option", { value: "", selected: draft.page == null }, "Every page"),
          view.pages.map(t => h("option", { value: t.id, selected: draft.page === t.id }, t.label || "Unnamed page")))),
      h("label", { class: "field" }, h("span", null, "Section"), secSel));
  };
  const drawFields = () => setChildren(fields,
    h("div", { class: "field" }, h("span", null, "Kind"), h("div", { class: "seg seg-field" }, CONTROL_TYPES.map(([k, label]) =>
      h("button", { type: "button", class: draft.type === k ? "active" : "", onclick: () => { draft.type = k; drawFields(); } }, label)))),
    text("label", draft.type === "text" ? "Text" : "Label", draft.type === "icon" ? "Optional" : ""),
    (SETS_VALUE.has(draft.type) || draft.type === "text") && valueFields(),
    draft.type === "range" && [nameField("name", "Sets the lower value"), nameField("name2", "Sets the upper value"), forField()],
    draft.type === "polygon" && [(draft.vertices = draft.vertices?.length >= 3 ? draft.vertices : [{ label: "", name: "" }, { label: "", name: "" }, { label: "", name: "" }], cornersEditor()), forField()],
    (draft.type === "slider" || draft.type === "range") && h("div", { class: "form grid" }, num("min", "From", "the value's own"), num("max", "To", "the value's own"), num("step", "Step", "any")),
    draft.type === "toggle" && h("div", { class: "form grid" }, num("off", "Off sets", "0"), num("on", "On sets", "1")),
    (draft.type === "slider" || draft.type === "range" || draft.type === "toggle") && h("label", { class: "field" },
      h("span", null, draft.type === "toggle" ? "On is towards" : "More is towards"),
      h("select", { onchange: e => { draft.reverse = e.target.value === "1"; } },
        h("option", { value: "", selected: !draft.reverse }, "The right, or the top when upright"),
        h("option", { value: "1", selected: !!draft.reverse }, "The left, or the bottom when upright")),
      h("small", { class: "muted" }, "Make it taller than it's wide (in Arrange, drag its corner) and it stands upright.")),
    draft.type === "button" && [
      h("label", { class: "field" }, h("span", null, "When pressed"), h("select", { onchange: e => { draft.action = e.target.value; } },
        h("option", { value: "set", selected: draft.action !== "add" }, "Set the value to"), h("option", { value: "add", selected: draft.action === "add" }, "Add to the value (negative takes away)"))),
      num("amount", "Amount", "1")],
    draft.type === "dropdown" && choicesEditor(rows),
    draft.type === "board" && h("div", { class: "field" }, h("span", null, "Picture and pins"),
      h("div", { class: "inline wrap" },
        h("span", { class: "muted small" }, `${draft.board?.image ? "A picture" : "A blank square"}, ${plural(draft.board?.pins?.length || 0, "pin")}`),
        h("button", { type: "button", class: "btn", onclick: () => editBoard(draft.board || { pins: [] }, b => { draft.board = b; drawFields(); }, draft.label || "") },
          icon("edit"), "Edit board…"))),
    (draft.type === "icon" || draft.type === "button") && iconPick(),
    whereFields(),
    h("label", { class: "field" }, h("span", null, "Colour"), h("div", { class: "inline" },
      h("input", { type: "color", value: draft.color || "#888888", onchange: e => { draft.color = e.target.value; } }),
      draft.color && h("button", { type: "button", class: "btn", onclick: () => { delete draft.color; drawFields(); } }, "Default"))));
  drawFields();

  const save = () => {
    if (draft.type === "dropdown") {
      const opts = choicesFromRows(rows);
      if (opts.error) return toast(opts.error);
      draft.options = opts.list;
    }
    if (draft.type === "board") draft.board = draft.board || { pins: [] };
    else delete draft.board;
    if (SETS_VALUE.has(draft.type) && !isValueName(draft.name)) return toast("Choose the value it sets: a letter, then letters, digits or _");
    if (draft.type === "text" && draft.name && !isValueName(draft.name)) return toast("Not a value name");
    if (draft.type === "range" && (!isValueName(draft.name) || !isValueName(draft.name2))) return toast("Choose the two values it sets: a letter, then letters, digits or _");
    if (draft.type === "range" && draft.name === draft.name2) return toast("The lower and upper values need different names");
    if (draft.type === "polygon") {
      if (draft.vertices.some(v => !isValueName(v.name))) return toast("Each corner needs a value to set: a letter, then letters, digits or _");
      if (new Set(draft.vertices.map(v => v.name)).size < draft.vertices.length) return toast("Each corner needs a value of its own");
    }
    if (!SETS_VALUE.has(draft.type) && draft.type !== "text" && draft.type !== "range") delete draft.name;
    if (draft.type !== "range") delete draft.name2;
    if (draft.type !== "polygon") { delete draft.vertices; delete draft.at; }
    if (isNew) {
      // As wide as suits it (a slider likes two cells), where there's room.
      const big = draft.type === "board" || draft.type === "polygon";
      const want = big ? 3 : draft.type === "slider" || draft.type === "range" ? 2 : 1, tall = big ? 3 : 1;
      const room = (w, ht) => fitsPanel(panel, { ...draft, w, h: ht }) && !clashes(panel, draft, { ...draft, w, h: ht });
      outer: for (let ht = tall; ht >= 1; ht--) for (let w = want; w >= 1; w--) if (room(w, ht)) { draft.w = w; draft.h = ht; break outer; }
    }
    if (clashes(panel, draft, draft)) return toast("It would overlap another control where it shows: choose another page or section, or move it first");
    close();
    updatePanel(panel.id, p => {
      const i = p.controls.findIndex(c => c.id === draft.id);
      if (i >= 0) p.controls[i] = draft; else p.controls.push(draft);
    });
  };
  const remove = () => { close(); updatePanel(panel.id, p => { p.controls = p.controls.filter(c => c.id !== draft.id); }, "Removed the control"); };
  close = openModal(isNew ? "New control" : "Edit control", fields, { footer: [
    !isNew && h("button", { class: "btn danger", onclick: remove }, icon("trash"), "Remove"),
    h("button", { class: "btn", onclick: () => close() }, "Cancel"),
    h("button", { class: "btn primary", onclick: save }, icon("check"), "Save"),
  ] });
}
