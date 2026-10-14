"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_PLAN, SAMPLE_PLAN, taskKey, type Col, type Plan, type Prio } from "./plan";
import { watchKey, type WatchedIssue, type WatchItem } from "./watch";

/*
 * Everything Spool remembers lives in this browser's localStorage.
 * Each key is a small store with cross-tab sync. Swapping this module for a
 * server-backed one is the path to multi-user accounts later.
 */

/* `memory` keeps a store in this tab only, for state that shouldn't outlive the page (the sample plan). */
function createStore<T>(key: string, defaults: T, memory = false) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  function read(): T {
    if (cache !== undefined) return cache;
    if (memory) return (cache = defaults);
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      cache = defaults;
    }
    return cache as T;
  }

  function write(next: T) {
    cache = next;
    if (!memory) {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full or blocked: keep the in-memory copy for this session */
      }
    }
    listeners.forEach((l) => l());
  }

  function update(fn: (prev: T) => T) {
    write(fn(read()));
  }

  function clear() {
    cache = defaults;
    if (!memory) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    listeners.forEach((l) => l());
  }

  function subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }

  function use(): T {
    return useSyncExternalStore(subscribe, read, () => defaults);
  }

  return { read, write, update, clear, use, key };
}

/* ---------- auth ---------- */

export type Auth = {
  token: string;
  login: string;
  name: string | null;
  avatar: string;
  scopes: string[];
  savedAt: string;
} | null;

type AuthBox = { auth: Auth };
const authStore = createStore<AuthBox>("spool:auth", { auth: null });

export const useAuth = () => authStore.use().auth;
export const readAuth = () => authStore.read().auth;
export const saveAuth = (auth: NonNullable<Auth>) => authStore.write({ auth });
export const clearAuth = () => authStore.clear();

/* ---------- settings ---------- */

export type Settings = {
  interests: string[];
  staleDays: number;
  youOrder: "oldest" | "newest";
  demo: boolean;
  /** browser notification when a thread becomes your move, while Spool is open */
  notify: boolean;
};

const settingsStore = createStore<Settings>("spool:settings", {
  interests: ["typescript", "rust", "cli", "devtools"],
  staleDays: 14,
  youOrder: "oldest",
  demo: false,
  notify: false,
});

export const useSettings = settingsStore.use;
export const readSettings = settingsStore.read;
export const updateSettings = (patch: Partial<Settings>) => settingsStore.update((s) => ({ ...s, ...patch }));

/* ---------- per-thread meta ---------- */

export type Meta = {
  pins: Record<string, true>;
  snoozed: Record<string, string>;
  notes: Record<string, string>;
  seen: Record<string, string>;
  shortlist: Record<string, { full: string; url: string; addedAt: string }>;
  /** GSoC organisations saved from the browser, by slug */
  orgs: Record<string, { name: string; addedAt: string }>;
  /** issues you might take, keyed by watchKey(repo, number) */
  watch: Record<string, WatchItem>;
};

const metaStore = createStore<Meta>("spool:meta", { pins: {}, snoozed: {}, notes: {}, seen: {}, shortlist: {}, orgs: {}, watch: {} });

export const useMeta = metaStore.use;
export const readMeta = metaStore.read;
export const updateMeta = metaStore.update;

export function togglePin(id: string) {
  metaStore.update((m) => {
    const pins = { ...m.pins };
    if (pins[id]) delete pins[id];
    else pins[id] = true;
    return { ...m, pins };
  });
}

export function snooze(id: string, days: number | null) {
  metaStore.update((m) => {
    const snoozed = { ...m.snoozed };
    if (days === null) delete snoozed[id];
    else snoozed[id] = new Date(Date.now() + days * 86400000).toISOString();
    return { ...m, snoozed };
  });
}

export function setNote(id: string, text: string) {
  metaStore.update((m) => {
    const notes = { ...m.notes };
    if (text.trim()) notes[id] = text;
    else delete notes[id];
    return { ...m, notes };
  });
}

export function markSeen(entries: { id: string; at: string }[]) {
  metaStore.update((m) => {
    const seen = { ...m.seen };
    for (const e of entries) seen[e.id] = e.at;
    return { ...m, seen };
  });
}

export function toggleShortlist(full: string, url: string) {
  metaStore.update((m) => {
    const shortlist = { ...m.shortlist };
    if (shortlist[full]) delete shortlist[full];
    else shortlist[full] = { full, url, addedAt: new Date().toISOString() };
    return { ...m, shortlist };
  });
}

export function toggleOrg(slug: string, name: string) {
  metaStore.update((m) => {
    const orgs = { ...m.orgs };
    if (orgs[slug]) delete orgs[slug];
    else orgs[slug] = { name, addedAt: new Date().toISOString() };
    return { ...m, orgs };
  });
}

export function watchIssue(it: { repo: string; number: number; title: string; url: string }) {
  const at = new Date().toISOString();
  metaStore.update((m) => ({ ...m, watch: { ...m.watch, [watchKey(it.repo, it.number)]: { ...it, addedAt: at, seenAt: at } } }));
}

export function unwatchIssue(key: string) {
  metaStore.update((m) => {
    const watch = { ...m.watch };
    delete watch[key];
    return { ...m, watch };
  });
}

/* Remember when you last looked, so only later comments count as new; the title follows any rename. */
export function seeWatched(key: string, title?: string) {
  metaStore.update((m) => {
    const it = m.watch[key];
    if (!it) return m;
    return { ...m, watch: { ...m.watch, [key]: { ...it, title: title ?? it.title, seenAt: new Date().toISOString() } } };
  });
}

/* ---------- cached board snapshot, so the board paints instantly ---------- */

export const cacheStore = createStore<{ board: unknown; at: string | null; login: string | null }>("spool:cache", {
  board: null,
  at: null,
  login: null,
});

/* ---------- last check of watched issues, so a guest's hourly allowance isn't spent on every visit ---------- */

export const watchCacheStore = createStore<{ who: string | null; at: string | null; issues: Record<string, WatchedIssue | null> }>("spool:watchcache", {
  who: null,
  at: null,
  issues: {},
});

/* ---------- GitHub usage, exactly as GitHub reports it on each response ---------- */

export type RateWindow = { remaining: number; limit: number; resetAt: string; at: string };
/** "guest" is the allowance for calls made without a token; "token" is yours once connected */
export type Who = "guest" | "token";
export type Usage = Partial<Record<`${Who}:${"core" | "search" | "graphql"}`, RateWindow>>;

const usageStore = createStore<Usage>("spool:usage", {});

export const useUsage = usageStore.use;
export const readUsage = usageStore.read;

export function noteUsage(who: Who, resource: string, w: Omit<RateWindow, "at">) {
  if (resource !== "core" && resource !== "search" && resource !== "graphql") return;
  usageStore.update((u) => ({ ...u, [`${who}:${resource}`]: { ...w, at: new Date().toISOString() } }));
}

/** What's left in a window right now; once its reset time passes, GitHub has refilled it. */
export function windowLeft(w: RateWindow | undefined, now = Date.now()) {
  if (!w) return null;
  if (Date.parse(w.resetAt) <= now) return { ...w, remaining: w.limit };
  return w;
}

/* ---------- your plan: kanban placement, priorities and your own tasks ---------- */

const planStore = createStore<Plan>("spool:plan", EMPTY_PLAN);
// The sample board's plan lives only in this tab, so trying things on it never touches yours.
const samplePlanStore = createStore<Plan>("spool:plan-sample", SAMPLE_PLAN, true);

export type PlanStore = typeof planStore;
export const planStoreFor = (sample: boolean): PlanStore => (sample ? samplePlanStore : planStore);
export const readPlan = planStore.read;

export function setPrio(st: PlanStore, key: string, p: Prio | null) {
  st.update((pl) => {
    const prio = { ...pl.prio };
    if (p) prio[key] = p;
    else delete prio[key];
    return { ...pl, prio };
  });
}

/** Put cards in columns at the given order; see placementsFor in plan.ts for which cards a move writes. */
export function placeCards(st: PlanStore, entries: { key: string; col: Col; order: number }[]) {
  st.update((pl) => {
    const place = { ...pl.place };
    for (const e of entries) place[e.key] = { col: e.col, order: e.order };
    return { ...pl, place };
  });
}

export function addTask(st: PlanStore, task: { title: string; url: string | null }, col: Col, prio: Prio | null) {
  const id = Math.random().toString(36).slice(2, 10);
  const key = taskKey(id);
  st.update((pl) => {
    // New cards go to the top of their column.
    const place = { ...pl.place };
    for (const [k, v] of Object.entries(place)) if (v.col === col) place[k] = { ...v, order: v.order + 1 };
    place[key] = { col, order: 0 };
    return {
      ...pl,
      tasks: { ...pl.tasks, [id]: { title: task.title, url: task.url, createdAt: new Date().toISOString() } },
      place,
      prio: prio ? { ...pl.prio, [key]: prio } : pl.prio,
    };
  });
}

/** Your own tasks are deleted; threads and watched issues are only hidden, and come back with showHidden. */
export function removeCards(st: PlanStore, keys: string[]) {
  st.update((pl) => {
    const tasks = { ...pl.tasks };
    const place = { ...pl.place };
    const prio = { ...pl.prio };
    const hidden = { ...pl.hidden };
    for (const k of keys) {
      delete place[k];
      delete prio[k];
      if (k.startsWith("n:")) delete tasks[k.slice(2)];
      else hidden[k] = true;
    }
    return { place, prio, tasks, hidden };
  });
}

export function showHidden(st: PlanStore) {
  st.update((pl) => ({ ...pl, hidden: {} }));
}

/* ---------- export / import / wipe ---------- */

export function exportAll() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settingsStore.read(),
    meta: metaStore.read(),
    plan: planStore.read(),
  };
}

export function importAll(data: { settings?: Partial<Settings>; meta?: Partial<Meta>; plan?: Partial<Plan> }) {
  if (data.settings) settingsStore.update((s) => ({ ...s, ...data.settings }));
  if (data.meta) metaStore.update((m) => ({ ...m, ...data.meta }));
  if (data.plan) planStore.update((pl) => ({ ...pl, ...data.plan }));
}

export function wipeAll() {
  authStore.clear();
  settingsStore.clear();
  metaStore.clear();
  cacheStore.clear();
  watchCacheStore.clear();
  usageStore.clear();
  planStore.clear();
  samplePlanStore.clear();
}
