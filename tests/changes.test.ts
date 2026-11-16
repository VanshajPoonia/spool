import assert from "node:assert/strict";
import { test } from "node:test";
import { diffBoards, snapOf } from "../src/lib/changes";
import { classify } from "../src/lib/classify";
import { SAMPLE_LOGIN, sampleBoard } from "../src/lib/sample-board";

const NOW = Date.parse("2026-11-16T12:00:00Z");
const cls = (nodes: ReturnType<typeof sampleBoard>["nodes"], t = NOW) => nodes.map((n) => classify(n, SAMPLE_LOGIN, 14, t));

test("nothing changed, nothing reported, even days later", () => {
  const b = sampleBoard(NOW);
  const before = Object.fromEntries(cls(b.nodes).map((t) => [t.id, snapOf(t)]));
  assert.deepEqual(diffBoards(before, cls(b.nodes), SAMPLE_LOGIN, "x", {}), []);
  assert.deepEqual(diffBoards(before, cls(b.nodes, NOW + 2 * 86400000), SAMPLE_LOGIN, "x", {}), []);
});

test("each kind of change, one item per thread", () => {
  const b = sampleBoard(NOW);
  const before = Object.fromEntries(cls(b.nodes).map((t) => [t.id, snapOf(t)]));
  const next = structuredClone(b.nodes);
  const pick = (n: number) => next.find((x) => x.number === n)!;
  pick(640).state = "MERGED";
  pick(640).mergedAt = new Date(NOW).toISOString();
  pick(311).comments = { totalCount: 1, nodes: [{ author: { __typename: "User", login: "kit-o" }, createdAt: new Date(NOW).toISOString() }] };
  pick(97).commits!.nodes[0].commit.statusCheckRollup = { state: "FAILURE" };
  next.splice(next.findIndex((x) => x.number === 655), 1);
  next.push({ ...structuredClone(pick(84)), id: "new-1", number: 99 });
  const prior = { [pick(311).id]: { count: 2 } as never };
  const kinds = Object.fromEntries(diffBoards(before, cls(next), SAMPLE_LOGIN, "x", prior).map((c) => [c.num, c]));
  assert.equal(kinds[640].kind, "merged");
  assert.equal(kinds[311].kind, "reply");
  assert.equal(kinds[311].count, 3);
  assert.equal(kinds[97].kind, "ci-red");
  assert.equal(kinds[99].kind, "arrived");
  assert.equal(kinds[655].kind, "left");
});
