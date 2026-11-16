import { CLAIM, MAINTAINER } from "./watch";

/*
 * Following: repos, orgs and maintainers you keep an eye on, each with a rule for which new issues count.
 * Pure logic here; the searches live in github.ts and the list in the local store.
 */

export type FollowKind = "repo" | "org" | "maintainer";
/** labels: issues with one of your labels. maintainers: issues filed by the project's own people. all: every new issue. */
export type FollowRule = "labels" | "maintainers" | "all";

export type Follow = {
  id: string;
  kind: FollowKind;
  /** owner/name, owner, or a login */
  target: string;
  rule: FollowRule;
  labels: string[];
  addedAt: string;
  /** issues opened after this are new to you */
  seenAt: string;
};

export type FollowIssue = {
  id: string;
  repo: string;
  number: number;
  title: string;
  url: string;
  createdAt: string;
  author: string | null;
  /** filed by an owner, member or collaborator, as far as GitHub shows it */
  maintainer: boolean;
  labels: string[];
  comments: number;
  /** someone else asked for it in the last 21 days */
  claim: { by: string; at: string } | null;
  /** an open or merged PR in the repo that points at it */
  pr: { number: number; url: string } | null;
  /** the same issue filed in this many other repos by the same person */
  alsoIn?: number;
};

export const DEFAULT_LABELS = ["good first issue", "help wanted"];
export const MAX_FOLLOWS = 20;

const LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const NAME = /^[\w.-]{1,100}$/;

/** "owner/repo", a repo or org link, "owner" or "@login" become one follow target. */
export function parseFollow(input: string): { kind: FollowKind; target: string } | { error: string } {
  const v = input
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\/+$/, "");
  if (!v) return { error: "Type a repo like owner/name, an org, or @someone." };
  if (v.startsWith("@")) {
    const login = v.slice(1);
    return LOGIN.test(login) ? { kind: "maintainer", target: login } : { error: "That isn't a GitHub username." };
  }
  const [owner, name, ...rest] = v.split("/");
  if (rest.length && !["issues", "pulls"].includes(rest[0])) return { error: "Use owner/name for a repo, or just the owner for an org." };
  if (!LOGIN.test(owner)) return { error: "That isn't a GitHub owner." };
  if (name === undefined) return { kind: "org", target: owner };
  return NAME.test(name) ? { kind: "repo", target: `${owner}/${name}` } : { error: "That isn't a repo name." };
}

export const followId = (kind: FollowKind, target: string) => `${kind}:${target.toLowerCase()}`;

// user: covers every repo an account owns, whether it's an org or a person.
const scope = (f: Follow) => (f.kind === "repo" ? `repo:${f.target}` : f.kind === "org" ? `user:${f.target}` : `author:${f.target}`);
const quoted = (l: string) => (/[\s,"]/.test(l) ? `"${l.replace(/"/g, "")}"` : l);

/* Open, unassigned, no linked PR GitHub knows of, newest first. Labels are ORed by the comma. */
export function newIssuesQuery(f: Follow) {
  const labels = f.kind !== "maintainer" && f.rule === "labels" && f.labels.length ? ` label:${f.labels.map(quoted).join(",")}` : "";
  return `${scope(f)} is:issue is:open no:assignee -linked:pr archived:false${labels} sort:created-desc`;
}

/* The free-issue scan ignores the rule: any age, any label, recently active first. */
export function freeScanQuery(f: Follow) {
  return `${scope(f)} is:issue is:open no:assignee -linked:pr archived:false sort:updated-desc`;
}

export function ruleText(f: Follow) {
  if (f.kind === "maintainer") return "issues they file anywhere";
  if (f.rule === "maintainers") return "issues filed by maintainers";
  if (f.rule === "all") return "every new issue";
  return `labelled ${f.labels.join(" or ")}`;
}

type RawLinkedPr = { number?: number; url?: string; state?: string; repository?: { nameWithOwner: string } } | null;
export type RawFollowIssue = {
  id: string;
  number: number;
  title: string;
  url: string;
  createdAt: string;
  authorAssociation: string;
  author: { login: string } | null;
  repository: { nameWithOwner: string };
  labels: { nodes: { name: string }[] };
  comments: { totalCount: number; nodes: { author: { login: string } | null; authorAssociation: string; body: string; createdAt: string }[] };
  timelineItems: { nodes: ({ source?: RawLinkedPr; subject?: RawLinkedPr } | null)[] };
};

const CLAIM_FRESH = 21 * 86400000;

/** Reads one searched issue into what Following shows; comment text stays here. */
export function toFollowIssue(i: RawFollowIssue, me: string, now = Date.now()): FollowIssue {
  const meL = me.toLowerCase();
  const claim = [...i.comments.nodes]
    .reverse()
    .find(
      (c) =>
        c.author &&
        c.author.login.toLowerCase() !== meL &&
        !MAINTAINER.has(c.authorAssociation) &&
        now - Date.parse(c.createdAt) < CLAIM_FRESH &&
        CLAIM.test(c.body),
    );
  const repo = i.repository.nameWithOwner.toLowerCase();
  const linked = i.timelineItems.nodes
    .map((e) => e?.source ?? e?.subject ?? null)
    .find((p) => p?.number && p.state !== "CLOSED" && p.repository?.nameWithOwner.toLowerCase() === repo);
  return {
    id: i.id,
    repo: i.repository.nameWithOwner,
    number: i.number,
    title: i.title,
    url: i.url,
    createdAt: i.createdAt,
    author: i.author?.login ?? null,
    maintainer: MAINTAINER.has(i.authorAssociation),
    labels: i.labels.nodes.map((l) => l.name),
    comments: i.comments.totalCount,
    claim: claim ? { by: claim.author!.login, at: claim.createdAt } : null,
    pr: linked ? { number: linked.number!, url: linked.url! } : null,
  };
}

/** What a follow's rule keeps of its search results. */
export function byRule(f: Follow, issues: FollowIssue[]) {
  return f.kind !== "maintainer" && f.rule === "maintainers" ? issues.filter((i) => i.maintainer) : issues;
}

export const isFree = (i: FollowIssue) => !i.claim && !i.pr;

/*
 * One person filing the same issue in three or more repos shows once, with "+N repos".
 * OpenWISP filed one CI task in 21 repos in a single day.
 */
export function mergeBatches(issues: FollowIssue[]): FollowIssue[] {
  const groups = new Map<string, FollowIssue[]>();
  for (const i of issues) {
    const k = `${(i.author ?? "").toLowerCase()}|${i.title.trim().toLowerCase()}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const out: FollowIssue[] = [];
  for (const g of groups.values()) {
    const repos = new Set(g.map((i) => i.repo.toLowerCase()));
    if (repos.size >= 3) out.push({ ...g[0], alsoIn: repos.size - 1 });
    else out.push(...g);
  }
  return out;
}

/* SYNTHETIC: what Following shows on the sample board. Invented repos, people and issues. */
export function sampleFollowing(now: number): { follows: Follow[]; feed: Record<string, FollowIssue[]>; scan: Record<string, FollowIssue[]> } {
  const iso = (hoursAgo: number) => new Date(now - hoursAgo * 3600000).toISOString();
  const follows: Follow[] = [
    { id: "repo:quarry-db/quarry", kind: "repo", target: "quarry-db/quarry", rule: "labels", labels: DEFAULT_LABELS, addedAt: iso(400), seenAt: iso(30) },
    { id: "org:harbor-sh", kind: "org", target: "harbor-sh", rule: "maintainers", labels: [], addedAt: iso(400), seenAt: iso(30) },
    { id: "maintainer:kit-o", kind: "maintainer", target: "kit-o", rule: "all", labels: [], addedAt: iso(400), seenAt: iso(30) },
  ];
  const issue = (id: string, repo: string, number: number, title: string, author: string, hoursAgo: number, extra: Partial<FollowIssue> = {}): FollowIssue => ({
    id,
    repo,
    number,
    title,
    url: `https://github.com/${repo}/issues/${number}`,
    createdAt: iso(hoursAgo),
    author,
    maintainer: true,
    labels: [],
    comments: 0,
    claim: null,
    pr: null,
    ...extra,
  });
  return {
    follows,
    feed: {
      "repo:quarry-db/quarry": [
        issue("sf1", "quarry-db/quarry", 2442, "Document the cursor batch size setting", "mara-k", 6, { labels: ["good first issue", "docs"] }),
        issue("sf2", "quarry-db/quarry", 2436, "EXPLAIN output drops the LIMIT node", "mara-k", 52, { labels: ["help wanted"], comments: 3, claim: { by: "ren-t", at: iso(20) } }),
      ],
      "org:harbor-sh": [
        issue("sf3", "harbor-sh/harbor", 5171, "Retry budget metrics per host", "ilya", 12, { labels: ["enhancement"], comments: 1 }),
        issue("sf4", "harbor-sh/harbor-cli", 140, "Bump the minimum Go version to 1.24", "ilya", 20, { alsoIn: 4 }),
      ],
      "maintainer:kit-o": [issue("sf5", "fernlang/fern-lsp", 77, "Hover shows the wrong type for match guards", "kit-o", 40, { comments: 2, pr: { number: 79, url: "https://github.com/fernlang/fern-lsp/pull/79" } })],
    },
    scan: {
      "repo:quarry-db/quarry": [issue("ss1", "quarry-db/quarry", 2210, "Planner tests are slow on CI", "mara-k", 900, { labels: ["testing"], comments: 4 })],
      "org:harbor-sh": [issue("ss2", "harbor-sh/harbor", 4980, "Webhook signatures: support key rotation", "lena", 1500, { maintainer: false, comments: 6 })],
    },
  };
}
