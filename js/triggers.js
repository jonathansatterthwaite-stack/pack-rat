// Triggers: an item's "when → if → do" rules, Clockwork's first (see js/clockwork.js, and item
// states and layers in js/system.js).
//
//   item.triggers: [{ on, if?, do: [{ set, to }], message? }]
//     on:      "acquired" (it enters this character's inventory: added, bought, given, traded),
//              "on:<state>" / "off:<state>" (a state turns on or off, by the player, the GM or
//              another trigger), "equipped", "unequipped"
//     if:      { state, is: true | false } (optional)
//     do:      turn states on or off (the entry's own states: a GM override still wins)
//     message: shown to the player
//
// They run on the device the character belongs to, after every change and every party update
// (render calls runTriggers): each entry's states and equipped are compared with what they were
// last time (entry.seen), and the triggers of what changed fire. Their changes can fire more,
// up to TRIGGER_STEPS in a row. An entry with no `seen` is new here: it fires "acquired" once.

const TRIGGER_STEPS = 10;
const TRIGGER_EVENTS = [["acquired", "Enters the inventory"], ["on", "Turns on:"], ["off", "Turns off:"],
  ["equipped", "Is equipped"], ["unequipped", "Is unequipped"]];

const seenOf = (char, e) => ({ states: entryStates(char, e), equipped: !!e.equipped });

// What changed for an entry since last time: the events, in order.
function entryEvents(char, e) {
  if (!e.seen) return ["acquired"];
  const now = seenOf(char, e), was = e.seen.states || {}, events = [];
  for (const st of systemStates()) {
    if (now.states[st.key] && !was[st.key]) events.push("on:" + st.key);
    if (!now.states[st.key] && was[st.key]) events.push("off:" + st.key);
  }
  if (now.equipped !== !!e.seen.equipped) events.push(now.equipped ? "equipped" : "unequipped");
  return events;
}

// Run the triggers of one character's items. Returns { changed, messages }.
function runCharTriggers(char) {
  let changed = false;
  const messages = [];
  for (const e of char.items) {
    for (let step = 0; step < TRIGGER_STEPS; step++) {
      const events = entryEvents(char, e);
      if (!events.length) break;
      e.seen = seenOf(char, e);
      changed = true;
      for (const t of e.item.triggers || []) {
        if (!events.includes(t.on)) continue;
        if (t.if?.state && !!clockwork.get({ char, entry: e }, "item.state." + t.if.state) !== (t.if.is !== false)) continue;
        for (const a of t.do || []) if (a?.set && stateByKey(a.set)) setState(e, a.set, a.to !== false);
        if (t.message) messages.push(`${entryName(e)}: ${t.message}`);
      }
    }
  }
  return { changed, messages };
}

// Every character on this device (in a party, the ones that are this device's own).
let triggersRunning = false;
function runTriggers() {
  if (triggersRunning || !store.data) return;
  triggersRunning = true;
  try {
    let changed = false;
    const messages = [];
    for (const c of store.state.characters) {
      const r = runCharTriggers(c);
      changed = changed || r.changed;
      messages.push(...r.messages);
    }
    if (changed) store.save();
    if (messages.length) toast(messages.join(" · "));
  } finally {
    triggersRunning = false;
  }
}

// Entries from before triggers: seen as they are, so nothing fires for them (normalizeData).
function markEntriesSeen(characters) {
  for (const c of characters) for (const e of c.items || []) {
    if (!e.seen) e.seen = { states: { ...(e.attuned ? { attuned: true } : {}), ...(e.toggles || {}), ...(e.states || {}) }, equipped: !!e.equipped };
  }
}

// ------------------------------------------------------------------ editing triggers

// A list of triggers (an item's or a template's), edited in place in `owner.triggers`.
function triggersEditor(owner) {
  owner.triggers = (owner.triggers || []).map(t => clone(t));
  const box = h("div", { class: "triggers-edit" });
  const states = systemStates();
  const stateSelect = (value, onChange, label) => h("select", { "aria-label": label, onchange: e => onChange(e.target.value) },
    states.map(st => h("option", { value: st.key, selected: value === st.key }, st.label)));
  const draw = () => setChildren(box,
    !states.length && h("p", { class: "muted small" }, "This game system has no states, so there's nothing for triggers to change."),
    owner.triggers.map((t, i) => {
      const [kind, key] = t.on.includes(":") ? t.on.split(":") : [t.on, null];
      const act = t.do?.[0] || null;
      const setOn = (k, sk) => { t.on = k === "on" || k === "off" ? `${k}:${sk || states[0]?.key}` : k; draw(); };
      return h("div", { class: "trigger-row" },
        h("div", { class: "trigger-line" }, h("b", null, "When it"),
          h("select", { "aria-label": "When", onchange: e => setOn(e.target.value, key) },
            TRIGGER_EVENTS.map(([k, l]) => h("option", { value: k, selected: kind === k }, l.toLowerCase()))),
          key && stateSelect(key, v => setOn(kind, v), "Which state")),
        h("div", { class: "trigger-line" }, h("b", null, "If"),
          h("select", { "aria-label": "Condition", onchange: e => {
            const v = e.target.value;
            if (!v) delete t.if; else { const [sk, is] = v.split(":"); t.if = { state: sk, is: is === "on" }; }
          } },
            h("option", { value: "", selected: !t.if }, "always"),
            states.flatMap(st => [["on", "is on"], ["off", "is off"]].map(([is, l]) => h("option", { value: `${st.key}:${is}`,
              selected: t.if?.state === st.key && (t.if.is !== false) === (is === "on") }, `${st.label} ${l}`))))),
        h("div", { class: "trigger-line" }, h("b", null, "Then"),
          h("select", { "aria-label": "Then", onchange: e => {
            const v = e.target.value;
            t.do = v ? [{ set: act?.set || states[0]?.key, to: v === "on" }] : [];
            draw();
          } },
            h("option", { value: "", selected: !act }, "only show the message"),
            h("option", { value: "on", selected: act && act.to !== false }, "turn on"),
            h("option", { value: "off", selected: act && act.to === false }, "turn off")),
          act && stateSelect(act.set, v => { t.do = [{ set: v, to: act.to !== false }]; }, "Which state")),
        h("label", { class: "field full" }, h("span", null, "Message to the player (optional)"),
          h("input", { type: "text", value: t.message || "", maxlength: 200, placeholder: "e.g. The ring tightens on your finger.",
            oninput: e => { if (e.target.value.trim()) t.message = e.target.value; else delete t.message; } })),
        iconBtn("trash", "Remove this trigger", () => { owner.triggers.splice(i, 1); draw(); }, "danger-hover"));
    }),
    states.length > 0 && h("button", { class: "btn", type: "button", onclick: () => {
      owner.triggers.push({ on: "acquired", do: [{ set: states[0].key, to: true }] });
      draw();
    } }, icon("plus"), "Add a trigger"));
  draw();
  return box;
}

// Triggers as saved: complete ones only.
function cleanTriggers(list) {
  return (Array.isArray(list) ? list : []).filter(t => t && typeof t.on === "string" && ((t.do || []).length || t.message))
    .slice(0, 30).map(t => ({ on: t.on, ...(t.if ? { if: { state: t.if.state, is: t.if.is !== false } } : {}),
      do: (t.do || []).filter(a => a && typeof a.set === "string").map(a => ({ set: a.set, to: a.to !== false })),
      ...(t.message ? { message: String(t.message).slice(0, 200) } : {}) }));
}
