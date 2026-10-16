"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { FACES } from "@/lib/faces";
import { useSectionFace } from "./mood";
import { onScrollFrame, ramp, travel } from "./scroll";
import { useMotion } from "./useMotion";
import sec from "./section.module.css";
import s from "./principles.module.css";

/*
 * The statement under the hero: what Spool is, in one sentence and its continuation, then three plates
 * that draw the mechanism. The plates are isometric line drawings built here from boxes and circles,
 * so they stay sharp at any size and take the theme's colours.
 */

type P3 = [number, number, number];
const COS = Math.cos(Math.PI / 6);
const iso = ([x, y, z]: P3): [number, number] => [(x - y) * COS, (x + y) * 0.5 - z];
const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P3) => {
  const [x, y] = iso(p);
  return `${r1(x)} ${r1(y)}`;
};
const line = (pts: P3[], close = false) => pts.map((p, i) => `${i ? "L" : "M"}${pt(p)}`).join("") + (close ? "Z" : "");

/* Points round a level circle; the front half runs from -45° to 135°, the side facing the viewer. */
const FRONT: [number, number] = [-Math.PI / 4, (3 * Math.PI) / 4];
function arc(cx: number, cy: number, z: number, r: number, [a0, a1]: [number, number], lift = 0, n = 36): P3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t), z + lift * (i / n - 0.5)];
  });
}

/* A piece of a figure. solid: a filled outline that draws on; edge: inner lines that draw on; dash: a
   guide that fades in; mark: a colour mark that arrives last; thread: a coloured line that draws on last;
   beam: a short light that runs along a thread as the plate scrolls on.
   tone recolours the stroke; fill "tint" lays a faint wash of the tone, "tone" fills with it; o fades it. */
type Part = { d: string; t: "solid" | "edge" | "dash" | "mark" | "thread" | "beam"; tone?: string; fill?: "tint" | "tone"; o?: number };

/* A box seen from above and in front: its outline, then the three edges that meet at the near top corner. */
function box(x: number, y: number, z: number, w: number, d: number, h: number): Part[] {
  const t = z + h;
  return [
    { t: "solid", d: line([[x, y, t], [x + w, y, t], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x, y + d, t]], true) },
    { t: "edge", d: `${line([[x + w, y, t], [x + w, y + d, t], [x, y + d, t]])}${line([[x + w, y + d, t], [x + w, y + d, z]])}` },
  ];
}

/* ---------- boxes in any pose ----------
   The plates move and tip their boxes, so a box is also drawn from its eight corners: the outline is the hull
   of where they land on the page, the inner edges are the ones shared by two faces turned toward the viewer. */

const BOX_FACES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [3, 2, 6, 7],
  [0, 3, 7, 4],
  [1, 2, 6, 5],
];

function corners(x: number, y: number, z: number, w: number, d: number, h: number): P3[] {
  return [
    [x, y, z],
    [x + w, y, z],
    [x + w, y + d, z],
    [x, y + d, z],
    [x, y, z + h],
    [x + w, y, z + h],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ];
}

/* Tip a box back about a level line along x at depth y0 on the floor: its top goes away from the viewer. */
function tip(pts: P3[], y0: number, a: number): P3[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y, z]): P3 => [x, y0 + (y - y0) * c - z * s, (y - y0) * s + z * c]);
}

function hull(ps: [number, number][]) {
  const pts = [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(pts), ...half([...pts].reverse())];
}

function solid(pts: P3[]): Part[] {
  const mid = (ids: number[]) => [0, 1, 2].map((k) => ids.reduce((n, i) => n + pts[i][k], 0) / ids.length);
  const centre = mid([0, 1, 2, 3, 4, 5, 6, 7]);
  // a face is seen when it leans toward the viewer, who looks down the (1, 1, 1) diagonal
  const seen = BOX_FACES.map((f) => {
    const c = mid(f);
    return c[0] - centre[0] + (c[1] - centre[1]) + (c[2] - centre[2]) > 1e-6;
  });
  let edges = "";
  for (let a = 0; a < 6; a++)
    for (let b = a + 1; b < 6; b++) {
      if (!seen[a] || !seen[b]) continue;
      const shared = BOX_FACES[a].filter((i) => BOX_FACES[b].includes(i));
      if (shared.length === 2) edges += line([pts[shared[0]], pts[shared[1]]]);
    }
  const outline = hull(pts.map(iso));
  return [
    { t: "solid", d: outline.map(([x, y], i) => `${i ? "L" : "M"}${r1(x)} ${r1(y)}`).join("") + "Z" },
    { t: "edge", d: edges },
  ];
}

/* A short cylinder standing on z0: its front wall, then its whole top. */
function cylinder(z0: number, h: number, r: number): Part[] {
  const wall = [...arc(0, 0, z0, r, FRONT), ...arc(0, 0, z0 + h, r, [FRONT[1], FRONT[0]])];
  return [
    { t: "solid", d: line(wall, true) },
    { t: "solid", d: line(arc(0, 0, z0 + h, r, [0, Math.PI * 2], 0, 48), true) },
  ];
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (k: number) => 1 - (1 - k) ** 3;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

/* FIG 1: threads from three repos wind onto one spool, each in its kind's colour. Scrolled on, light runs along them. */
function spool(): Part[] {
  const R = 62;
  const core = 35;
  const parts: Part[] = [];
  // the repos the threads come from, set around the spool
  const repos: { at: [number, number]; z: number; tone: string; side: "right" | "left" }[] = [
    { at: [70, -160], z: 71, tone: "var(--strip-review)", side: "right" },
    { at: [-96, 104], z: 64, tone: "var(--strip-issue)", side: "left" },
    { at: [128, -78], z: 57, tone: "var(--strip-pr)", side: "right" },
  ];
  for (const r of repos) parts.push(...box(r.at[0] - 14, r.at[1] - 14, 0, 28, 28, 6));
  parts.push(...cylinder(0, 7, R));
  parts.push({ t: "solid", d: line([...arc(0, 0, 7, core, FRONT), ...arc(0, 0, 81, core, [FRONT[1], FRONT[0]])], true) });
  // the thread already wound: front arcs, each rising a little across the face
  for (let z = 12; z <= 76; z += 4.6) parts.push({ t: "edge", d: line(arc(0, 0, z, core + 2, FRONT, 2.4)) });
  parts.push(...cylinder(81, 7, R));
  parts.push({ t: "edge", d: line(arc(0, 0, 88, 9, [0, Math.PI * 2], 0, 24), true) });
  // the newest threads: up off each repo, in level from the side between the flanges, then once round
  for (const r of repos) {
    const from = iso([r.at[0], r.at[1], 6]);
    const wrap = arc(0, 0, r.z, core + 2.4, r.side === "right" ? FRONT : [FRONT[1], FRONT[0]], 2.4);
    const join = iso(wrap[0]);
    const out = r.side === "right" ? 1 : -1;
    const curve = `M${r1(from[0])} ${r1(from[1])}C${r1(from[0])} ${r1(join[1])} ${r1(join[0] + out * 46)} ${r1(join[1])} ${r1(join[0])} ${r1(join[1])}`;
    const d = curve + line(wrap).replace(/^M/, "L");
    parts.push({ t: "thread", tone: r.tone, d });
    parts.push({ t: "beam", tone: r.tone, d });
  }
  return parts;
}

/* FIG 2: their stack and yours, and one thread that goes between them. It lands on yours when they answer and
   the mark on it turns yellow: your move. You answer, and it goes back. */
const HAND = { W: 92, D: 40, H: 6, P: 11, ARC: 44, FLY: 1300 };
const THEIRS: [number, number] = [56, -58];
const YOURS: [number, number] = [-58, 56];
// rest on yours, fly to theirs, rest on theirs, fly to yours
const LEGS = [1800, HAND.FLY, 1800, HAND.FLY];
const HAND_LOOP = LEGS.reduce((a, b) => a + b, 0);
// with motion off the plate holds the moment of arrival: just above your stack, already yellow
const HAND_STILL = LEGS[0] + LEGS[1] + LEGS[2] + HAND.FLY * 0.69;

function hop(from: [number, number], z0: number, to: [number, number], z1: number, e: number): P3 {
  return [lerp(from[0], to[0], e), lerp(from[1], to[1], e), lerp(z0, z1, e) + HAND.ARC * Math.sin(Math.PI * e)];
}

function handoffAt(t: number): Part[] {
  const { W, D, H, P } = HAND;
  const slab = ([x, y]: [number, number], z: number) => solid(corners(x - W / 2, y - D / 2, z, W, D, H));
  const circle = (x: number, y: number, z: number, tone: string, o: number): Part => ({ t: "mark", tone, o, d: line(arc(x, y, z, 10, [0, Math.PI * 2], 0, 32), true) });
  const half = (x: number, y: number, z: number, k: number, o: number): Part => ({
    t: "mark",
    tone: "var(--move)",
    fill: "tone",
    o: k < 0.02 ? 0 : o,
    d: line(arc(x, y, z, 6.2 * Math.max(k, 0.02), [-0.75 * Math.PI, 0.25 * Math.PI], 0, 16), true),
  });

  // where in the loop we are: which leg, and how far through it
  let n = ((t % HAND_LOOP) + HAND_LOOP) % HAND_LOOP;
  let leg = 0;
  while (n >= LEGS[leg]) n -= LEGS[leg++];
  const u = n / LEGS[leg];
  const e = easeInOut(u);

  let at: P3;
  let mine: number; // how yellow the travelling mark is
  let theirsShown = 1; // the mark on the top of each stack's own pile
  let yoursShown = 1;
  if (leg === 0) {
    at = [YOURS[0], YOURS[1], 2 * P];
    mine = 1;
    yoursShown = 0;
  } else if (leg === 1) {
    at = hop(YOURS, 2 * P, THEIRS, 4 * P, e);
    mine = 1 - ramp(0, 0.15, u);
    yoursShown = ramp(0, 0.12, u);
    theirsShown = 1 - ramp(0.9, 1, u);
  } else if (leg === 2) {
    at = [THEIRS[0], THEIRS[1], 4 * P];
    mine = 0;
    theirsShown = 0;
  } else {
    at = hop(THEIRS, 4 * P, YOURS, 2 * P, e);
    mine = ramp(0.78, 0.86, e);
    theirsShown = ramp(0, 0.12, u);
    yoursShown = 1 - ramp(0.9, 1, u);
  }

  const parts: Part[] = [];
  // the lane it flies, from the top of their stack to the top of yours
  const lane = Array.from({ length: 25 }, (_, i) => {
    const p = hop(THEIRS, 4 * P, YOURS, 2 * P, i / 24);
    return [p[0], p[1], p[2] + H + 4] as P3;
  });
  parts.push({ t: "dash", d: line(lane) });
  for (let i = 0; i < 4; i++) parts.push(...slab(THEIRS, i * P));
  parts.push(circle(THEIRS[0], THEIRS[1], 3 * P + H, "var(--ink-3)", theirsShown));
  for (let i = 0; i < 2; i++) parts.push(...slab(YOURS, i * P));
  parts.push(circle(YOURS[0], YOURS[1], P + H, "var(--move)", yoursShown));
  parts.push(half(YOURS[0], YOURS[1], P + H, 1, yoursShown));
  parts.push(...slab([at[0], at[1]], at[2]));
  parts.push(circle(at[0], at[1], at[2] + H, mine > 0.5 ? "var(--move)" : "var(--ink-3)", 1));
  parts.push(half(at[0], at[1], at[2] + H, mine, 1));
  return parts;
}

/* FIG 3: a day's silence as a slab, the row a little taller every day; past the limit the slabs are stalled.
   Scrolled through, the days stand up one at a time, then a reply knocks the whole row over. */
const SIL = { W: 64, D: 4, GAP: 15, N: 10, LIMIT: 70, STEP: 340, GROW: 420, FALL: 380 };
const tall = (i: number) => 14 + i * 10;

/* A slab's side view (depth, height) when tipped back by a about its back foot. */
function section(i: number, a: number): [number, number][] {
  const { D, GAP } = SIL;
  const y0 = -i * GAP;
  const h = tall(i);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [y0, 0],
    [y0 - h * s, h * c],
    [y0 + D * c - h * s, D * s + h * c],
    [y0 + D * c, D * s],
  ];
}

/* Whether two convex outlines overlap: no edge of either separates them. */
function overlaps(p: [number, number][], q: [number, number][]) {
  for (const poly of [p, q])
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const nx = y2 - y1;
      const ny = x1 - x2;
      const span = (pts: [number, number][]) => pts.map(([x, y]) => x * nx + y * ny);
      const a = span(p);
      const b = span(q);
      if (Math.max(...a) < Math.min(...b) + 1e-3 || Math.max(...b) < Math.min(...a) + 1e-3) return false;
    }
  return true;
}

/* How far a slab tips before it meets the one behind, posed at a. Found a quarter degree at a time. */
function meets(i: number, behind: number) {
  const other = section(i + 1, behind);
  for (let a = 0; a <= Math.PI / 2; a += Math.PI / 720) if (overlaps(section(i, a), other)) return a;
  return Math.PI / 2;
}

const TOPPLE = (() => {
  const { N, FALL } = SIL;
  // where each comes to rest: the last lies flat, every other leans back on the one behind it
  const rest = Array<number>(N).fill(Math.PI / 2);
  for (let i = N - 2; i >= 0; i--) rest[i] = meets(i, rest[i + 1]);
  // each falls as things fall, slowly then fast, and sets off the next as it touches it still standing
  const start = [0];
  for (let i = 0; i < N - 1; i++) start.push(start[i] + FALL * Math.sqrt(Math.min(1, meets(i, 0) / rest[i])));
  return { rest, start, end: start[N - 1] + FALL + 160 };
})();

const GROWN = (SIL.N - 1) * SIL.STEP + SIL.GROW;
const SIL_HOLD = 700;
const SIL_AFTER = 1300;
const SIL_FADE = 420;
const SIL_LOOP = GROWN + SIL_HOLD + TOPPLE.end + SIL_AFTER + SIL_FADE;

function silenceAt(t: number): Part[] {
  const { W, D, GAP, N, LIMIT, STEP, GROW, FALL } = SIL;
  const n = ((t % SIL_LOOP) + SIL_LOOP) % SIL_LOOP;
  const knocked = n - GROWN - SIL_HOLD;
  const fade = 1 - ramp(SIL_LOOP - SIL_FADE, SIL_LOOP, n);
  const back = -(N - 1) * GAP - 12;
  const front = D + 12;
  const parts: Part[] = [];
  // the far edges of the limit sit behind the slabs; the near edges are drawn after them
  parts.push({ t: "dash", d: line([[-10, front, LIMIT], [-10, back, LIMIT], [W + 10, back, LIMIT]]) });
  for (let i = N - 1; i >= 0; i--) {
    const grow = easeOut(ramp(i * STEP, i * STEP + GROW, n));
    const shown = n < GROWN ? ramp(i * STEP, i * STEP + 80, n) : fade;
    const since = knocked - TOPPLE.start[i];
    let a = 0;
    if (since > 0) {
      const k = Math.min(1, since / FALL);
      a = TOPPLE.rest[i] * k * k;
      // a small rebound off whatever it lands on
      if (since > FALL) a -= 0.035 * Math.sin(Math.PI * ramp(FALL, FALL + 160, since));
    }
    const h = Math.max(1, tall(i) * grow);
    const slab = solid(tip(corners(0, -i * GAP, 0, W, D, h), -i * GAP, a));
    // stalled while it stands past the limit; the reply clears it as it goes over
    const stalled = h > LIMIT && since <= 0;
    for (const p of slab) parts.push({ ...p, o: shown, ...(stalled ? { tone: "var(--pencil)", fill: p.t === "solid" ? ("tint" as const) : undefined } : null) });
  }
  parts.push({ t: "dash", d: line([[-10, front, LIMIT], [W + 10, front, LIMIT], [W + 10, back, LIMIT]]) });
  return parts;
}

function bounds(parts: Part[]) {
  const nums = parts.flatMap((p) => (p.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number));
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const pad = 6;
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return `${r1(x)} ${r1(y)} ${r1(Math.max(...xs) - x + pad)} ${r1(Math.max(...ys) - y + pad)}`;
}

type Fig = {
  key: string;
  title: string;
  body: string;
  label: string;
  /** the drawing as it stands still: server-rendered, and all there is with motion off */
  parts: Part[];
  /** whether the lines draw on as the plate rises into view */
  draw: boolean;
  /** the plate at a moment of its story, and the stretch of that story the scroll plays through */
  at?: (t: number) => Part[];
  span?: [number, number];
  /** where in the plate's scroll the story plays */
  act?: [number, number];
};

const FIGS = (
  [
    {
      key: "one-list",
      title: "One list",
      body: "PRs, issues, review requests and mentions from every repo you touch, wound into one place.",
      label: "Threads in three colours run from three repos and wind onto a single spool.",
      parts: spool(),
      draw: true,
    },
    {
      key: "whose-move",
      title: "Whose move",
      body: "Each thread waits on you or on them. That split comes first, before repo, date or label.",
      label: "A thread lifted off their stack lands on yours, and its mark turns yellow: the move is yours.",
      parts: handoffAt(HAND_STILL),
      draw: true,
      // from resting on their stack to landing on yours
      at: handoffAt,
      span: [LEGS[0] + LEGS[1] + LEGS[2], HAND_LOOP + 200],
      act: [0.4, 0.86],
    },
    {
      key: "silence",
      title: "Silence, counted",
      body: "Days since anyone spoke sit on every row. Past your limit a thread is stalled and moves to the top.",
      label: "Ten slabs grow day by day and the four past the dashed limit turn red, until a reply knocks the row over.",
      parts: silenceAt(GROWN),
      draw: false,
      // the days stand up one at a time, then a reply knocks the row over
      at: silenceAt,
      span: [0, GROWN + SIL_HOLD + TOPPLE.end],
      act: [0.02, 0.92],
    },
  ] satisfies Fig[]
).map((f) => ({ ...f, view: bounds(f.parts) }));

type Painted = { d: string; o: number; tone: string; fill: string; off: number };

/* Write one part of a plate onto its path, touching only what changed since the last frame. */
function paint(el: SVGPathElement, p: Part, off: number, was: Painted) {
  if (p.d !== was.d) el.setAttribute("d", (was.d = p.d));
  const o = p.o ?? 1;
  if (o !== was.o) el.style.opacity = String((was.o = o));
  if (off !== was.off) el.style.strokeDashoffset = String((was.off = off));
  const tone = p.tone ?? "";
  if (tone !== was.tone) {
    was.tone = tone;
    if (tone) el.style.setProperty("--tone", tone);
    else el.style.removeProperty("--tone");
  }
  const fill = p.fill ?? "";
  if (fill !== was.fill) {
    was.fill = fill;
    if (fill) el.dataset.fill = fill;
    else delete el.dataset.fill;
  }
}

// The first part of a plate's scroll draws it; its story plays in what's left.
const DRAWN_BY = 0.42;

/* A plate as it stands at a point p (0 to 1) of its trip up the viewport. */
function framed(fig: Fig, p: number) {
  const parts = fig.at && fig.span && fig.act ? fig.at(lerp(fig.span[0], fig.span[1], ramp(fig.act[0], fig.act[1], p))) : fig.parts;
  const q = fig.draw ? ramp(0, DRAWN_BY, p) : 1;
  const lines = parts.filter((x) => x.t === "solid" || x.t === "edge").length;
  let k = 0;
  let beam = 0;
  return parts.map((part) => {
    let off = 0;
    let o = part.o ?? 1;
    if (part.t === "solid" || part.t === "edge") {
      // the lines draw in order, each starting a little after the one before
      const from = (Math.min(k++ * 34, 700) / Math.max(700, Math.min(lines * 34, 700))) * 0.55;
      off = 1 - ramp(from, from + 0.45, q);
    } else if (part.t === "thread") off = 1 - ramp(0.5, 1, q);
    else if (part.t === "beam") {
      // each thread's light runs in once the drawing is done, one thread after another
      const i = beam++;
      const run = ramp(0.46 + i * 0.13, 0.7 + i * 0.13, p);
      off = lerp(0.07, -1, run);
      o = run > 0 && run < 1 ? 1 : 0;
    } else o *= fig.draw ? ramp(0.7, 1, q) : ramp(0, 0.1, p);
    return { part: { ...part, o }, off };
  });
}

function Figure({ fig, scrub }: { fig: Fig & { view: string }; scrub: boolean }) {
  const ref = useRef<SVGSVGElement>(null);

  // The plate follows the scroll: drawn as it rises into view, its story played as it carries on up.
  // Scrolling back plays it backwards. With motion off it is simply drawn.
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll("path"));
    const was: Painted[] = fig.parts.map((p) => ({ d: p.d, o: p.o ?? 1, tone: p.tone ?? "", fill: p.fill ?? "", off: 0 }));
    if (!scrub) {
      fig.parts.forEach((part, i) => paths[i] && paint(paths[i], part, 0, was[i]));
      return;
    }
    let last = -1;
    return onScrollFrame(() => {
      const p = travel(svg, 0.95, 0.28);
      if (p === last) return;
      last = p;
      return () => framed(fig, p).forEach(({ part, off }, i) => paths[i] && paint(paths[i], part, off, was[i]));
    });
  }, [fig, scrub]);

  return (
    <svg ref={ref} className={s.art} viewBox={fig.view} role="img" aria-label={fig.label}>
      {fig.parts.map((p, i) => (
        <path
          key={i}
          d={p.d}
          pathLength={p.t === "dash" ? undefined : 1}
          data-t={p.t}
          data-fill={p.fill}
          style={
            {
              ...(p.tone ? { "--tone": p.tone } : null),
              ...(p.o !== undefined && p.o < 1 ? { opacity: p.o } : null),
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
}

export function Principles() {
  const ref = useRef<HTMLElement>(null);
  useSectionFace(ref, FACES.calm);
  const motion = useMotion();

  return (
    <section ref={ref} className={`${sec.section} ${s.principles}`} aria-labelledby="principles-title">
      <h2 id="principles-title" className={sec.statement}>
        Every open thread, wound onto one list.{" "}
        <span className={sec.statementRest}>
          Spool sorts them by who owes the next move, counts the days since anyone spoke, and reads GitHub without ever
          writing to it.
        </span>
      </h2>

      <div className={s.figs} data-scrub={motion || undefined}>
        {FIGS.map((f) => (
          <figure key={f.key} className={s.fig}>
            <Figure fig={f} scrub={motion} />
            <figcaption className={s.caption}>
              <h3 className={s.title}>{f.title}</h3>
              <p className={s.body}>{f.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
