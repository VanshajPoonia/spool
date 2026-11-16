import { statusLabel } from "./format";
import type { Next, Thread } from "./classify";

/*
 * "Since you last looked": the board compares each fresh load with the one before it and keeps
 * what changed until you mark it handled. One item per thread; a newer change replaces an older one.
 */

/** What Spool remembers of a thread between loads, to tell what changed. */
export type Snap = Pick<Thread, "next" | "status" | "state" | "ci" | "lastAt" | "lastActor" | "title" | "repo" | "num" | "url" | "kind" | "reason">;

export type ChangeKind = "merged" | "closed" | "reply" | "ci-red" | "ci-green" | "status" | "arrived" | "left";

export type Change = {
  id: string;
  kind: ChangeKind;
  /** when Spool noticed it */
  at: string;
  /** changes to this thread since you last handled it */
  count: number;
  label: string;
  text: string;
  next: Next;
  repo: string;
  num: number;
  title: string;
  url: string;
};

export function snapOf(t: Thread): Snap {
  const { next, status, state, ci, lastAt, lastActor, title, repo, num, url, kind, reason } = t;
  return { next, status, state, ci, lastAt, lastActor, title, repo, num, url, kind, reason };
}

// "STALLED 15D" becomes "STALLED 16D" every day; only going stalled is news.
const base = (status: string) => status.replace(/ \d+D$/, "");
const red = (ci: string | null) => ci === "FAILURE" || ci === "ERROR";

function changeOf(was: Snap | undefined, now: Snap, me: string): Pick<Change, "kind" | "label" | "text"> | null {
  if (!was) return now.next === "done" ? null : { kind: "arrived", label: "New on the board", text: now.reason };
  if (was.state === "open" && now.state === "merged") return { kind: "merged", label: "Merged", text: now.reason };
  if (was.state === "open" && now.state === "closed") return { kind: "closed", label: "Closed", text: now.reason };
  if (now.lastAt > was.lastAt && now.lastActor && now.lastActor.toLowerCase() !== me) {
    return { kind: "reply", label: `@${now.lastActor} replied`, text: now.reason };
  }
  if (now.kind === "pr" && !red(was.ci) && red(now.ci)) return { kind: "ci-red", label: "CI failing", text: now.reason };
  if (now.kind === "pr" && red(was.ci) && now.ci === "SUCCESS") return { kind: "ci-green", label: "CI passing", text: now.reason };
  if (base(was.status) !== base(now.status)) return { kind: "status", label: `Now: ${statusLabel(base(now.status))}`, text: now.reason };
  return null;
}

/** Compare a fresh board with the last one seen; `pending` is what you haven't handled yet. */
export function diffBoards(before: Record<string, Snap>, after: Thread[], me: string, at: string, pending: Record<string, Change>) {
  const meL = me.toLowerCase();
  const found: Change[] = [];
  const add = (id: string, s: Snap, c: Pick<Change, "kind" | "label" | "text">) =>
    found.push({ ...c, id, at, count: (pending[id]?.count ?? 0) + 1, next: s.next, repo: s.repo, num: s.num, title: s.title, url: s.url });
  const seen = new Set<string>();
  for (const t of after) {
    seen.add(t.id);
    const c = changeOf(before[t.id], snapOf(t), meL);
    if (c) add(t.id, snapOf(t), c);
  }
  for (const [id, s] of Object.entries(before)) {
    // Merged and closed threads age off the board after 21 days; that isn't news.
    if (seen.has(id) || s.next === "done") continue;
    add(id, { ...s, next: "done" }, { kind: "left", label: "Off the board", text: "It no longer shows up as open and involving you." });
  }
  return found;
}

/* SYNTHETIC: what the sample board shows under "Since you last looked". */
export function sampleChanges(threads: Thread[], now: number): Change[] {
  const pick: [number, ChangeKind, string][] = [
    [2431, "reply", "@mara-k replied"],
    [860, "ci-red", "CI failing"],
    [1175, "status", "Now: Conflicts"],
    [2417, "merged", "Merged"],
    [330, "reply", "@kit-o replied"],
  ];
  return pick.flatMap(([num, kind, label], i) => {
    const t = threads.find((x) => x.num === num);
    if (!t) return [];
    const at = new Date(now - (i + 1) * 47 * 60000).toISOString();
    return [{ id: t.id, kind, at, count: 1, label, text: t.reason, next: t.next, repo: t.repo, num: t.num, title: t.title, url: t.url }];
  });
}
