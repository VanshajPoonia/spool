/*
 * SYNTHETIC board for the sample mode. Invented repos, people and numbers.
 * Shaped exactly like GitHub's responses so the real classifier runs on it.
 */

import type { FirstIssue, FoundRepoGql, HistNode, History, OwnRepo, RawBoard, RawNode, Source, TimelineEvent } from "./github";
import { FLEET } from "./sample-threads";
import type { WatchedIssue, WatchItem } from "./watch";

export const SAMPLE_LOGIN = "sample-dev";

const H = 3600000;
const D = 24 * H;

type Spec = {
  repo: string;
  num: number;
  kind: "pr" | "issue";
  title: string;
  author: string;
  created: number;
  sources: Source[];
  comments?: [string, number][];
  reviews?: [string, string, number][];
  commit?: number;
  ci?: "SUCCESS" | "FAILURE" | "PENDING";
  decision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED";
  draft?: boolean;
  state?: "OPEN" | "CLOSED" | "MERGED";
  closed?: number;
  reviewers?: string[];
  assignees?: string[];
  labels?: [string, string][];
  lang?: string;
};

const ME = SAMPLE_LOGIN;

const SPECS: Spec[] = [
  { repo: "quarry-db/quarry", num: 2431, kind: "pr", title: "Push LIMIT down through views", author: ME, created: 3 * D, sources: ["mine"], comments: [["mara-k", 5 * H + 120000]], reviews: [["mara-k", "CHANGES_REQUESTED", 5 * H]], commit: 2 * D, ci: "SUCCESS", decision: "CHANGES_REQUESTED", labels: [["planner", "1d76db"]], lang: "Rust" },
  { repo: "fernlang/fern", num: 311, kind: "pr", title: "Exhaustiveness check for match guards", author: ME, created: 4 * D, sources: ["mine"], commit: 3 * D, ci: "SUCCESS", decision: "REVIEW_REQUIRED", reviewers: ["kit-o"], lang: "Rust" },
  { repo: "vela-dev/vela", num: 640, kind: "pr", title: "Cache layer for asset hashing", author: ME, created: 7 * D, sources: ["mine"], comments: [["tomasz", 2 * D]], reviews: [["tomasz", "APPROVED", 6 * H]], commit: 1 * D, ci: "SUCCESS", decision: "APPROVED", lang: "TypeScript" },
  { repo: "tinyorbit/orbit-cli", num: 81, kind: "pr", title: "Shell completions for fish", author: ME, created: 16 * D, sources: ["mine"], commit: 16 * D, ci: "SUCCESS", lang: "Go" },
  { repo: "lattice/lattice-ui", num: 860, kind: "pr", title: "Virtualised Combobox list", author: ME, created: 22 * D, sources: ["mine"], comments: [["devon", 9 * D]], commit: 20 * H, ci: "FAILURE", lang: "TypeScript" },
  { repo: "mossjs/moss", num: 1190, kind: "pr", title: "Faster resolver cache", author: ME, created: 1 * D, sources: ["mine"], commit: 3 * H, ci: "PENDING", draft: true, lang: "JavaScript" },
  { repo: "ripple-rs/ripple", num: 88, kind: "issue", title: "Panic on an empty frame", author: ME, created: 4 * D, sources: ["myIssues"], labels: [["bug", "d73a4a"], ["needs-triage", "ededed"]], lang: "Rust" },
  { repo: "lattice/lattice-ui", num: 902, kind: "issue", title: "Tabs: arrow keys skip disabled items", author: ME, created: 13 * D, sources: ["myIssues"], comments: [["devon", 1 * D]], labels: [["a11y", "0e8a16"]], lang: "TypeScript" },
  { repo: "harbor-sh/harbor", num: 5051, kind: "issue", title: "Retry budget per host", author: ME, created: 30 * D, sources: ["myIssues"], comments: [["ilya", 19 * D], [ME, 17 * D]], lang: "Go" },
  { repo: "harbor-sh/harbor", num: 5133, kind: "pr", title: "Batch DNS lookups in the resolver", author: "ilya", created: 2 * D, sources: ["review"], commit: 1 * D, ci: "SUCCESS", reviewers: [ME], decision: "REVIEW_REQUIRED", lang: "Go" },
  { repo: `${ME}/dotfiles-sync`, num: 12, kind: "pr", title: "Support the XDG config directory", author: "kenji-w", created: 20 * H, sources: ["incoming"], commit: 20 * H, ci: "SUCCESS", lang: "Shell" },
  { repo: "tinyorbit/orbit-cli", num: 84, kind: "issue", title: "--json output for status", author: "noor", created: 6 * D, sources: ["assigned"], assignees: [ME], comments: [["noor", 6 * D]], lang: "Go" },
  { repo: "mossjs/moss", num: 1180, kind: "issue", title: "Drop Node 18 in the next major", author: "ana-r", created: 9 * D, sources: ["mentions", "commented"], comments: [[ME, 5 * D], ["ana-r", 2 * D]], lang: "JavaScript" },
  { repo: "vela-dev/vela", num: 655, kind: "issue", title: "Plugin API v2 RFC", author: "tomasz", created: 12 * D, sources: ["commented"], comments: [["lena", 4 * D], [ME, 2 * D]], lang: "TypeScript" },
  { repo: "fernlang/fern", num: 320, kind: "issue", title: "Async closures design", author: "kit-o", created: 10 * D, sources: ["commented"], comments: [[ME, 3 * D], ["kit-o", 10 * H]], lang: "Rust" },
  { repo: "quarry-db/quarry", num: 2417, kind: "pr", title: "Stream rows from cursor in batches", author: ME, created: 6 * D, sources: ["recent"], state: "MERGED", closed: 1 * D, reviews: [["mara-k", "APPROVED", 1 * D + 2 * H]], lang: "Rust" },
  { repo: "harbor-sh/harbor", num: 5120, kind: "pr", title: "Add retry jitter to webhook sender", author: ME, created: 9 * D, sources: ["recent"], state: "MERGED", closed: 4 * D, lang: "Go" },
  { repo: "lattice/lattice-ui", num: 801, kind: "pr", title: "CSS-only Tooltip", author: ME, created: 15 * D, sources: ["recent"], state: "CLOSED", closed: 9 * D, comments: [["devon", 9 * D]], lang: "TypeScript" },
];

const human = (login: string) => ({ __typename: "User", login });

export function sampleBoard(now = Date.now()): RawBoard {
  const iso = (ago: number) => new Date(now - ago).toISOString();
  const nodes = SPECS.map((sp, i): RawNode & { sources: Source[] } => ({
    __typename: sp.kind === "pr" ? "PullRequest" : "Issue",
    id: `sample-${i}`,
    number: sp.num,
    title: sp.title,
    url: `https://github.com/${sp.repo}/${sp.kind === "pr" ? "pull" : "issues"}/${sp.num}`,
    state: sp.state ?? "OPEN",
    isDraft: sp.draft ?? false,
    createdAt: iso(sp.created),
    updatedAt: iso(Math.min(sp.created, ...(sp.comments ?? []).map((c) => c[1]), sp.commit ?? Infinity)),
    closedAt: sp.closed ? iso(sp.closed) : null,
    mergedAt: sp.state === "MERGED" && sp.closed ? iso(sp.closed) : null,
    reviewDecision: sp.decision ?? null,
    author: human(sp.author),
    repository: { nameWithOwner: sp.repo, isPrivate: false, stargazerCount: 1200 + i * 317, primaryLanguage: sp.lang ? { name: sp.lang, color: null } : null },
    comments: { totalCount: (sp.comments ?? []).length, nodes: (sp.comments ?? []).map(([a, t]) => ({ author: human(a), createdAt: iso(t) })) },
    reviews: { nodes: (sp.reviews ?? []).map(([a, st, t]) => ({ author: human(a), state: st, submittedAt: iso(t) })) },
    commits: sp.commit !== undefined ? { nodes: [{ commit: { committedDate: iso(sp.commit), statusCheckRollup: sp.ci ? { state: sp.ci } : null } }] } : { nodes: [] },
    reviewRequests: { nodes: (sp.reviewers ?? []).map((r) => ({ requestedReviewer: { login: r } })) },
    assignees: { nodes: (sp.assignees ?? []).map((l) => ({ login: l })) },
    labels: { nodes: (sp.labels ?? []).map(([name, color]) => ({ name, color })) },
    sources: sp.sources,
  }));
  return { login: ME, fetchedAt: new Date(now).toISOString(), nodes, rate: { remaining: 5000, limit: 5000, resetAt: new Date(now + H).toISOString() } };
}

export function sampleTimeline(id: string, now = Date.now()): TimelineEvent[] {
  const i = Number(id.replace("sample-", ""));
  const sp = SPECS[i];
  if (!sp) return [];
  const iso = (ago: number) => new Date(now - ago).toISOString();
  const ev: TimelineEvent[] = [{ at: iso(sp.created), actor: sp.author, text: sp.kind === "pr" ? `opened #${sp.num}` : `opened the issue`, kind: "event" }];
  if (sp.commit !== undefined && sp.commit !== sp.created) ev.push({ at: iso(sp.commit), actor: sp.author, text: "pushed: address review feedback", kind: "commit" });
  for (const [a, t] of sp.comments ?? []) ev.push({ at: iso(t), actor: a, text: a === ME ? "Pushed a fix and replied with the numbers." : "Could you add a test that covers the nested case?", kind: "comment" });
  for (const [a, st, t] of sp.reviews ?? []) ev.push({ at: iso(t), actor: a, text: st === "APPROVED" ? "approved" : "requested changes: needs a test for nested views", kind: "review" });
  if (sp.state === "MERGED" && sp.closed) ev.push({ at: iso(sp.closed), actor: "mara-k", text: "merged it", kind: "merged" });
  if (sp.state === "CLOSED" && sp.closed) ev.push({ at: iso(sp.closed), actor: "devon", text: "closed it", kind: "closed" });
  return ev.sort((a, b) => a.at.localeCompare(b.at));
}

export function sampleHistory(now = Date.now()): History {
  const iso = (ago: number) => new Date(now - ago).toISOString();
  const prs: HistNode[] = [];
  let k = 0;
  for (const f of FLEET) {
    const repo = { nameWithOwner: f.repo, isPrivate: false, stargazerCount: 2000, primaryLanguage: null };
    const push = (t: { num: number; title: string }, state: HistNode["state"], ageDays: number, mergeDays: number) => {
      prs.push({
        __typename: "PullRequest",
        id: `h-${k++}`,
        number: t.num,
        title: t.title,
        url: `https://github.com/${f.repo}/pull/${t.num}`,
        state,
        createdAt: iso(ageDays * D),
        closedAt: state === "OPEN" ? null : iso((ageDays - mergeDays) * D),
        mergedAt: state === "MERGED" ? iso((ageDays - mergeDays) * D) : null,
        repository: repo,
      });
    };
    f.merged.forEach((t, i) => push(t, "MERGED", 20 + i * 17, 2 + ((i * 3) % 7)));
    f.closed.forEach((t, i) => push(t, "CLOSED", 40 + i * 23, 5));
    f.open.forEach((t, i) => push(t, "OPEN", 3 + i * 9, 0));
  }
  const own: OwnRepo[] = [
    { nameWithOwner: `${ME}/dotfiles-sync`, description: "Sync dotfiles across machines with one command", url: "https://github.com", stargazerCount: 214, forkCount: 19, pushedAt: iso(20 * H), isFork: false, primaryLanguage: { name: "Shell", color: "#89e051" }, issues: { totalCount: 6 }, pullRequests: { totalCount: 1 } },
    { nameWithOwner: `${ME}/flapjs`, description: "Split-flap text effect for the web", url: "https://github.com", stargazerCount: 88, forkCount: 4, pushedAt: iso(9 * D), isFork: false, primaryLanguage: { name: "TypeScript", color: "#3178c6" }, issues: { totalCount: 2 }, pullRequests: { totalCount: 0 } },
    { nameWithOwner: `${ME}/notes`, description: null, url: "https://github.com", stargazerCount: 3, forkCount: 0, pushedAt: iso(41 * D), isFork: false, primaryLanguage: { name: "Markdown", color: null }, issues: { totalCount: 0 }, pullRequests: { totalCount: 0 } },
  ];
  return { own, prs, issues: [], prCount: prs.length, fetchedAt: new Date(now).toISOString() };
}

export function sampleFirstIssues(now = Date.now()): FirstIssue[] {
  const iso = (ago: number) => new Date(now - ago).toISOString();
  return [
    { id: "fi-1", number: 412, title: "Add --quiet flag to the sync command", url: "https://github.com", createdAt: iso(2 * D), comments: { totalCount: 0 }, repository: { nameWithOwner: "tinyorbit/orbit-cli", stargazerCount: 3400, primaryLanguage: { name: "Go" } } },
    { id: "fi-2", number: 977, title: "Docs: example for custom serializers", url: "https://github.com", createdAt: iso(5 * D), comments: { totalCount: 1 }, repository: { nameWithOwner: "mossjs/moss", stargazerCount: 8100, primaryLanguage: { name: "JavaScript" } } },
    { id: "fi-3", number: 334, title: "Error message for unclosed string literal points at the wrong column", url: "https://github.com", createdAt: iso(6 * D), comments: { totalCount: 2 }, repository: { nameWithOwner: "fernlang/fern", stargazerCount: 2900, primaryLanguage: { name: "Rust" } } },
  ];
}

export function sampleRepos(now = Date.now()): FoundRepoGql[] {
  const iso = (ago: number) => new Date(now - ago).toISOString();
  return [
    { nameWithOwner: "tidewater/tide", description: "A tiny job queue on top of SQLite", url: "https://github.com", stargazerCount: 4210, createdAt: iso(61 * D), primaryLanguage: { name: "Rust", color: null }, repositoryTopics: { nodes: [{ topic: { name: "cli" } }] } },
    { nameWithOwner: "pinecone-labs/lint-lite", description: "A 2 MB linter for TypeScript monorepos", url: "https://github.com", stargazerCount: 2380, createdAt: iso(44 * D), primaryLanguage: { name: "TypeScript", color: null }, repositoryTopics: { nodes: [{ topic: { name: "devtools" } }] } },
  ];
}

/* SYNTHETIC: watched issues for the sample board, one in each state Spool can report. */
export function sampleWatched(now = Date.now()): { item: WatchItem; issue: WatchedIssue }[] {
  const iso = (ago: number) => new Date(now - ago).toISOString();
  const issue = (over: Partial<WatchedIssue>): WatchedIssue => ({
    title: "",
    url: "https://github.com",
    state: "OPEN",
    stateReason: null,
    closedAt: null,
    assignees: { nodes: [] },
    comments: { totalCount: 0, nodes: [] },
    closedByPullRequestsReferences: { nodes: [] },
    timelineItems: { nodes: [] },
    ...over,
  });
  const item = (repo: string, number: number, title: string, added: number, seen: number): WatchItem => ({
    repo,
    number,
    title,
    url: "https://github.com",
    addedAt: iso(added * D),
    seenAt: iso(seen * D),
  });
  const c = (login: string, body: string, ago: number, assoc = "NONE") => ({ author: { login }, authorAssociation: assoc, body, createdAt: iso(ago) });
  return [
    {
      item: item("tinyorbit/orbit-cli", 412, "Add --quiet flag to the sync command", 3, 1),
      issue: issue({ title: "Add --quiet flag to the sync command", comments: { totalCount: 1, nodes: [c("orbit-maint", "Happy to take a PR for this.", 2 * D, "OWNER")] } }),
    },
    {
      item: item("fernlang/fern", 334, "Error message for unclosed string literal points at the wrong column", 6, 4),
      issue: issue({
        title: "Error message for unclosed string literal points at the wrong column",
        comments: { totalCount: 3, nodes: [c("ana-r", "Reproduced on main.", 5 * D), c("j-okafor", "Hi! Can I work on this one?", 9 * H)] },
      }),
    },
    {
      item: item("mossjs/moss", 977, "Docs: example for custom serializers", 9, 9),
      issue: issue({ title: "Docs: example for custom serializers", assignees: { nodes: [{ login: "lena-k" }] }, comments: { totalCount: 2, nodes: [c("lena-k", "I'd like to take this.", 7 * D), c("moss-bot", "Assigned.", 7 * D, "MEMBER")] } }),
    },
    {
      item: item("harbor-sh/harbor", 5120, "Expose retry count in webhook delivery logs", 12, 12),
      issue: issue({
        title: "Expose retry count in webhook delivery logs",
        comments: { totalCount: 1, nodes: [c("tomasz", "Opened a PR.", 2 * D)] },
        timelineItems: { nodes: [{ createdAt: iso(2 * D), source: { number: 5131, url: "https://github.com", state: "OPEN", author: { login: "tomasz" }, repository: { nameWithOwner: "harbor-sh/harbor" } } }] },
      }),
    },
    {
      item: item("quarry-db/quarry", 2290, "Document cursor lifetimes", 20, 15),
      issue: issue({ title: "Document cursor lifetimes", state: "CLOSED", stateReason: "COMPLETED", closedAt: iso(10 * D) }),
    },
  ];
}
