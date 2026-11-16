import { isHuman } from "./classify";

/*
 * "Can an outsider land work here?": a repo read from public data, the way the owner's playbook
 * checks an org before investing in it. Pure shaping here; the query lives in github.ts.
 */

export type RepoCheck = {
  repo: string;
  url: string;
  pushedAt: string;
  archived: boolean;
  licence: string | null;
  codeOfConduct: boolean;
  contributing: string | null;
  /** merged PRs in the last 90 days, how many of those (in the first 100) came from outsiders, and from how many people */
  merged: { total: number; sampled: number; outside: number; outsideAuthors: number };
  /** first answer from someone other than the author on the last outside PRs, in hours */
  answer: { medianHours: number | null; answered: number; unanswered: number };
  /** CONTRIBUTING lines about taking an issue, and workflows named for it */
  claim: { lines: string[]; workflows: string[] };
  sign: { cla: boolean; dco: boolean };
  ai: { file: string | null; line: string | null };
  goodFirst: number;
  at: string;
};

type Actor = { __typename?: string; login: string } | null;
type RawPr = {
  createdAt: string;
  mergedAt: string | null;
  authorAssociation: string;
  author: Actor;
  comments: { nodes: { createdAt: string; author: Actor }[] };
  reviews: { nodes: { submittedAt: string | null; author: Actor }[] };
  commits: { nodes: { commit: { statusCheckRollup: { contexts: { nodes: { name?: string; context?: string }[] } } | null } }[] };
};
export type RawRepoCheck = {
  repository: {
    nameWithOwner: string;
    url: string;
    pushedAt: string;
    isArchived: boolean;
    licenseInfo: { spdxId: string | null; name: string } | null;
    codeOfConduct: { name: string } | null;
    c1: { text: string | null } | null;
    c2: { text: string | null } | null;
    c3: { text: string | null } | null;
    ai1: { text: string | null } | null;
    ai2: { text: string | null } | null;
    workflows: { entries: { name: string }[] } | null;
  } | null;
  merged: { issueCount: number; nodes: ({ title: string; authorAssociation: string; author: Actor } | Record<string, never>)[] };
  closed: { nodes: (RawPr | Record<string, never>)[] };
  gfi: { issueCount: number };
};

// Members who keep their org membership private show as CONTRIBUTOR, so "outside" can include staff.
const OUTSIDE = new Set(["CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR", "FIRST_TIMER", "NONE"]);
// Staff often title PRs with their internal ticket, like [WEB-123]; outsiders don't have tickets.
const TICKET = /^\[[A-Z][A-Z0-9]+-\d+\]/;
const isBot = (a: Actor) => !isHuman(a);
const outside = (assoc: string, a: Actor, title = "") => OUTSIDE.has(assoc) && !isBot(a) && !TICKET.test(title);

const CLAIM_LINE = /\bassign(ed|ment|ing)?\b|\bclaim\b|\/assign\b|\btake (an|the|this) issue\b/i;
const AI_LINE = /\b(ai|llm|llms|chatgpt|copilot|claude|generative|machine[- ]generated|ai[- ]assisted)\b/i;
const CLA = /^license\/cla$|easycla|\bcla\b/i;
const DCO = /^dco$/i;

/* Plain lines from a markdown file that match, trimmed for a quick read; headings and code fences left out. */
function lines(text: string | null, re: RegExp, max: number) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s>*\-+\d.]+/, "").replace(/[*_`]/g, "").trim())
    .filter((l) => l.length > 20 && !l.startsWith("#") && !l.startsWith("```") && re.test(l))
    .slice(0, max)
    .map((l) => (l.length > 220 ? `${l.slice(0, 219)}…` : l));
}

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function summarize(raw: RawRepoCheck, at: string): RepoCheck | null {
  const r = raw.repository;
  if (!r) return null;
  const contributing = r.c1?.text ? "CONTRIBUTING.md" : r.c2?.text ? ".github/CONTRIBUTING.md" : r.c3?.text ? "docs/CONTRIBUTING.md" : null;
  const contribText = r.c1?.text ?? r.c2?.text ?? r.c3?.text ?? null;

  const merged = raw.merged.nodes.filter((n): n is { title: string; authorAssociation: string; author: Actor } => "authorAssociation" in n);
  const outsideMerged = merged.filter((n) => outside(n.authorAssociation, n.author, n.title));
  const prs = raw.closed.nodes.filter((n): n is RawPr => "createdAt" in n);

  const hours: number[] = [];
  let unanswered = 0;
  for (const pr of prs.filter((x) => outside(x.authorAssociation, x.author)).slice(0, 20)) {
    const me = pr.author?.login.toLowerCase();
    const replies = [
      ...pr.comments.nodes.filter((c) => !isBot(c.author) && c.author!.login.toLowerCase() !== me).map((c) => c.createdAt),
      ...pr.reviews.nodes.filter((v) => v.submittedAt && !isBot(v.author) && v.author!.login.toLowerCase() !== me).map((v) => v.submittedAt!),
      // A merge with no words is still an answer.
      ...(pr.mergedAt ? [pr.mergedAt] : []),
    ].sort();
    if (replies.length) hours.push((Date.parse(replies[0]) - Date.parse(pr.createdAt)) / 3600000);
    else unanswered++;
  }

  const checks = prs.flatMap((pr) => pr.commits.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? []).map((c) => c.name ?? c.context ?? "");
  const aiFile = r.ai1?.text ? "AI_POLICY.md" : r.ai2?.text ? ".github/AI_POLICY.md" : null;

  return {
    repo: r.nameWithOwner,
    url: r.url,
    pushedAt: r.pushedAt,
    archived: r.isArchived,
    licence: r.licenseInfo ? (r.licenseInfo.spdxId && r.licenseInfo.spdxId !== "NOASSERTION" ? r.licenseInfo.spdxId : r.licenseInfo.name) : null,
    codeOfConduct: !!r.codeOfConduct,
    contributing,
    merged: {
      total: raw.merged.issueCount,
      sampled: merged.length,
      outside: outsideMerged.length,
      outsideAuthors: new Set(outsideMerged.map((n) => n.author!.login.toLowerCase())).size,
    },
    answer: { medianHours: median(hours), answered: hours.length, unanswered },
    claim: { lines: lines(contribText, CLAIM_LINE, 3), workflows: (r.workflows?.entries ?? []).map((e) => e.name).filter((n) => /assign|claim/i.test(n)) },
    sign: { cla: checks.some((c) => CLA.test(c)), dco: checks.some((c) => DCO.test(c)) },
    ai: { file: aiFile, line: lines(aiFile ? (r.ai1?.text ?? r.ai2?.text ?? null) : contribText, AI_LINE, 1)[0] ?? null },
    goodFirst: raw.gfi.issueCount,
    at,
  };
}

export function fmtHours(h: number | null) {
  if (h === null) return "no outside PRs answered";
  if (h < 1) return "under an hour";
  if (h < 48) return `${Math.round(h)} hours`;
  return `${Math.round(h / 24)} days`;
}

/** Open PRs you have per owner, from the board, for the per-org limit. Your own account doesn't count. */
export function openPrsByOwner(threads: { kind: string; author: string | null; state: string; repo: string }[], me: string) {
  const out = new Map<string, number>();
  for (const t of threads) {
    if (t.kind !== "pr" || t.state !== "open" || t.author?.toLowerCase() !== me.toLowerCase()) continue;
    const owner = t.repo.split("/")[0].toLowerCase();
    if (owner === me.toLowerCase()) continue;
    out.set(owner, (out.get(owner) ?? 0) + 1);
  }
  return out;
}

/* SYNTHETIC: the report the sample board shows for any repo. */
export function sampleRepoCheck(repo: string, now: number): RepoCheck {
  return {
    repo,
    url: `https://github.com/${repo}`,
    pushedAt: new Date(now - 2 * 86400000).toISOString(),
    archived: false,
    licence: "Apache-2.0",
    codeOfConduct: true,
    contributing: "CONTRIBUTING.md",
    merged: { total: 64, sampled: 64, outside: 23, outsideAuthors: 14 },
    answer: { medianHours: 31, answered: 17, unanswered: 3 },
    claim: { lines: ["Comment on the issue to ask for it, and wait to be assigned before you open a PR."], workflows: ["auto-assign.yml"] },
    sign: { cla: false, dco: true },
    ai: { file: null, line: "Say in the PR if an AI tool helped, and be ready to explain every line." },
    goodFirst: 9,
    at: new Date(now).toISOString(),
  };
}
