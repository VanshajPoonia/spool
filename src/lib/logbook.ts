/*
 * Your logbook: what you've landed in other people's repos over time. PRs on your own repos are left
 * out, so the numbers say what open source made of your work. Pure shaping; the search lives in github.ts.
 */

export type LogPr = { repo: string; number: number; title: string; url: string; createdAt: string; mergedAt: string | null };

export type Logbook = {
  /** PRs read: GitHub's search returns your newest 500 at most */
  read: number;
  total: number;
  merged: number;
  opened: number;
  repos: { repo: string; merged: number }[];
  first: LogPr | null;
  latest: LogPr | null;
  /** merged per month, oldest first, ending this month */
  months: { month: string; merged: number }[];
  /** weeks in a row with a PR opened or merged; this week only counts once it has one */
  streak: { current: number; longest: number };
  years: number[];
};

export type YearCard = { year: number; merged: number; opened: number; repos: { repo: string; merged: number }[]; months: number[]; longest: number };

const WEEK = 7 * 86400000;
const MONDAY = Date.UTC(1970, 0, 5);
// Your calendar week (Monday to Sunday), counted on your local date so a late-night PR lands in the right one.
const weekOf = (iso: string) => {
  const d = new Date(iso);
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - MONDAY) / WEEK);
};
const monthOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function streaks(weeks: Set<number>, thisWeek: number) {
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const w of [...weeks].sort((a, b) => a - b)) {
    run = prev !== null && w === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = w;
  }
  // A week without a PR yet doesn't break the streak until it's over.
  let current = 0;
  for (let w = weeks.has(thisWeek) ? thisWeek : thisWeek - 1; weeks.has(w); w--) current++;
  return { current, longest };
}

const byMerged = (counts: Map<string, number>) => [...counts].map(([repo, merged]) => ({ repo, merged })).sort((a, b) => b.merged - a.merged || a.repo.localeCompare(b.repo));

export function buildLogbook(all: LogPr[], total: number, me: string, now: number): Logbook {
  const meL = me.toLowerCase();
  const prs = all.filter((p) => p.repo.split("/")[0].toLowerCase() !== meL);
  const merged = prs.filter((p) => p.mergedAt).sort((a, b) => a.mergedAt!.localeCompare(b.mergedAt!));
  const perRepo = new Map<string, number>();
  for (const p of merged) perRepo.set(p.repo, (perRepo.get(p.repo) ?? 0) + 1);

  const perMonth = new Map<string, number>();
  for (const p of merged) perMonth.set(monthOf(p.mergedAt!), (perMonth.get(monthOf(p.mergedAt!)) ?? 0) + 1);
  const d = new Date(now);
  const months = Array.from({ length: 24 }, (_, i) => {
    const m = monthOf(new Date(d.getFullYear(), d.getMonth() - 23 + i, 1).toISOString());
    return { month: m, merged: perMonth.get(m) ?? 0 };
  });

  const weeks = new Set(prs.flatMap((p) => [weekOf(p.createdAt), ...(p.mergedAt ? [weekOf(p.mergedAt)] : [])]));
  const years = [...new Set(prs.map((p) => new Date(p.createdAt).getFullYear()))].sort((a, b) => b - a);

  return {
    read: all.length,
    total,
    merged: merged.length,
    opened: prs.length,
    repos: byMerged(perRepo),
    first: merged[0] ?? null,
    latest: merged.at(-1) ?? null,
    months,
    streak: streaks(weeks, weekOf(new Date(now).toISOString())),
    years,
  };
}

/** One calendar year, for the image card. */
export function yearCard(all: LogPr[], me: string, year: number): YearCard {
  const meL = me.toLowerCase();
  const inYear = (iso: string | null) => !!iso && new Date(iso).getFullYear() === year;
  const prs = all.filter((p) => p.repo.split("/")[0].toLowerCase() !== meL);
  const merged = prs.filter((p) => inYear(p.mergedAt));
  const perRepo = new Map<string, number>();
  for (const p of merged) perRepo.set(p.repo, (perRepo.get(p.repo) ?? 0) + 1);
  const months = Array.from({ length: 12 }, (_, m) => merged.filter((p) => new Date(p.mergedAt!).getMonth() === m).length);
  const weeks = new Set(prs.flatMap((p) => [p.createdAt, p.mergedAt].filter((t): t is string => inYear(t)).map(weekOf)));
  return { year, merged: merged.length, opened: prs.filter((p) => inYear(p.createdAt)).length, repos: byMerged(perRepo), months, longest: streaks(weeks, -1).longest };
}

/* SYNTHETIC: a logbook for the sample board, invented and stable for a given day. */
export function sampleLogPrs(now: number): LogPr[] {
  const repos = ["quarry-db/quarry", "harbor-sh/harbor", "lattice/lattice-ui", "fernlang/fern", "mossjs/moss", "vela-dev/vela"];
  const out: LogPr[] = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const daysAgo = Math.floor(rand() * 560);
    const created = new Date(now - daysAgo * 86400000);
    const repo = repos[Math.floor(rand() * rand() * repos.length)];
    const merged = rand() < 0.72 && daysAgo > 2 ? new Date(created.getTime() + (1 + Math.floor(rand() * 9)) * 86400000) : null;
    out.push({ repo, number: 1000 + i, title: `Sample change ${i + 1}`, url: `https://github.com/${repo}/pull/${1000 + i}`, createdAt: created.toISOString(), mergedAt: merged && merged.getTime() < now ? merged.toISOString() : null });
  }
  return out;
}
