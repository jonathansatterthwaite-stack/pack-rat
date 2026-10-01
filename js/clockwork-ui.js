// Clockwork in the GM tab: the Values tab (Global and Local values, and the boards), the
// Clockwork tab (what's connected to what), and the cog beside a connected item's name, which
// only GMs see. See js/clockwork.js.

// ------------------------------------------------------------------ a value's control

// A value at one level: its choices, or a slider and a number; "inherited" (the level above, or
// the value's default, applies) until set.
function valueControl(spec, own, inherited, onSet) {
  const shown = own ?? inherited ?? 0;
  const clear = own !== undefined ? iconBtn("x", "Clear (use the value above)", () => onSet(null))
    : h("span", { class: "muted small gm-inherit" }, "inherited");
  if (spec.choices?.length) {
    return h("div", { class: "gm-control" + (own === undefined ? " inherits" : "") },
      h("select", { "aria-label": "Value", onchange: ev => onSet(+ev.target.value) },
        spec.choices.map((c, i) => h("option", { value: i, selected: Math.round(shown) === i }, c))), clear);
  }
  const min = Math.min(spec.min ?? 0, shown), max = Math.max(spec.max ?? 1, shown), step = spec.step || "any";
  const num = h("input", { type: "number", class: "gm-num", step, value: shown, "aria-label": "Value",
    onchange: ev => { if (ev.target.value !== "") onSet(+ev.target.value); } });
  const range = h("input", { type: "range", min, max, step, value: shown, "aria-label": "Value",
    oninput: ev => { num.value = ev.target.value; }, onchange: ev => onSet(+ev.target.value) });
  return h("div", { class: "gm-control" + (own === undefined ? " inherits" : "") }, range, num, clear);
}

const showValue = (spec, v) => v === undefined ? "not set" : spec?.choices?.[Math.round(v)] ?? String(v);

// Which items' drawings use each value: "global:name" / "local:name" -> [{ char, e }].
function valueUsers() {
  const out = new Map();
  for (const c of gmChars()) for (const e of c.items) {
    if (!e.item.iconDoc) continue;
    for (const r of drawingValueRefs(e.item.iconDoc).values()) {
      for (const s of r.scope === "any" ? ["global", "local"] : [r.scope]) {
        const k = `${s}:${r.name}`;
        if (!out.has(k)) out.set(k, []);
        out.get(k).push({ char: c, e });
      }
    }
  }
  return out;
}

const foldToggle = key => {
  const closed = ui.collapsed.has(key);
  return [closed, h("button", { class: "collapse" + (closed ? " closed" : ""), "aria-expanded": String(!closed),
    onclick: () => { closed ? ui.collapsed.delete(key) : ui.collapsed.add(key); render(); } }, icon("chevron"))];
};

// ------------------------------------------------------------------ the Values tab

function valuesView() {
  const vals = [...knownValues().values()];
  const users = valueUsers(), chars = gmChars();
  const set = fn => async value => { try { await fn(value); } catch (e) { toast(e.message); } };
  const usedBy = list => list?.length ? `Read by the icons of ${plural(list.length, "item")}` : "No item's icon reads it yet";
  const title = v => [h("code", null, v.name), v.label && h("span", { class: "muted" }, " " + v.label),
    v.legacy && h("span", { class: "tag", title: "An older drawing's gm_ name: items use their own, their character's, else the Global" }, "gm_")];

  const globals = vals.filter(v => v.scope === "global");
  const globalSection = h("section", { class: "gm-values" },
    h("h2", null, "Global values"),
    h("p", { class: "muted small" }, "One value for the whole campaign: every item sees the same, like the weather or a doom clock. Drawn icons read them as ",
      h("code", null, "global_name"), "."),
    globals.length ? h("div", { class: "group" }, globals.map(v => h("div", { class: "row gm-level" },
      h("div", { class: "row-main static" }, h("div", { class: "row-title" }, title(v)),
        h("div", { class: "row-sub" }, usedBy(users.get(`global:${v.name}`)))),
      valueControl(v, globalValue(v.name), v.value, set(x => setGlobal(v.name, x))))))
      : h("p", { class: "muted pad" }, "No Global values yet. In the icon editor's Variables tab, add one with + Global value (a name starting ",
        h("code", null, "global_"), ") and bind layers to it, or set one with a board's pin for Everyone."));

  const locals = vals.filter(v => v.scope === "local");
  const localSection = h("section", { class: "gm-values" },
    h("h2", null, "Local values"),
    h("p", { class: "muted small" }, "Each character's own, and each item's own: an item uses its own, else its character's. Drawn icons read them as ",
      h("code", null, "local_name"), "."),
    !locals.length ? h("p", { class: "muted pad" }, "No Local values yet. In the icon editor's Variables tab, add one with + Local value (a name starting ",
      h("code", null, "local_"), ")."
    ) : locals.map(v => {
      const [closed, toggle] = foldToggle(`val:local:${v.name}`);
      const using = users.get(`local:${v.name}`) || [];
      return h("div", { class: "group gm-var" },
        h("div", { class: "group-head" }, toggle, h("h3", null, title(v)), h("span", { class: "muted small" }, usedBy(using))),
        !closed && chars.map(c => {
          const mine = charLocal(c.id, v.name);
          const items = c.items.filter(e => using.some(u => u.e === e) || itemLocal(c.id, e.uid, v.name) !== undefined);
          return h("div", { class: "gm-player" },
            h("div", { class: "row gm-level" },
              h("div", { class: "row-main static" }, h("div", { class: "row-title" }, c.name, c.mine && h("span", { class: "tag" }, "yours")),
                h("div", { class: "row-sub" }, "Their items use this unless it's set on the item")),
              valueControl(v, mine, v.value, set(x => setLocal(c.id, null, v.name, x)))),
            items.map(e => {
              const own = itemLocal(c.id, e.uid, v.name);
              return h("div", { class: "row gm-level gm-item" },
                itemIcon(currentItem(e, c), "row-icon", () => entryIconVars(c, e)),
                h("div", { class: "row-main static" }, h("div", { class: "row-title" }, entryName(e)),
                  h("div", { class: "row-sub" }, `Uses ${showValue(v, own ?? mine ?? v.value)} (from ${own !== undefined ? "this item" : mine !== undefined ? "the character" : "the default"})`)),
                valueControl(v, own, mine ?? v.value, set(x => setLocal(c.id, e.uid, v.name, x))));
            }));
        }));
    }));

  return [
    !party.active && h("p", { class: "muted small pad" }, `Starting values for ${store.campaign().name}, ready for the next session: they go to the party when you load this campaign into it. Your own icons show them meanwhile.`),
    globalSection, localSection, gmControlsSection(),
  ];
}

// ------------------------------------------------------------------ the Clockwork tab

const LAYER_FIELD_WORDS = { cost: "worth", acBonus: "AC bonus", maxCharges: "charges" };

function layerWords(L) {
  const fields = Object.keys(L).filter(k => !LAYER_META.has(k) && L[k] !== "" && L[k] != null).map(k => LAYER_FIELD_WORDS[k] || k);
  const feats = Object.entries(L.features || {}).filter(([, on]) => on).map(([k]) => featureByKey(k)?.label || k);
  const locks = (L.locks || []).map(k => stateByKey(k)?.label || k);
  return [fields.length && `changes ${fields.join(", ")}`, feats.length && `turns on ${feats.join(", ")}`,
    locks.length && `locks ${locks.join(", ")}`].filter(Boolean).join("; ") || "nothing yet";
}

function clockworkItemCard(c, e) {
  const k = itemConnections(c, e), key = `${c.id}/${e.uid}`;
  const line = (label, ...content) => h("div", { class: "cw-line" }, h("span", { class: "cw-label muted small" }, label), h("div", { class: "cw-what" }, content));
  const changers = [
    ...statesFor(e).filter(st => k.reads.some(r => r.address === `item.state.${st.key}`) && canPlayerSet(c, e, st.key))
      .map(st => `the player (${st.label})`),
    k.reads.some(r => r.address.startsWith("item.state.")) && `the ${term("gm")}'s state menu`,
    k.triggers.length > 0 && "its own triggers",
    ...k.pins.map(p => `the pin “${p.pin.label || "Pin"}” on ${p.control.name}`),
    k.refs.size > 0 && `the ${term("gm")}'s values (Values tab)`,
  ].filter(Boolean);
  return h("div", { class: "group cw-item" + (ui.cwFocus === key ? " focus" : ""), id: "cw-" + key.replace("/", "-") },
    h("div", { class: "group-head" },
      itemIcon(currentItem(e, c), "row-icon", () => entryIconVars(c, e)),
      h("h3", null, entryName(e)),
      statesOnFor(c, e).map(st => h("span", { class: "tag attuned" }, st.label.toLowerCase()))),
    h("div", { class: "cw-body" },
      k.triggers.length > 0 && line("Triggers", h("ul", { class: "cw-rules" }, k.triggers.map(t => h("li", null, ruleWords(t))))),
      k.layers.length > 0 && line("Layers", h("ul", { class: "cw-rules" }, k.layers.map(st => h("li", null,
        h("b", null, st.label), ` (${stateOn(c, e, st.key) ? "on" : "off"}): ${layerWords(e.item.layers[st.key])}`)))),
      k.reads.length > 0 && line("Reads", k.reads.map(r => h("span", { class: "chip" + (r.value === undefined ? " muted" : ""), title: r.address },
        `${r.label} = ${r.value === undefined ? (r.fallback !== undefined ? `${r.fallback} (default)` : "not set") : r.value}`))),
      (k.overrides.length > 0 || k.setHere.length > 0) && line("Set here",
        k.overrides.map(o => h("span", { class: "chip" }, `${o.state.label} held ${o.on ? "on" : "off"} by the ${term("gm")}`)),
        k.setHere.map(v => h("span", { class: "chip" }, `${v.name} = ${v.value}`))),
      changers.length > 0 && line("Changed by", changers.join(" · ")),
      (k.live || k.layers.length > 0) && line("Shows", [k.live && "its live icon", k.layers.length > 0 && "what it is now (its layers)"].filter(Boolean).join(" · "))));
}

function clockworkView() {
  const chars = gmChars();
  const groups = chars.map(c => [c, byName(c.items.filter(e => usesClockwork(c, e)))]).filter(([, list]) => list.length);
  // Opened from an item's cog: show it.
  if (ui.cwFocus) {
    const id = "cw-" + ui.cwFocus.replace("/", "-");
    setTimeout(() => { document.getElementById(id)?.scrollIntoView({ block: "center" }); ui.cwFocus = null; }, 0);
  }
  const users = valueUsers();
  const globals = [...knownValues().values()].filter(v => v.scope === "global");
  const pinsFor = name => (store.state.gmControls || []).flatMap(ctl => ctl.pins.filter(p => p.scope === "party" && (p.xVar === name || p.yVar === name))
    .map(p => `the pin “${p.label || "Pin"}” on ${ctl.name}`));
  return [
    h("section", { class: "cw" },
      h("h2", null, "Clockwork"),
      h("p", { class: "muted small" }, "What makes items react: their triggers and layers, the values their icons read, and what changes them. Items with a cog beside their name (only you see it) are here."),
      groups.length ? groups.map(([c, list]) => h("div", { class: "cw-char" },
        h("h3", { class: "cw-char-name" }, c.name, c.mine && h("span", { class: "tag" }, "yours")),
        list.map(e => clockworkItemCard(c, e))))
        : h("div", { class: "empty" }, h("p", null, "Nothing is connected yet. Items with triggers, layers, or a drawn icon that reads values show up here."))),
    globals.length > 0 && h("section", { class: "cw" },
      h("h2", null, "Global values"),
      h("p", { class: "muted small" }, "What each one reaches: moving it changes all of these."),
      h("div", { class: "group" }, globals.map(v => {
        const using = users.get(`global:${v.name}`) || [], pins = pinsFor(v.name);
        return h("div", { class: "row gm-level" }, h("div", { class: "row-main static" },
          h("div", { class: "row-title" }, h("code", null, v.name), h("span", { class: "muted" }, ` = ${showValue(v, globalValue(v.name) ?? v.value)}`)),
          h("div", { class: "row-sub" }, [using.length ? "Read by " + using.map(u => `${u.char.name}'s ${entryName(u.e)}`).join(", ") : "No item reads it",
            pins.length && "set by " + pins.join(", ")].filter(Boolean).join(" · "))));
      }))),
  ];
}

// ------------------------------------------------------------------ the cog

// Beside a connected item's name, for GMs: opens the Clockwork tab at it. before: e.g. close a dialog.
function clockworkCog(char, e, before) {
  if (!char || !isGmDevice() || !usesClockwork(char, e)) return null;
  return iconBtn("cog", `Clockwork: what drives ${entryName(e)}`, () => {
    before?.();
    const root = document.getElementById("modal-root");
    root.replaceChildren();
    document.body.classList.remove("modal-open");
    ui.gmTab = "clockwork";
    ui.cwFocus = `${char.id}/${e.uid}`;
    go("gm");
  }, "cw-cog");
}
