/*
 * SYNTHETIC. A made-up contributor's day, used on the landing page board.
 * Repos, people, numbers and events are invented and labelled as sample data on the page.
 */

import type { Mood } from "./faces";

export type Next = "YOU" | "THEM" | "DONE";
export type StatusTone = "go" | "wait" | "stop" | undefined;

export type DayState = {
  next: Next;
  status: string;
  tone: StatusTone;
  note: string;
  mood?: Mood;
  /** whole days since the last move, for states carried in from before today */
  quiet?: number;
};

export type DayRow = {
  id: string;
  repo: string;
  num: number;
  kind: "pr" | "issue";
  title: string;
  /** the title cut to a whole phrase, 22 characters at most */
  board: string;
  events: { at: number; state: DayState }[];
};

const h = (hh: number, mm = 0) => hh * 60 + mm;

export const DAY_START = h(8);
export const DAY_END = h(23);

export const SAMPLE_DAY: DayRow[] = [
  {
    id: "qy-2417",
    repo: "quarry-db/quarry",
    num: 2417,
    kind: "pr",
    title: "Stream rows from cursor in batches",
    board: "STREAM ROWS IN BATCHES",
    events: [
      { at: h(8), state: { next: "THEM", status: "IN REVIEW", tone: undefined, note: "Opened 3 days ago, waiting on a maintainer", quiet: 3 } },
      { at: h(10, 41), state: { next: "YOU", status: "CHANGES REQ", tone: "stop", note: "@mara-k asked for a benchmark against the old reader", mood: "alarm" } },
      { at: h(13, 20), state: { next: "THEM", status: "IN REVIEW", tone: undefined, note: "You pushed two commits and posted the numbers", mood: "calm" } },
      { at: h(17, 5), state: { next: "THEM", status: "APPROVED", tone: "go", note: "@mara-k approved; waiting for the merge queue", mood: "glad" } },
      { at: h(19, 30), state: { next: "DONE", status: "MERGED", tone: "go", note: "Merged into main.", mood: "stars" } },
    ],
  },
  {
    id: "lt-881",
    repo: "lattice/lattice-ui",
    num: 881,
    kind: "issue",
    title: "Popover loses focus on scroll",
    board: "POPOVER LOSES FOCUS",
    events: [
      { at: h(8), state: { next: "THEM", status: "STALLED", tone: "wait", note: "Nobody has replied in 19 days", quiet: 19 } },
      { at: h(15, 12), state: { next: "YOU", status: "THEY REPLIED", tone: undefined, note: "@devon asked for a minimal repro", mood: "watch" } },
      { at: h(16, 5), state: { next: "THEM", status: "AWAITING", tone: undefined, note: "You posted a repro link", mood: "calm" } },
    ],
  },
  {
    id: "hb-5120",
    repo: "harbor-sh/harbor",
    num: 5120,
    kind: "pr",
    title: "Add retry jitter to webhook sender",
    board: "WEBHOOK RETRY JITTER",
    events: [
      { at: h(8), state: { next: "THEM", status: "DRAFT", tone: undefined, note: "@ilya is still drafting", quiet: 1 } },
      { at: h(9, 30), state: { next: "YOU", status: "REVIEW ASKED", tone: undefined, note: "@ilya requested your review", mood: "focus" } },
      { at: h(12, 15), state: { next: "THEM", status: "REVIEWED", tone: "go", note: "You approved with two comments", mood: "wink" } },
    ],
  },
  {
    id: "fn-302",
    repo: "fernlang/fern",
    num: 302,
    kind: "pr",
    title: "Pattern match on nested enums",
    board: "MATCH NESTED ENUMS",
    events: [
      { at: h(8), state: { next: "THEM", status: "IN REVIEW", tone: undefined, note: "Waiting on a reviewer", quiet: 4 } },
      { at: h(11, 40), state: { next: "YOU", status: "CI FAILED", tone: "stop", note: "test-linux failed: snapshot mismatch", mood: "done" } },
      { at: h(14, 2), state: { next: "THEM", status: "IN REVIEW", tone: undefined, note: "You updated the snapshot; checks are green", mood: "calm" } },
    ],
  },
  {
    id: "ob-77",
    repo: "tinyorbit/orbit-cli",
    num: 77,
    kind: "issue",
    title: "Ship shell completions for fish",
    board: "FISH SHELL COMPLETIONS",
    events: [
      { at: h(8), state: { next: "YOU", status: "ASSIGNED", tone: undefined, note: "Assigned to you 6 days ago", quiet: 6 } },
      { at: h(21, 10), state: { next: "THEM", status: "IN REVIEW", tone: undefined, note: "You opened PR #81 for it", mood: "glad" } },
    ],
  },
];

export function stateAt(row: DayRow, minute: number): DayState {
  let s = row.events[0].state;
  for (const e of row.events) if (e.at <= minute) s = e.state;
  return s;
}

export function lastEventAt(row: DayRow, minute: number): number {
  let t = row.events[0].at;
  for (const e of row.events) if (e.at <= minute) t = e.at;
  return t;
}

export function allEvents() {
  return SAMPLE_DAY.flatMap((r) => r.events.slice(1).map((e) => ({ row: r, at: e.at, state: e.state }))).sort(
    (a, b) => a.at - b.at,
  );
}

export function hhmm(minute: number) {
  const hh = Math.floor(minute / 60) % 24;
  const mm = Math.floor(minute % 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
