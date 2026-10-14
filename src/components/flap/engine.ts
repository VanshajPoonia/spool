/*
 * Split-flap engine.
 * React renders the tiles once; this module owns every later character change,
 * driven by one shared requestAnimationFrame loop so hundreds of tiles cost one tick.
 */

import { clack } from "./sound";

// Order matters: a real drum cycles forward through its cards.
export const CHARSET =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?'-_/\\()<>^~*+=#$%&@|°¬•abcdefghijklmnopqrstuvwxyz";

export type Tile = {
  root: HTMLElement;
  sTop: HTMLElement;
  sBot: HTMLElement;
  lTop: HTMLElement;
  lBot: HTMLElement;
  lTopC: HTMLElement;
  lBotC: HTMLElement;
  cur: string;
  queue: string[];
  nextAt: number;
  step: number;
  anims: Animation[];
};

const active = new Set<Tile>();
let raf = 0;

let motionOn = true;
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionOn = !mq.matches && document.documentElement.dataset.motion !== "off";
  mq.addEventListener?.("change", (e) => {
    motionOn = !e.matches && document.documentElement.dataset.motion !== "off";
  });
}

export function setFlapMotion(on: boolean) {
  motionOn = on;
}

export function flapMotion() {
  return motionOn;
}

// One Tile per element, so a remount (or Strict Mode's double effects) never puts two drivers on one tile.
const adopted = new WeakMap<Element, Tile>();

export function adopt(root: Element): Tile {
  const known = adopted.get(root);
  if (known) return known;
  const el = root as HTMLElement;
  const kids = el.children;
  const sTop = kids[0].firstElementChild as HTMLElement;
  const sBot = kids[1].firstElementChild as HTMLElement;
  const lTop = kids[2] as HTMLElement;
  const lBot = kids[3] as HTMLElement;
  const tile: Tile = {
    root: el,
    sTop,
    sBot,
    lTop,
    lBot,
    lTopC: lTop.firstElementChild as HTMLElement,
    lBotC: lBot.firstElementChild as HTMLElement,
    cur: sTop.textContent ?? " ",
    queue: [],
    nextAt: 0,
    step: 64,
    anims: [],
  };
  adopted.set(root, tile);
  return tile;
}

/*
 * The two moving leaves exist only while a tile flips (data-flip shows them). An idle tile is
 * flat: no 3D transform, so it costs the compositor nothing. Hundreds of resting tiles used to
 * hold several GPU layers each.
 */
function rest(t: Tile) {
  delete t.root.dataset.flip;
}

function settle(t: Tile, ch: string) {
  for (const a of t.anims) a.cancel();
  t.anims.length = 0;
  t.sTop.textContent = ch;
  t.sBot.textContent = ch;
  t.lTopC.textContent = ch;
  t.lBotC.textContent = ch;
  t.cur = ch;
  rest(t);
}

function flip(t: Tile, to: string, dur: number) {
  const from = t.cur;
  if (from === to) return;
  for (const a of t.anims) a.cancel();
  t.anims.length = 0;

  t.sTop.textContent = to;
  t.sBot.textContent = from;
  t.lTopC.textContent = from;
  t.lBotC.textContent = to;
  t.cur = to;
  t.root.dataset.flip = "";

  const half = dur * 0.5;
  const fall = t.lTop.animate(
    [
      { transform: "rotateX(0deg)", filter: "brightness(1)" },
      { transform: "rotateX(-90deg)", filter: "brightness(0.42)" },
    ],
    { duration: half, easing: "cubic-bezier(0.55, 0, 1, 0.55)", fill: "forwards" },
  );
  const land = t.lBot.animate(
    [
      { transform: "rotateX(90deg)", filter: "brightness(1.8)" },
      { transform: "rotateX(-7deg)", filter: "brightness(1)", offset: 0.82 },
      { transform: "rotateX(0deg)", filter: "brightness(1)" },
    ],
    // "both" holds the leaf edge-on through its delay, before it starts to land
    { duration: half * 1.15, delay: half * 0.9, easing: "cubic-bezier(0.25, 0.8, 0.35, 1)", fill: "both" },
  );
  land.onfinish = () => {
    if (t.cur !== to) return;
    t.sBot.textContent = to;
    t.lTopC.textContent = to;
    fall.cancel();
    land.cancel();
    rest(t);
  };
  t.anims.push(fall, land);
  clack();
}

function loop(now: number) {
  for (const t of active) {
    if (now < t.nextAt) continue;
    const next = t.queue.shift();
    if (next === undefined) {
      active.delete(t);
      continue;
    }
    const last = t.queue.length === 0;
    const dur = last ? t.step * 2.1 : t.step;
    flip(t, next, dur);
    t.nextAt = now + (last ? dur : t.step * 0.92);
  }
  raf = active.size ? requestAnimationFrame(loop) : 0;
}

function wake() {
  if (!raf) raf = requestAnimationFrame(loop);
}

const DIGITS = "0123456789";

export function pathTo(from: string, to: string, maxSteps: number): string[] {
  if (from === to) return [];
  // Numbers roll on their own drum so 9 -> 0 never passes through letters.
  if (DIGITS.includes(from) && DIGITS.includes(to)) {
    const dist = (Number(to) - Number(from) + 10) % 10;
    const steps = Math.max(1, Math.min(dist, maxSteps));
    const out: string[] = [];
    for (let s = 1; s <= steps; s++) out.push(DIGITS[(Number(from) + Math.round((dist * s) / steps)) % 10]);
    return out;
  }
  const n = CHARSET.length;
  const i = CHARSET.indexOf(from);
  const j = CHARSET.indexOf(to);
  if (i < 0 || j < 0) return [to];
  const dist = (j - i + n) % n;
  const steps = Math.max(1, Math.min(dist, maxSteps));
  const out: string[] = [];
  for (let s = 1; s <= steps; s++) out.push(CHARSET[(i + Math.round((dist * s) / steps)) % n]);
  return out;
}

export type SetOpts = {
  /** ms between neighbouring tiles starting */
  stagger?: number;
  /** ms before the first tile starts */
  delay?: number;
  /** ms per card */
  step?: number;
  /** cap on cards shown per tile */
  maxSteps?: number;
  /** extra random cards before landing, for intros */
  scramble?: number;
  /** order tiles start in */
  order?: "ltr" | "rtl" | "random" | "center";
};

function startOrder(count: number, order: SetOpts["order"]): number[] {
  const idx = Array.from({ length: count }, (_, i) => i);
  if (order === "rtl") return idx.map((i) => count - 1 - i);
  if (order === "center") {
    const mid = (count - 1) / 2;
    return idx.map((i) => Math.round(Math.abs(i - mid)));
  }
  if (order === "random") {
    let seed = count * 7919;
    return idx.map(() => {
      seed = (seed * 16807) % 2147483647;
      return seed % Math.max(1, count);
    });
  }
  return idx;
}

export function setTiles(tiles: Tile[], text: string, opts: SetOpts = {}) {
  const { stagger = 22, delay = 0, step = 62, maxSteps = 12, scramble = 0, order = "ltr" } = opts;
  if (!motionOn) {
    tiles.forEach((t, i) => {
      t.queue.length = 0;
      active.delete(t);
      settle(t, text[i] ?? " ");
    });
    return;
  }
  // Tiles inside a hidden layout (display: none) just take the value.
  const hidden = tiles.length > 0 && tiles[0].root.offsetParent === null;
  if (hidden) {
    tiles.forEach((t, i) => {
      t.queue.length = 0;
      active.delete(t);
      settle(t, text[i] ?? " ");
    });
    return;
  }
  const now = performance.now();
  const rank = startOrder(tiles.length, order);
  tiles.forEach((t, i) => {
    const target = text[i] ?? " ";
    // Re-aim from the card currently showing; a new value replaces any queued run.
    const from = t.cur;
    let path: string[] = [];
    if (scramble > 0 && !(target === " " && from === " ")) {
      for (let k = 0; k < scramble; k++) path.push(CHARSET[1 + Math.floor(Math.random() * 36)]);
      path.push(target);
    } else {
      path = pathTo(from, target, maxSteps);
    }
    if (!path.length) {
      t.queue.length = 0;
      return;
    }
    const wasRunning = active.has(t) && t.queue.length > 0;
    t.queue = path;
    t.step = step * (0.9 + Math.random() * 0.25);
    if (!wasRunning) {
      t.nextAt = now + delay + rank[i] * stagger;
      active.add(t);
    }
  });
  wake();
}

/* Riffle one tile through a few cards and back to the card it showed, like a fingertip run along the board. */
export function riffle(root: Element, cards = 3, step = 44) {
  if (!motionOn) return;
  const t = adopted.get(root);
  if (!t || t.queue.length) return;
  const home = t.cur;
  const path: string[] = [];
  for (let k = 0; k < cards; k++) path.push(CHARSET[1 + Math.floor(Math.random() * 36)]);
  path.push(home);
  t.queue = path;
  t.step = step;
  t.nextAt = performance.now();
  active.add(t);
  wake();
}

export function padText(value: string, length: number, align: "left" | "right" | "center" = "left") {
  const v = value.length > length ? value.slice(0, length) : value;
  const room = length - v.length;
  if (align === "right") return " ".repeat(room) + v;
  if (align === "center") {
    const l = Math.floor(room / 2);
    return " ".repeat(l) + v + " ".repeat(room - l);
  }
  return v + " ".repeat(room);
}
