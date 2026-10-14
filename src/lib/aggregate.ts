import type { Thread } from "./classify";
import type { HistNode, History } from "./github";

export type RepoStats = {
  repo: string;
  language: string | null;
  items: HistNode[];
  opened: number;
  merged: HistNode[];
  closed: HistNode[];
  open: HistNode[];
  issues: HistNode[];
  mergeRate: number | null;
  medianDays: number | null;
  first: string | null;
  last: string | null;
  onYou: number;
  onThem: number;
  threads: Thread[];
};

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function aggregate(history: History | null, threads: Thread[]): RepoStats[] {
  const map = new Map<string, RepoStats>();
  const get = (repo: string, lang: string | null) => {
    let r = map.get(repo);
    if (!r) {
      r = { repo, language: lang, items: [], opened: 0, merged: [], closed: [], open: [], issues: [], mergeRate: null, medianDays: null, first: null, last: null, onYou: 0, onThem: 0, threads: [] };
      map.set(repo, r);
    }
    if (!r.language && lang) r.language = lang;
    return r;
  };
  const touch = (r: RepoStats, iso: string | null | undefined) => {
    if (!iso) return;
    if (!r.first || iso < r.first) r.first = iso;
    if (!r.last || iso > r.last) r.last = iso;
  };

  for (const p of history?.prs ?? []) {
    const r = get(p.repository.nameWithOwner, p.repository.primaryLanguage?.name ?? null);
    r.items.push(p);
    r.opened++;
    if (p.state === "MERGED") r.merged.push(p);
    else if (p.state === "CLOSED") r.closed.push(p);
    else r.open.push(p);
    touch(r, p.createdAt);
    touch(r, p.closedAt);
  }
  for (const i of history?.issues ?? []) {
    const r = get(i.repository.nameWithOwner, i.repository.primaryLanguage?.name ?? null);
    r.issues.push(i);
    touch(r, i.createdAt);
  }
  for (const t of threads) {
    const r = get(t.repo, t.language);
    r.threads.push(t);
    if (t.next === "you") r.onYou++;
    if (t.next === "them") r.onThem++;
    touch(r, t.lastAt);
  }
  for (const r of map.values()) {
    const decided = r.merged.length + r.closed.length;
    r.mergeRate = decided ? r.merged.length / decided : null;
    r.medianDays = median(
      r.merged.filter((p) => p.mergedAt).map((p) => (Date.parse(p.mergedAt!) - Date.parse(p.createdAt)) / 86400000),
    );
  }
  return [...map.values()].sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
}

export function fmtDays(d: number | null) {
  if (d === null) return "—";
  if (d < 1) return `${Math.max(1, Math.round(d * 24))}h`;
  return `${d < 10 ? d.toFixed(1) : Math.round(d)}d`;
}
