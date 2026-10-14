"use client";

import { useSyncExternalStore } from "react";
import { setFlapMotion } from "@/components/flap/engine";
import { setSound } from "@/components/flap/sound";

export type Prefs = { sound: boolean; motion: boolean };

const KEY = "spool:prefs";
const listeners = new Set<() => void>();
const DEFAULTS: Prefs = { sound: false, motion: true };
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
}

function apply(p: Prefs) {
  if (typeof document === "undefined") return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.motion = p.motion ? "on" : "off";
  setFlapMotion(p.motion && !reduced);
  // Sound needs a user gesture; it is only switched on from a click.
  if (!p.sound) setSound(false);
}

export function setPrefs(patch: Partial<Prefs>) {
  const next = { ...read(), ...patch };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: keep the in-memory value */
  }
  apply(next);
  if (patch.sound) setSound(true);
  listeners.forEach((l) => l());
}

export function initPrefs() {
  const p = read();
  apply({ ...p, sound: false });
  if (p.sound) {
    // Resume the stored preference on the first gesture.
    const resume = () => {
      setSound(true);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}
