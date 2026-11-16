import assert from "node:assert/strict";
import { test } from "node:test";
import { openPrsByOwner, summarize, type RawRepoCheck } from "../src/lib/outsider";

const h = (hours: number) => new Date(Date.parse("2026-11-01T00:00:00Z") + hours * 3600000).toISOString();
const user = (login: string) => ({ __typename: "User", login });

const raw: RawRepoCheck = {
  repository: {
    nameWithOwner: "o/r",
    url: "https://github.com/o/r",
    pushedAt: h(0),
    isArchived: false,
    licenseInfo: { spdxId: "MIT", name: "MIT License" },
    codeOfConduct: { name: "Contributor Covenant" },
    c1: { text: "# Contributing\n\nComment on the issue and wait to be assigned before you open a PR.\n\nAI-assisted PRs must say so in the description, please." },
    c2: null,
    c3: null,
    ai1: null,
    ai2: null,
    workflows: { entries: [{ name: "ci.yml" }, { name: "bot-autoassign-issue.yml" }] },
  },
  merged: {
    issueCount: 4,
    nodes: [
      { title: "Fix a bug", authorAssociation: "CONTRIBUTOR", author: user("ana") },
      { title: "[WEB-123] Staff change", authorAssociation: "CONTRIBUTOR", author: user("staffer") },
      { title: "Bump deps", authorAssociation: "NONE", author: { __typename: "Bot", login: "dependabot" } },
      { title: "Internal", authorAssociation: "MEMBER", author: user("lead") },
    ],
  },
  closed: {
    nodes: [
      {
        createdAt: h(0),
        mergedAt: h(30),
        authorAssociation: "CONTRIBUTOR",
        author: user("ana"),
        comments: { nodes: [{ createdAt: h(1), author: user("CLAassistant") }, { createdAt: h(10), author: user("lead") }] },
        reviews: { nodes: [] },
        commits: { nodes: [{ commit: { statusCheckRollup: { contexts: { nodes: [{ context: "license/cla" }, { name: "DCO" }] } } } }] },
      },
      { createdAt: h(0), mergedAt: null, authorAssociation: "FIRST_TIME_CONTRIBUTOR", author: user("bo"), comments: { nodes: [] }, reviews: { nodes: [] }, commits: { nodes: [] } },
    ],
  },
  gfi: { issueCount: 5 },
};

test("outsiders leave out bots and ticket-titled staff PRs, and count people", () => {
  const c = summarize(raw, h(0))!;
  assert.deepEqual(c.merged, { total: 4, sampled: 4, outside: 1, outsideAuthors: 1 });
});

test("first answer skips the author and bots like CLA Assistant", () => {
  const c = summarize(raw, h(0))!;
  assert.equal(c.answer.medianHours, 10);
  assert.equal(c.answer.answered, 1);
  assert.equal(c.answer.unanswered, 1);
});

test("CLA, DCO, claim lines, assign workflows and AI lines", () => {
  const c = summarize(raw, h(0))!;
  assert.deepEqual(c.sign, { cla: true, dco: true });
  assert.equal(c.claim.lines.length, 1);
  assert.deepEqual(c.claim.workflows, ["bot-autoassign-issue.yml"]);
  assert.match(c.ai.line ?? "", /AI-assisted/);
  assert.equal(c.licence, "MIT");
  assert.equal(summarize({ ...raw, repository: null }, h(0)), null);
});

test("open PRs per org leave out your own account", () => {
  const t = (repo: string, state = "open") => ({ kind: "pr", author: "me", state, repo });
  const m = openPrsByOwner([t("openwisp/a"), t("openwisp/b"), t("me/site"), t("openwisp/c", "merged")], "me");
  assert.equal(m.get("openwisp"), 2);
  assert.equal(m.has("me"), false);
});
