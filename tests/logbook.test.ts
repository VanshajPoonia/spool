import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLogbook, yearCard, type LogPr } from "../src/lib/logbook";

const NOW = new Date(2026, 10, 18, 12).getTime(); // a Wednesday
const day = (d: number) => new Date(2026, 10, d, 12).toISOString();
const pr = (repo: string, created: string, merged: string | null): LogPr => ({ repo, number: 1, title: "t", url: "u", createdAt: created, mergedAt: merged });

test("your own repos are left out, and merges are counted by month", () => {
  const lb = buildLogbook([pr("o/a", day(2), day(3)), pr("me/site", day(2), day(3)), pr("o/b", day(4), null)], 3, "me", NOW);
  assert.equal(lb.merged, 1);
  assert.equal(lb.opened, 2);
  assert.equal(lb.months.length, 24);
  assert.equal(lb.months.at(-1)!.merged, 1);
});

test("weekly streaks: this week only breaks one once it's over", () => {
  // Activity in the three weeks before this one, nothing yet this week.
  const prs = [pr("o/a", day(2), null), pr("o/a", day(10), null), pr("o/a", day(13), null)];
  const lb = buildLogbook(prs, 3, "me", NOW);
  assert.equal(lb.streak.current, 2);
  assert.equal(lb.streak.longest, 2);
});

test("a year card sums one calendar year", () => {
  const card = yearCard([pr("o/a", day(2), day(3)), pr("o/a", new Date(2025, 5, 1).toISOString(), new Date(2025, 5, 2).toISOString())], "me", 2026);
  assert.equal(card.merged, 1);
  assert.equal(card.months[10], 1);
});
