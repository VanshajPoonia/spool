"use client";

/*
 * The page's scroll, read once a frame for everything that moves with it.
 * One listener and one animation frame serve every subscriber; each reads its layout first and hands back the
 * writes, and all the writes run after all the reads, so a frame never measures a page it has just changed.
 */

type Read = () => (() => void) | void;

const subs = new Set<Read>();
let raf = 0;

function flush() {
  raf = 0;
  const writes: (() => void)[] = [];
  for (const read of subs) {
    const w = read();
    if (w) writes.push(w);
  }
  for (const w of writes) w();
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(flush);
}

/* Run `read` on every frame the page scrolls or resizes, and once now. */
export function onScrollFrame(read: Read) {
  if (!subs.size) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }
  subs.add(read);
  schedule();
  return () => {
    subs.delete(read);
    if (!subs.size) {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* How far something has come: 0 at a, 1 at b. */
export const ramp = (a: number, b: number, n: number) => clamp01((n - a) / (b - a));

/* How far an element has travelled up the viewport: 0 when its top meets `from` (a fraction of the viewport's
   height, measured from the top), 1 when it meets `to`. */
export function travel(el: Element, from = 1, to = 0) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return clamp01((vh * from - r.top) / (vh * (from - to)));
}

/* How far through its runway a pinned section is: 0 as its sticky frame pins, 1 as the frame lets go. */
export function pinned(runway: Element, frame: Element) {
  const r = runway.getBoundingClientRect();
  const top = parseFloat(getComputedStyle(frame).top) || 0;
  const span = r.height - frame.getBoundingClientRect().height;
  return span > 0 ? clamp01((top - r.top) / span) : 0;
}

/* Where the window has to scroll for a pinned section to stand at progress p. */
export function pinnedScrollY(runway: Element, frame: Element, p: number) {
  const r = runway.getBoundingClientRect();
  const top = parseFloat(getComputedStyle(frame).top) || 0;
  const span = r.height - frame.getBoundingClientRect().height;
  return window.scrollY + r.top - top + span * clamp01(p);
}
