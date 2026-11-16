import assert from "node:assert/strict";
import { test } from "node:test";
import { classify, isHuman } from "../src/lib/classify";
import type { RawNode, Source } from "../src/lib/github";
import { SAMPLE_LOGIN, sampleBoard } from "../src/lib/sample-board";

const NOW = Date.parse("2026-11-16T12:00:00Z");
const board = sampleBoard(NOW);
const byNum = (num: number) => {
  const n = board.nodes.find((x) => x.number === num);
  assert.ok(n, `sample #${num}`);
  return classify(n, SAMPLE_LOGIN, 14, NOW);
};

test("your PRs say exactly why they're on you", () => {
  const cases: [number, string, "you" | "them"][] = [
    [2431, "CHANGES REQ", "you"],
    [860, "CI FAILED", "you"],
    [5140, "SIGN CLA", "you"],
    [1175, "CONFLICTS", "you"],
    [97, "BOT REVIEW", "you"],
    [668, "THREADS OPEN", "you"],
    [1190, "DRAFT", "you"],
    [311, "CI ON HOLD", "them"],
    [640, "APPROVED", "them"],
  ];
  for (const [num, status, next] of cases) {
    const t = byNum(num);
    assert.equal(t.status, status, `#${num}`);
    assert.equal(t.next, next, `#${num}`);
  }
});

test("failing checks are named", () => {
  assert.match(byNum(860).reason, /test \(ubuntu-latest\), visual-regression/);
});

test("quiet threads past the limit are stalled, counted in days", () => {
  const t = byNum(81);
  assert.equal(t.next, "them");
  assert.equal(t.tone, "wait");
  assert.match(t.status, /^STALLED \d+D$/);
});

test("other people's threads", () => {
  assert.equal(byNum(5133).status, "REVIEW ASKED");
  assert.equal(byNum(12).status, "INCOMING PR");
  assert.equal(byNum(2417).next, "done");
  const d = byNum(330);
  assert.equal(d.kind, "discussion");
  assert.equal(d.next, "watch");
});

test("claims: asked, assigned with a warning after 10 days, taken", () => {
  assert.equal(byNum(5160).claim, "asked");
  assert.equal(byNum(5160).next, "them");
  const old = byNum(915);
  assert.equal(old.claim, "assigned");
  assert.equal(old.tone, "wait");
  assert.match(old.reason, /unassign/);
  const taken = byNum(1188);
  assert.equal(taken.claim, "taken");
  assert.equal(taken.next, "you");
  assert.match(taken.reason, /@jin-l opened #1192/);
});

test("bots, CLA Assistant included, never count as a person", () => {
  assert.equal(isHuman({ __typename: "Bot", login: "coderabbitai" }), false);
  assert.equal(isHuman({ __typename: "User", login: "dependabot" }), false);
  assert.equal(isHuman({ __typename: "User", login: "CLAassistant" }), false);
  assert.equal(isHuman({ __typename: "User", login: "mara-k" }), true);
});

/* A minimal open PR of yours, for rules the sample board doesn't cover. */
function myPr(extra: Partial<RawNode> = {}): RawNode & { sources: Source[] } {
  const at = (h: number) => new Date(NOW - h * 3600000).toISOString();
  return {
    __typename: "PullRequest",
    id: "pr",
    number: 1,
    title: "t",
    url: "u",
    state: "OPEN",
    isDraft: false,
    createdAt: at(72),
    updatedAt: at(2),
    closedAt: null,
    mergedAt: null,
    reviewDecision: null,
    author: { __typename: "User", login: SAMPLE_LOGIN },
    repository: { nameWithOwner: "o/r", isPrivate: false, stargazerCount: 1, primaryLanguage: null },
    comments: { totalCount: 0, nodes: [] },
    reviews: { nodes: [] },
    commits: { nodes: [{ commit: { committedDate: at(10), statusCheckRollup: { state: "SUCCESS" } } }] },
    labels: { nodes: [] },
    sources: ["mine"],
    ...extra,
  };
}

test("a bot review before your last push doesn't put a PR on you", () => {
  const at = (h: number) => new Date(NOW - h * 3600000).toISOString();
  const t = classify(
    myPr({
      detail: {
        mergeable: "MERGEABLE",
        reviews: [{ author: { __typename: "Bot", login: "coderabbitai" }, state: "COMMENTED", submittedAt: at(20), comments: { totalCount: 3 } }],
        threads: [],
        ciApproval: false,
        checks: [],
      },
    }),
    SAMPLE_LOGIN,
    14,
    NOW,
  );
  assert.equal(t.status, "IN REVIEW");
});

test("review threads on old code, or where you spoke last, aren't on you", () => {
  const t = classify(
    myPr({
      detail: {
        mergeable: "MERGEABLE",
        reviews: [],
        threads: [
          { isResolved: false, isOutdated: true, lastAuthor: { __typename: "User", login: "nemesifier" } },
          { isResolved: false, isOutdated: false, lastAuthor: { __typename: "User", login: SAMPLE_LOGIN } },
        ],
        ciApproval: false,
        checks: [],
      },
    }),
    SAMPLE_LOGIN,
    14,
    NOW,
  );
  assert.equal(t.next, "them");
  assert.equal(t.signals?.threadsOpen, 2);
  assert.equal(t.signals?.threadsOnYou, 0);
});
