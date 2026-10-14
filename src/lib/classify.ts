import type { RawNode, Source } from "./github";

/*
 * Who moves next. Every open thread is either waiting on you or waiting on them;
 * threads you only commented on are "watch"; merged and closed ones are "done".
 */

export type Next = "you" | "them" | "watch" | "done";
export type Tone = "go" | "wait" | "stop" | undefined;

export type Thread = {
  id: string;
  kind: "pr" | "issue";
  repo: string;
  num: number;
  title: string;
  url: string;
  state: "open" | "merged" | "closed";
  draft: boolean;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  next: Next;
  status: string;
  tone: Tone;
  reason: string;
  lastActor: string | null;
  lastAt: string;
  quietDays: number;
  sources: Source[];
  ci: string | null;
  review: string | null;
  labels: { name: string; color: string }[];
  comments: number;
  language: string | null;
};

const DAY = 86400000;

// GitHub Apps report as Bot; many older bots are plain user accounts named "*bot".
const isHuman = (a: { __typename?: string; login: string } | null | undefined) =>
  !!a && a.__typename !== "Bot" && !/(\[bot\]|bot)$/i.test(a.login);

type Ev = { actor: string; at: string; kind: "open" | "comment" | "review" | "commit"; state?: string };

function lastHumanEvent(n: RawNode): Ev {
  const events: Ev[] = [];
  if (n.author?.login) events.push({ actor: n.author.login, at: n.createdAt, kind: "open" });
  for (const c of n.comments.nodes) if (isHuman(c.author)) events.push({ actor: c.author!.login, at: c.createdAt, kind: "comment" });
  for (const r of n.reviews?.nodes ?? [])
    if (isHuman(r.author) && r.submittedAt && r.state !== "PENDING")
      events.push({ actor: r.author!.login, at: r.submittedAt, kind: "review", state: r.state });
  const commit = n.commits?.nodes[0]?.commit;
  if (commit && n.author?.login) events.push({ actor: n.author.login, at: commit.committedDate, kind: "commit" });
  events.sort((a, b) => a.at.localeCompare(b.at));
  return events[events.length - 1] ?? { actor: n.author?.login ?? "", at: n.updatedAt, kind: "open" };
}

export function classify(n: RawNode & { sources: Source[] }, me: string, staleDays: number, now = Date.now()): Thread {
  const meL = me.toLowerCase();
  const isMe = (l: string | null | undefined) => !!l && l.toLowerCase() === meL;
  const last = lastHumanEvent(n);
  const quietDays = Math.max(0, Math.floor((now - Date.parse(last.at)) / DAY));
  const ci = n.commits?.nodes[0]?.commit.statusCheckRollup?.state ?? null;
  const pr = n.__typename === "PullRequest";
  const mine = isMe(n.author?.login);
  const lastIsMe = isMe(last.actor);
  const has = (s: Source) => n.sources.includes(s);
  const reviewAsked = (n.reviewRequests?.nodes ?? []).some((r) => isMe(r.requestedReviewer?.login));
  const assigned = (n.assignees?.nodes ?? []).some((a) => isMe(a.login));

  let next: Next = "them";
  let status = "AWAITING";
  let tone: Tone;
  let reason = "";

  const state: Thread["state"] = n.state === "MERGED" || n.mergedAt ? "merged" : n.state === "CLOSED" ? "closed" : "open";

  if (state === "merged") {
    next = "done";
    status = "MERGED";
    tone = "go";
    reason = "Merged.";
  } else if (state === "closed") {
    next = "done";
    status = "CLOSED";
    tone = "stop";
    reason = "Closed without merging.";
  } else if (pr && mine) {
    if (n.isDraft) {
      next = "you";
      status = "DRAFT";
      reason = "Still a draft. Mark it ready when it is.";
    } else if (ci === "FAILURE" || ci === "ERROR") {
      next = "you";
      status = "CI FAILED";
      tone = "stop";
      reason = "Checks are failing on the latest commit.";
    } else if (n.reviewDecision === "APPROVED" && (lastIsMe || (last.kind === "review" && last.state === "APPROVED"))) {
      next = "them";
      status = "APPROVED";
      tone = "go";
      reason = `Approved${!lastIsMe ? ` by @${last.actor}` : ""}. Waiting for a maintainer to merge.`;
    } else if (n.reviewDecision === "CHANGES_REQUESTED" && !lastIsMe) {
      next = "you";
      status = "CHANGES REQ";
      tone = "stop";
      reason = `Changes requested${last.actor ? ` by @${last.actor}` : ""}.`;
    } else if (!lastIsMe) {
      next = "you";
      status = "THEY REPLIED";
      reason = `@${last.actor} had the last word.`;
    } else if (quietDays >= staleDays) {
      next = "them";
      status = `DELAYED ${quietDays}D`;
      tone = "wait";
      reason = `No reply in ${quietDays} days. You had the last word.`;
    } else {
      next = "them";
      status = "IN REVIEW";
      reason = "Waiting on a reviewer.";
    }
  } else if (!pr && mine) {
    if (!lastIsMe) {
      next = "you";
      status = "THEY REPLIED";
      reason = `@${last.actor} had the last word.`;
    } else if (quietDays >= staleDays) {
      next = "them";
      status = `DELAYED ${quietDays}D`;
      tone = "wait";
      reason = `No reply in ${quietDays} days.`;
    } else {
      next = "them";
      status = "AWAITING";
      reason = "Waiting on a maintainer.";
    }
  } else if (pr && (reviewAsked || has("review"))) {
    next = "you";
    status = "REVIEW ASKED";
    reason = `@${n.author?.login ?? "someone"} asked for your review.`;
  } else if (pr && has("incoming")) {
    if (lastIsMe) {
      next = "them";
      status = "WITH AUTHOR";
      reason = `You replied; waiting on @${n.author?.login ?? "the author"}.`;
    } else {
      next = "you";
      status = "INCOMING PR";
      reason = `@${n.author?.login ?? "Someone"} opened a PR on your repo.`;
    }
  } else if (assigned) {
    next = "you";
    status = "ASSIGNED";
    reason = "Assigned to you.";
  } else if (has("mentions") && !lastIsMe) {
    next = "you";
    status = "MENTIONED";
    reason = `You were mentioned; @${last.actor} spoke last.`;
  } else {
    next = "watch";
    status = lastIsMe ? "WATCHING" : "NEW REPLY";
    reason = lastIsMe ? "You commented last." : `@${last.actor} replied after you.`;
  }

  return {
    id: n.id,
    kind: pr ? "pr" : "issue",
    repo: n.repository.nameWithOwner,
    num: n.number,
    title: n.title,
    url: n.url,
    state,
    draft: !!n.isDraft,
    author: n.author?.login ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    closedAt: n.closedAt,
    next,
    status,
    tone,
    reason,
    lastActor: last.actor || null,
    lastAt: last.at,
    quietDays,
    sources: n.sources,
    ci,
    review: n.reviewDecision ?? null,
    labels: n.labels.nodes,
    comments: n.comments.totalCount,
    language: n.repository.primaryLanguage?.name ?? null,
  };
}

export function lampFor(tone: Tone) {
  return tone ?? ("idle" as const);
}

export function ago(iso: string, now = Date.now()) {
  const ms = now - Date.parse(iso);
  const m = Math.round(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 60) return `${d}d`;
  const mo = Math.round(d / 30);
  if (mo < 24) return `${mo}mo`;
  return `${Math.round(mo / 12)}y`;
}
