// The item menu: press and hold an item's tile or row and a ring of what can be done with it opens
// around it. Slide to an option and let go to choose it; let go in the middle for its details (as a
// tap); let go outside for nothing. + and − (when it counts up and down) are always straight above
// and below; the rest share the sides (only the side away from the edge, at an edge of the screen).
// With a mouse or the keyboard, the context menu (right-click, the menu key) opens it to click.
//
// A list (a storage: see storageTree) gives the options: menu(e) for its own, else the buttons its
// extras(e) would show; and setQty / canCount for − and +.

const RADIAL_PRESS_MS = 260;   // a press this long, without moving, opens the menu
const RADIAL_SLOP = 10;        // moving further first is a scroll or a drag instead

let radialOpen = null;         // the menu showing: { root, close, ... }

// An item's options: [{ icon, label, run, danger }], and whether it counts (− / +).
function entryMenu(st, e) {
  const side = st.menu ? st.menu(e) : menuFromButtons(st.extras?.(e));
  // − and +: for what stacks (or is more than one), where it can be counted now.
  const counts = !!st.setQty && (st.canCount?.(e) ?? true) && (e.qty > 1 || stacks(currentItem(e, st.char), e.srcId));
  return {
    side: side.filter(Boolean),
    plus: counts && { icon: "plus", label: "Add one", run: () => st.setQty(e, e.qty + 1) },
    minus: counts && { icon: "minus", label: e.qty > 1 ? "Use one" : "Use the last one", run: () => st.setQty(e, e.qty - 1) },
  };
}

// A list's extra buttons as menu options (their own icon and label; choosing one clicks it).
function menuFromButtons(...els) {
  return els.flat(Infinity).filter(b => b instanceof HTMLElement && b.matches("button"))
    .map(b => ({ icon: b.querySelector("svg")?.cloneNode(true) || "more", label: b.getAttribute("aria-label") || b.title || b.textContent.trim(), run: () => b.click() }));
}

// Press-and-hold (touch and pen) and the context menu (mouse, keyboard) on an item's tile or row.
// el: what's pressed; target: what the ring goes round (the tile, or the row at the press).
function attachItemMenu(el, st, e) {
  const options = () => entryMenu(st, e);
  const details = () => st.open(e);
  el.addEventListener("pointerdown", ev => {
    if (ev.pointerType === "mouse" || !ev.isPrimary || radialOpen) return;
    // Not from the row's own controls (− / +, the number, buttons): those work as they are.
    if (ev.target.closest("input, select, textarea, a, .qty, .icon-btn, .cw-cog, .btn") && !ev.target.closest(".row-main")) return;
    const id = ev.pointerId, x0 = ev.clientX, y0 = ev.clientY;
    let timer = setTimeout(() => {
      timer = null;
      openRadial(el, options(), details, { x: x0, y: y0, row: !el.classList.contains("tile"), drag: true });
    }, RADIAL_PRESS_MS);
    const move = m => {
      if (m.pointerId !== id) return;
      if (timer && Math.hypot(m.clientX - x0, m.clientY - y0) > RADIAL_SLOP) done();
      else radialOpen?.track(m.clientX, m.clientY);
    };
    const up = u => {
      if (u.pointerId !== id) return;
      if (radialOpen?.drag) { radialOpen.release(u.clientX, u.clientY); swallowClick(el); }
      done();
    };
    const cancel = c => { if (c.pointerId === id) { radialOpen?.drag && radialOpen.close(); done(); } };
    const done = () => {
      clearTimeout(timer); timer = null;
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", cancel);
    };
    addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", cancel);
  });
  el.addEventListener("contextmenu", ev => {
    ev.preventDefault();
    if (radialOpen) return; // (a touch press already opened it; phones also send this)
    const keyboard = !ev.clientX && !ev.clientY;
    openRadial(el, options(), details, { x: keyboard ? null : ev.clientX, y: keyboard ? null : ev.clientY, row: !el.classList.contains("tile"), drag: false });
  });
  // Dragging (to move it between containers) doesn't start from a press that opened the menu.
  el.addEventListener("dragstart", ev => { if (radialOpen) ev.preventDefault(); });
}

// The click a press-and-release sends to the tile or row (its details) is the menu's, not theirs.
function swallowClick(el) {
  const stop = ev => { if (!el.contains(ev.target)) return; ev.stopPropagation(); ev.preventDefault(); off(); };
  const off = () => removeEventListener("click", stop, { capture: true });
  addEventListener("click", stop, { capture: true });
  setTimeout(off, 400);
}

// While the menu follows a finger, the page doesn't scroll.
addEventListener("touchmove", ev => { if (radialOpen?.drag) ev.preventDefault(); }, { passive: false });

// Where each option goes: + above and − below; the rest spaced around the open arcs (the sides
// between them, or the whole circle), keeping to what's on screen.
function radialLayout(cx, cy, n, counts) {
  const W = innerWidth, H = innerHeight, deg = Math.PI / 180, edge = 30;
  let r = Math.max(84, 58 * (n + (counts ? 2 : 0)) / (2 * Math.PI));
  const fits = (a, rr) => { const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; return x > edge && x < W - edge && y > edge && y < H - edge; };
  // The longest unbroken stretch of an arc that's on screen (a whole circle may wrap past its start).
  const trim = ([a0, a1]) => {
    const steps = Math.round((a1 - a0) / (2 * deg)), ok = i => fits(a0 + (i % (steps + 1)) * 2 * deg, r + 20), circle = a1 - a0 > 350 * deg;
    if ([...Array(steps + 1).keys()].every(ok)) return [a0, a1];
    let s0 = 0;
    if (circle) while (s0 <= steps && ok(s0)) s0++;
    let best = null, run = null;
    for (let j = 0; j <= steps; j++) {
      const i = s0 + j;
      if (ok(i)) { run = run ? [run[0], i] : [i, i]; if (!best || run[1] - run[0] > best[1] - best[0]) best = run; } else run = null;
    }
    return best && [a0 + best[0] * 2 * deg, a0 + best[1] * 2 * deg];
  };
  const arcs = (counts ? [[-90 * deg, 90 * deg], [90 * deg, 270 * deg]] : [[-90 * deg, 270 * deg]])
    .map(trim).filter(a => a && a[1] - a[0] >= 60 * deg);
  const total = arcs.reduce((s, [a0, a1]) => s + a1 - a0, 0) || 1;
  const angles = [];
  let left = n;
  arcs.forEach(([a0, a1], i) => {
    const k = i === arcs.length - 1 ? left : Math.min(left, Math.round(n * (a1 - a0) / total));
    left -= k;
    const whole = a1 - a0 > 350 * deg, ends = !counts && !whole; // an edge arc's ends are free when there's no − / +
    const parts = whole ? k : ends ? Math.max(1, k - 1) : k + 1;
    for (let j = 0; j < k; j++) angles.push(a0 + (a1 - a0) * (whole || ends ? j : j + 1) / parts);
    if (k) r = Math.min(130, Math.max(r, 58 / ((a1 - a0) / parts)));
  });
  while (angles.length < n) angles.push(angles.length * 2 * Math.PI / n); // (nowhere fits: round anyway)
  const at = a => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  return { r, side: angles.map(at), plus: [cx, cy - r], minus: [cx, cy + r] };
}

// Open the menu round el. o: { x, y } (where it was pressed; else el's middle), row (centred on the
// press, along the row), drag (following a finger; else to click).
function openRadial(el, menu, details, o = {}) {
  radialOpen?.close();
  const box = el.getBoundingClientRect();
  const cx = o.row && o.x != null ? Math.min(Math.max(o.x, box.left + 40), box.right - 40) : box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const opts = [...menu.side];
  const lay = radialLayout(cx, cy, opts.length, !!menu.plus);
  const all = opts.map((op, i) => ({ ...op, pos: lay.side[i] }));
  if (menu.plus) all.push({ ...menu.plus, pos: lay.plus }, { ...menu.minus, pos: lay.minus });

  const root = h("div", { class: "radial" + (o.drag ? " following" : ""), role: "menu", "aria-label": `${el.getAttribute("aria-label") || "Item"}: what to do` });
  const lift = h("div", { class: "radial-lift" });
  Object.assign(lift.style, { left: box.left + "px", top: box.top + "px", width: box.width + "px", height: box.height + "px" });
  const label = h("button", { type: "button", class: "radial-label", role: "menuitem", onclick: () => choose("details") }, "Details");
  label.style.left = cx + "px"; label.style.top = cy + "px";
  const trail = h("div", { class: "radial-trail" });
  const btns = all.map(op => {
    const b = h("button", { type: "button", class: "radial-opt" + (op.danger ? " danger" : ""), role: "menuitem", "aria-label": op.label, title: op.label,
      onclick: () => choose(op), onpointerenter: () => !o.drag && hot(op), onfocus: () => hot(op) },
      typeof op.icon === "string" ? icon(op.icon) : op.icon);
    b.style.left = op.pos[0] + "px"; b.style.top = op.pos[1] + "px";
    op.el = b;
    return b;
  });
  root.append(lift, trail, ...btns, label);
  root.addEventListener("pointerdown", ev => { if (!o.drag && ev.target === root) close(); });
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add("shown"));
  if (o.drag && navigator.vibrate) try { navigator.vibrate(8); } catch {}

  let current = null;
  function hot(op) {
    current = op;
    for (const x of all) x.el.classList.toggle("hot", x === op);
    label.textContent = op === "details" ? (o.drag ? "Let go here: details" : "Details") : op ? op.label : o.drag ? "Let go outside: nothing" : "Details";
    label.classList.toggle("hot", op === "details");
    if (op && op !== "details") {
      const [x, y] = op.pos, len = Math.hypot(x - cx, y - cy) - 30;
      Object.assign(trail.style, { left: cx + "px", top: cy + "px", width: Math.max(0, len) + "px", transform: `rotate(${Math.atan2(y - cy, x - cx)}rad)`, display: "block" });
    } else trail.style.display = "none";
  }
  hot(o.drag ? "details" : null);
  // Following a finger: the option nearest it (within reach), the middle, or nothing (outside).
  function track(x, y) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < 30) return hot("details");
    if (d > lay.r + 60) return hot(null);
    let best = null, bd = Infinity;
    for (const op of all) { const dd = Math.hypot(x - op.pos[0], y - op.pos[1]); if (dd < bd) { bd = dd; best = op; } }
    hot(bd < 52 || d > lay.r * 0.55 ? best : "details");
  }
  function release(x, y) { track(x, y); choose(current); }
  function choose(op) {
    close();
    if (op === "details") details();
    else op?.run?.();
  }
  const onKey = ev => {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(); el.focus?.(); return; }
    // Arrows go round the ring (the middle, Details, is Tab-reachable too).
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(ev.key)) {
      ev.preventDefault();
      const list = [label, ...btns], i = list.indexOf(document.activeElement);
      list[(i + (ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : list.length - 1)) % list.length].focus();
    }
  };
  document.addEventListener("keydown", onKey, true);
  const onScroll = () => close();
  addEventListener("scroll", onScroll, { passive: true, once: true });
  function close() {
    if (radialOpen !== api) return;
    radialOpen = null;
    document.removeEventListener("keydown", onKey, true);
    removeEventListener("scroll", onScroll);
    root.remove();
  }
  const api = { root, close, track, release, drag: !!o.drag };
  radialOpen = api;
  if (!o.drag) (btns[0] || label).focus({ preventScroll: true });
  return api;
}

// ------------------------------------------------------------------ this device's inventory's options

// What can be done with one of this device's inventory items, around the ring (− and + aside).
function inventoryMenu(e) {
  const char = store.char();
  return [
    ...menuFromButtons(writingButton(e)),
    isEquipable(e) && { icon: equipKind(e) === "wielded" ? "sword" : "shield", label: e.equipped ? "Unequip" : "Equip", run: () => toggleEquip(e.uid) },
    // The player's states (Attuned…), unless only the GM can change them now.
    ...statesFor(e).filter(s => s.who === "player" && (canPlayerSet(char, e, s.key) || isGmDevice())).map(s => {
      const on = stateOn(char, e, s.key);
      return { icon: "wand", label: `${s.label}: turn ${on ? "off" : "on"}`, run: () => playerSetState(e.uid, s.key, !on) };
    }),
    editing() && { icon: "edit", label: "Edit", run: () => openItemForm(e.item, { entryUid: e.uid }) },
    { icon: "move", label: "Move to…", run: () => openMoveTo(e.uid) },
    { icon: "coins", label: "Sell", run: () => openSell(e.uid) },
    party.active && party.others().length > 0 && { icon: "users", label: "Trade", run: () => openTradeBuilder(null, e.uid) },
    { icon: "trash", label: "Remove", danger: true, run: () => confirmRemoveEntry(e.uid) },
  ].filter(Boolean);
}

// Move to…: where it goes (on person, into a container, strapped to one), as a list to tap.
function openMoveTo(entryUid) {
  const char = store.char(), e = char.items.find(x => x.uid === entryUid);
  if (!e) return;
  const here = e.parent ? e.parent + (e.strapped ? ":out" : "") : "";
  let close;
  const rows = containerOptions(char, e.uid).map(opt => {
    const value = opt.value, current = value === here;
    return h("button", { type: "button", class: "row row-main switch" + (current ? " equipped" : ""), disabled: current,
      onclick: () => { close(); const loc = parseLocation(value); moveEntry(e.uid, loc.parent, loc.strapped); } },
      icon(value ? (value.endsWith(":out") ? "link" : "bag") : "user"),
      h("div", null, h("div", { class: "row-title" }, opt.textContent), current && h("div", { class: "row-sub" }, "Where it is now")));
  });
  close = openModal(`Move ${entryName(e)}`, h("div", { class: "group move-to" }, rows));
}

// Removing an item asks first (Undo still works after).
function confirmRemoveEntry(entryUid, after) {
  const char = store.char(), e = char?.items.find(x => x.uid === entryUid);
  if (!e) return;
  const name = entryName(e) + (e.qty > 1 ? ` (×${e.qty.toLocaleString()})` : "");
  const inside = holdsItems(char, e) && char.items.some(x => x.parent === e.uid);
  confirmDialog(`Remove ${name} from ${char.name}'s inventory?${inside ? " What's in it stays where it was." : ""}`, "Remove", () => {
    after?.();
    commit((s, c) => removeEntry(c, e.uid), `Removed ${entryName(e)}`, true);
  });
}
