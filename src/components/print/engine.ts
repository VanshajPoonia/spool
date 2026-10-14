/*
 * The strip printer.
 * React renders a printed field once; this module owns every later change, typing the new
 * value over the old one left to right. One shared requestAnimationFrame loop drives every
 * field on the page, and it sleeps when nothing is printing.
 */

import { tick } from "./sound";

type Job = { el: HTMLElement; from: string; to: string; start: number; speed: number; shown: number };

const jobs = new Map<HTMLElement, Job>();
let raf = 0;

let motionOn = true;
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionOn = !mq.matches && document.documentElement.dataset.motion !== "off";
  mq.addEventListener?.("change", (e) => {
    motionOn = !e.matches && document.documentElement.dataset.motion !== "off";
  });
}

export function setPrintMotion(on: boolean) {
  motionOn = on;
}

export function printMotion() {
  return motionOn;
}

function frame(now: number) {
  raf = 0;
  for (const j of jobs.values()) {
    if (now < j.start) continue;
    const k = Math.min(j.to.length, Math.floor((now - j.start) / j.speed) + 1);
    if (k !== j.shown) {
      j.shown = k;
      j.el.textContent = j.to.slice(0, k) + j.from.slice(k);
      if (j.to[k - 1] !== " ") tick();
    }
    if (k >= j.to.length) {
      j.el.textContent = j.to;
      delete j.el.dataset.printing;
      jobs.delete(j.el);
    }
  }
  if (jobs.size) raf = requestAnimationFrame(frame);
}

export type PrintOpts = {
  /** ms per character */
  speed?: number;
  /** ms before the first character */
  delay?: number;
  /** print onto a blank field instead of over the current text */
  fromBlank?: boolean;
};

export function print(el: HTMLElement, text: string, opts: PrintOpts = {}) {
  const { speed = 26, delay = 0, fromBlank = false } = opts;
  const shown = el.textContent ?? "";
  const target = jobs.get(el)?.to ?? shown;
  if (!motionOn || el.offsetParent === null) {
    jobs.delete(el);
    delete el.dataset.printing;
    el.textContent = text;
    return;
  }
  if (!fromBlank && target === text) return;
  // Retype over whatever is showing, mid-print included.
  const from = fromBlank ? " ".repeat(text.length) : shown.padEnd(text.length, " ");
  // A field that only changes at the end starts printing where it differs.
  let same = 0;
  if (!fromBlank) while (same < text.length && from[same] === text[same]) same++;
  if (fromBlank) el.textContent = from;
  el.dataset.printing = "";
  jobs.set(el, { el, from, to: text, start: performance.now() + delay - same * speed, speed, shown: same });
  if (!raf) raf = requestAnimationFrame(frame);
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
