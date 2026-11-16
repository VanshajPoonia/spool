import assert from "node:assert/strict";
import { test } from "node:test";
import { inDays, orgDeadlines, programDeadlines, upcoming } from "../src/lib/deadlines";
import { toIcs } from "../src/lib/ics";
import type { OrgPlan } from "../src/lib/orgs";
import type { Programs } from "../src/lib/programs";

const org = (owner: string, nextDate: string | null, status: OrgPlan["status"] = "active"): OrgPlan => ({ owner, goal: "job", status, next: "Next step", nextDate, notes: "", links: "", addedAt: "" });

test("org dates count calendar days, so later today reads today", () => {
  const now = new Date(2026, 10, 16, 9, 0).getTime();
  const list = upcoming(orgDeadlines([org("a", "2026-11-16"), org("b", "2026-11-17"), org("c", "2026-12-20"), org("d", "2026-11-18", "hold")]), now);
  assert.deepEqual(
    list.map((d) => [d.label, inDays(d.days)]),
    [
      ["a", "today"],
      ["b", "tomorrow"],
    ],
  );
});

test("only followed program dates, and LFX opens and closes", () => {
  const data = {
    gsoc: null,
    yc: { batch: "Winter 2027", deadline: "November 2", decisions: "December 11", afterDeadline: true, applyUrl: "" },
    launches: [],
    lfx: [{ id: "2027-01", label: "2027 Term 1, Mar to May", url: "u", milestones: [{ name: "apply", label: "Mentee applications", start: "2027-02-03", end: "2027-02-16" }] }],
    news: [],
    ycOpen: null,
    fetchedAt: "",
  } as Programs;
  const now = Date.parse("2027-01-20T12:00:00Z");
  assert.deepEqual(programDeadlines(data, [], now), []);
  const keys = programDeadlines(data, ["lfx:apply", "yc"], now).map((d) => d.key);
  assert.deepEqual(keys, ["lfx:2027-01:apply:start", "lfx:2027-01:apply:end"]);
});

test("the calendar file escapes, folds and keeps stable IDs", () => {
  const ics = toIcs([{ key: "org:o", label: "openwisp", date: "2026-11-21T00:00:00", detail: "Ask; then, if quiet, ping\nchat", href: "https://example.com/" + "x".repeat(90) }], Date.parse("2026-11-16T12:00:00Z"));
  assert.match(ics, /DESCRIPTION:Ask\\; then\\, if quiet\\, ping\\nchat/);
  assert.match(ics, /UID:org:o-20261121@spool\.vanshajpoonia\.com/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261121\r\nDTEND;VALUE=DATE:20261122/);
  assert.ok(ics.split("\r\n").every((l) => l.length <= 75));
});
