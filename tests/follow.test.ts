import assert from "node:assert/strict";
import { test } from "node:test";
import { byRule, followId, isFree, mergeBatches, newIssuesQuery, parseFollow, toFollowIssue, type Follow, type FollowIssue, type RawFollowIssue } from "../src/lib/follow";

const NOW = Date.parse("2026-11-16T12:00:00Z");

test("follow targets from names, links and @people", () => {
  assert.deepEqual(parseFollow("https://github.com/layer5io/layer5/"), { kind: "repo", target: "layer5io/layer5" });
  assert.deepEqual(parseFollow("openwisp"), { kind: "org", target: "openwisp" });
  assert.deepEqual(parseFollow("@leecalcote"), { kind: "maintainer", target: "leecalcote" });
  assert.ok("error" in parseFollow(""));
  assert.ok("error" in parseFollow("a/b/c"));
  assert.ok("error" in parseFollow("@-x"));
});

const follow = (over: Partial<Follow>): Follow => ({ id: followId("repo", "o/r"), kind: "repo", target: "o/r", rule: "labels", labels: ["good first issue", "help wanted"], addedAt: "", seenAt: "", ...over });

test("queries: labels ORed and quoted, accounts by user:, people by author:", () => {
  assert.equal(newIssuesQuery(follow({})), 'repo:o/r is:issue is:open no:assignee -linked:pr archived:false label:"good first issue","help wanted" sort:created-desc');
  assert.match(newIssuesQuery(follow({ kind: "org", target: "openwisp", rule: "all" })), /^user:openwisp /);
  assert.match(newIssuesQuery(follow({ kind: "maintainer", target: "lee", rule: "all" })), /^author:lee /);
});

const raw = (over: Partial<RawFollowIssue>): RawFollowIssue => ({
  id: "i",
  number: 1,
  title: "Fix it",
  url: "u",
  createdAt: new Date(NOW).toISOString(),
  authorAssociation: "MEMBER",
  author: { login: "lead" },
  repository: { nameWithOwner: "o/r" },
  labels: { nodes: [] },
  comments: { totalCount: 0, nodes: [] },
  timelineItems: { nodes: [] },
  ...over,
});

test("free, asked for in the last 21 days, or covered by a PR in the same repo", () => {
  const ask = (daysAgo: number) => ({ author: { login: "newbie" }, authorAssociation: "NONE", body: "Can I work on this?", createdAt: new Date(NOW - daysAgo * 86400000).toISOString() });
  assert.ok(isFree(toFollowIssue(raw({}), "me", NOW)));
  assert.equal(toFollowIssue(raw({ comments: { totalCount: 1, nodes: [ask(3)] } }), "me", NOW).claim?.by, "newbie");
  assert.equal(toFollowIssue(raw({ comments: { totalCount: 1, nodes: [ask(30)] } }), "me", NOW).claim, null);
  const pr = (repo: string, state = "OPEN") => ({ source: { number: 9, url: "p", state, repository: { nameWithOwner: repo } } });
  assert.equal(toFollowIssue(raw({ timelineItems: { nodes: [pr("o/r")] } }), "me", NOW).pr?.number, 9);
  assert.equal(toFollowIssue(raw({ timelineItems: { nodes: [pr("other/repo")] } }), "me", NOW).pr, null);
  assert.equal(toFollowIssue(raw({ timelineItems: { nodes: [pr("o/r", "CLOSED")] } }), "me", NOW).pr, null);
});

test("maintainer rule and batches across repos", () => {
  const issue = (repo: string, maintainer = true): FollowIssue => ({ ...toFollowIssue(raw({ repository: { nameWithOwner: repo }, id: repo }), "me", NOW), maintainer });
  assert.equal(byRule(follow({ rule: "maintainers" }), [issue("o/a"), issue("o/b", false)]).length, 1);
  const merged = mergeBatches([issue("o/a"), issue("o/b"), issue("o/c"), issue("o/d")]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].alsoIn, 3);
  assert.equal(mergeBatches([issue("o/a"), issue("o/b")]).length, 2);
});
