/*
 * GitHub, read-only, called straight from the browser.
 * The token goes to api.github.com and nowhere else.
 * Without a token (guest mode) the same calls go out unauthenticated, under GitHub's smaller allowance.
 */

import { noteUsage, readUsage, windowLeft, type Who } from "./store";
import type { WatchedIssue } from "./watch";

const API = "https://api.github.com";

/* Every response carries the caller's remaining allowance; keep the latest so Spool can show it and stay under it. */
function noteRate(res: Response, who: Who) {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const limit = res.headers.get("x-ratelimit-limit");
  const reset = res.headers.get("x-ratelimit-reset");
  const resource = res.headers.get("x-ratelimit-resource");
  if (remaining === null || limit === null || reset === null || !resource) return;
  noteUsage(who, resource, { remaining: Number(remaining), limit: Number(limit), resetAt: new Date(Number(reset) * 1000).toISOString() });
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const GUEST_HOURLY = 60;

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

function explain(status: number, fallback: string) {
  if (status === 401) return "GitHub rejected this token. It may have expired or been revoked; paste a new one in Settings.";
  if (status === 403) return "GitHub refused the request. You may have hit the rate limit; it resets within the hour.";
  if (status >= 500) return "GitHub is having trouble right now. Try again in a minute.";
  return fallback;
}

export async function verifyToken(token: string) {
  let res: Response;
  try {
    res = await fetch(`${API}/user`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
  } catch {
    throw new GitHubError("Couldn't reach api.github.com. Check your connection and try again.");
  }
  noteRate(res, "token");
  if (!res.ok) throw new GitHubError(explain(res.status, `GitHub answered ${res.status}.`), res.status);
  const u = (await res.json()) as { login: string; name: string | null; avatar_url: string };
  const scopes = (res.headers.get("x-oauth-scopes") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { login: u.login, name: u.name, avatar: u.avatar_url, scopes };
}

export async function gql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/graphql`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new GitHubError("Couldn't reach api.github.com. Check your connection and try again.");
  }
  noteRate(res, "token");
  if (!res.ok) throw new GitHubError(explain(res.status, `GitHub answered ${res.status}.`), res.status);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!json.data) throw new GitHubError(json.errors?.[0]?.message ?? "GitHub returned no data.");
  return json.data;
}

/* ---------- board query ---------- */

type Actor = { __typename?: string; login: string } | null;

type RawRepo = {
  nameWithOwner: string;
  isPrivate: boolean;
  stargazerCount: number;
  primaryLanguage: { name: string; color: string | null } | null;
};

type RawComment = { author: Actor; createdAt: string };

export type RawNode = {
  __typename: "PullRequest" | "Issue";
  id: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt?: string | null;
  reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  author: Actor;
  repository: RawRepo;
  comments: { totalCount: number; nodes: RawComment[] };
  reviews?: { nodes: { author: Actor; state: string; submittedAt: string | null }[] };
  commits?: { nodes: { commit: { committedDate: string; statusCheckRollup: { state: string } | null } }[] };
  reviewRequests?: { nodes: { requestedReviewer: { login?: string; name?: string } | null }[] };
  assignees?: { nodes: { login: string }[] };
  labels: { nodes: { name: string; color: string }[] };
};

const FRAGMENTS = /* GraphQL */ `
fragment Repo on Repository { nameWithOwner isPrivate stargazerCount primaryLanguage { name color } }
fragment PRF on PullRequest {
  __typename id number title url state isDraft createdAt updatedAt closedAt mergedAt reviewDecision
  author { __typename login }
  repository { ...Repo }
  comments(last: 3) { totalCount nodes { author { __typename login } createdAt } }
  reviews(last: 3) { nodes { author { __typename login } state submittedAt } }
  commits(last: 1) { nodes { commit { committedDate statusCheckRollup { state } } } }
  reviewRequests(first: 4) { nodes { requestedReviewer { ... on User { login } ... on Team { name } } } }
  assignees(first: 4) { nodes { login } }
  labels(first: 4) { nodes { name color } }
}
fragment ISF on Issue {
  __typename id number title url state createdAt updatedAt closedAt
  author { __typename login }
  repository { ...Repo }
  comments(last: 3) { totalCount nodes { author { __typename login } createdAt } }
  assignees(first: 4) { nodes { login } }
  labels(first: 4) { nodes { name color } }
}`;

export type Source = "mine" | "myIssues" | "review" | "assigned" | "mentions" | "commented" | "incoming" | "recent";

/* How many results each search pulls. Kept modest: one heavy query makes GitHub time out (502). */
const SIZES: Record<Source, number> = {
  mine: 40,
  myIssues: 30,
  review: 20,
  assigned: 20,
  mentions: 15,
  commented: 15,
  incoming: 20,
  recent: 20,
};

/* Searches run as three small parallel requests. */
const GROUPS: Source[][] = [
  ["mine", "recent"],
  ["myIssues", "review", "assigned"],
  ["mentions", "commented", "incoming"],
];

function groupQuery(group: Source[]) {
  const vars = group.map((g) => `$${g}: String!`).join(", ");
  const body = group
    .map((g) => `${g}: search(query: $${g}, type: ISSUE, first: ${SIZES[g]}) { issueCount nodes { ...PRF ...ISF } }`)
    .join("\n  ");
  return `${FRAGMENTS}\nquery Board(${vars}) {\n  ${body}\n  rateLimit { remaining limit resetAt cost }\n}`;
}

type SearchBlock = { issueCount: number; nodes: (RawNode | Record<string, never>)[] };
type Rate = { remaining: number; limit: number; resetAt: string; cost: number };

export type RawBoard = {
  login: string;
  fetchedAt: string;
  nodes: (RawNode & { sources: Source[] })[];
  rate: { remaining: number; limit: number; resetAt: string };
  /** searches that failed on this load; the board shows what did arrive */
  missing?: Source[];
};

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    // GitHub answers 502 when a query runs long; one quick retry usually lands.
    if (e instanceof GitHubError && (e.status === 502 || e.status === 504)) {
      await new Promise((r) => setTimeout(r, 600));
      return fn();
    }
    throw e;
  }
}

export async function fetchBoard(token: string, login: string): Promise<RawBoard> {
  const since = new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10);
  const L = login;
  const q: Record<Source, string> = {
    mine: `is:pr is:open author:${L} archived:false sort:updated-desc`,
    myIssues: `is:issue is:open author:${L} archived:false sort:updated-desc`,
    review: `is:pr is:open review-requested:${L} archived:false sort:updated-desc`,
    assigned: `is:open assignee:${L} archived:false sort:updated-desc`,
    mentions: `is:open mentions:${L} -author:${L} archived:false sort:updated-desc`,
    commented: `is:open commenter:${L} -author:${L} archived:false sort:updated-desc`,
    incoming: `is:pr is:open user:${L} -author:${L} archived:false sort:updated-desc`,
    recent: `is:pr author:${L} is:closed closed:>${since} sort:updated-desc`,
  };
  const results = await Promise.allSettled(
    GROUPS.map((group) =>
      withRetry(() =>
        gql<Partial<Record<Source, SearchBlock>> & { rateLimit: Rate }>(
          token,
          groupQuery(group),
          Object.fromEntries(group.map((g) => [g, q[g]])),
        ),
      ),
    ),
  );
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length === results.length) throw failed[0].reason;

  const byId = new Map<string, RawNode & { sources: Source[] }>();
  let rate: Rate | null = null;
  const missing: Source[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      missing.push(...GROUPS[i]);
      return;
    }
    const data = r.value;
    if (!rate || data.rateLimit.remaining < rate.remaining) rate = data.rateLimit;
    for (const src of GROUPS[i]) {
      for (const n of data[src]?.nodes ?? []) {
        if (!("id" in n) || !n.id) continue;
        const node = n as RawNode;
        const existing = byId.get(node.id);
        if (existing) existing.sources.push(src);
        else byId.set(node.id, { ...node, sources: [src] });
      }
    }
  });
  const rl = rate as Rate | null;
  return {
    login,
    fetchedAt: new Date().toISOString(),
    nodes: [...byId.values()],
    rate: rl ? { remaining: rl.remaining, limit: rl.limit, resetAt: rl.resetAt } : { remaining: 0, limit: 0, resetAt: new Date().toISOString() },
    missing: missing.length ? missing : undefined,
  };
}

/* ---------- history for repo progress ---------- */

export type HistNode = {
  __typename: "PullRequest" | "Issue";
  id: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  createdAt: string;
  closedAt: string | null;
  mergedAt?: string | null;
  repository: RawRepo;
};

export type OwnRepo = {
  nameWithOwner: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  pushedAt: string;
  isFork: boolean;
  primaryLanguage: { name: string; color: string | null } | null;
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
};

const HISTORY_QUERY = /* GraphQL */ `
fragment Repo on Repository { nameWithOwner isPrivate stargazerCount primaryLanguage { name color } }
query History($prs: String!, $issues: String!) {
  viewer {
    repositories(first: 30, ownerAffiliations: OWNER, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        nameWithOwner description url stargazerCount forkCount pushedAt isFork
        primaryLanguage { name color }
        issues(states: OPEN) { totalCount }
        pullRequests(states: OPEN) { totalCount }
      }
    }
  }
  prs: search(query: $prs, type: ISSUE, first: 100) {
    issueCount
    nodes { ... on PullRequest { __typename id number title url state createdAt closedAt mergedAt repository { ...Repo } } }
  }
  issues: search(query: $issues, type: ISSUE, first: 60) {
    issueCount
    nodes { ... on Issue { __typename id number title url state createdAt closedAt repository { ...Repo } } }
  }
}`;

export type History = { own: OwnRepo[]; prs: HistNode[]; issues: HistNode[]; prCount: number; fetchedAt: string };

export async function fetchHistory(token: string, login: string): Promise<History> {
  const data = await gql<{
    viewer: { repositories: { nodes: OwnRepo[] } };
    prs: { issueCount: number; nodes: HistNode[] };
    issues: { issueCount: number; nodes: HistNode[] };
  }>(token, HISTORY_QUERY, {
    prs: `is:pr author:${login} sort:created-desc`,
    issues: `is:issue author:${login} sort:created-desc`,
  });
  return {
    own: data.viewer.repositories.nodes,
    prs: data.prs.nodes.filter((n) => n && n.id),
    issues: data.issues.nodes.filter((n) => n && n.id),
    prCount: data.prs.issueCount,
    fetchedAt: new Date().toISOString(),
  };
}

/* ---------- discovery for the user's interests ---------- */

export type FoundRepoGql = {
  nameWithOwner: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  createdAt: string;
  primaryLanguage: { name: string; color: string | null } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
};

export type FirstIssue = {
  id: string;
  number: number;
  title: string;
  url: string;
  createdAt: string;
  comments: { totalCount: number };
  repository: { nameWithOwner: string; stargazerCount: number; primaryLanguage: { name: string } | null };
};

const LANGS = new Set(["rust", "typescript", "python", "go", "javascript", "zig", "kotlin", "swift", "c", "c++", "java", "ruby", "elixir", "php", "dart", "scala", "haskell", "ocaml"]);

export function isLanguage(t: string) {
  return LANGS.has(t.toLowerCase());
}

export async function fetchDiscovery(token: string, interests: string[]) {
  const since = new Date(Date.now() - 150 * 86400000).toISOString().slice(0, 10);
  const issueSince = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const picked = interests.slice(0, 6);
  const langs = picked.filter(isLanguage);
  const parts: string[] = [];
  const vars: Record<string, string> = {};
  picked.forEach((t, i) => {
    vars[`r${i}`] = `${isLanguage(t) ? `language:${t}` : `topic:${t}`} created:>${since} stars:>20 archived:false sort:stars-desc`;
    parts.push(`r${i}: search(query: $r${i}, type: REPOSITORY, first: 8) { nodes { ... on Repository { nameWithOwner description url stargazerCount createdAt primaryLanguage { name color } repositoryTopics(first: 6) { nodes { topic { name } } } } } }`);
  });
  const issueLangs = langs.length ? langs : ["typescript", "python"];
  issueLangs.slice(0, 3).forEach((l, i) => {
    vars[`g${i}`] = `is:issue is:open label:"good first issue" no:assignee language:${l} created:>${issueSince} sort:created-desc`;
    parts.push(`g${i}: search(query: $g${i}, type: ISSUE, first: 10) { nodes { ... on Issue { id number title url createdAt comments { totalCount } repository { nameWithOwner stargazerCount primaryLanguage { name } } } } }`);
  });
  const decl = Object.keys(vars)
    .map((k) => `$${k}: String!`)
    .join(", ");
  const query = `query Discover(${decl}) { ${parts.join("\n")} }`;
  const data = await gql<Record<string, { nodes: (FoundRepoGql | FirstIssue)[] }>>(token, query, vars);

  const repos = new Map<string, FoundRepoGql & { matched: string[] }>();
  picked.forEach((t, i) => {
    for (const r of (data[`r${i}`]?.nodes ?? []) as FoundRepoGql[]) {
      if (!r?.nameWithOwner) continue;
      const prev = repos.get(r.nameWithOwner);
      if (prev) prev.matched.push(t);
      else repos.set(r.nameWithOwner, { ...r, matched: [t] });
    }
  });
  const issues: FirstIssue[] = [];
  issueLangs.slice(0, 3).forEach((_, i) => {
    for (const n of (data[`g${i}`]?.nodes ?? []) as FirstIssue[]) if (n?.id && !issues.some((x) => x.id === n.id)) issues.push(n);
  });
  return {
    repos: [...repos.values()].sort((a, b) => b.matched.length - a.matched.length || b.stargazerCount - a.stargazerCount),
    issues: issues
      .filter((i) => i.repository.stargazerCount >= 30)
      .sort((a, b) => b.repository.stargazerCount - a.repository.stargazerCount)
      .slice(0, 24),
    fetchedAt: new Date().toISOString(),
  };
}

/* ---------- watched issues: one query, one alias per issue ---------- */

export async function fetchWatched(token: string, items: { repo: string; number: number }[]) {
  if (!items.length) return [];
  const vars: Record<string, string | number> = {};
  const parts = items.map((it, i) => {
    const [owner, name] = it.repo.split("/");
    vars[`o${i}`] = owner;
    vars[`n${i}`] = name;
    vars[`i${i}`] = it.number;
    return `w${i}: repository(owner: $o${i}, name: $n${i}) { issue(number: $i${i}) {
      title url state stateReason closedAt
      assignees(first: 3) { nodes { login } }
      comments(last: 30) { totalCount nodes { author { login } authorAssociation body createdAt } }
      closedByPullRequestsReferences(first: 3, includeClosedPrs: true) { nodes { number url state author { login } } }
      timelineItems(last: 15, itemTypes: [CROSS_REFERENCED_EVENT]) { nodes { ... on CrossReferencedEvent { createdAt source { ... on PullRequest { number url state author { login } repository { nameWithOwner } } } } } }
    } }`;
  });
  const decl = items.map((_, i) => `$o${i}: String!, $n${i}: String!, $i${i}: Int!`).join(", ");
  // A deleted or private repo makes GitHub return partial data with errors; read what came back instead of failing the lot.
  let res: Response;
  try {
    res = await fetch(`${API}/graphql`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `query Watched(${decl}) { ${parts.join("\n")} }`, variables: vars }),
    });
  } catch {
    throw new GitHubError("Couldn't reach api.github.com. Check your connection and try again.");
  }
  noteRate(res, "token");
  if (!res.ok) throw new GitHubError(explain(res.status, `GitHub answered ${res.status}.`), res.status);
  const json = (await res.json()) as { data?: Record<string, { issue: WatchedIssue | null } | null> | null; errors?: { message: string }[] };
  if (!json.data) throw new GitHubError(json.errors?.[0]?.message ?? "GitHub returned no data.");
  return items.map((_, i) => json.data![`w${i}`]?.issue ?? null);
}

/* ---------- watched issues for guests: public REST, two calls per issue ---------- */

type RestUser = { login: string } | null;
type RestIssue = {
  title: string;
  html_url: string;
  state: "open" | "closed";
  state_reason: string | null;
  closed_at: string | null;
  comments: number;
  assignees: { login: string }[] | null;
  pull_request?: unknown;
};
type RestEvent = {
  event: string;
  created_at?: string;
  user?: RestUser;
  author_association?: string;
  body?: string;
  source?: {
    issue?: {
      number: number;
      html_url: string;
      state: string;
      body: string | null;
      user: RestUser;
      pull_request?: { merged_at: string | null };
      repository?: { full_name: string };
    };
  };
};

/** Calls one watched issue costs a guest: the issue, then its timeline (one more page on very long threads). */
export const GUEST_CALLS_PER_ISSUE = 2;

/** The guest allowance as last reported, or null before the first call this hour. */
export function guestLeft(now = Date.now()) {
  return windowLeft(readUsage()["guest:core"], now);
}

/* Refuse up front rather than spend the last calls and leave half a list checked. */
export function guestCanSpend(calls: number) {
  const w = guestLeft();
  if (!w || w.remaining >= calls) return;
  throw new GitHubError(
    `Guest limit reached: GitHub allows ${w.limit} requests an hour without a token, and ${w.remaining} are left. It refills at ${clock(w.resetAt)}. Connect GitHub in Settings for 5,000 an hour.`,
    429,
  );
}

async function guestGet(path: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: { Accept: "application/vnd.github+json" } });
  } catch {
    throw new GitHubError("Couldn't reach api.github.com. Check your connection and try again.");
  }
  noteRate(res, "guest");
  if (res.status === 403 || res.status === 429) {
    const w = guestLeft();
    throw new GitHubError(
      w && w.remaining === 0
        ? `Guest limit reached. It refills at ${clock(w.resetAt)}. Connect GitHub in Settings for 5,000 requests an hour.`
        : "GitHub refused the request. Try again in a few minutes.",
      res.status,
    );
  }
  return res;
}

const lastPage = (link: string | null) => Number(link?.match(/[?&]page=(\d+)>; rel="last"/)?.[1] ?? 1);
const up = (s: string | null | undefined) => (s ? s.toUpperCase() : null);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* The REST timeline holds the same facts the GraphQL query reads; shape them the same way so watchStatus can't tell. */
function fromRest(repo: string, number: number, issue: RestIssue, events: RestEvent[]): WatchedIssue {
  const closing = new RegExp(
    `\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\b:?\\s+(?:${escapeRe(repo)}#|https://github\\.com/${escapeRe(repo)}/issues/|#)${number}\\b`,
    "i",
  );
  const comments = events.filter((e) => e.event === "commented");
  const prRefs = events
    .filter((e) => e.event === "cross-referenced" && e.source?.issue?.pull_request)
    .map((e) => {
      const i = e.source!.issue!;
      return {
        createdAt: e.created_at ?? "",
        body: i.body ?? "",
        source: {
          number: i.number,
          url: i.html_url,
          state: i.pull_request!.merged_at ? "MERGED" : (up(i.state) ?? "OPEN"),
          author: i.user ? { login: i.user.login } : null,
          repository: { nameWithOwner: i.repository?.full_name ?? "" },
        },
      };
    });
  return {
    title: issue.title,
    url: issue.html_url,
    state: issue.state === "closed" ? "CLOSED" : "OPEN",
    stateReason: up(issue.state_reason),
    closedAt: issue.closed_at,
    assignees: { nodes: (issue.assignees ?? []).map((a) => ({ login: a.login })) },
    comments: {
      totalCount: issue.comments,
      nodes: comments.slice(-30).map((c) => ({
        author: c.user ? { login: c.user.login } : null,
        authorAssociation: c.author_association ?? "NONE",
        body: c.body ?? "",
        createdAt: c.created_at ?? "",
      })),
    },
    // A PR in the same repo that says "fixes #n" is what GitHub would link as closing it.
    closedByPullRequestsReferences: {
      nodes: prRefs
        .filter((r) => r.source.repository.nameWithOwner.toLowerCase() === repo.toLowerCase() && closing.test(r.body))
        .map((r) => ({ number: r.source.number, url: r.source.url, state: r.source.state, author: r.source.author })),
    },
    timelineItems: { nodes: prRefs.slice(-15).map(({ createdAt, source }) => ({ createdAt, source })) },
  };
}

/** One issue, read without a token. Null when it's gone, private, or actually a PR. */
export async function fetchIssuePublic(repo: string, number: number, withTimeline = true): Promise<WatchedIssue | null> {
  const res = await guestGet(`/repos/${repo}/issues/${number}`);
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new GitHubError(explain(res.status, `GitHub answered ${res.status}.`), res.status);
  const issue = (await res.json()) as RestIssue;
  if (issue.pull_request) return null;
  if (!withTimeline) return fromRest(repo, number, issue, []);
  const first = await guestGet(`/repos/${repo}/issues/${number}/timeline?per_page=100`);
  if (!first.ok) throw new GitHubError(explain(first.status, `GitHub answered ${first.status}.`), first.status);
  let events = (await first.json()) as RestEvent[];
  // Long threads: the newest events sit on the last page, and that's where claims and PRs show up.
  const last = lastPage(first.headers.get("link"));
  if (last > 1) {
    const tail = await guestGet(`/repos/${repo}/issues/${number}/timeline?per_page=100&page=${last}`);
    if (tail.ok) events = events.concat((await tail.json()) as RestEvent[]);
  }
  return fromRest(repo, number, issue, events);
}

export async function fetchWatchedPublic(items: { repo: string; number: number }[]) {
  guestCanSpend(items.length * GUEST_CALLS_PER_ISSUE);
  const out: (WatchedIssue | null)[] = [];
  // One at a time, so a limit hit midway stops the run instead of firing every call into a wall.
  for (const it of items) out.push(await fetchIssuePublic(it.repo, it.number));
  return out;
}

/* ---------- October PRs ---------- */

export async function fetchOctober(token: string, login: string, year: number) {
  const q = `is:pr author:${login} created:${year}-10-01..${year}-10-31`;
  const data = await gql<{
    s: { issueCount: number; nodes: { id: string; number: number; title: string; url: string; state: string; repository: { nameWithOwner: string; repositoryTopics: { nodes: { topic: { name: string } }[] } }; labels: { nodes: { name: string }[] } }[] };
  }>(
    token,
    `query Oct($q: String!) { s: search(query: $q, type: ISSUE, first: 50) { issueCount nodes { ... on PullRequest { id number title url state repository { nameWithOwner repositoryTopics(first: 20) { nodes { topic { name } } } } labels(first: 10) { nodes { name } } } } } }`,
    { q },
  );
  return data.s;
}

/* ---------- timeline for one thread (detail panel) ---------- */

export type TimelineEvent = { at: string; actor: string | null; text: string; kind: string };

export async function fetchTimeline(token: string, id: string): Promise<TimelineEvent[]> {
  const data = await gql<{
    node: {
      timelineItems: {
        nodes: ({ __typename: string } & Record<string, unknown>)[];
      };
    } | null;
  }>(
    token,
    `query T($id: ID!) { node(id: $id) {
      ... on PullRequest { timelineItems(last: 30, itemTypes: [ISSUE_COMMENT, PULL_REQUEST_REVIEW, PULL_REQUEST_COMMIT, REVIEW_REQUESTED_EVENT, LABELED_EVENT, MERGED_EVENT, CLOSED_EVENT, REOPENED_EVENT, READY_FOR_REVIEW_EVENT, ASSIGNED_EVENT]) { nodes { __typename
        ... on IssueComment { createdAt author { login } bodyText }
        ... on PullRequestReview { createdAt author { login } state bodyText }
        ... on PullRequestCommit { commit { committedDate messageHeadline author { user { login } } } }
        ... on ReviewRequestedEvent { createdAt actor { login } requestedReviewer { ... on User { login } } }
        ... on LabeledEvent { createdAt actor { login } label { name } }
        ... on MergedEvent { createdAt actor { login } }
        ... on ClosedEvent { createdAt actor { login } }
        ... on ReopenedEvent { createdAt actor { login } }
        ... on ReadyForReviewEvent { createdAt actor { login } }
        ... on AssignedEvent { createdAt actor { login } }
      } } }
      ... on Issue { timelineItems(last: 30, itemTypes: [ISSUE_COMMENT, LABELED_EVENT, CLOSED_EVENT, REOPENED_EVENT, ASSIGNED_EVENT, CROSS_REFERENCED_EVENT]) { nodes { __typename
        ... on IssueComment { createdAt author { login } bodyText }
        ... on LabeledEvent { createdAt actor { login } label { name } }
        ... on ClosedEvent { createdAt actor { login } }
        ... on ReopenedEvent { createdAt actor { login } }
        ... on AssignedEvent { createdAt actor { login } assignee { ... on User { login } } }
        ... on CrossReferencedEvent { createdAt actor { login } source { ... on PullRequest { number repository { nameWithOwner } } } }
      } } }
    } }`,
    { id },
  );
  const items = data.node?.timelineItems.nodes ?? [];
  const out: TimelineEvent[] = [];
  const login = (o: unknown) => (o as { login?: string } | null)?.login ?? null;
  const clip = (s: unknown) => {
    const t = String(s ?? "").replace(/\s+/g, " ").trim();
    return t.length > 140 ? `${t.slice(0, 139)}…` : t;
  };
  for (const it of items) {
    const t = it.__typename;
    if (t === "IssueComment") out.push({ at: it.createdAt as string, actor: login(it.author), text: clip(it.bodyText) || "commented", kind: "comment" });
    else if (t === "PullRequestReview") {
      const st = String(it.state);
      const verb = st === "APPROVED" ? "approved" : st === "CHANGES_REQUESTED" ? "requested changes" : "reviewed";
      out.push({ at: it.createdAt as string, actor: login(it.author), text: clip(it.bodyText) ? `${verb}: ${clip(it.bodyText)}` : verb, kind: "review" });
    } else if (t === "PullRequestCommit") {
      const c = it.commit as { committedDate: string; messageHeadline: string; author: { user: { login: string } | null } };
      out.push({ at: c.committedDate, actor: c.author?.user?.login ?? null, text: `pushed: ${c.messageHeadline}`, kind: "commit" });
    } else if (t === "ReviewRequestedEvent") out.push({ at: it.createdAt as string, actor: login(it.actor), text: `requested a review from ${login(it.requestedReviewer) ?? "a team"}`, kind: "event" });
    else if (t === "LabeledEvent") out.push({ at: it.createdAt as string, actor: login(it.actor), text: `labelled ${(it.label as { name: string }).name}`, kind: "event" });
    else if (t === "MergedEvent") out.push({ at: it.createdAt as string, actor: login(it.actor), text: "merged it", kind: "merged" });
    else if (t === "ClosedEvent") out.push({ at: it.createdAt as string, actor: login(it.actor), text: "closed it", kind: "closed" });
    else if (t === "ReopenedEvent") out.push({ at: it.createdAt as string, actor: login(it.actor), text: "reopened it", kind: "event" });
    else if (t === "ReadyForReviewEvent") out.push({ at: it.createdAt as string, actor: login(it.actor), text: "marked it ready for review", kind: "event" });
    else if (t === "AssignedEvent") out.push({ at: it.createdAt as string, actor: login(it.actor), text: `assigned ${login(it.assignee) ?? "someone"}`, kind: "event" });
    else if (t === "CrossReferencedEvent") {
      const src = it.source as { number?: number; repository?: { nameWithOwner: string } } | null;
      if (src?.number) out.push({ at: it.createdAt as string, actor: login(it.actor), text: `referenced it from ${src.repository?.nameWithOwner}#${src.number}`, kind: "event" });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
