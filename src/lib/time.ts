"use client";

import { useSyncExternalStore } from "react";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Deterministic short date (UTC), safe to render on the server. */
export function fmtDate(iso: string, withYear = false) {
  const d = new Date(iso);
  const s = `${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return withYear ? `${s}, ${d.getUTCFullYear()}` : s;
}

/* One shared clock for the whole page, ticking every 30 seconds while anything listens. */
let current = 0;
let timer = 0;
const subs = new Set<() => void>();

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    current = Date.now();
    timer = window.setInterval(() => {
      current = Date.now();
      subs.forEach((f) => f());
    }, 30000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size) {
      window.clearInterval(timer);
      timer = 0;
    }
  };
}

const snapshot = () => current || (current = Date.now());

/* Current time, or null during server render and hydration so markup matches. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

const noop = () => () => {};

/* False on the server and during hydration, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
