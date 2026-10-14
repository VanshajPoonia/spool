import type { LampState } from "@/components/kit/Kit";
import { lampFor, type Thread } from "./classify";
import { watchStatus, type WatchedIssue, type WatchItem } from "./watch";

/*
 * Your plan: a kanban of the open source work you mean to do, and the priority you give each thing.
 * Cards come from three places: your threads on the board, issues you watch, and tasks you write yourself.
 * Pure logic here; the plan itself lives in the local store.
 */

export type Col = "inbox" | "next" | "doing" | "waiting" | "done";
export type Prio = 1 | 2 | 3;
export type Task = { title: string; url: string | null; createdAt: string };

export type Plan = {
  /** the column you put a card in, and its place there; a card that isn't here sits where its GitHub state suggests */
  place: Record<string, { col: Col; order: number }>;
  prio: Record<string, Prio>;
  /** your own cards, by id */
  tasks: Record<string, Task>;
  /** threads and watched issues you took off the plan */
  hidden: Record<string, true>;
};

export const EMPTY_PLAN: Plan = { place: {}, prio: {}, tasks: {}, hidden: {} };

export const COLS: { id: Col; title: string; sub: string }[] = [
  { id: "inbox", title: "Inbox", sub: "New and unsorted. Your open threads and watched issues land here." },
  { id: "next", title: "Up next", sub: "What you'll pick up next." },
  { id: "doing", title: "Working on", sub: "Keep it to one or two." },
  { id: "waiting", title: "Waiting", sub: "Out of your hands until someone answers." },
  { id: "done", title: "Done", sub: "Merged and closed items move here on their own." },
];

export const PRIOS: Record<Prio, { short: string; label: string; hint: string }> = {
  1: { short: "P1", label: "High", hint: "Work on this first" },
  2: { short: "P2", label: "Medium", hint: "Soon, after the P1s" },
  3: { short: "P3", label: "Low", hint: "When there's time" },
};

/** Lower sorts first; no priority sorts after P3. */
export const prioRank = (p: Prio | null | undefined) => p ?? 4;

/* Keys are prefixed so a thread, a watched issue and a task can never collide. */
export const threadKey = (id: string) => `t:${id}`;
export const watchCardKey = (key: string) => `w:${key}`;
export const taskKey = (id: string) => `n:${id}`;

export type Card = {
  key: string;
  kind: "pr" | "issue" | "watch" | "task";
  title: string;
  repo: string | null;
  num: number | null;
  url: string | null;
  /** short state, e.g. "Changes requested" or "Still free"; null for your own tasks */
  status: string | null;
  detail: string | null;
  lamp: LampState;
  yourMove: boolean;
  /** GitHub says it's merged or closed, so it stays in Done */
  finished: boolean;
  /** last activity on GitHub, or when you wrote the task */
  at: string | null;
  col: Col;
  placed: boolean;
  order: number;
  prio: Prio | null;
  /** the board thread behind this card, so the card can open its details */
  threadId: string | null;
};

const SAY: Record<string, string> = {
  "CHANGES REQ": "Changes requested",
  "CI FAILED": "CI failing",
  "REVIEW ASKED": "Review asked",
  "INCOMING PR": "Incoming PR",
  "THEY REPLIED": "They replied",
  "WITH AUTHOR": "With the author",
  "IN REVIEW": "In review",
};

/* The board speaks in flap capitals; a card speaks in sentence case. */
function say(status: string) {
  if (SAY[status]) return SAY[status];
  const d = status.match(/^DELAYED (\d+)D$/);
  if (d) return `Quiet ${d[1]} days`;
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export type WatchInput = { key: string; item: WatchItem; issue: WatchedIssue | null | undefined };

export function buildCards({ threads, watch, me, plan }: { threads: Thread[]; watch: WatchInput[]; me: string | null; plan: Plan }): Card[] {
  const out: Card[] = [];
  const known = (k: string) => k in plan.place || k in plan.prio;

  const finish = (c: Omit<Card, "col" | "placed" | "order" | "prio">, fallback: Col): Card => {
    const p = plan.place[c.key];
    const col: Col = c.finished ? "done" : p ? p.col : fallback;
    return { ...c, col, placed: !!p && p.col === col, order: p && p.col === col ? p.order : Infinity, prio: plan.prio[c.key] ?? null };
  };

  for (const t of threads) {
    const key = threadKey(t.id);
    if (plan.hidden[key]) continue;
    // Your open threads come in by themselves; threads you only follow, or that already finished, only if you planned them.
    if ((t.next === "watch" || t.next === "done") && !known(key)) continue;
    out.push(
      finish(
        {
          key,
          kind: t.kind,
          title: t.title,
          repo: t.repo,
          num: t.num,
          url: t.url,
          status: say(t.status),
          detail: t.reason,
          lamp: lampFor(t.tone),
          yourMove: t.next === "you",
          finished: t.next === "done",
          at: t.lastAt,
          threadId: t.id,
        },
        t.next === "them" ? "waiting" : "inbox",
      ),
    );
  }

  for (const w of watch) {
    const key = watchCardKey(w.key);
    if (plan.hidden[key]) continue;
    const st = w.issue === undefined ? null : watchStatus(w.issue, w.item, me);
    out.push(
      finish(
        {
          key,
          kind: "watch",
          title: w.issue?.title ?? w.item.title,
          repo: w.item.repo,
          num: w.item.number,
          url: w.item.url,
          status: st ? st.label : "Not checked yet",
          detail: st ? st.detail : "Discover checks watched issues.",
          lamp: st ? st.lamp : "idle",
          yourMove: false,
          finished: st?.kind === "closed",
          at: w.item.addedAt,
          threadId: null,
        },
        "inbox",
      ),
    );
  }

  for (const [id, task] of Object.entries(plan.tasks)) {
    const key = taskKey(id);
    out.push(
      finish(
        {
          key,
          kind: "task",
          title: task.title,
          repo: null,
          num: null,
          url: task.url,
          status: null,
          detail: null,
          lamp: "idle",
          yourMove: false,
          finished: false,
          at: task.createdAt,
          threadId: null,
        },
        "inbox",
      ),
    );
  }
  return out;
}

/** Cards you placed keep your order; the rest follow, most important and most recent first. */
export function byColumn(cards: Card[]): Record<Col, Card[]> {
  const cols: Record<Col, Card[]> = { inbox: [], next: [], doing: [], waiting: [], done: [] };
  for (const c of cards) cols[c.col].push(c);
  for (const list of Object.values(cols)) {
    list.sort((a, b) => a.order - b.order || prioRank(a.prio) - prioRank(b.prio) || (b.at ?? "").localeCompare(a.at ?? ""));
  }
  return cols;
}

/** The same columns, each sorted by priority; your order breaks ties. */
export function sortedByPriority(cols: Record<Col, Card[]>): Record<Col, string[]> {
  const out = {} as Record<Col, string[]>;
  for (const [col, list] of Object.entries(cols) as [Col, Card[]][]) {
    out[col] = list
      .map((c, i) => ({ c, i }))
      .sort((a, b) => prioRank(a.c.prio) - prioRank(b.c.prio) || a.i - b.i)
      .map(({ c }) => c.key);
  }
  return out;
}

export type Suggestion = { card: Card; why: string } | null;

/* What to work on now: finish what you started, then the most important thing you lined up. */
export function suggest(cols: Record<Col, Card[]>): Suggestion {
  const doing = cols.doing.find((c) => !c.finished);
  if (doing) {
    return { card: doing, why: doing.yourMove ? "You're working on it, and it's your move." : "You're already working on it. Finish it before starting something new." };
  }
  const best = (list: Card[]) => [...list].sort((a, b) => prioRank(a.prio) - prioRank(b.prio))[0];
  const next = best(cols.next);
  if (next) return { card: next, why: next.prio ? `Top of Up next, marked ${PRIOS[next.prio].label.toLowerCase()}.` : "Top of Up next." };
  const inbox = best(cols.inbox.filter((c) => c.prio || c.yourMove));
  if (inbox) {
    return { card: inbox, why: inbox.prio ? `Nothing is lined up yet; this is the most important card in your inbox.` : "Nothing is lined up yet, and this one is your move." };
  }
  return null;
}

/* The sample board gets a plan too, so you can see one working before you make your own. */
export const SAMPLE_PLAN: Plan = {
  place: {
    "t:sample-0": { col: "doing", order: 0 },
    "t:sample-9": { col: "next", order: 0 },
    "n:sample-gsoc": { col: "next", order: 1 },
    "w:tinyorbit/orbit-cli#412": { col: "next", order: 2 },
    "t:sample-11": { col: "next", order: 3 },
    "t:sample-15": { col: "done", order: 0 },
  },
  prio: {
    "t:sample-0": 1,
    "t:sample-9": 1,
    "n:sample-gsoc": 2,
    "t:sample-11": 2,
    "w:tinyorbit/orbit-cli#412": 3,
    "t:sample-6": 2,
    "t:sample-4": 1,
  },
  tasks: {
    "sample-gsoc": { title: "Draft a GSoC proposal for quarry-db", url: null, createdAt: "2026-10-01T09:00:00.000Z" },
    "sample-read": { title: "Read fern's contributing guide", url: null, createdAt: "2026-10-03T09:00:00.000Z" },
  },
  hidden: {},
};

/*
 * After a move, which cards to write so the column keeps exactly the order you see.
 * Cards at or above `upTo` and cards you'd already placed get their position; unplaced cards
 * below stay unplaced, so they still follow their GitHub state (they sort after placed ones anyway).
 */
export function placementsFor(col: Col, keys: string[], isPlaced: (k: string) => boolean, upTo: number) {
  return keys.flatMap((key, order) => (order <= upTo || isPlaced(key) ? [{ key, col, order }] : []));
}
