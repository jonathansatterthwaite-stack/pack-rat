// Builds js/starter-drawings.js: interactive drawings to start from (Catalog → Drawings, and the
// icon editor's Start from…). Each is made with svg-lay-tool's core, so it's a valid document.
//
//   node tools/build_starters.mjs [path to svg-lay-tool's dist/core.js]
//   (default: ../node/src/svg-lay-tool/dist/core.js beside this project)
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const corePath = resolve(process.argv[2] || join(here, "..", "..", "node", "src", "svg-lay-tool", "dist", "core.js"));
const T = await import(pathToFileURL(corePath).href);

let n = 0;
const id = p => `${p}${++n}`;
const bind = (target, expression, anchor) => ({ id: id("b"), target, expression, enabled: true, ...(anchor ? { anchor } : {}) });
const tap = (...actions) => T.createGesture("tap", { id: id("g"), actions });
const act = a => ({ id: id("a"), ...a });
const v = (name, value, min, max, step = 1) => T.createVariable({ id: id("v"), name, value, min, max, step });
const shape = init => T.createShapeLayer({ id: id("l"), ...init });
const group = init => T.createGroupLayer({ id: id("l"), ...init });
const doc = (layers, variables = []) => {
  let d = T.createDocument({ width: 256, height: 256, background: null });
  for (const x of variables) d = T.upsertVariable(d, x);
  for (const l of layers) d = T.insertLayer(d, l);
  return d;
};
// An outline only: no fill, a stroke of width w.
const outline = (w = 8) => [T.createModifier("fill", { fill: { type: "none" } }), T.createModifier("stroke", { color: null, width: w })];
const BIG = 1e13;

const starters = [];

// --- Abacus: three rods of five beads; drag along a rod to count (the rightmost beads slide over first).
{
  const layers = [
    shape({ shape: "rect", name: "Top bar", x: 128, y: 44, width: 220, height: 14 }),
    shape({ shape: "rect", name: "Bottom bar", x: 128, y: 212, width: 220, height: 14 }),
    shape({ shape: "rect", name: "Left post", x: 24, y: 128, width: 12, height: 182 }),
    shape({ shape: "rect", name: "Right post", x: 232, y: 128, width: 12, height: 182 }),
  ];
  const vars = [];
  [84, 128, 172].forEach((y, r) => {
    const name = `local_row${r + 1}`;
    vars.push(v(name, 0, 0, 5));
    layers.push(shape({ shape: "rect", name: `Rod ${r + 1}`, x: 128, y, width: 196, height: 4 }));
    for (let i = 0; i < 5; i++) {
      layers.push(shape({ shape: "ellipse", name: `Bead ${r + 1}.${i + 1}`, x: 44 + i * 22, y, width: 20, height: 26,
        bindings: [bind("x", `${name} > ${4 - i} ? ${212 - (4 - i) * 22} : ${44 + i * 22}`)] }));
    }
    layers.push(shape({ shape: "rect", name: `Rod ${r + 1} (touch)`, x: 128, y, width: 200, height: 36,
      hotspot: T.createHotspot({ hidden: true, gestures: [T.createGesture("drag", { id: id("g"), axis: "x", actions: [act({ do: "drag", var: name, from: 0, to: 5, step: 1 })] })] }) }));
  });
  starters.push({ id: "starter-abacus", name: "Abacus", hint: "Drag along a rod to count (0 to 5 on each). The counts are the item's own Local values (row1, row2, row3).", doc: doc(layers, vars) });
}

// --- Hourglass: tap (or swipe) to flip it; a minute of sand runs down, wherever it was when flipped.
{
  const top = "clamp(local_top - since(local_flippedAt) / 60, 0, 1)"; // the sand in the top chamber (on screen)
  // The glass turns over; the sand stays still (it always falls down the screen), hidden while it turns.
  const settled = "local_flips == 0 || since(local_flippedAt) >= 0.5";
  const flip = [
    act({ do: "set", var: "local_top", to: `1 - ${top}` }),
    act({ do: "mark", var: "local_flippedAt" }),
    act({ do: "add", var: "local_flips", by: "1" }),
    act({ do: "sound", sound: "whoosh", volume: 0.5 }),
  ];
  const glass = group({ name: "Hourglass", x: 128, y: 128, children: [
    shape({ shape: "rect", name: "Top", x: 0, y: -100, width: 140, height: 14 }),
    shape({ shape: "rect", name: "Bottom", x: 0, y: 100, width: 140, height: 14 }),
    shape({ shape: "polygon", name: "Upper glass", x: 0, y: -46, width: 110, height: 94, params: { sides: 3 }, flipY: true, modifiers: outline(6) }),
    shape({ shape: "polygon", name: "Lower glass", x: 0, y: 46, width: 110, height: 94, params: { sides: 3 }, modifiers: outline(6) }),
  ], bindings: [bind("rotation", "180 * (local_flips - 1 + ease(clamp(since(local_flippedAt) / 0.5, 0, 1)))")],
    hotspot: T.createHotspot({ gestures: [tap(...flip), T.createGesture("swipe", { id: id("g"), dir: "any", actions: flip.map(a => ({ ...a, id: id("a") })) })] }) });
  starters.push({ id: "starter-hourglass", name: "Hourglass", hint: "Tap or swipe to flip it: a minute of sand runs down, and flipping part-way turns over what's left. It keeps running with the details closed.",
    doc: doc([glass,
      shape({ shape: "polygon", name: "Upper sand", x: 128, y: 87, width: 86, height: 74, params: { sides: 3 }, flipY: true,
        // What's left rests at the neck: it shrinks towards its point. (Anchors are in the shape's
        // own frame, before its flip: its point at the neck is y 0.)
        bindings: [bind("width", `86 * ${top}`, { x: 0.5, y: 0 }), bind("height", `74 * ${top}`, { x: 0.5, y: 0 }), bind("visible", settled)] }),
      shape({ shape: "polygon", name: "Lower sand", x: 128, y: 178, width: 86, height: 74, params: { sides: 3 },
        bindings: [bind("width", `86 * (1 - ${top})`, { x: 0.5, y: 1 }), bind("height", `74 * (1 - ${top})`, { x: 0.5, y: 1 }), bind("visible", settled)] }),
    ], [v("local_top", 0, 0, 1, 0.01), v("local_flippedAt", 0, 0, BIG), v("local_flips", 0, 0, BIG)]) });
}

// --- Lantern: tap to light it; the flame flickers. (Rules on the item can burn its oil down.)
{
  const layers = [
    shape({ shape: "ellipse", name: "Glow", x: 128, y: 140, width: 230, height: 230, opacity: 0.2, bindings: [bind("visible", "local_lit")] }),
    shape({ shape: "ellipse", name: "Ring", x: 128, y: 34, width: 40, height: 30, params: { hole: 55 } }),
    shape({ shape: "polygon", name: "Cap", x: 128, y: 62, width: 120, height: 34, params: { sides: 4 }, modifiers: [T.createModifier("deform", { top: 40, bottom: 100, skew: 0 })] }),
    shape({ shape: "rect", name: "Glass", x: 128, y: 138, width: 100, height: 118, modifiers: outline(8) }),
    shape({ shape: "rect", name: "Base", x: 128, y: 210, width: 130, height: 26 }),
    shape({ shape: "teardrop", name: "Flame", x: 128, y: 150, width: 40, height: 62,
      bindings: [bind("visible", "local_lit"), bind("height", "62 * (0.88 + 0.12 * sin(t * 11) * sin(t * 7))", { x: 0.5, y: 1 })] }),
    shape({ shape: "rect", name: "Wick", x: 128, y: 184, width: 6, height: 12 }),
    shape({ shape: "rect", name: "Lantern (touch)", x: 128, y: 130, width: 150, height: 210,
      hotspot: T.createHotspot({ hidden: true, gestures: [tap(act({ do: "set", var: "local_lit", to: "1 - local_lit" }), act({ do: "sound", sound: "click" }))] }) }),
  ];
  starters.push({ id: "starter-lantern", name: "Lantern", hint: "Tap to light it and put it out (its Local value lit). Give the item rules to burn its oil down while lit: when lit becomes 1, change oil at -1 an hour; when oil reaches 0, set lit to 0.",
    doc: doc(layers, [v("local_lit", 0, 0, 1)]) });
}

// --- Drum: tap the skin for a beat (and a wobble, and a buzz on phones).
{
  const wobble = "1 + 0.22 * exp(-since(hitAt) * 7) * sin(since(hitAt) * 42)";
  const layers = [
    shape({ shape: "rect", name: "Shell", x: 128, y: 160, width: 180, height: 100 }),
    shape({ shape: "ellipse", name: "Bottom rim", x: 128, y: 210, width: 180, height: 44 }),
    shape({ shape: "rect", name: "Stick 1", x: 96, y: 52, width: 10, height: 120, rotation: -35 }),
    shape({ shape: "rect", name: "Stick 2", x: 160, y: 52, width: 10, height: 120, rotation: 35 }),
    shape({ shape: "ellipse", name: "Skin", x: 128, y: 110, width: 180, height: 56, modifiers: outline(10),
      bindings: [bind("height", `56 * (${wobble})`)],
      hotspot: T.createHotspot({ gestures: [tap(act({ do: "sound", sound: "drum" }), act({ do: "mark", var: "hitAt" }), act({ do: "vibrate", ms: 15 }))] }) }),
  ];
  starters.push({ id: "starter-drum", name: "Drum", hint: "Tap the skin for a beat. The wobble lasts while the details are open (hitAt isn't kept).", doc: doc(layers, [v("hitAt", 0, 0, BIG)]) });
}

// --- Die: tap to roll (1 to 6, kept as the item's face), with a rattle and a shake.
{
  const pip = (name, x, y, when) => shape({ shape: "ellipse", name, x, y, width: 32, height: 32, bindings: [bind("visible", when)] });
  const die = group({ name: "Die", x: 128, y: 128, children: [
    shape({ shape: "rect", name: "Face", x: 0, y: 0, width: 190, height: 190, modifiers: [T.createModifier("round", { radius: 18 }), ...outline(12)] }),
    pip("Top left", -52, -52, "local_face >= 2"), pip("Bottom right", 52, 52, "local_face >= 2"),
    pip("Top right", 52, -52, "local_face >= 4"), pip("Bottom left", -52, 52, "local_face >= 4"),
    pip("Middle left", -52, 0, "local_face == 6"), pip("Middle right", 52, 0, "local_face == 6"),
    pip("Middle", 0, 0, "mod(local_face, 2) == 1"),
  ], bindings: [bind("rotation", "24 * exp(-since(rolledAt) * 6) * sin(since(rolledAt) * 34)")],
    hotspot: T.createHotspot({ gestures: [tap(act({ do: "random", var: "local_face", from: 1, to: 6, step: 1 }), act({ do: "mark", var: "rolledAt" }), act({ do: "sound", sound: "dice" }))] }) });
  starters.push({ id: "starter-die", name: "Die", hint: "Tap to roll: a face from 1 to 6, kept as the item's Local value face.", doc: doc([die], [v("local_face", 1, 1, 6), v("rolledAt", 0, 0, BIG)]) });
}

// --- Card deck: tap to draw a card (on a set, e.g. a deck of cards); the stack shrinks as cards are drawn.
{
  const card = (name, dx, dy, when) => shape({ shape: "rect", name, x: 128 + dx, y: 128 + dy, width: 130, height: 180,
    modifiers: [T.createModifier("round", { radius: 14 }), ...outline(7)], bindings: when ? [bind("visible", when)] : [] });
  const layers = [
    card("Bottom card", 16, 16, "pieces > 2"),
    card("Middle card", 8, 8, "pieces > 1"),
    card("Top card", 0, 0, "pieces > 0"),
    shape({ shape: "crescent", name: "Mark", x: 128, y: 128, width: 50, height: 60, bindings: [bind("visible", "pieces > 0")] }),
    shape({ shape: "rect", name: "Deck (touch)", x: 136, y: 136, width: 160, height: 210,
      hotspot: T.createHotspot({ hidden: true, gestures: [tap(act({ do: "app", app: "draw" }), act({ do: "sound", sound: "whoosh", volume: 0.4 }))] }) }),
  ];
  starters.push({ id: "starter-deck", name: "Card deck", hint: "For a set (a deck of cards): tap to draw a card. The stack shows how many are left (Pack Rat's value pieces).", doc: doc(layers, [v("pieces", 3, 0, 60)]) });
}

const out = `// Generated by tools/build_starters.mjs (svg-lay-tool documents): interactive drawings to start
// from, offered in Catalog → Drawings and the icon editor's Start from…. Rebuild it rather than editing.
const STARTER_DRAWINGS = ${JSON.stringify(starters.map(s => ({ ...s, doc: T.normalizeDocument(s.doc) })))};
`;
writeFileSync(join(here, "..", "js", "starter-drawings.js"), out);
console.log(`Wrote js/starter-drawings.js: ${starters.map(s => s.name).join(", ")} (${Math.round(out.length / 1024)} KB)`);
