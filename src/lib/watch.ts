import type { MarkState } from "@/components/kit/Kit";

/*
 * Watched issues: issues you might take, tracked until someone else does.
 * Pure logic here; the query lives in github.ts and the list in the local store.
 */

export type WatchItem = { repo: string; number: number; title: string; url: string; addedAt: string; seenAt: string };

export type WatchedIssue = {
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  stateReason: string | null;
  closedAt: string | null;
  assignees: { nodes: { login: string }[] };
  comments: { totalCount: number; nodes: { author: { login: string } | null; authorAssociation: string; body: string; createdAt: string }[] };
  closedByPullRequestsReferences: { nodes: { number: number; url: string; state: string; author: { login: string } | null }[] };
  timelineItems: {
    nodes: ({ createdAt: string; source: { number?: number; url?: string; state?: string; author?: { login: string } | null; repository?: { nameWithOwner: string } } } | null)[];
  };
};

export type WatchStatus = {
  kind: "free" | "asked" | "assigned" | "pr" | "closed" | "missing";
  lamp: MarkState;
  label: string;
  detail: string | null;
  href: string | null;
  newComments: number;
};

export const watchKey = (repo: string, number: number) => `${repo.toLowerCase()}#${number}`;

/* Accepts an issue URL or the short owner/repo#123 form. */
export function parseIssueRef(input: string): { repo: string; number: number } | { error: string } {
  const v = input.trim();
  if (!v) return { error: "Paste an issue link, like github.com/owner/repo/issues/123." };
  const short = v.match(/^([\w.-]+\/[\w.-]+)#(\d+)$/);
  if (short) return { repo: short[1], number: Number(short[2]) };
  const url = v.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+\/[\w.-]+)\/(issues|pull)\/(\d+)/i);
  if (!url) return { error: "That isn't a GitHub issue link. It should look like github.com/owner/repo/issues/123." };
  if (url[2].toLowerCase() === "pull") return { error: "That's a pull request. Spool watches issues you might take; your PRs are already on the board." };
  return { repo: url[1], number: Number(url[3]) };
}

// "Can I work on this?", "please assign me", "I'd like to take this", "I'm working on it"...
const CLAIM =
  /\b(can|could|may|shall) i (work|take|pick|try|handle|grab|tackle)\b|\bassign (it|this|me)\b|\bplease assign\b|\bi(?:'d| would) (like|love) to (work|take|try|tackle|pick|give)\b|\bi(?:'ll| will) (work on|take|pick|handle|tackle)\b|\bi(?:'m| am) (working on|taking|interested in working)\b|\bworking on (it|this)\b/i;

const MAINTAINER = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

const short = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function watchStatus(issue: WatchedIssue | null, item: WatchItem, me: string | null): WatchStatus {
  const self = (login?: string | null) => !!login && !!me && login.toLowerCase() === me.toLowerCase();
  if (!issue) {
    return { kind: "missing", lamp: "idle", label: "Can't see it", detail: "Deleted, moved, or private to this token.", href: null, newComments: 0 };
  }
  const newComments = issue.comments.nodes.filter((c) => Date.parse(c.createdAt) > Date.parse(item.seenAt) && !self(c.author?.login)).length;
  const base = { newComments, href: null as string | null };

  if (issue.state === "CLOSED") {
    const how = issue.stateReason === "NOT_PLANNED" ? "Closed as not planned" : "Closed as completed";
    return { ...base, kind: "closed", lamp: "idle", label: "Closed", detail: issue.closedAt ? `${how}, ${short(issue.closedAt)}` : how };
  }

  const linked = issue.closedByPullRequestsReferences.nodes.find((p) => p.state === "OPEN" || p.state === "MERGED");
  const mentioned = issue.timelineItems.nodes
    // only open PRs in the same repo; a passing mention from elsewhere isn't someone taking the issue
    .filter((n) => n?.source?.number && n.source.state === "OPEN" && n.source.repository?.nameWithOwner.toLowerCase() === item.repo.toLowerCase())
    .map((n) => n!.source)
    .pop();
  const pr = linked ?? (mentioned as { number: number; url: string; author: { login: string } | null } | undefined);
  if (pr) {
    const mine = self(pr.author?.login);
    return {
      ...base,
      kind: "pr",
      lamp: mine ? "go" : "stop",
      label: mine ? "Your PR is linked" : "PR open",
      detail: mine ? `#${pr.number}` : `#${pr.number}${pr.author ? ` by @${pr.author.login}` : ""}`,
      href: pr.url,
    };
  }

  const who = issue.assignees.nodes.map((a) => a.login);
  if (who.length) {
    const mine = who.some((w) => self(w));
    return {
      ...base,
      kind: "assigned",
      lamp: mine ? "go" : "stop",
      label: mine ? "Assigned to you" : "Assigned",
      detail: mine ? null : `to ${who.map((w) => `@${w}`).join(", ")}`,
    };
  }

  const claim = [...issue.comments.nodes]
    .reverse()
    .find((c) => c.author && !self(c.author.login) && !MAINTAINER.has(c.authorAssociation) && CLAIM.test(c.body));
  if (claim) {
    return { ...base, kind: "asked", lamp: "wait", label: "Someone asked for it", detail: `@${claim.author!.login}, ${short(claim.createdAt)}` };
  }

  return { ...base, kind: "free", lamp: "go", label: "Still free", detail: issue.comments.totalCount ? `${issue.comments.totalCount} comment${issue.comments.totalCount === 1 ? "" : "s"}, nobody assigned` : "No comments yet" };
}
